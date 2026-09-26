import json
import random
import string
import base64
from fastapi import APIRouter, Depends, Request, HTTPException, status, UploadFile, File, Form
from sqlalchemy import func, JSON, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, attributes
from sqlalchemy.orm.attributes import flag_modified
from models.course import Course
from models.teacher import Teacher
from models.enrollment import Enrollment
from models.lesson_content import LessonContent
from models.quiz import Quiz
from models.student import Student
from models.homework_submission import HomeworkSubmission
from connect_db import get_db
from sqlalchemy import delete
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from auth.dependencies import get_current_user_info, get_current_teacher_id
from core.config import settings
import homework_rules
import learning_store
from models.teaching import HomeworkSubmissionVersion
from core import classroom, plans, streak
from core.permissions import ensure_course_access

router = APIRouter()

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # karışabilecek 0/O, 1/I hariç


async def generate_enrollment_code(db: AsyncSession) -> str:
    """Benzersiz 6 haneli katılım kodu üretir."""
    for _ in range(10):
        code = "".join(random.choices(CODE_ALPHABET, k=6))
        existing = await db.execute(select(Course).where(Course.enrollment_code == code))
        if not existing.scalars().first():
            return code
    raise HTTPException(status_code=500, detail="Katılım kodu üretilemedi, lütfen tekrar deneyin.")


async def populate_course_notes(courses: List[Course], db: AsyncSession) -> List[Course]:
    if not courses:
        return courses

    course_ids = [c.id for c in courses]
    
    # Tüm kursların lesson_contents kayıtlarını çek
    content_result = await db.execute(
        select(LessonContent).where(LessonContent.course_id.in_(course_ids))
    )
    lesson_contents = content_result.scalars().all()
    
    # Kurslara göre grupla
    from collections import defaultdict
    contents_by_course = defaultdict(list)
    for lc in lesson_contents:
        contents_by_course[lc.course_id].append(lc)
        
    for course in courses:
        relational_notes = [
            {
                "id": lc.node_id,
                "noteTitle": lc.title or "İsimsiz Not",
                "slides": lc.slides or []
            }
            for lc in contents_by_course[course.id]
        ]
        
        legacy_notes = course.notes or []
        existing_node_ids = {lc.node_id for lc in contents_by_course[course.id]}
        combined_notes = list(relational_notes)
        for note in legacy_notes:
            if isinstance(note, dict) and str(note.get("id")) not in existing_node_ids:
                combined_notes.append(note)
                
        course.notes = combined_notes
        
    return courses


from datetime import datetime, time
from models.live_session import LiveSession

class TeacherResponse(BaseModel):
    first_name: Optional[str] = "Mufi"
    last_name: Optional[str] = "Eğitmen"

    class Config:
        from_attributes = True

class CourseResponse(BaseModel):
    id: int
    teacher_id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    progress: int
    learning_outcomes: Optional[List[str]] = []
    requirements: Optional[List[str]] = []
    curriculum: Optional[Any] = []
    notes: Optional[Any] = []
    teacher: Optional[TeacherResponse] = None
    students_count: int = 0
    rating: Optional[int] = 5
    schedule: Optional[List[Any]] = []
    enrollment_code: Optional[str] = None
    classes: Optional[List[Any]] = []
    start_date: Optional[str] = None

    class Config:
        from_attributes = True

class TeacherCourseResponse(CourseResponse):
    """CourseResponse + enrollment_code ve görüşme linki — sadece eğitmene ait endpoint'lerde kullanılır."""
    enrollment_code: Optional[str] = None
    meeting_url: Optional[str] = None

class LiveSessionResponse(BaseModel):
    id: int
    course_id: int
    title: str
    day_of_week: str
    start_time: time
    duration_minutes: int
    type: str
    status: str

    class Config:
        from_attributes = True

