import os 
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
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
    try:
        # Check if email already exists
        check_query = select(Student).where(func.lower(Student.email) == func.lower(data.email))
        res = await db.execute(check_query)
        if res.scalars().first():
            raise HTTPException(status_code=400, detail="Bu e-posta adresi ile zaten bir hesap mevcut.")

        new_student = Student(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            nickname=data.nickname,
            grade_level=data.grade_level,
            education_level=data.education_level,
            password=hash_password(data.password),
        )

        db.add(new_student)
        await db.commit()
        return {"status": "registered"}
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/student/login")
async def login_user(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Student).where(func.lower(Student.email) == func.lower(data.email))
    )
    student = result.scalars().first()

    if not student or not verify_password(data.password, student.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(str(student.id), role="student")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    is_production ="localhost" not in FRONTEND_URL

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="None" if is_production else "lax",
        secure=is_production,
        path="/"
    )

    return {
        "status": "logged_in",
        "role": "student"
    }


@router.post("/student/logout")
async def logout_user(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"status": "logged_out"}


def get_current_student():
    return current_student

