from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy import func, JSON, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, attributes
from sqlalchemy.orm.attributes import flag_modified
from models.course import Course
from models.teacher import Teacher
from models.enrollment import Enrollment
from models.quiz import Quiz
from models.student import Student
from connect_db import get_db
from pydantic import BaseModel
from typing import List, Optional, Any
from auth.dependencies import get_current_user_info, get_current_teacher_id
from core.config import settings

router = APIRouter()

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
    classes: Optional[List[Any]] = []
    start_date: Optional[str] = None

    class Config:
        from_attributes = True

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
        return courses
    elif role == "teacher":
        result = await db.execute(
            select(Course)
            .where(Course.teacher_id == user_id)
            .options(joinedload(Course.teacher), joinedload(Course.enrollments))
        )
        courses = result.unique().scalars().all()
        for course in courses:
            course.students_count = len(course.enrollments)
        return courses
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
async def read_course(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(joinedload(Course.teacher), joinedload(Course.enrollments))
    )
    course = result.unique().scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.students_count = len(course.enrollments)
    return course

@router.get("/teacher/content", response_model=List[CourseResponse])
async def read_my_courses(
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Course).where(Course.teacher_id == teacher_id).options(joinedload(Course.teacher), joinedload(Course.enrollments))
    )
    courses = result.unique().scalars().all()
    for course in courses:
        course.students_count = len(course.enrollments)
    return courses

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
    classes: Optional[List[Any]] = []
    start_date: Optional[str] = None

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
    classes: Optional[List[Any]] = None
    start_date: Optional[str] = None