class TeacherStudentResponse(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    email: str
    course_title: str
    course_id: Optional[int] = None
    # Bitirilen modül / toplam modül (öğrenme kaydındaki module_completed olayları).
    progress: int = 0
    modules_done: int = 0
    modules_total: int = 0
    enrolled_at: Optional[datetime] = None
    # active | struggling | completed | inactive (bkz. teacher_summary.StudentSignal.status)
    status: str = "active"
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    last_activity_at: Optional[datetime] = None
    struggling_concepts: int = 0
    stuck_now: int = 0
    tasks_solved: int = 0
    tasks_started: int = 0
    has_parent: bool = False



def _class_for_student(cls: Any, student_id: int) -> Any:
    """Öğrenciye giden şube: katılım kodu yok; öğrenci listesinde yalnızca kendisi
    (kendi şubesini bulabilsin diye) — diğer öğrencilerin kimlikleri gitmez."""
    if not isinstance(cls, dict):
        return cls
    ids = [sid for sid in (cls.get("student_ids") or []) if str(sid) == str(student_id)]
    return {**{k: v for k, v in cls.items() if k != "code"}, "student_ids": ids}


def student_view_of_courses(db: AsyncSession, courses: List[Course], student_id: int) -> List[Course]:
    """Öğrenciye giden kurs: katılım kodları gizli, yalnızca ona atanan tekrar görevleri.

    Nesneler oturumdan ayrılır — aşağıdaki değişiklikler yanlışlıkla veritabanına
    yazılmasın (yalnızca bu yanıt için süzülüyor).
    """
    db.expunge_all()
    for course in courses:
        course.enrollment_code = None
        course.classes = [_class_for_student(cls, student_id) for cls in course.classes or []]
        course.notes = classroom.student_notes(course.notes, student_id, classroom.pending_review_ids(course))
    return courses


@router.get("/my-content", response_model=List[CourseResponse])
async def read_my_content(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(user_info["sub"])
    role = user_info["role"]

    if role in ["student", "admin"]:
        stmt = (
            select(Course)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .where(Enrollment.student_id == user_id)
            .options(joinedload(Course.teacher), joinedload(Course.enrollments))
        )
        result = await db.execute(stmt)
        courses = result.unique().scalars().all()
        for course in courses:
            course.students_count = len(course.enrollments)
        courses = await populate_course_notes(courses, db)
        return student_view_of_courses(db, courses, user_id)
    elif role == "teacher":
        result = await db.execute(
            select(Course)
            .where(Course.teacher_id == user_id)
            .options(joinedload(Course.teacher), joinedload(Course.enrollments))
        )
        courses = result.unique().scalars().all()
        for course in courses:
            course.students_count = len(course.enrollments)
        return await populate_course_notes(courses, db)
    else:
        return []

@router.get("/my-schedule", response_model=List[LiveSessionResponse])
async def read_my_schedule(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(user_info["sub"])
    role = user_info["role"]

    if role == "admin":
        stmt = (
            select(LiveSession)
            .order_by(LiveSession.start_time)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    elif role == "student":
        stmt = (
            select(LiveSession)
            .join(Course)
            .join(Enrollment)
            .where(Enrollment.student_id == user_id)
            .order_by(LiveSession.start_time)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    else:
        return []

class EnrollByCodeRequest(BaseModel):
    code: str

@router.post("/enroll-by-code")
async def enroll_by_code(
    payload: EnrollByCodeRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    """Eski adres: /class/join ile aynı — öğrenci her zaman bir şubeye katılır."""
    return await _join_with_code(db, user_info, payload.code)

@router.get("/courses/{course_id}", response_model=CourseResponse)
async def read_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user_info: dict = Depends(get_current_user_info)
):
    # Yalnızca kursun öğretmeni, kayıtlı öğrencisi ve yönetici. Eskiden giriş
    # yapmış HERKES (başka öğretmenler, kayıtsız öğrenciler, veliler) bütün
    # slaytları, ödevleri ve şubelerdeki öğrenci kimliklerini okuyabiliyordu.
    await ensure_course_access(db, course_id, user_info)
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(joinedload(Course.teacher), joinedload(Course.enrollments))
    )
    course = result.unique().scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.students_count = len(course.enrollments)

    # Automatically generate enrollment code if it doesn't exist
    if not course.enrollment_code:
        course.enrollment_code = await generate_enrollment_code(db)
        await db.commit()
        await db.refresh(course)

    # Convert to dict to selectively return the enrollment_code
    course_dict = {}
    for col in course.__table__.columns:
        course_dict[col.name] = getattr(course, col.name)
    course_dict["teacher"] = course.teacher
    course_dict["students_count"] = course.students_count

    # Relational ders notlarını (lesson_contents) çek ve eski notes yapısına dönüştürerek ekle
    content_result = await db.execute(
        select(LessonContent).where(LessonContent.course_id == course.id)
    )
    lesson_contents = content_result.scalars().all()
    relational_notes = [
        {
            "id": lc.node_id,
            "noteTitle": lc.title or "İsimsiz Not",
            "slides": lc.slides or []
        }
        for lc in lesson_contents
    ]

    legacy_notes = course.notes or []
    existing_node_ids = {lc.node_id for lc in lesson_contents}
    combined_notes = list(relational_notes)
    for note in legacy_notes:
        if isinstance(note, dict) and str(note.get("id")) not in existing_node_ids:
            combined_notes.append(note)

    course_dict["notes"] = combined_notes

    user_id = int(user_info["sub"])
    role = user_info["role"]
    if role != "admin" and course.teacher_id != user_id:
        # Katılım kodları yalnızca kursun öğretmenine görünür: kodu bilen kursa katılabilir.
        course_dict["enrollment_code"] = None
        # Öğrenci şube adını ve programını görür; katılım kodu ve diğer
        # öğrencilerin kimlikleri gitmez.
        course_dict["classes"] = [_class_for_student(cls, user_id) for cls in course.classes or []]
        # Onay bekleyen YZ modülleri boş; atanmış tekrar görevleri yalnızca ilgili öğrencilere.
        course_dict["notes"] = classroom.student_notes(course_dict["notes"], user_id, classroom.pending_review_ids(course))

    return course_dict

@router.get("/teacher/content", response_model=List[TeacherCourseResponse])
async def read_my_courses(
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Course).where(Course.teacher_id == teacher_id).options(joinedload(Course.teacher), joinedload(Course.enrollments))
    )
    courses = result.unique().scalars().all()
    
    updated = False
    for course in courses:
        course.students_count = len(course.enrollments)
        if not course.enrollment_code:
            course.enrollment_code = await generate_enrollment_code(db)
            updated = True
        # Eski kurslar: şubesi yoksa "Genel" şubesi, kodsuz/çakışan şubeye tekil kod,
        # tek şubeli kursta şubesiz kalmış öğrenciler şubeye.
        if await classroom.ensure_classes(db, course, [e.student_id for e in course.enrollments]):
            updated = True
            
    if updated:
        await db.commit()
        # Re-fetch to ensure everything is loaded correctly
        result = await db.execute(
            select(Course).where(Course.teacher_id == teacher_id).options(joinedload(Course.teacher), joinedload(Course.enrollments))
        )
        courses = result.unique().scalars().all()
        for course in courses:
            course.students_count = len(course.enrollments)
            
    return await populate_course_notes(courses, db)

@router.get("/teacher/students", response_model=List[TeacherStudentResponse])
async def read_teacher_students(
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    """Öğretmenin kurslarına kayıtlı öğrenciler — kurs başına bir satır.

    Durum ve ilerleme öğrenme kaydından hesaplanır; eskiden herkes "Aktif",
    ilerleme 0 dönüyordu.
    """
    import teacher_summary

    courses = (await db.execute(select(Course).where(Course.teacher_id == teacher_id))).scalars().all()
    by_id = {c.id: c for c in courses}
    signals = await teacher_summary.student_signals(db, courses)
    now = datetime.utcnow()

    stmt = (
        select(Enrollment, Student)
        .join(Student, Student.id == Enrollment.student_id)
        .where(Enrollment.course_id.in_(list(by_id) or [-1]))
    )
    response = []
    for enrollment, student in (await db.execute(stmt)).all():
        course = by_id[enrollment.course_id]
        sig = signals.get((course.id, student.id)) or teacher_summary.StudentSignal()
        cls = teacher_summary.class_of(course, student.id)
        response.append(
            TeacherStudentResponse(
                student_id=student.id,
                first_name=student.first_name or "",
                last_name=student.last_name or "",
                email=student.email or "",
                course_title=course.title,
                course_id=course.id,
                progress=sig.progress,
                modules_done=sig.modules_done,
                modules_total=sig.modules_total,
                enrolled_at=enrollment.enrolled_at,
                status=sig.status(now),
                class_id=str(cls["id"]) if cls and cls.get("id") is not None else None,
                class_name=cls.get("name") if cls else None,
                last_activity_at=sig.last_activity,
                struggling_concepts=len(sig.struggling),
                stuck_now=sig.stuck_now,
                tasks_solved=sig.tasks_solved,
                tasks_started=sig.tasks_started,
                has_parent=student.parent_id is not None,
            )
        )
    return response

class CreateCourseRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    learning_outcomes: Optional[List[str]] = []
    requirements: Optional[List[str]] = []
    curriculum: Optional[Any] = []
    notes: Optional[Any] = []
    rating: Optional[int] = 5
    schedule: Optional[List[Any]] = []
    classes: Optional[List[Any]] = []
    start_date: Optional[str] = None

class UpdateCourseRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    learning_outcomes: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    curriculum: Optional[Any] = None
    notes: Optional[Any] = None
    rating: Optional[int] = None
    schedule: Optional[List[Any]] = None
    classes: Optional[List[Any]] = None
    start_date: Optional[str] = None

@router.post("/create_course", response_model=TeacherCourseResponse)
async def create_course(
    course_data: CreateCourseRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):

    if not course_data.curriculum or len(course_data.curriculum) == 0:
        raise HTTPException(status_code=400, detail="Müfredat boş olamaz. En az bir ders (bölüm) eklenmelidir.")

    try:
        enrollment_code = await generate_enrollment_code(db)
        new_course = Course(
            teacher_id=teacher_id,
            title=course_data.title,
            description=course_data.description,
            category=course_data.category,
            progress=0,
            learning_outcomes=course_data.learning_outcomes,
            requirements=course_data.requirements,
            curriculum=course_data.curriculum,
            notes=course_data.notes if course_data.notes is not None else [],
            rating=course_data.rating if course_data.rating is not None else 5,
            schedule=course_data.schedule if course_data.schedule is not None else [],
            enrollment_code=enrollment_code,
            classes=course_data.classes if course_data.classes is not None else [],
            start_date=course_data.start_date
        )
        # Her kursun en az bir şubesi ve tekil şube kodları olur (katılım şube koduyla).
        await classroom.ensure_classes(db, new_course)
        db.add(new_course)
        await db.commit()
        # teacher ilişkisini eager-load ile tekrar çek — aksi halde response_model
        # serileştirmesi sırasında lazy-load MissingGreenlet hatası oluşur.
        result = await db.execute(
            select(Course).where(Course.id == new_course.id).options(joinedload(Course.teacher))
        )
        new_course = result.scalar_one()
        new_course.students_count = 0
        return new_course
    except Exception as e:
        await db.rollback()
        print(f"ERROR in create_course: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update_course/{course_id}", response_model=TeacherCourseResponse)
async def update_course(
    course_id: int,
    course_data: UpdateCourseRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # NOT: Tüm payload'ı loglamak müfredat JSON'u büyüdükçe (slayt içerikleri)
    # isteği saniyelerce yavaşlatıyordu; sadece özet bilgi logluyoruz.
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail=f"Course {course_id} not found for teacher {teacher_id}")
    
    if course_data.curriculum is not None and len(course_data.curriculum) == 0:
        raise HTTPException(status_code=400, detail="Müfredat boş olamaz. En az bir ders (bölüm) eklenmelidir.")

    try:
        if course_data.title is not None:
            course.title = course_data.title
        if course_data.description is not None:
            course.description = course_data.description
        if course_data.category is not None:
            course.category = course_data.category
        if course_data.learning_outcomes is not None:
            course.learning_outcomes = course_data.learning_outcomes
            flag_modified(course, "learning_outcomes")
        if course_data.requirements is not None:
            course.requirements = course_data.requirements
            flag_modified(course, "requirements")
        if course_data.curriculum is not None:
            course.curriculum = classroom.keep_review_flags(course.curriculum, course_data.curriculum)
            flag_modified(course, "curriculum")
        if course_data.notes is not None:
            course.notes = course_data.notes
            flag_modified(course, "notes")
            
        if course_data.rating is not None:
            course.rating = course_data.rating

        if course_data.schedule is not None:
            course.schedule = course_data.schedule
            flag_modified(course, "schedule")
            
        if course_data.classes is not None:
            course.classes = course_data.classes
            flag_modified(course, "classes")
            enrolled_ids = [sid for sid, in (await db.execute(
                select(Enrollment.student_id).where(Enrollment.course_id == course.id)
            )).all()]
            await classroom.ensure_classes(db, course, enrolled_ids)
            
        if course_data.start_date is not None:
            course.start_date = course_data.start_date
            
        await db.commit()
        # teacher ilişkisini eager-load ile tekrar çek — aksi halde response_model
        # serileştirmesi sırasında lazy-load MissingGreenlet hatası oluşur.
        result = await db.execute(
            select(Course).where(Course.id == course.id).options(joinedload(Course.teacher), joinedload(Course.enrollments))
        )
        course = result.unique().scalar_one()
        course.students_count = len(course.enrollments)
        return course
    except Exception as e:
        await db.rollback()
        print(f"ERROR in update_course: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.delete("/delete_course/{course_id}")
async def delete_course(
    course_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
        
    try:
        # Delete related quizzes
        await db.execute(delete(Quiz).where(Quiz.course_id == course_id))
        
        # Delete related live sessions
        await db.execute(delete(LiveSession).where(LiveSession.course_id == course_id))
        
        # Delete related enrollments
        await db.execute(delete(Enrollment).where(Enrollment.course_id == course_id))
        
        # Delete the course
        await db.delete(course)
        await db.commit()
    except Exception as e:
        await db.rollback()
        print(f"ERROR in delete_course: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Course deleted successfully"}

@router.post("/start-session/{course_id}")
async def start_session(
    course_id: int,
    title: Optional[str] = None,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # Dersi kontrol et
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Mevcut canlı oturumu bul veya yeni oluştur
    stmt = select(LiveSession).where(LiveSession.course_id == course_id, LiveSession.status == 'live')
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        session = LiveSession(
            course_id=course_id,
            title=title if title else f"{course.title} - Canlı Oturum",
            status='live',
            type='live'
        )
        db.add(session)
    else:
        session.status = 'live'
        if title:
            session.title = title
    
    await db.commit()
    return {"message": "Session started", "session_id": session.id}

@router.get("/session-status/{course_id}")
async def get_session_status(
    course_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LiveSession).where(LiveSession.course_id == course_id, LiveSession.status == 'live')
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if session:
        # Görüşme linki yalnızca kursun öğretmenine ve kayıtlı öğrencisine gider.
        # Link burada önceden gelir ki "Derse katıl" tıklamasında sekme hemen
        # açılabilsin (await sonrası açılan sekmeyi tarayıcı engelliyor).
        from core.security import decode_access_token
        payload = decode_access_token(request.cookies.get("access_token") or _bearer(request))
        course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
        meeting_url = course.meeting_url if course and payload and await _can_see_meeting_link(db, course, payload) else None
        return {"is_live": True, "session_id": session.id, "title": session.title, "meeting_url": meeting_url}
    return {"is_live": False}

@router.post("/stop-session/{course_id}")
async def stop_session(
    course_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # Dersi kontrol et
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Aktif canlı oturumu bul
    stmt = select(LiveSession).where(LiveSession.course_id == course_id, LiveSession.status == 'live')
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Aktif canlı oturum bulunamadı")

    session.status = 'completed'
    await db.commit()
    return {"message": "Session stopped", "session_id": session.id}


# --- Canlı ders görüşme linki ---
# Görüşmeyi öğretmen kendi seçtiği platformda açar (Zoom, Meet, okulun sistemi…);
# GoMufi yalnızca linki saklar ve kursa kayıtlı öğrenciye gösterir.

class MeetingLinkRequest(BaseModel):
    url: Optional[str] = None


def normalize_meeting_url(raw: Optional[str]) -> Optional[str]:
    from urllib.parse import urlparse

    url = (raw or "").strip()
    if not url:
        return None
    if "://" not in url:
        url = f"https://{url}"
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or "." not in (parsed.hostname or "") or len(url) > 500:
        raise HTTPException(status_code=400, detail="Geçerli bir görüşme linki girin (ör. https://zoom.us/j/...).")
    return url


@router.put("/courses/{course_id}/meeting-link")
async def set_meeting_link(
    course_id: int,
    body: MeetingLinkRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    course = (await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.meeting_url = normalize_meeting_url(body.url)
    await db.commit()
    return {"url": course.meeting_url}


def _bearer(request: Request) -> Optional[str]:
    header = request.headers.get("Authorization") or ""
    return header[7:] if header.startswith("Bearer ") else None


async def _can_see_meeting_link(db: AsyncSession, course: Course, user_info: dict) -> bool:
    role = user_info.get("role")
    try:
        user_id = int(user_info.get("sub"))
    except (TypeError, ValueError):
        return role == "admin"
    if role == "teacher":
        return course.teacher_id == user_id
    if role == "student":
        return (await db.execute(
            select(Enrollment.id).where(Enrollment.course_id == course.id, Enrollment.student_id == user_id)
        )).first() is not None
    return role == "admin"


@router.get("/courses/{course_id}/meeting-link")
async def get_meeting_link(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not await _can_see_meeting_link(db, course, user_info):
        raise HTTPException(status_code=403, detail="Bu kursun görüşme linkini göremezsiniz.")
    return {"url": course.meeting_url}


class LessonContentResponse(BaseModel):
    title: Optional[str] = ""
    slides: List[Any] = []


class UpdateLessonContentRequest(BaseModel):
    title: Optional[str] = None
    slides: List[Any]


@router.get("/courses/{course_id}/lessons/{node_id}", response_model=LessonContentResponse)
async def get_lesson_content(
    course_id: int,
    node_id: str,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    # 1. Kursun varligini sorgula
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    
    # 2. Yetki kontrolu
    user_id = int(user_info["sub"])
    role = user_info.get("role")
    
    if role == "teacher":
        # Kursun sahibi mi?
        if course.teacher_id != user_id:
            raise HTTPException(status_code=403, detail="Bu kursun icerigine erisim yetkiniz yok.")
    elif role in ["student", "admin"]:
        # Kursa kayitli mi? (Admin ise her sekilde erisebilir)
        if role != "admin":
            enroll_result = await db.execute(
                select(Enrollment).where(
                    Enrollment.course_id == course_id,
                    Enrollment.student_id == user_id
                )
            )
            if not enroll_result.scalars().first():
                raise HTTPException(status_code=403, detail="Bu derse kayitli degilsiniz.")
    else:
        raise HTTPException(status_code=403, detail="Gecersiz rol.")

    # 3. Yeni tablodan icerigi sorgula
    content_result = await db.execute(
        select(LessonContent).where(
            LessonContent.course_id == course_id,
            LessonContent.node_id == node_id
        )
    )
    lesson_content = content_result.scalar_one_or_none()
    
    if lesson_content:
        return LessonContentResponse(title=lesson_content.title or "", slides=lesson_content.slides or [])
    
    # Geriye donuk uyumluluk: Eski notes kolonunu kontrol et
    legacy_notes = course.notes or []
    for note in legacy_notes:
        if isinstance(note, dict) and str(note.get("id")) == str(node_id):
            return LessonContentResponse(title=note.get("noteTitle", ""), slides=note.get("slides", []))
            
    return LessonContentResponse(title="", slides=[])


@router.put("/courses/{course_id}/lessons/{node_id}")
async def update_lesson_content(
    course_id: int,
    node_id: str,
    payload: UpdateLessonContentRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # 1. Kursun varligini ve sahibini kontrol et
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı veya bu kursun egitmeni degilsiniz.")
    
    # 2. Yeni tabloda kaydi bul veya olustur
    content_result = await db.execute(
        select(LessonContent).where(
            LessonContent.course_id == course_id,
            LessonContent.node_id == node_id
        )
    )
    lesson_content = content_result.scalar_one_or_none()
    
    try:
        if not lesson_content:
            lesson_content = LessonContent(
                course_id=course_id,
                node_id=node_id,
                title=payload.title,
                slides=payload.slides
            )
            db.add(lesson_content)
        else:
            if payload.title is not None:
                lesson_content.title = payload.title
            lesson_content.slides = payload.slides
            flag_modified(lesson_content, "slides")
        
        # 3. Geriye donuk temizlik: Eski notes kolonunda bu dugume ait veri varsa oradan kaldir
        legacy_notes = list(course.notes or [])
        cleaned_notes = [note for note in legacy_notes if isinstance(note, dict) and str(note.get("id")) != str(node_id)]
        if len(cleaned_notes) != len(legacy_notes):
            course.notes = cleaned_notes
            flag_modified(course, "notes")

        await db.commit()
        return {"success": True, "message": "Ders icerigi basariyla kaydedildi."}
    except Exception as e:
        await db.rollback()
        print(f"ERROR in update_lesson_content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/courses/{course_id}/lessons/{node_id}")
async def delete_lesson_content(
    course_id: int,
    node_id: str,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # 1. Kursun varligini ve sahibini kontrol et
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı veya bu kursun egitmeni degilsiniz.")
    
    try:
        # 2. LessonContent tablosundan sil
        content_result = await db.execute(
            select(LessonContent).where(
                LessonContent.course_id == course_id,
                LessonContent.node_id == node_id
            )
        )
        lesson_content = content_result.scalar_one_or_none()
        if lesson_content:
            await db.delete(lesson_content)

        # 3. Geriye donuk temizlik: Eski notes kolonunda varsa oradan da sil
        legacy_notes = list(course.notes or [])
        cleaned_notes = [note for note in legacy_notes if isinstance(note, dict) and str(note.get("id")) != str(node_id)]
        if len(cleaned_notes) != len(legacy_notes):
            course.notes = cleaned_notes
            flag_modified(course, "notes")

        await db.commit()
        return {"success": True, "message": "Ders icerigi basariyla silindi."}
    except Exception as e:
        await db.rollback()
        print(f"ERROR in delete_lesson_content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# --- Roadmap Export/Import with Deep Widget Property Normalization ---

DEFAULT_STYLE = {
    "bold": None,
    "italic": None,
    "underline": None,
    "color": None,
    "fontSize": None,
    "fontFamily": None,
    "backgroundColor": None,
    "textAlign": None,
    "verticalAlign": None,
    "borderRadius": None,
    "borderColor": None,
    "borderWidth": None,
    "borderPosition": None,
    "opacity": None
}

DEFAULT_CODE_CONFIG = {
    "language": None,
    # Görünüm kipi (editor/terminal). Bu anahtar listede yoksa
    # normalize_code_config onu SESSİZCE düşürür: öğretmenin terminal seçimi
    # kaydedince kaybolur ve blok yeniden kod editörü olarak açılır.
    "mode": None,
    "expectedOutput": None,
    "hint": None,
    "runnable": None,
    "theme": None,
    "enableAutocomplete": None
}

DEFAULT_ARROW_CONFIG = {
    "start": None,
    "end": None,
    "startConnectedElementId": None,
    "endConnectedElementId": None,
    "startSide": None,
    "endSide": None,
    "customChannel": None,
    "customStartOffset": None,
    "customEndOffset": None,
    "arrowStyle": None
}

DEFAULT_ELEMENT = {
    "id": None,
    "type": None,
    "shapeType": None,
    "x": None,
    "y": None,
    "width": None,
    "height": None,
    "rotation": None,
    "content": None,
    "src": None,
    "imageUrl": None,
    "videoUrl": None,
    "style": None,
    "extra": None,
    "codeConfig": None,
    "arrowConfig": None
}

DEFAULT_SLIDE = {
    "id": None,
    "type": "normal",
    "gameType": None,
    "gameConfig": None,
    # Bunlar listede olmadan dışa aktarılan bir yol haritası UYGULA/BİRLEŞTİR/ÜRET
    # görevlerini, ödevleri ve grid yerleşimlerini KAYBEDİYORDU: normalize_slide
    # yalnızca buradaki anahtarları kopyalıyor, gerisini sessizce düşürüyor.
    "challengeConfig": None,
    "connectConfig": None,
    "produceConfig": None,
    "homeworkConfig": None,
    "layout": None,
    "elements": [],
    "connections": None,
    "background": "default",
    "backgroundColor": None
}


def normalize_style(style_dict):
    if not isinstance(style_dict, dict):
        return {k: None for k in DEFAULT_STYLE.keys()}
    return {k: style_dict.get(k) for k in DEFAULT_STYLE.keys()}


def normalize_code_config(cfg):
    if not isinstance(cfg, dict):
        return {k: None for k in DEFAULT_CODE_CONFIG.keys()}
    return {k: cfg.get(k) for k in DEFAULT_CODE_CONFIG.keys()}


def normalize_arrow_config(cfg):
    if not isinstance(cfg, dict):
        return {k: None for k in DEFAULT_ARROW_CONFIG.keys()}
    normalized = {}
    for k in DEFAULT_ARROW_CONFIG.keys():
        val = cfg.get(k)
        if k in ("start", "end"):
            if isinstance(val, dict):
                normalized[k] = {"x": val.get("x"), "y": val.get("y")}
            else:
                normalized[k] = {"x": None, "y": None}
        else:
            normalized[k] = val
    return normalized


def normalize_element(el):
    if not isinstance(el, dict):
        return {}
    normalized = {}
    for k in DEFAULT_ELEMENT.keys():
        if k == "style":
            normalized[k] = normalize_style(el.get("style"))
        elif k == "codeConfig":
            normalized[k] = normalize_code_config(el.get("codeConfig"))
        elif k == "arrowConfig":
            normalized[k] = normalize_arrow_config(el.get("arrowConfig"))
        else:
            normalized[k] = el.get(k)
    return normalized


def normalize_slide(slide):
    if not isinstance(slide, dict):
        return {}
    normalized = {}
    for k in DEFAULT_SLIDE.keys():
        if k == "elements":
            elements = slide.get("elements") or []
            normalized[k] = [normalize_element(el) for el in elements]
        elif k == "connections":
            conns = slide.get("connections")
            if isinstance(conns, list):
                normalized[k] = conns
            else:
                normalized[k] = None
        else:
            normalized[k] = slide.get(k)
    return normalized


class ImportRoadmapRequest(BaseModel):
    curriculum: Any
    lesson_contents: List[Any]
    notes: List[Any]
    quizzes: List[Any]


@router.get("/courses/{course_id}/export_roadmap")
async def export_roadmap(
    course_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # Verify course ownership
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="Kurs bulunamadı veya bu kursun eğitmeni değilsiniz."
        )

    # Fetch all LessonContent for this course
    lessons_result = await db.execute(
        select(LessonContent).where(LessonContent.course_id == course_id)
    )
    lessons = lessons_result.scalars().all()

    # Fetch all Quiz for this course
    quizzes_result = await db.execute(
        select(Quiz).where(Quiz.course_id == course_id)
    )
    quizzes = quizzes_result.scalars().all()

    # Normalize slides inside notes
    raw_notes = course.notes or []
    normalized_notes = []
    for note in raw_notes:
        raw_slides = note.get("slides") or []
        normalized_slides = [normalize_slide(s) for s in raw_slides]
        normalized_notes.append({
            "id": note.get("id"),
            "noteTitle": note.get("noteTitle", ""),
            "slides": normalized_slides
        })

    # Serialize quizzes
    quizzes_data = []
    for q in quizzes:
        quizzes_data.append(q.to_dict())

    # Ders içerikleri (UYGULA/BİRLEŞTİR/ÜRET görevleri dahil). Bu liste eskiden hiç
    # oluşturulmuyordu; uç her çağrıda tanımsız değişken hatasıyla düşüyordu.
    lesson_contents_data = [{
        "node_id": l.node_id,
        "title": l.title or "",
        "slides": [normalize_slide(s) for s in (l.slides or [])],
    } for l in lessons]

    return {
        "success": True,
        "course_title": course.title,
        "curriculum": course.curriculum or [],
        "lesson_contents": lesson_contents_data,
        "notes": normalized_notes,
        "quizzes": quizzes_data
    }


@router.post("/courses/{course_id}/import_roadmap")
async def import_roadmap(
    course_id: int,
    payload: ImportRoadmapRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    # Verify course ownership
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="Kurs bulunamadı veya bu kursun eğitmeni değilsiniz."
        )

    if not payload.curriculum or len(payload.curriculum) == 0:
        raise HTTPException(
            status_code=400,
            detail="Müfredat boş olamaz. En az bir ders (bölüm) eklenmelidir."
        )

    try:
        # Update course curriculum
        course.curriculum = payload.curriculum
        flag_modified(course, "curriculum")

        # Delete existing LessonContent and Quiz
        await db.execute(
            delete(LessonContent).where(LessonContent.course_id == course_id)
        )
        await db.execute(
            delete(Quiz).where(Quiz.course_id == course_id)
        )

        # Insert new LessonContent
        for l in payload.lesson_contents:
            new_lesson = LessonContent(
                course_id=course_id,
                node_id=l.get("node_id"),
                title=l.get("title", ""),
                slides=l.get("slides", [])
            )
            db.add(new_lesson)

        # Insert new Quiz
        for q in payload.quizzes:
            new_quiz = Quiz(
                course_id=course_id,
                section_id=q.get("section_id"),
                node_id=q.get("node_id"),
                topic=q.get("topic", "Genel"),
                difficulty=q.get("difficulty", "Orta"),
                question_text=q.get("question_text") or q.get("text") or "",
                options=q.get("options"),
                correct_answer=q.get("correct_answer") or q.get("correctAnswer") or "",
                explanation=q.get("explanation"),
                question_type=q.get("type") or q.get("question_type") or "multiple-choice"
            )
            db.add(new_quiz)

        await db.commit()
        return {"success": True, "message": "Yol haritası ve içerikleri başarıyla yüklendi."}

    except Exception as e:
        await db.rollback()
        print(f"ERROR in import_roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Yol haritası yüklenemedi: {str(e)}")


# --- kopyalama: yeni dönem / ikinci şube için kursu ya da modülleri yeniden kurmamak ----------

def _fresh_slide_ids(slides: List[Any]) -> List[Any]:
    """Kopyalanan slaytlara yeni kimlik: aynı kursta iki slayt aynı görev anahtarını paylaşmasın."""
    import copy as _copy
    out = []
    for slide in slides or []:
        if isinstance(slide, dict):
            slide = _copy.deepcopy(slide)
            slide["id"] = random.randint(10**12, 10**13 - 1)
        out.append(slide)
    return out


def _curriculum_without_dates(curriculum: List[Any]) -> List[Any]:
    """Yeni dönemin takvimi eskisinden taşınmaz: canlı ders tarihleri boşaltılır."""
    import copy as _copy
    out = []
    for node in curriculum or []:
        node = _copy.deepcopy(node)
        if isinstance(node, dict) and node.get("type") == "live_sessions_config":
            node["sessions"] = []
        out.append(node)
    return out


class DuplicateCourseRequest(BaseModel):
    title: Optional[str] = None


async def clone_course(db: AsyncSession, src: Course, teacher_id: int, title: str) -> Course:
    """Kursun içerik kopyası (müfredat, ders içerikleri, quizler) — öğrenci, şube, teslim
    ve tarih KOPYALANMAZ. Commit etmez. Kurumdan ayrılan öğretmenin kurslarını kurumda
    bırakmak için de kullanılır (routers/organizations.py)."""
    import copy as _copy

    new = Course(
        teacher_id=teacher_id,
        title=title,
        description=src.description, category=src.category, progress=0,
        learning_outcomes=_copy.deepcopy(src.learning_outcomes or []),
        requirements=_copy.deepcopy(src.requirements or []),
        curriculum=_curriculum_without_dates(src.curriculum or []),
        notes=_copy.deepcopy(src.notes or []),
        rating=src.rating, status="active", schedule=[],
        enrollment_code=await generate_enrollment_code(db),
        classes=[], start_date=None,
    )
    await classroom.ensure_classes(db, new)          # yeni kurs "Genel" şubesi ve yeni kodla başlar
    db.add(new)
    await db.flush()
    for content in (await db.execute(
        select(LessonContent).where(LessonContent.course_id == src.id)
    )).scalars().all():
        db.add(LessonContent(course_id=new.id, node_id=content.node_id, title=content.title,
                             slides=_copy.deepcopy(content.slides or [])))
    for q in (await db.execute(select(Quiz).where(Quiz.course_id == src.id))).scalars().all():
        db.add(Quiz(course_id=new.id, section_id=q.section_id, node_id=q.node_id, topic=q.topic,
                    difficulty=q.difficulty, question_text=q.question_text, options=_copy.deepcopy(q.options),
                    correct_answer=q.correct_answer, explanation=q.explanation, question_type=q.question_type))
    return new


@router.post("/courses/{course_id}/duplicate", response_model=TeacherCourseResponse)
async def duplicate_course(
    course_id: int,
    payload: DuplicateCourseRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """Kursun kopyası: müfredat, ders içerikleri ve quizler. Öğrenciler, şubeler,
    teslimler ve canlı ders tarihleri KOPYALANMAZ — yeni dönem temiz başlar."""
    src = (await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı veya bu kursun eğitmeni değilsiniz.")
    new = await clone_course(db, src, teacher_id, (payload.title or "").strip()[:200] or f"{src.title} (kopya)")
    await db.commit()
    result = await db.execute(select(Course).where(Course.id == new.id).options(joinedload(Course.teacher)))
    new = result.scalar_one()
    new.students_count = 0
    return new


class CopyModulesRequest(BaseModel):
    target_course_id: int
    node_ids: List[str]


@router.post("/courses/{course_id}/copy-modules")
async def copy_modules(
    course_id: int,
    payload: CopyModulesRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """Seçilen modülleri (slaytları ve quizleriyle) başka bir kursun sonuna ekler.

    Hedefte aynı kimlikte modül varsa yeni kimlik verilir; slaytlar her zaman
    yeni kimlik alır — görev anahtarları kurs içinde benzersiz kalsın.
    """
    import copy as _copy
    src = (await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )).scalar_one_or_none()
    target = (await db.execute(
        select(Course).where(Course.id == payload.target_course_id, Course.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if not src or not target:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı veya bu kursun eğitmeni değilsiniz.")
    wanted = [str(n) for n in payload.node_ids]
    nodes = [n for n in (src.curriculum or []) if isinstance(n, dict) and str(n.get("id")) in wanted
             and n.get("type") != "live_sessions_config"]
    if not nodes:
        raise HTTPException(status_code=400, detail="Kopyalanacak modül seçilmedi.")

    target_curriculum = list(target.curriculum or [])
    taken = {str(n.get("id")) for n in target_curriculum if isinstance(n, dict)}
    contents = {c.node_id: c for c in (await db.execute(
        select(LessonContent).where(LessonContent.course_id == course_id)
    )).scalars().all()}
    legacy_notes = {str(n.get("id")): n for n in (src.notes or []) if isinstance(n, dict)}
    target_notes = list(target.notes or [])
    quizzes = (await db.execute(select(Quiz).where(Quiz.course_id == course_id))).scalars().all()

    copied = []
    for node in nodes:
        old_id = str(node.get("id"))
        new_id = old_id if old_id not in taken else f"{old_id}_k{random.randint(1000, 9999)}"
        taken.add(new_id)
        new_node = _copy.deepcopy(node)
        new_node["id"] = node["id"] if new_id == old_id else new_id
        target_curriculum.append(new_node)
        if old_id in contents:
            c = contents[old_id]
            db.add(LessonContent(course_id=target.id, node_id=new_id, title=c.title,
                                 slides=_fresh_slide_ids(c.slides or [])))
        elif old_id in legacy_notes:
            note = _copy.deepcopy(legacy_notes[old_id])
            note["id"] = new_id
            note["slides"] = _fresh_slide_ids(note.get("slides") or [])
            target_notes.append(note)
        for q in quizzes:
            if str(q.section_id) == old_id:
                db.add(Quiz(course_id=target.id, section_id=new_id, node_id=q.node_id, topic=q.topic,
                            difficulty=q.difficulty, question_text=q.question_text,
                            options=_copy.deepcopy(q.options), correct_answer=q.correct_answer,
                            explanation=q.explanation, question_type=q.question_type))
        copied.append({"from": old_id, "to": new_id, "title": node.get("title")})

    target.curriculum = target_curriculum
    flag_modified(target, "curriculum")
    if target_notes != list(target.notes or []):
        target.notes = target_notes
        flag_modified(target, "notes")
    await db.commit()
    learning_store._CONTEXT_CACHE.pop(target.id, None)
    return {"copied": copied, "target_course_id": target.id}


class JoinClassRequest(BaseModel):
    code: str


@router.post("/class/join")
async def join_class(
    payload: JoinClassRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    return await _join_with_code(db, user_info, payload.code)


async def _join_with_code(db: AsyncSession, user_info: dict, code: str):
    """Tek katılım yolu: kod → şube. Öğrenci kursa kaydolur ve o şubeye girer
    (başka şubedeyse oradan çıkar). Eski kurs kodu tek şubeli kursta çalışır."""
    if user_info["role"] not in ["student", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sadece öğrenciler sınıfa katılabilir.")
    student_id = int(user_info["sub"])
    course, target_class, error = await classroom.find_by_code(db, code)
    if error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)

    enrolled = (await db.execute(
        select(Enrollment).where(Enrollment.student_id == student_id, Enrollment.course_id == course.id)
    )).scalar_one_or_none()
    if not enrolled:
        await plans.ensure_student_capacity(db, course, student_id)
        db.add(Enrollment(student_id=student_id, course_id=course.id))
    already = student_id in classroom.class_student_ids(target_class)
    classroom.place_student(course, target_class, student_id)
    await db.commit()
    learning_store._CONTEXT_CACHE.pop(course.id, None)
    name = target_class.get("name") or "Şube"
    return {
        "success": True,
        "message": f"Zaten '{name}' sınıfındasın." if enrolled and already else f"'{name}' sınıfına katıldın!",
        "course_id": course.id,
        "course_title": course.title,
        "class_name": name,
    }


@router.get("/student/homework-status")
async def my_homework_status(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrencinin tüm kurslarındaki ödev teslimleri — ana sayfadaki "Ödevlerim"
    kartı ve bildirimler için tek istekte. Dosya içeriği ve geri bildirim metni
    DÖNMEZ (liste için gereksiz, ayrıntı `/homework/{id}/submission`da)."""
    if user_info.get("role") not in ("student", "admin"):  # yönetici: öğrenci paneli önizlemesi
        return {"items": []}
    student_id = int(user_info["sub"])
    rows = (await db.execute(
        select(
            HomeworkSubmission.course_id, HomeworkSubmission.node_id, HomeworkSubmission.submitted_at,
            HomeworkSubmission.grade, HomeworkSubmission.graded_at,
        ).join(Enrollment, (Enrollment.course_id == HomeworkSubmission.course_id)
               & (Enrollment.student_id == HomeworkSubmission.student_id))
        .where(HomeworkSubmission.student_id == student_id)
    )).all()
    iso = lambda d: f"{d.isoformat()}Z" if d else None  # noqa: E731 — sunucu saatleri UTC
    return {"items": [{
        "course_id": r.course_id, "node_id": r.node_id,
        "submitted_at": iso(r.submitted_at), "grade": r.grade, "graded_at": iso(r.graded_at),
    } for r in rows]}


@router.get("/student/my-class/{course_id}")
async def get_student_class(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    student_id = int(user_info["sub"])
    role = user_info["role"]
    if role not in ["student", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sadece öğrenciler veya yöneticiler sınıf detaylarını görebilir.")
        
    stmt = select(Course).where(Course.id == course_id)
    result = await db.execute(stmt)
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
        
    student_class = None
    classes_list = course.classes or []
    student_id_str = str(student_id)
    for cls in classes_list:
        student_ids = cls.get("student_ids") or []
        if any(str(sid) == student_id_str for sid in student_ids):
            student_class = cls
            break
            
    if not student_class:
        return {"class_name": None, "classmates": []}
        
    classmate_ids = student_class.get("student_ids") or []
    classmate_ids_ints = []
    for cid in classmate_ids:
        try:
            classmate_ids_ints.append(int(cid))
        except (ValueError, TypeError):
            pass
            
    classmates_list = []
    if classmate_ids_ints:
        students_stmt = select(Student).where(Student.id.in_(classmate_ids_ints))
        students_result = await db.execute(students_stmt)
        students = students_result.scalars().all()
        
        for s in students:
            avatar_seed = s.id * 111 + 456
            status_val = "online" if (s.id == student_id) else ("offline" if s.id % 2 == 0 else "online")
            classmates_list.append({
                "id": s.id,
                "name": f"{s.first_name} {s.last_name or ''}".strip(),
                "status": status_val,
                "avatarSeed": avatar_seed,
                "email": s.email
            })
            
    return {
        "class_name": student_class.get("name"),
        "classmates": classmates_list
    }


# ─────────────────────────────────────────────────────────────────────────────
# HOMEWORK SUBMISSION ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

async def homework_rules_for(db: AsyncSession, course_id: int, node_id: str) -> Dict[str, Any]:
    """Teslimin kuralları (bkz. homework_rules): son tarih, geç teslim, puanlama anahtarı."""
    ctx = await learning_store.course_context(db, course_id)
    task = ctx.resolve_task(str(node_id)) if ctx else None
    slide = task["slide"] if task else {}
    return {
        "due": slide.get("due"),
        "allow_late": slide.get("allow_late", True),
        "rubric": slide.get("rubric"),
        "title": slide.get("title"),
    }


async def _archive_submission(db: AsyncSession, sub: HomeworkSubmission, reason: str) -> None:
    """Teslimin o anki hâlini (dosya + not + geri bildirim) geçmişe yazar.

    Yeniden teslimde ve silmede çağrılır: "ilk sürüm 55, düzeltilmiş hâli 80"
    gelişimi ve öğretmenin eski geri bildirimi kaybolmasın.
    """
    count = (await db.execute(
        select(func.count(HomeworkSubmissionVersion.id)).where(
            HomeworkSubmissionVersion.course_id == sub.course_id,
            HomeworkSubmissionVersion.node_id == sub.node_id,
            HomeworkSubmissionVersion.student_id == sub.student_id,
        )
    )).scalar() or 0
    db.add(HomeworkSubmissionVersion(
        course_id=sub.course_id, node_id=sub.node_id, student_id=sub.student_id,
        version=int(count) + 1, file_name=sub.file_name, file_data=sub.file_data,
        file_mime=sub.file_mime, student_note=sub.student_note, submitted_at=sub.submitted_at,
        grade=sub.grade, feedback=sub.feedback, graded_at=sub.graded_at,
        graded_source=sub.graded_source, rubric_scores=getattr(sub, "rubric_scores", None),
        reason=reason,
    ))


async def _version_counts(db: AsyncSession, course_id: int, node_id: Optional[str] = None) -> Dict[tuple, int]:
    query = select(
        HomeworkSubmissionVersion.node_id, HomeworkSubmissionVersion.student_id,
        func.count(HomeworkSubmissionVersion.id),
    ).where(HomeworkSubmissionVersion.course_id == course_id)
    if node_id is not None:
        query = query.where(HomeworkSubmissionVersion.node_id == node_id)
    rows = (await db.execute(query.group_by(
        HomeworkSubmissionVersion.node_id, HomeworkSubmissionVersion.student_id))).all()
    return {(n, sid): int(c) for n, sid, c in rows}


def _rules_out(rules: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": rules.get("title"),
        "due_at": homework_rules.due_iso(rules.get("due")),
        "allow_late": rules.get("allow_late", True),
        "rubric": rules.get("rubric"),
    }


@router.post("/courses/{course_id}/homework/{node_id}/submit")
async def submit_homework(
    course_id: int,
    node_id: str,
    file: UploadFile = File(...),
    student_note: Optional[str] = Form(None),
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrencinin ödevi dosya olarak göndermesi."""
    student_id = user["sub"]
    role = user.get("role", "")
    if role not in ("student", "admin"):
        raise HTTPException(status_code=403, detail="Sadece öğrenciler ödev gönderebilir.")

    # Enrollment kontrolü
    enrollment = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == int(student_id)
        )
    )
    if not enrollment.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu kursa kayıtlı değilsiniz.")

    MAX_SIZE = 5 * 1024 * 1024  # 5 MB limit
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Dosya boyutu 5 MB'ı aşamaz.")

    file_data_b64 = base64.b64encode(contents).decode("utf-8")

    # Son teslim tarihi: öğretmen geç teslime izin vermediyse reddedilir,
    # izin verdiyse teslim "geç" işaretlenir.
    rules = await homework_rules_for(db, course_id, node_id)
    now = datetime.utcnow()
    late = homework_rules.is_late(now, rules["due"])
    if late and not rules["allow_late"]:
        raise HTTPException(status_code=403, detail="Son teslim tarihi geçti; öğretmenin geç teslime izin vermiyor.")

    # Daha önce gönderilmişse güncelle
    existing = await db.execute(
        select(HomeworkSubmission).where(
            HomeworkSubmission.course_id == course_id,
            HomeworkSubmission.node_id == node_id,
            HomeworkSubmission.student_id == int(student_id),
        )
    )
    sub = existing.scalar_one_or_none()
    if sub:
        # Eski hâl geçmişe: öğretmenin önceki notu ve geri bildirimi kaybolmasın.
        await _archive_submission(db, sub, "resubmitted")
        sub.file_name = file.filename or "dosya"
        sub.file_data = file_data_b64
        sub.file_mime = file.content_type
        sub.student_note = student_note
        # Teslim zamanı yeni cevabın zamanı (eskiden ilk teslimde kalıyordu).
        sub.submitted_at = now
        sub.rubric_scores = None
        # İçerik değişti: eski değerlendirme ARTIK BU CEVABA AİT DEĞİL.
        # Silinmezse öğrenci yeni cevabına eski notu görür, öğretmen listesinde de
        # "değerlendirildi" görünüp yeniden bakılması gerektiği kaçar.
        sub.grade = None
        sub.feedback = None
        sub.graded_at = None
        sub.graded_by = None
        sub.graded_source = None
    else:
        sub = HomeworkSubmission(
            course_id=course_id,
            node_id=node_id,
            student_id=int(student_id),
            file_name=file.filename or "dosya",
            file_data=file_data_b64,
            file_mime=file.content_type,
            student_note=student_note,
            submitted_at=now,
        )
        db.add(sub)

    if role == "student":
        await streak.record(db, int(student_id), homework=1)
    await db.commit()
    # Öğrenme kaydı: görev/ödev teslim edildi (kavram kanıtı değil, ilerleme).
    await learning_store.safe_record_event(course_id, int(student_id), {
        "type": "submitted", "task_key": node_id, "client": "server",
    })
    return {
        "success": True,
        "message": "Ödev geç teslim edildi." if late else "Ödev başarıyla gönderildi.",
        "late": late,
        "due_at": homework_rules.due_iso(rules["due"]),
    }


@router.get("/courses/{course_id}/homework/{node_id}/submissions")
async def get_homework_submissions(
    course_id: int,
    node_id: str,
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Eğitmenin belirli bir ödevin tüm gönderilerini görmesi."""
    teacher_id = user["sub"]
    role = user.get("role", "")
    if role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Sadece eğitmenler görebilir.")

    # Ownership kontrolü
    course_res = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == int(teacher_id))
    )
    if not course_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    result = await db.execute(
        select(HomeworkSubmission, Student.first_name, Student.last_name, Student.email)
        .join(Student, HomeworkSubmission.student_id == Student.id)
        .where(
            HomeworkSubmission.course_id == course_id,
            HomeworkSubmission.node_id == node_id,
        )
        .order_by(HomeworkSubmission.submitted_at.desc())
    )
    rows = result.all()
    rules = await homework_rules_for(db, course_id, node_id)
    versions = await _version_counts(db, course_id, node_id)

    submissions = []
    for sub, first, last, email in rows:
        submissions.append({
            "id": sub.id,
            "late": homework_rules.is_late(sub.submitted_at, rules["due"]),
            "versions": versions.get((sub.node_id, sub.student_id), 0),
            "rubric_scores": sub.rubric_scores,
            "student_id": sub.student_id,
            "student_name": f"{first} {last or ''}".strip(),
            "student_email": email,
            "file_name": sub.file_name,
            "file_mime": sub.file_mime,
            "file_data": sub.file_data,   # base64
            "student_note": sub.student_note,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            # Değerlendirme. "Değerlendirildi mi" sorusunun tek kaynağı graded_at:
            # 0 geçerli bir nottur, grade'in dolu olmasına bakmak yanıltıcı olur.
            "grade": sub.grade,
            "feedback": sub.feedback,
            "graded_at": sub.graded_at.isoformat() if sub.graded_at else None,
            "graded_source": sub.graded_source,
        })

    return {"submissions": submissions, "count": len(submissions), **_rules_out(rules)}


# Görev slaytlarının teslim anahtarı "<tip>:<slayt id>" (bkz. LessonSlide.tsx).
# Tip → (aşama adı, yapılandırma alanı).
_TASK_SLIDE_KINDS = {
    "challenge": ("Uygula", "challengeConfig"),
    "connect": ("Birleştir", "connectConfig"),
    "produce": ("Üret", "produceConfig"),
}


def task_slide_titles(lessons: List[tuple]) -> Dict[str, str]:
    """Görev slaytlarının teslim anahtarını okunur başlığa çevirir.

    Eğitmenin teslim listesinde "challenge:83749121" gibi ham bir kimlik
    görünüyordu; hangi dersin hangi görevi olduğu anlaşılmıyordu. `lessons`,
    (ders başlığı, slayt listesi) çiftleri.
    """
    titles: Dict[str, str] = {}
    for lesson_title, slides in lessons:
        for slide in slides or []:
            if not isinstance(slide, dict):
                continue
            kind = slide.get("type")
            if kind not in _TASK_SLIDE_KINDS:
                continue
            stage, cfg_key = _TASK_SLIDE_KINDS[kind]
            cfg = slide.get(cfg_key) or slide.get("challengeConfig") or {}
            task = (cfg.get("projectTitle") if kind == "produce" else None) or cfg.get("title") or "Görev"
            prefix = f"{lesson_title} · " if lesson_title else ""
            titles[f"{kind}:{slide.get('id')}"] = f"{prefix}{stage}: {task}"
    return titles


@router.get("/courses/{course_id}/homework/all-submissions")
async def get_all_homework_submissions(
    course_id: int,
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Eğitmenin bir kursa ait TÜM ödev gönderilerini (tüm node'lar) görmesi."""
    teacher_id = user["sub"]
    role = user.get("role", "")
    if role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Sadece eğitmenler görebilir.")

    course_res = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == int(teacher_id))
    )
    course = course_res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    # Notes alanından ders/node başlıklarını haritalandır
    node_titles = {}
    lesson_slides: List[tuple] = []
    if course.notes:
        try:
            notes_list = course.notes
            if isinstance(notes_list, str):
                notes_list = json.loads(notes_list)
            for note in notes_list:
                n_id = str(note.get("id"))
                n_title = note.get("lessonTopic") or note.get("title") or f"Ders {n_id}"
                node_titles[n_id] = n_title
                lesson_slides.append((note.get("noteTitle") or n_title, note.get("slides")))
        except Exception as e:
            print("Error parsing course notes:", e)

    # Görev slaytları (Uygula/Birleştir/Üret) dersin kendi tablosunda duruyor.
    contents = await db.execute(
        select(LessonContent.title, LessonContent.slides).where(LessonContent.course_id == course_id)
    )
    lesson_slides.extend((title, slides) for title, slides in contents.all())
    node_titles.update(task_slide_titles(lesson_slides))

    result = await db.execute(
        select(HomeworkSubmission, Student.first_name, Student.last_name, Student.email)
        .join(Student, HomeworkSubmission.student_id == Student.id)
        .where(HomeworkSubmission.course_id == course_id)
        .order_by(HomeworkSubmission.submitted_at.desc())
    )
    rows = result.all()

    versions = await _version_counts(db, course_id)
    rules_by_node: Dict[str, Dict[str, Any]] = {}
    for node in {str(sub.node_id) for sub, *_ in rows}:
        rules_by_node[node] = await homework_rules_for(db, course_id, node)

    seen = set()
    submissions = []
    for sub, first, last, email in rows:
        # Her öğrencinin her düğüm için sadece EN SON gönderdiği ödevi listele
        key = (sub.student_id, sub.node_id)
        if key in seen:
            continue
        seen.add(key)

        node_title = node_titles.get(str(sub.node_id)) or f"Ödev (Ders ID: {sub.node_id})"

        rules = rules_by_node.get(str(sub.node_id), {})
        submissions.append({
            "id": sub.id,
            "late": homework_rules.is_late(sub.submitted_at, rules.get("due")),
            "versions": versions.get((sub.node_id, sub.student_id), 0),
            "rubric_scores": sub.rubric_scores,
            "node_id": sub.node_id,
            "node_title": node_title,
            "student_id": sub.student_id,
            "student_name": f"{first} {last or ''}".strip(),
            "student_email": email,
            "file_name": sub.file_name,
            "file_mime": sub.file_mime,
            "file_data": sub.file_data,
            "student_note": sub.student_note,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            # Değerlendirme. "Değerlendirildi mi" sorusunun tek kaynağı graded_at:
            # 0 geçerli bir nottur, grade'in dolu olmasına bakmak yanıltıcı olur.
            "grade": sub.grade,
            "feedback": sub.feedback,
            "graded_at": sub.graded_at.isoformat() if sub.graded_at else None,
            "graded_source": sub.graded_source,
        })

    return {
        "submissions": submissions,
        "count": len(submissions),
        # Düğüm başına kurallar: son tarih ve puanlama anahtarı (değerlendirme ekranı kullanır).
        "tasks": {node: _rules_out(rules) for node, rules in rules_by_node.items()},
    }


@router.get("/courses/{course_id}/homework/submissions/{submission_id}/versions")
async def homework_submission_versions(
    course_id: int,
    submission_id: int,
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Bir teslimin önceki sürümleri (en yeni önce) — öğretmen gelişimi görür."""
    if user.get("role") not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Sadece eğitmenler görebilir.")
    course_res = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == int(user["sub"]))
    )
    if not course_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    sub = (await db.execute(
        select(HomeworkSubmission).where(
            HomeworkSubmission.id == submission_id, HomeworkSubmission.course_id == course_id)
    )).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı.")
    rows = (await db.execute(
        select(HomeworkSubmissionVersion).where(
            HomeworkSubmissionVersion.course_id == course_id,
            HomeworkSubmissionVersion.node_id == sub.node_id,
            HomeworkSubmissionVersion.student_id == sub.student_id,
        ).order_by(HomeworkSubmissionVersion.version.desc())
    )).scalars().all()
    return {"versions": [{
        "version": v.version, "reason": v.reason,
        "file_name": v.file_name, "file_mime": v.file_mime, "file_data": v.file_data,
        "student_note": v.student_note,
        "submitted_at": v.submitted_at.isoformat() if v.submitted_at else None,
        "grade": v.grade, "feedback": v.feedback,
        "graded_at": v.graded_at.isoformat() if v.graded_at else None,
        "rubric_scores": v.rubric_scores,
    } for v in rows]}


class GradeHomeworkRequest(BaseModel):
    grade: Optional[int] = None      # 0-100; None = yalnızca yazılı geri bildirim
    feedback: Optional[str] = None
    # "teacher" (hoca kendi yazdı) veya "ai_assisted" (AI taslağını hoca onayladı).
    # İleride free/paid ayrımında hangi yolun kullanıldığı geriye dönük görülebilsin.
    source: str = "teacher"
    # Dereceli puanlama anahtarıyla: {"<ölçüt id>": <seviye sırası>}. Not boşsa bundan hesaplanır.
    rubric_scores: Optional[Dict[str, Any]] = None


@router.put("/courses/{course_id}/homework/submissions/{submission_id}/grade")
async def grade_homework_submission(
    course_id: int,
    submission_id: int,
    payload: GradeHomeworkRequest,
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Eğitmenin bir ödev gönderisine not ve geri bildirim yazması."""
    role = user.get("role", "")
    if role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Sadece eğitmenler değerlendirebilir.")

    # Kurs sahipliği: başka bir hocanın kursundaki ödeve not verilemesin.
    course_res = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == int(user["sub"]))
    )
    if not course_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    sub_res = await db.execute(
        select(HomeworkSubmission).where(
            HomeworkSubmission.id == submission_id,
            HomeworkSubmission.course_id == course_id,
        )
    )
    sub = sub_res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı.")

    if payload.grade is not None and not (0 <= payload.grade <= 100):
        raise HTTPException(status_code=400, detail="Not 0 ile 100 arasında olmalıdır.")

    grade = payload.grade
    rubric_scores = None
    if payload.rubric_scores is not None:
        rules = await homework_rules_for(db, course_id, str(getattr(sub, "node_id", "")))
        if rules["rubric"]:
            computed, rubric_scores = homework_rules.rubric_grade(rules["rubric"], payload.rubric_scores)
            if grade is None:
                grade = computed

    feedback = (payload.feedback or "").strip()
    if grade is None and not feedback:
        raise HTTPException(
            status_code=400,
            detail="Değerlendirme için en az bir not veya geri bildirim girin.",
        )

    sub.grade = grade
    sub.feedback = feedback or None
    if payload.rubric_scores is not None:
        sub.rubric_scores = rubric_scores or None
    sub.graded_at = datetime.utcnow()
    sub.graded_by = int(user["sub"])
    sub.graded_source = payload.source if payload.source in ("teacher", "ai_assisted") else "teacher"

    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Öğretmen notu en güçlü kavram kanıtı: modülün kavramlarına işlenir.
    # Analitik not vermeyi ASLA bozmamalı: eksik bilgi varsa kayıt atlanır.
    student_of_sub = getattr(sub, "student_id", None)
    node_of_sub = getattr(sub, "node_id", None)
    if sub.grade is not None and student_of_sub is not None and node_of_sub:
        await learning_store.safe_record_event(course_id, student_of_sub, {
            "type": "homework_graded", "task_key": node_of_sub, "client": "server",
            "grade": sub.grade,
            "details": {"grade": sub.grade, "source": sub.graded_source},
        })

    return {
        "success": True,
        "submission": {
            "id": sub.id,
            "grade": sub.grade,
            "feedback": sub.feedback,
            "graded_at": sub.graded_at.isoformat() if sub.graded_at else None,
            "graded_source": sub.graded_source,
            "rubric_scores": getattr(sub, "rubric_scores", None),
        },
    }


@router.get("/courses/{course_id}/homework/{node_id}/submission")
async def get_my_homework_submission(
    course_id: int,
    node_id: str,
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrencinin kendi gönderdiği ödevi görmesi — son tarih, anahtar ve önceki sürümlerle."""
    # Öğretmen ve öğrenci kimlikleri ayrı tablolardan geliyor ve çakışabilir:
    # rol bakılmazsa öğrenci önizlemesindeki öğretmen (id=5), aynı id'li
    # öğrencinin teslimini "kendi teslimi" olarak görürdü.
    if user.get("role") not in ("student", "admin"):
        return {"submitted": False, "submission": None}
    student_id = int(user["sub"])
    sub = (await db.execute(
        select(HomeworkSubmission).where(
            HomeworkSubmission.course_id == course_id,
            HomeworkSubmission.node_id == node_id,
            HomeworkSubmission.student_id == student_id,
        )
    )).scalar_one_or_none()
    rules = await homework_rules_for(db, course_id, node_id)
    # Önceki sürümler: öğrenci eski notunu ve geri bildirimini de görür (dosya içeriği hariç).
    history = [{
        "version": v.version, "reason": v.reason,
        "submitted_at": v.submitted_at.isoformat() if v.submitted_at else None,
        "grade": v.grade, "feedback": v.feedback,
        "graded_at": v.graded_at.isoformat() if v.graded_at else None,
    } for v in (await db.execute(
        select(HomeworkSubmissionVersion).where(
            HomeworkSubmissionVersion.course_id == course_id,
            HomeworkSubmissionVersion.node_id == node_id,
            HomeworkSubmissionVersion.student_id == student_id,
        ).order_by(HomeworkSubmissionVersion.version.desc())
    )).scalars().all()]
    extra = {**_rules_out(rules), "history": history}

    if not sub:
        return {"submitted": False, "submission": None, **extra}

    return {
        **extra,
        "submitted": True,
        "submission": {
            "id": sub.id,
            "file_name": sub.file_name,
            "file_mime": sub.file_mime,
            "file_data": sub.file_data,  # base64 contents
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            # Öğrenci kendi notunu ve hocanın geri bildirimini görür.
            # graded_by / graded_source öğrenciye GÖNDERİLMEZ: değerlendirmenin
            # AI destekli olup olmadığı öğrenciyi ilgilendiren bir bilgi değil.
            "grade": sub.grade,
            "feedback": sub.feedback,
            "graded_at": sub.graded_at.isoformat() if sub.graded_at else None,
            "rubric_scores": sub.rubric_scores,
            "late": homework_rules.is_late(sub.submitted_at, rules["due"]),
        }
    }


@router.delete("/courses/{course_id}/homework/{node_id}/delete")
async def delete_homework(
    course_id: int,
    node_id: str,
    user=Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrencinin gönderdiği ödevi silmesi."""
    student_id = user["sub"]
    role = user.get("role", "")
    if role not in ("student", "admin"):
        raise HTTPException(status_code=403, detail="Sadece öğrenciler ödev silebilir.")

    stmt = select(HomeworkSubmission).where(
        HomeworkSubmission.course_id == course_id,
        HomeworkSubmission.node_id == node_id,
        HomeworkSubmission.student_id == int(student_id),
    )
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Gönderilmiş ödev bulunamadı.")
        
    # Silinen teslim geçmişte kalır: öğretmenin verdiği not "teslimi silerek" kaybolmasın.
    await _archive_submission(db, sub, "withdrawn")
    await db.delete(sub)
    await db.commit()
    return {"success": True, "message": "Ödev başarıyla silindi."}
