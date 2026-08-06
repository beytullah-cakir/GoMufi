"""Tarayıcı dışı istemciler (VS Code eklentisi) için kimlik doğrulama.

NEDEN AYRI UÇ: mevcut `/student/login` ve `/teacher/login` token'ı yalnızca
`httpOnly` çerezle veriyor ve bu KASITLI — tarayıcıda JavaScript token'a
erişemesin diye. Token'ı o uçların gövdesine eklemek XSS karşısındaki bu
korumayı yok ederdi.

Masaüstü istemcinin çerez kavramı yok; token'ı gövdede alıp işletim sisteminin
şifre kasasında (VS Code SecretStorage) saklar. Bu uç çerez BIRAKMAZ.

`get_current_user_info` zaten `Authorization: Bearer` başlığını kabul ettiği için
(bkz. auth/dependencies.py) diğer tüm uçlar bu token'la olduğu gibi çalışır.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth.auth_request import LoginRequest
from auth.dependencies import get_current_user_info
from connect_db import get_db
from core.config import settings
from core.security import create_access_token, is_admin_credentials, verify_password
from models.student import Student
from models.teacher import Teacher

router = APIRouter()


class DeviceTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    display_name: str
    expires_in: int  # saniye


@router.post("/auth/device-token", response_model=DeviceTokenResponse)
async def issue_device_token(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """E-posta + parola karşılığında Bearer token verir (çerez bırakmaz).

    Rolü istemci seçmez, sunucu bulur: eklenti kullanıcısı sadece e-posta ve
    parolasını girer, öğrenci mi öğretmen mi olduğunu bilmesi gerekmez.
    """
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    if is_admin_credentials(data.email, data.password):
        return DeviceTokenResponse(
            access_token=create_access_token("admin", role="admin"),
            role="admin", user_id="admin", display_name="Yönetici", expires_in=expires_in,
        )

    res = await db.execute(
        select(Student).where(func.lower(Student.email) == func.lower(data.email))
    )
    student = res.scalars().first()
    if student and verify_password(data.password, student.password):
        return DeviceTokenResponse(
            access_token=create_access_token(str(student.id), role="student"),
            role="student",
            user_id=str(student.id),
            display_name=f"{student.first_name} {student.last_name or ''}".strip(),
            expires_in=expires_in,
        )

    res = await db.execute(
        select(Teacher).where(func.lower(Teacher.email) == func.lower(data.email))
    )
    teacher = res.scalars().first()
    if teacher and verify_password(data.password, teacher.password):
        return DeviceTokenResponse(
            access_token=create_access_token(str(teacher.id), role="teacher"),
            role="teacher",
            user_id=str(teacher.id),
            display_name=f"{teacher.first_name} {teacher.last_name or ''}".strip(),
            expires_in=expires_in,
        )

    # Hesabın var olup olmadığını sızdırmamak için tüm başarısızlıklar aynı yanıt.
    raise HTTPException(status_code=401, detail="E-posta veya parola hatalı.")


# --- TARAYICI UZERINDEN GIRIS (device authorization) ---------------------------
#
# Parolanin eklentiye girilmesi yerine: eklenti rastgele bir `state` uretir,
# tarayicida site acilir, ogrenci ZATEN oturum acmis oldugu icin tek tikla
# onaylar, eklenti de token'i yoklayarak alir.
#
# `state` TEK KULLANIMLIKTIR ve kisa omurludur: token okunduktan sonra kayit
# silinir, boylece ayni baglanti adresi ikinci kez kullanilamaz.

DEVICE_AUTH_TTL = 300  # 5 dakika

_auth_redis: redis.Redis | None = None


async def _auth_store() -> redis.Redis:
    global _auth_redis
    if _auth_redis is None:
        _auth_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _auth_redis


def _state_key(state: str) -> str:
    return f"gomufi:devauth:{state}"


class ApproveRequest(BaseModel):
    # Yuksek entropi bekleniyor; kisa bir deger tahmin edilebilir olurdu.
    state: str = Field(min_length=32, max_length=128)


@router.post("/auth/device-approve")
async def approve_device(payload: ApproveRequest, user=Depends(get_current_user_info)):
    """Sitedeki oturum, eklentinin baglanmasini onaylar.

    Kimlik SITE oturumundan gelir (cerez); eklenti burada hicbir sey kanitlamaz,
    yalnizca urettigi `state` ile sonucu yoklar.
    """
    role = user.get("role", "student")
    token = create_access_token(str(user["sub"]), role=role)

    r = await _auth_store()
    await r.hset(_state_key(payload.state), mapping={
        "access_token": token,
        "role": role,
        "user_id": str(user["sub"]),
        "display_name": user.get("name") or user.get("email") or "GoMufi kullanicisi",
    })
    await r.expire(_state_key(payload.state), DEVICE_AUTH_TTL)
    return {"success": True}


@router.get("/auth/device-poll", response_model=DeviceTokenResponse)
async def poll_device(state: str):
    """Eklenti onayi bekler. Kimlik dogrulama YOKTUR — sirrin kendisi `state`.

    Token bir kez okunur ve kayit silinir; ayni `state` tekrar kullanilamaz.
    """
    if len(state) < 32:
        raise HTTPException(status_code=400, detail="Gecersiz baglanti kodu.")

    r = await _auth_store()
    data = await r.hgetall(_state_key(state))
    if not data:
        # Henuz onaylanmadi ya da suresi doldu — eklenti yoklamaya devam eder.
        raise HTTPException(status_code=404, detail="Onay bekleniyor.")

    await r.delete(_state_key(state))
    return DeviceTokenResponse(
        access_token=data["access_token"],
        role=data["role"],
        user_id=data["user_id"],
        display_name=data["display_name"],
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
