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
