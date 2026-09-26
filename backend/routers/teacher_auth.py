
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from auth.auth_request import LoginRequest, TeacherRegisterRequest
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.security import create_access_token, hash_password, verify_password, is_admin_credentials
from core.config import settings
from connect_db import get_db
from models.teacher import Teacher
from core import login_guard


router = APIRouter()


@router.post("/teacher/register")
async def register_user(
    data: TeacherRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Check if email already exists
        check_query = select(Teacher).where(func.lower(Teacher.email) == func.lower(data.email))
        res = await db.execute(check_query)
        if res.scalars().first():
            raise HTTPException(status_code=400, detail="Bu e-posta adresi ile zaten bir hesap mevcut.")

        new_teacher = Teacher(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            expertises=data.expertises,
            password=hash_password(data.password)
        )

        db.add(new_teacher)
        await db.commit()
        return {"status": "registered"}
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/teacher/login")
async def login_user(
    data: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    ip = login_guard.client_ip(request)
    await login_guard.check(db, data.email, ip)
    if is_admin_credentials(data.email, data.password):
        await login_guard.record(db, data.email, ip, True)
        access_token = create_access_token("admin", role="admin")
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="None" if settings.IS_PRODUCTION else "lax",
            secure=settings.IS_PRODUCTION,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )
        return {
            "status": "logged_in",
            "role": "admin"
        }

    result = await db.execute(
        select(Teacher).where(func.lower(Teacher.email) == func.lower(data.email))
    )
    teacher = result.scalars().first()

    if not teacher or not verify_password(data.password, teacher.password):
        await login_guard.record(db, data.email, ip, False)
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
    await login_guard.ensure_not_suspended(db, "teacher", teacher.id)
    await login_guard.record(db, data.email, ip, True)

    access_token = create_access_token(str(teacher.id), role="teacher")

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="None" if settings.IS_PRODUCTION else "lax",
        secure=settings.IS_PRODUCTION,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return {
        "status": "logged_in",
        "role": "teacher"
    }




