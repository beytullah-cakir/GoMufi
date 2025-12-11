from fastapi import APIRouter, Depends
from models.auth_request import StudentRegisterRequest, LoginRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.student import Student


router = APIRouter()

current_student = None


@router.post("/student/register")
async def register_user(data: StudentRegisterRequest,db:AsyncSession = Depends(get_db)):
    global current_student

    new_student = Student(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=data.password,
        nickname=data.nickname,
        grade_level=data.grade_level,
        education_level=data.education_level
    ) 

    db.add(new_student)
    await db.commit()
    current_student = new_student

    return {"status": "registered"}


@router.post("/student/login")
async def login_user(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    global current_student

    result = await db.execute(
        select(Student).where(Student.email == data.email, Student.password == data.password)
    )
    user = result.scalars().first()
    if user:
        return {"status": "logged_in", "username": user.username}
    return {"error": "Invalid credentials"}

def get_current_student():
    return current_student

