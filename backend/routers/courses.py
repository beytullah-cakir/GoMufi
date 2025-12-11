from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.course import Course

router = APIRouter()

@router.get("/courses")
def read_courses():
    return {"courses": ["Course 1", "Course 2", "Course 3"]}


@router.post("/create-course")
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

    return {
        "status": "course_created",
        "course_id": new_course.id,
        "title": new_course.title
    }