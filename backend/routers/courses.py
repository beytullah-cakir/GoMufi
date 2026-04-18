from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy import func, JSON
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, attributes
from sqlalchemy.orm.attributes import flag_modified
from models.course import Course
from models.teacher import Teacher
from models.enrollment import Enrollment
from connect_db import get_db
from pydantic import BaseModel
from typing import List, Optional, Any
import jwt
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

async def get_current_user_info(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/my-content", response_model=List[CourseResponse])
async def read_my_content(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(user_info["sub"])
    role = user_info["role"]
    
    if role == "teacher":
        result = await db.execute(
            select(Course)
            .where(Course.teacher_id == user_id)
            .options(joinedload(Course.teacher), joinedload(Course.enrollments))
        )
        courses = result.unique().scalars().all()
        for course in courses:
            course.students_count = len(course.enrollments)
        return courses
    elif role == "student":
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
    else:
        return []

@router.get("/my-schedule", response_model=List[LiveSessionResponse])
async def read_my_schedule(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(user_info["sub"])
    role = user_info["role"]
    
    if role == "student":
        # Get all live sessions for courses the student is enrolled in
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
    if user_info["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll")
    
    student_id = int(user_info["sub"])
    
    # Check if already enrolled
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

async def get_current_teacher_id(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role = payload.get("role")
        user_id = payload.get("sub")
        if role != "teacher":
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized as teacher"
            )
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")



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
            rating=course_data.rating if course_data.rating is not None else 5
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
            title=f"{course.title} - Canlı Oturum",
            status='live',
            type='live'
        )
        db.add(session)
    else:
        session.status = 'live'
    
    await db.commit()
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

