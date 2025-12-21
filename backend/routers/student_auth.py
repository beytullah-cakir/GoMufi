from fastapi import APIRouter, Depends, HTTPException, Response
from auth.auth_request import StudentRegisterRequest, LoginRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.security import create_access_token, hash_password
from core.security import verify_password
from connect_db import get_db
from models.student import Student


router = APIRouter()

current_student = None


@router.post("/student/register")
async def register_user(
    data: StudentRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    new_student = Student(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        nickname=data.nickname,
        grade_level=data.grade_level,
        education_level=data.education_level
    )

    db.add(new_student)
    await db.commit()
    return {"status": "registered"}


# @router.post("/student/login")
# async def login_user(data: LoginRequest, db: AsyncSession = Depends(get_db),response=Response):
#     global current_student

#     result = await db.execute(
#         select(Student).where(Student.email == data.email, Student.password == data.password)
#     )
#     user = result.scalars().first()
#     if user:
#         return {"status": "logged_in", "username": user.username}
#     return {"error": "Invalid credentials"}


@router.post("/student/login")
async def login_user(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Student).where(Student.email == data.email)
    )
    student = result.scalars().first()

    if not student or not verify_password(data.password, student.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(str(student.id), role="student")

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )

    return {
        "status": "logged_in",
        "role": "student"
    }

    

def get_current_student():
    return current_student

