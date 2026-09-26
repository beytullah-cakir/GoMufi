"""
Şifremi unuttum.

  POST /auth/forgot-password        {email}            → her durumda aynı cevap
  GET  /auth/reset-password/check   ?token=...         → link hâlâ geçerli mi
  POST /auth/reset-password         {token, password}  → yeni şifre

Öğrenci ve öğretmen hesapları içindir; veliler Google ile giriyor, şifreleri yok.

Güvenlik:
  - forgot-password e-postanın kayıtlı olup olmadığını SÖYLEMEZ (hesap avcılığı olmasın).
  - Linkteki token veritabanında yalnızca SHA-256 özetiyle durur, 1 saat geçerli, tek kullanımlık.
  - Yeni şifre kaydedilince o hesabın kullanılmamış diğer linkleri de geçersizleşir.
  - Bir hesaba saatte en fazla RATE_LIMIT_PER_HOUR link gönderilir.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from connect_db import get_db
from core import mailer
from core.config import settings
from core import login_guard, ratelimit
from core.security import hash_password
from models.school import PasswordResetToken
from models.student import Student
from models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["auth"])

TOKEN_TTL = timedelta(hours=1)
RATE_LIMIT_PER_HOUR = 3
MIN_PASSWORD_LENGTH = 8
# bcrypt 72 bayttan sonrasını yok sayar; sessizce kırpılmış şifre sürpriz olur.
MAX_PASSWORD_BYTES = 72

GENERIC_REPLY = {
    "status": "ok",
    "message": "Bu e-posta adresiyle bir hesap varsa şifre sıfırlama linki gönderildi. Gelen kutunu ve spam klasörünü kontrol et.",
}
ROLE_LABEL = {"student": "öğrenci", "teacher": "öğretmen"}
MODELS = {"student": Student, "teacher": Teacher}


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)
    password: str


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def check_password_rules(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalı.")
    if len(password.encode()) > MAX_PASSWORD_BYTES:
        raise HTTPException(status_code=400, detail="Şifre çok uzun (en fazla 72 bayt).")


async def _accounts(db: AsyncSession, email: str) -> List[Tuple[str, object]]:
    found = []
    for role, model in MODELS.items():
        row = (await db.execute(
            select(model).where(func.lower(model.email) == email)
        )).scalars().first()
        if row:
            found.append((role, row))
    return found


async def _valid_token(db: AsyncSession, token: str) -> Optional[PasswordResetToken]:
    row = (await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == _digest(token))
    )).scalar_one_or_none()
    if not row or row.used_at is not None or row.expires_at < datetime.utcnow():
        return None
    return row


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    background: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # E-posta bombardımanına karşı IP başına sınır (hesap başına sınır aşağıda).
    # Okul ağında sınıf tek IP'den çıktığı için gevşek; hesap başına saatlik sınır ayrıca var.
    await ratelimit.check("forgot", login_guard.client_ip(request), per_minute=20, per_day=200)
    email = body.email.strip().lower()
    # Admin hesabı ortam değişkenlerinden gelir; buradan şifresi değiştirilemez.
    if settings.ADMIN_EMAIL and email == settings.ADMIN_EMAIL.lower():
        return GENERIC_REPLY

    now = datetime.utcnow()
    mails = []
    for role, account in await _accounts(db, email):
        recent = (await db.execute(
            select(func.count(PasswordResetToken.id)).where(
                PasswordResetToken.role == role,
                PasswordResetToken.user_id == account.id,
                PasswordResetToken.created_at >= now - timedelta(hours=1),
            )
        )).scalar() or 0
        if recent >= RATE_LIMIT_PER_HOUR:
            continue
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(role=role, user_id=account.id, token_hash=_digest(token),
                                  expires_at=now + TOKEN_TTL, created_at=now))
        link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        name = (account.first_name or "").strip() or "Merhaba"
        text, html_body = mailer.render(
            "Şifreni sıfırla",
            [f"{name}, GoMufi {ROLE_LABEL[role]} hesabın için şifre sıfırlama isteği aldık.",
             "Yeni şifreni belirlemek için aşağıdaki düğmeye tıkla. Link 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.",
             "Bu isteği sen yapmadıysan bu e-postayı yok say; şifren değişmez."],
            ("Yeni şifre belirle", link),
        )
        mails.append((account.email, text, html_body))
    await db.commit()

    for to, text, html_body in mails:
        background.add_task(mailer.send_email, to, "GoMufi şifre sıfırlama", text, html_body)
    return GENERIC_REPLY


@router.get("/reset-password/check")
async def check_reset_token(token: str, db: AsyncSession = Depends(get_db)):
    row = await _valid_token(db, token)
    return {"valid": row is not None, "role": row.role if row else None}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    row = await _valid_token(db, body.token)
    if not row:
        raise HTTPException(status_code=400, detail="Link geçersiz ya da süresi dolmuş. Yeni bir link iste.")
    check_password_rules(body.password)

    model = MODELS.get(row.role)
    account = (await db.execute(select(model).where(model.id == row.user_id))).scalar_one_or_none() if model else None
    if not account:
        raise HTTPException(status_code=400, detail="Link geçersiz ya da süresi dolmuş. Yeni bir link iste.")

    now = datetime.utcnow()
    account.password = hash_password(body.password)
    # Şifre değişti: başka cihazlardaki (belki çalınmış) oturumlar kapanır.
    await login_guard.reset_sessions(db, row.role, row.user_id)
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.role == row.role, PasswordResetToken.user_id == row.user_id,
               PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    await db.commit()
    return {"status": "ok", "role": row.role}
