from fastapi import Request, HTTPException, Depends, status
import jwt
from core.config import settings
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.student import Student
from models.teacher import Teacher
from connect_db import get_db


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    """Cookie veya Bearer token'dan kullanıcıyı doğrular."""
    token = request.cookies.get("access_token")
    if not token:
        # Check Authorization header if cookie is missing
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        role = payload.get("role")
        sub = payload.get("sub")

        if role == "admin":
            # Find or create Student record for admin
            result = await db.execute(select(Student).where(func.lower(Student.email) == settings.ADMIN_EMAIL.lower()))
            student = result.scalars().first()
            if not student:
                from core.security import hash_password
                student = Student(
                    first_name="GoMufi",
                    last_name="Admin",
                    email=settings.ADMIN_EMAIL.lower(),
                    nickname="admin",
                    grade_level="Yönetici",
                    education_level="Yönetici",
                    password=hash_password(settings.ADMIN_PASSWORD)
                )
                db.add(student)
                await db.commit()
                await db.refresh(student)
            return {
                "user_id": str(student.id),
                "role": "admin"
            }

        return {
            "user_id": sub,
            "role": role
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


async def get_current_user_info(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """
    courses.py, payment.py gibi router'ların kullandığı formatta payload döner.
    {'sub': '...', 'role': '...', 'type': '...'} şeklinde raw JWT payload.
    """
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role = payload.get("role")
        if role == "admin":
            # Get admin student to be safe
            result = await db.execute(select(Student).where(func.lower(Student.email) == settings.ADMIN_EMAIL.lower()))
            student = result.scalars().first()
            if not student:
                from core.security import hash_password
                student = Student(
                    first_name="GoMufi",
                    last_name="Admin",
                    email=settings.ADMIN_EMAIL.lower(),
                    nickname="admin",
                    grade_level="Yönetici",
                    education_level="Yönetici",
                    password=hash_password(settings.ADMIN_PASSWORD)
                )
                db.add(student)
                await db.commit()
                await db.refresh(student)
            return {
                "sub": str(student.id),
                "role": "admin",
                "type": "access"
            }
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_teacher_id(request: Request, db: AsyncSession = Depends(get_db)) -> int:
    """Yalnızca teacher veya admin rolündeki kullanıcının ID'sini döner."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role = payload.get("role")
        user_id = payload.get("sub")
        if role not in ["teacher", "instructor", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized as teacher"
            )
        if role == "admin":
            # Find or create Teacher record for admin
            result = await db.execute(select(Teacher).where(func.lower(Teacher.email) == settings.ADMIN_EMAIL.lower()))
            teacher = result.scalars().first()
            if not teacher:
                from core.security import hash_password
                teacher = Teacher(
                    first_name="GoMufi",
                    last_name="Admin",
                    email=settings.ADMIN_EMAIL.lower(),
                    expertises="Tümü",
                    password=hash_password(settings.ADMIN_PASSWORD),
                    bio="Sistem Yöneticisi"
                )
                db.add(teacher)
                await db.commit()
                await db.refresh(teacher)
            return teacher.id
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def student_required(user=Depends(get_current_user)):
    if user["role"] not in ["student", "admin"]:
        raise HTTPException(status_code=403, detail="Student access required")
    return user


def teacher_required(user=Depends(get_current_user)):
    if user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user


def parent_required(user=Depends(get_current_user)):
    if user["role"] not in ["parent", "admin"]:
        raise HTTPException(status_code=403, detail="Parent access required")
    return user
