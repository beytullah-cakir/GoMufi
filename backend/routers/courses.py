from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.course import Course
from connect_db import get_db

router = APIRouter()

@router.get("/courses")
async def read_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course))
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






