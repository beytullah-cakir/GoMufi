from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from models.course import Course
from models.teacher import Teacher
from models.enrollment import Enrollment
from connect_db import get_db
from pydantic import BaseModel
from typing import List, Optional
import jwt
from core.config import settings

router = APIRouter()

from datetime import datetime

class TeacherResponse(BaseModel):
    first_name: str
    last_name: str

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
    teacher: Optional[TeacherResponse] = None

    class Config:
        from_attributes = True

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
            select(Course).where(Course.teacher_id == user_id).options(joinedload(Course.teacher))
        )
        return result.scalars().all()
    elif role == "student":
        stmt = (
    select(Course)
            .join(Enrollment)
            .where(Enrollment.student_id == user_id)
            .options(joinedload(Course.teacher))
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
        select(Course).options(joinedload(Course.teacher))
    )
    courses = result.scalars().all()
    return courses

@router.get("/teacher/content", response_model=List[CourseResponse])
async def read_my_courses(
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Course).where(Course.teacher_id == teacher_id).options(joinedload(Course.teacher))
    )
    courses = result.scalars().all()
    return courses

@router.post("/create_course")
async def create_course(teacher_id: int, title: str, description: str, category: str,
                        db: AsyncSession = Depends(get_db)):
    new_course = Course(
        teacher_id=teacher_id,
        title=title,
        description=description,
        category=category
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)
    return new_course