@router.post("/create_course")
async def create_course(
    course_data: CreateCourseRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    print(f"DEBUG: create_course data: {course_data.dict()}")

    if not course_data.curriculum or len(course_data.curriculum) == 0:
        raise HTTPException(status_code=400, detail="Müfredat boş olamaz. En az bir ders (bölüm) eklenmelidir.")

    try:
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
            classes=course_data.classes if course_data.classes is not None else [],
            start_date=course_data.start_date
        )
        db.add(new_course)
        await db.commit()
        await db.refresh(new_course)
        return new_course
    except Exception as e:
        await db.rollback()
        print(f"ERROR in create_course: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update_course/{course_id}")
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
            
        if course_data.classes is not None:
            course.classes = course_data.classes
            flag_modified(course, "classes")
            
        if course_data.start_date is not None:
            course.start_date = course_data.start_date
            
        await db.commit()
        await db.refresh(course)
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
    title: Optional[str] = None,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    print(f"DEBUG: start_session called for course {course_id} by teacher {teacher_id} with title {title}")
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
            title=title if title else f"{course.title} - Canlı Oturum",
            status='live',
            type='live'
        )
        db.add(session)
        print("DEBUG: Created new live session")
    else:
        session.status = 'live'
        if title:
            session.title = title
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
        return {"is_live": True, "session_id": session.id, "title": session.title}
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

    return {
        "success": True,
        "course_title": course.title,
        "curriculum": course.curriculum or [],
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

        # Normalize and update notes
        raw_notes = payload.notes or []
        normalized_notes = []
        for note in raw_notes:
            raw_slides = note.get("slides") or []
            normalized_slides = [normalize_slide(s) for s in raw_slides]
            normalized_notes.append({
                "id": note.get("id"),
                "noteTitle": note.get("noteTitle", ""),
                "slides": normalized_slides
            })
        course.notes = normalized_notes
        flag_modified(course, "notes")

        # Delete existing Quiz
        await db.execute(
            delete(Quiz).where(Quiz.course_id == course_id)
        )

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


class JoinClassRequest(BaseModel):
    code: str


@router.post("/class/join")
async def join_class(
    payload: JoinClassRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    student_id = int(user_info["sub"])
    role = user_info["role"]
    if role not in ["student", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sadece öğrenciler veya yöneticiler sınıfa katılabilir.")
        
    code_upper = payload.code.strip().upper()
    if not code_upper:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz katılım kodu.")
        
    # Tüm kursları ve sınıflarını çek
    stmt = select(Course)
    result = await db.execute(stmt)
    courses = result.scalars().all()
    
    target_course = None
    target_class = None
    
    for course in courses:
        classes_list = course.classes or []
        for cls in classes_list:
            if cls.get("code", "").strip().upper() == code_upper:
                target_course = course
                target_class = cls
                break
        if target_course:
            break
            
    if not target_course or not target_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sınıf bulunamadı. Lütfen kodu kontrol edin.")
        
    # Öğrenciyi kursa kaydet (eğer kayıtlı değilse)
    enrollment_stmt = select(Enrollment).where(
        Enrollment.student_id == student_id,
        Enrollment.course_id == target_course.id
    )
    enrollment_result = await db.execute(enrollment_stmt)
    enrollment = enrollment_result.scalar_one_or_none()
    
    if not enrollment:
        enrollment = Enrollment(student_id=student_id, course_id=target_course.id)
        db.add(enrollment)
        
    # Öğrenciyi sınıfın student_ids listesine ekle
    student_ids = target_class.get("student_ids") or []
    student_id_str = str(student_id)
    if not any(str(sid) == student_id_str for sid in student_ids):
        student_ids.append(student_id)
        target_class["student_ids"] = student_ids
        
        # Diğer sınıflardan bu öğrenciyi çıkar (Öğrenci sadece bir sınıfta olabilir)
        for cls in target_course.classes:
            if cls["id"] != target_class["id"]:
                other_ids = cls.get("student_ids") or []
                if any(str(sid) == student_id_str for sid in other_ids):
                    cls["student_ids"] = [sid for sid in other_ids if str(sid) != student_id_str]
                    
        flag_modified(target_course, "classes")
        
    try:
        await db.commit()
        await db.refresh(target_course)
        return {
            "success": True, 
            "message": f"'{target_class.get('name')}' sınıfına başarıyla katıldınız.",
            "course_title": target_course.title,
            "class_name": target_class.get("name")
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Sınıfa katılırken bir hata oluştu: {str(e)}")


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


class GenerateRoadmapRequest(BaseModel):
    topic: str
    difficulty: str
    lessons_count: int
    audience: str


@router.post("/courses/generate_roadmap")
async def generate_roadmap_api(
    req: GenerateRoadmapRequest,
    teacher_id: int = Depends(get_current_teacher_id)
):
    import json
    import os
    import random
    import copy
    from google import genai
    from google.genai import types
    
    TEMPLATES_PATH = "slide_templates.json"
    
    try:
        # Load templates
        templates = []
        if os.path.exists(TEMPLATES_PATH):
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                templates = json.load(f)
                
        # Filter ANLA templates
        anla_templates = [t for t in templates if t.get("category") == "ANLA"]
        
        # Prepare templates info for AI
        templates_info = []
        for t in anla_templates:
            elements_info = []
            for el in t.get("elements", []):
                if el.get("type") in ["text", "code", "sticky"]:
                    elements_info.append({
                        "id": el.get("id"),
                        "type": el.get("type"),
                        "placeholder": el.get("content")
                    })
            templates_info.append({
                "id": t.get("id"),
                "title": t.get("title"),
                "description": t.get("description"),
                "elements": elements_info
            })
            
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        prompt = f"""
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to design a learning roadmap of a course and fill in the slides content for the 'UNDERSTAND' modules.

Goal: Given the course topic, difficulty, desired lesson count, target audience, and a list of available slide templates, generate a complete course roadmap.

Available Slide Templates for 'UNDERSTAND' modules:
{json.dumps(templates_info, ensure_ascii=False, indent=2)}

Requirements:
- The roadmap consists of lessons.
- Each lesson contains a list of modules.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- For each lesson, you MUST have EXACTLY one 'UNDERSTAND' module (which represents the learning phase).
- Inside that single 'UNDERSTAND' module, you MUST generate multiple slides (usually 2 to 4 slides depending on the topic depth) to teach the concepts of the lesson.
- For each slide, choose the most appropriate template from the Available Slide Templates and fill in the element contents in Turkish.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "courseTitle": "...",
  "lessons": [
    {{
      "lessonNumber": 1,
      "title": "Lesson title (Türkçe)",
      "objective": "Lesson learning objective (Türkçe)",
      "modules": [
        {{
          "type": "UNDERSTAND",
          "slides": [
            {{
              "selectedTemplateId": "template_id_here",
              "elementContents": {{
                 "element_id_1": "Generated text explanation in Turkish",
                 "element_id_2": "Generated python code or note in Turkish..."
              }}
            }},
            {{
              "selectedTemplateId": "another_template_id",
              "elementContents": {{
                 "element_id_x": "..."
              }}
            }}
          ]
        }},
        {{
          "type": "APPLY"
        }},
        {{
          "type": "QUIZ"
        }}
      ]
    }}
  ]
}}

Input:
Topic: {req.topic}
Difficulty: {req.difficulty}
Lessons Count: {req.lessons_count}
Audience: {req.audience}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        raw_text = response.text.strip()
        data = json.loads(raw_text)
        
        generated_lessons = data.get("lessons", [])
        
        curriculum = []
        notes = []
        overall_idx = 1
        
        theme_map = {
          "UNDERSTAND": "purple",
          "APPLY": "cyan",
          "CONNECT": "green",
          "CREATE": "yellow",
          "QUIZ": "quiz",
          "HOMEWORK": "homework"
        }
        
        for l_idx, les in enumerate(generated_lessons):
            modules = les.get("modules", [])
            for m_idx, mod in enumerate(modules):
                mod_type = mod.get("type", "UNDERSTAND").upper()
                mapped_theme = theme_map.get(mod_type, "purple")
                
                level_id = f"sec_ai_{int(random.random() * 1000000000)}"
                
                node = {
                  "id": level_id,
                  "title": f"Ders {overall_idx}",
                  "theme": mapped_theme,
                  "lectures": []
                }
                
                if m_idx == 0:
                  node["lessonTopic"] = les.get("title") or f"Ders Konusu {les.get('lessonNumber')}"
                  node["lessonNumber"] = les.get("lessonNumber") or (l_idx + 1)
                  
                curriculum.append(node)
                overall_idx += 1
                
                # If it's UNDERSTAND, build the slide note from chosen template(s)
                if mod_type == "UNDERSTAND":
                    slides_to_add = []
                    ai_slides = mod.get("slides") or []
                    
                    # Fallback in case Gemini returned a single dict instead of a list
                    if isinstance(ai_slides, dict):
                        ai_slides = [ai_slides]
                    elif not isinstance(ai_slides, list):
                        ai_slides = []
                        
                    for ai_slide in ai_slides:
                        sel_template_id = ai_slide.get("selectedTemplateId")
                        elem_contents = ai_slide.get("elementContents") or {}
                        
                        # Find template
                        selected_t = next((t for t in anla_templates if t.get("id") == sel_template_id), None)
                        if not selected_t and anla_templates:
                            selected_t = anla_templates[0]
                            
                        if selected_t:
                            copied_elements = []
                            for el in selected_t.get("elements", []):
                                el_copy = copy.deepcopy(el)
                                el_id = el_copy.get("id")
                                if el_id in elem_contents:
                                    el_copy["content"] = elem_contents[el_id]
                                copied_elements.append(el_copy)
                                
                            slide = {
                                "id": int(random.random() * 1000000000),
                                "elements": copied_elements,
                                "background": selected_t.get("background", "default")
                            }
                            slides_to_add.append(slide)
                            
                    if slides_to_add:
                        note = {
                            "id": level_id,
                            "noteTitle": node["title"],
                            "slides": slides_to_add
                        }
                        notes.append(note)
                        
        return {"success": True, "curriculum": curriculum, "notes": notes, "roadmap": data}
        
    except Exception as e:
        print(f"Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))



