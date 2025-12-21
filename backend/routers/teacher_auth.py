
from fastapi import APIRouter, Depends, HTTPException, Response
from auth.auth_request import LoginRequest, TeacherRegisterRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.security import create_access_token, hash_password, verify_password
from connect_db import get_db
from models.teacher import Teacher


router = APIRouter()


@router.post("/teacher/register")
async def register_user(
    data: TeacherRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    new_teacher = Teacher(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        #department=data.department,
        password=hash_password(data.password)
    )

    db.add(new_teacher)
    await db.commit()
    return {"status": "registered"}


@router.post("/teacher/login")
async def login_user(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Teacher).where(Teacher.email == data.email)
    )
    teacher = result.scalars().first()

    if not teacher or not verify_password(data.password, teacher.password):

        raise HTTPException(status_code=401, detail="Invalid email or password.") 

    access_token = create_access_token(str(teacher.id), "teacher")

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",   
        secure=False,   
        path="/"
    )

    return {"status": "logged_in"}



