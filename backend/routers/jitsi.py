"""
Jitsi JWT Token Üretim Router'ı.

Canlı ders için rol tabanlı (öğretmen=moderator, öğrenci=izleyici) JWT token üretir.
Token, Jitsi sunucusunun prosody bileşeni tarafından doğrulanır.
"""
import time
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from connect_db import get_db
from core.config import settings
from auth.dependencies import get_current_user_info
from models.course import Course
from models.enrollment import Enrollment

router = APIRouter(prefix="/jitsi", tags=["Jitsi"])


@router.get("/token/{course_id}")
async def generate_jitsi_token(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_info),
):
    """
    Belirli bir kurs için Jitsi JWT token üretir.
    
    - Öğretmen ise: moderator=True (tüm yönetim butonları aktif)
    - Öğrenci ise: moderator=False (yönetim butonları gizli)
    
    Döndürülen token, Jitsi sunucusuna iletildiğinde kullanıcının
    rolüne göre yetkilendirme yapılır.
    """
    user_id = current_user.get("sub")
    role = current_user.get("role")

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz kimlik bilgileri"
        )

    # Jitsi secret kontrolü
    if not settings.JITSI_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Jitsi yapılandırması eksik. Lütfen yöneticiyle iletişime geçin."
        )

    # --- Yetki Kontrolü ---
    is_moderator = False
    user_name = ""
    user_email = ""

    if role == "teacher":
        # Öğretmen: Bu kursun sahibi mi kontrol et
        from models.teacher import Teacher
        result = await db.execute(
            select(Course).where(
                Course.id == course_id,
                Course.teacher_id == int(user_id)
            )
        )
        course = result.scalar_one_or_none()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu kursa erişim yetkiniz yok"
            )

        # Öğretmen bilgilerini çek
        teacher_result = await db.execute(
            select(Teacher).where(Teacher.id == int(user_id))
        )
        teacher = teacher_result.scalar_one_or_none()
        user_name = f"{teacher.first_name} {teacher.last_name}" if teacher else "Eğitmen"
        user_email = teacher.email if teacher else ""
        is_moderator = True

    elif role == "student":
        # Öğrenci: Bu kursa kayıtlı mı kontrol et
        from models.student import Student
        result = await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == course_id,
                Enrollment.student_id == int(user_id)
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu kursa kayıtlı değilsiniz"
            )

        # Öğrenci bilgilerini çek
        student_result = await db.execute(
            select(Student).where(Student.id == int(user_id))
        )
        student = student_result.scalar_one_or_none()
        user_name = f"{student.first_name} {student.last_name}" if student else "Öğrenci"
        user_email = student.email if student else ""
        is_moderator = False

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )

    # --- Oda adı oluştur ---
    # Kurs başlığını da çekelim (room adı için)
    course_result = await db.execute(
        select(Course).where(Course.id == course_id)
    )
    course_obj = course_result.scalar_one_or_none()
    course_title_safe = "".join(
        c for c in (course_obj.title if course_obj else "Ders")
        if c.isalnum()
    )
    room_name = f"GoMufi-{course_id}-{course_title_safe}"

    # --- Jitsi JWT Payload ---
    now = int(time.time())
    payload = {
        "aud": "jitsi",
        "iss": "chat",
        "sub": settings.JITSI_APP_ID,
        "room": "*", # Yıldız koyarak tüm odalara izin veriyoruz veya room_name de kullanılabilir
        "iat": now,
        "exp": now + (2 * 60 * 60),  # 2 saat geçerli
        "context": {
            "user": {
                "id": str(user_id),
                "name": user_name,
                "email": user_email,
                "avatar": "",
                "moderator": bool(is_moderator),
            },
            "features": {
                "recording": bool(is_moderator),
                "livestreaming": bool(is_moderator),
            },
        },
    }

    # JaaS (8x8) için zorunlu kid başlığı
    kid = settings.JITSI_API_KEY
    headers = {
        "kid": kid
    }

    # RS256 ile imzala (Asimetrik anahtar ile uyumlu)
    token = jwt.encode(
        payload,
        settings.JITSI_APP_SECRET,
        algorithm="RS256",
        headers=headers,
    )

    # 8x8 JaaS tenant adı, tenant/oda formatı için:
    tenant_name = settings.JITSI_APP_ID
    full_room_name = f"{tenant_name}/{room_name}"

    return {
        "token": token,
        "room": full_room_name,
        "domain": settings.JITSI_DOMAIN,
        "is_moderator": is_moderator,
    }
