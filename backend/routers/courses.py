import random
import string
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy import func, JSON
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, attributes
from sqlalchemy.orm.attributes import flag_modified
from models.course import Course
from models.teacher import Teacher
from models.enrollment import Enrollment
from models.lesson_content import LessonContent
from connect_db import get_db
from pydantic import BaseModel
from typing import List, Optional, Any
from auth.dependencies import get_current_user_info, get_current_teacher_id
from core.config import settings

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
    price: Optional[int] = 0
    learning_outcomes: Optional[List[str]] = []
    requirements: Optional[List[str]] = []
    curriculum: Optional[Any] = []
    notes: Optional[Any] = []
    teacher: Optional[TeacherResponse] = None
    students_count: int = 0
    rating: Optional[int] = 5
    schedule: Optional[List[Any]] = []
    enrollment_code: Optional[str] = None

    class Config:
        from_attributes = True

class TeacherCourseResponse(CourseResponse):
    """CourseResponse + enrollment_code — sadece eğitmene ait endpoint'lerde kullanılır."""
    enrollment_code: Optional[str] = None

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
    progress: int = 0
    enrolled_at: Optional[datetime] = None
    status: str = "active"



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
        return await populate_course_notes(courses, db)
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

@router.post("/enroll/{course_id}")
async def enroll_student(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    if user_info["role"] not in ["student", "admin"]:
        raise HTTPException(status_code=403, detail="Only students can enroll")

    student_id = int(user_info["sub"])

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course_id
        )
    )
    if existing.scalars().first():
        return {"message": "Already enrolled"}

    enrollment = Enrollment(student_id=student_id, course_id=course_id)
    db.add(enrollment)
    await db.commit()
    return {"message": "Enrolled successfully"}

class EnrollByCodeRequest(BaseModel):
    code: str

@router.post("/enroll-by-code")
async def enroll_by_code(
    payload: EnrollByCodeRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    if user_info["role"] not in ["student", "admin"]:
        raise HTTPException(status_code=403, detail="Sadece öğrenciler bir derse katılabilir.")

    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Kod boş olamaz.")

    result = await db.execute(select(Course).where(Course.enrollment_code == code))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Geçersiz kod. Lütfen eğitmeninizden doğru kodu alın.")

    student_id = int(user_info["sub"])
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course.id
        )
    )
    if existing.scalars().first():
        return {"message": "Zaten bu kursa kayıtlısınız.", "course_id": course.id, "course_title": course.title}

    enrollment = Enrollment(student_id=student_id, course_id=course.id)
    db.add(enrollment)
    await db.commit()
    return {"message": "Kursa başarıyla katıldınız!", "course_id": course.id, "course_title": course.title}

@router.get("/courses", response_model=List[CourseResponse])
async def read_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Course).options(joinedload(Course.teacher), joinedload(Course.enrollments))
    )
    courses = result.unique().scalars().all()
    for course in courses:
        course.students_count = len(course.enrollments)
    return courses

@router.get("/courses/{course_id}", response_model=CourseResponse)
async def read_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user_info: dict = Depends(get_current_user_info)
):
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
        course_dict["enrollment_code"] = None

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
    from models.student import Student
    
    stmt = (
        select(Enrollment, Student, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .join(Student, Student.id == Enrollment.student_id)
        .where(Course.teacher_id == teacher_id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    response = []
    for enrollment, student, course in rows:
        response.append(
            TeacherStudentResponse(
                student_id=student.id,
                first_name=student.first_name,
                last_name=student.last_name,
                email=student.email,
                course_title=course.title,
                progress=0, # İleride gerçek progress hesaplanabilir
                enrolled_at=enrollment.enrolled_at,
                status="active"
            )
        )
    return response

class CreateCourseRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    price: int = 0
    learning_outcomes: Optional[List[str]] = []
    requirements: Optional[List[str]] = []
    curriculum: Optional[Any] = []
    notes: Optional[Any] = []
    rating: Optional[int] = 5
    schedule: Optional[List[Any]] = []

class UpdateCourseRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    learning_outcomes: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    curriculum: Optional[Any] = None
    notes: Optional[Any] = None
    rating: Optional[int] = None
    schedule: Optional[List[Any]] = None

@router.post("/create_course", response_model=TeacherCourseResponse)
async def create_course(
    course_data: CreateCourseRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    print(f"DEBUG: create_course data: {course_data.dict()}")

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
            price=course_data.price,
            learning_outcomes=course_data.learning_outcomes,
            requirements=course_data.requirements,
            curriculum=course_data.curriculum,
            notes=course_data.notes if course_data.notes is not None else [],
            rating=course_data.rating if course_data.rating is not None else 5,
            schedule=course_data.schedule if course_data.schedule is not None else [],
            enrollment_code=enrollment_code
        )
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
    print(f"DEBUG: update_course data: {course_data.dict()}")
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
        if course_data.price is not None:
            course.price = course_data.price
        if course_data.learning_outcomes is not None:
            course.learning_outcomes = course_data.learning_outcomes
            flag_modified(course, "learning_outcomes")
        if course_data.requirements is not None:
            course.requirements = course_data.requirements
            flag_modified(course, "requirements")
        if course_data.curriculum is not None:
            course.curriculum = course_data.curriculum
            flag_modified(course, "curriculum")
        if course_data.notes is not None:
            course.notes = course_data.notes
            flag_modified(course, "notes")
            
        if course_data.rating is not None:
            course.rating = course_data.rating

        if course_data.schedule is not None:
            course.schedule = course_data.schedule
            flag_modified(course, "schedule")
            
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
        
    await db.delete(course)
    await db.commit()
    return {"message": "Course deleted successfully"}

@router.post("/start-session/{course_id}")
async def start_session(
    course_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    print(f"DEBUG: start_session called for course {course_id} by teacher {teacher_id}")
    # Dersi kontrol et
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        print(f"DEBUG: Course {course_id} not found for teacher {teacher_id}")
        raise HTTPException(status_code=404, detail="Course not found")

    print(f"DEBUG: Course found: {course.title}")
    # Mevcut canlı oturumu bul veya yeni oluştur
    stmt = select(LiveSession).where(LiveSession.course_id == course_id, LiveSession.status == 'live')
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        session = LiveSession(
            course_id=course_id,
            title=f"{course.title} - Canlı Oturum",
            status='live',
            type='live'
        )
        db.add(session)
        print("DEBUG: Created new live session")
    else:
        session.status = 'live'
        print("DEBUG: Reused existing live session")
    
    await db.commit()
    print("DEBUG: start_session committed")
    return {"message": "Session started", "session_id": session.id}

@router.get("/session-status/{course_id}")
async def get_session_status(
    course_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LiveSession).where(LiveSession.course_id == course_id, LiveSession.status == 'live')
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if session:
        return {"is_live": True, "session_id": session.id}
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
