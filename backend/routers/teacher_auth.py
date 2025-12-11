from fastapi import APIRouter, Depends
from models.auth_request import LoginRequest, TeacherRegisterRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.teacher import Teacher


router = APIRouter()

current_teacher = None


@router.post("/teacher/register")
async def register_user(data: TeacherRegisterRequest,db:AsyncSession = Depends(get_db)):
    global current_teacher

    new_teacher = Teacher(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        department=data.department,
        password=data.password
    )

    db.add(new_teacher)
    await db.commit()
    current_teacher = new_teacher

    return {"status": "registered"}


@router.post("/teacher/login")
async def login_user(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    global current_teacher

    result = await db.execute(
        select(Teacher).where(Teacher.email == data.email, Teacher.password == data.password)
    )
    user = result.scalars().first()
    if user:
        return {"status": "logged_in", "username": user.username}
    return {"error": "Invalid credentials"}

def get_current_teacher():
    return current_teacher

