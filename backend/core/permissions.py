"""
Kurs bazlı yetki kontrolleri.

get_current_user_info gibi dependency'ler kullanıcının KİM olduğunu söyler;
buradaki yardımcılar ise o kullanıcının belirli bir KURSA erişip erişemeyeceğini belirler.
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.course import Course
from models.enrollment import Enrollment

TEACHER_ROLES = ("teacher", "instructor")


async def ensure_course_owner(db: AsyncSession, course_id: int, user_info: dict) -> Course:
    """Kullanıcı bu kursun eğitmeni (veya admin) değilse 403/404 fırlatır."""
    role = user_info.get("role")
    user_id = int(user_info["sub"])

    stmt = select(Course).where(Course.id == course_id)
    if role != "admin":
        if role not in TEACHER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu işlem için eğitmen yetkisi gerekiyor.",
            )
        stmt = stmt.where(Course.teacher_id == user_id)

    course = (await db.execute(stmt)).scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kurs bulunamadı veya bu kursun eğitmeni değilsiniz.",
        )
    return course


async def ensure_course_access(db: AsyncSession, course_id: int, user_info: dict) -> Course:
    """
    Kullanıcı kursun eğitmeni, kursa kayıtlı öğrencisi veya admin değilse 403/404 fırlatır.
    Ders içeriği / quiz gibi kursa ait verileri okuyan uçlarda kullanılır.
    """
    role = user_info.get("role")
    user_id = int(user_info["sub"])

    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kurs bulunamadı.")

    if role == "admin":
        return course

    if role in TEACHER_ROLES:
        if course.teacher_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu kursun içeriğine erişim yetkiniz yok.",
            )
        return course

    if role == "student":
        enrollment = (
            await db.execute(
                select(Enrollment).where(
                    Enrollment.course_id == course_id,
                    Enrollment.student_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu derse kayıtlı değilsiniz.",
            )
        return course

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Geçersiz rol.")
