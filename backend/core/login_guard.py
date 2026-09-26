"""
Giriş koruması: kaba kuvvet şifre denemesine sınır ve askıya alınmış hesaplar.

Sınır (son başarılı girişten sonraki başarısız denemeler, 15 dakikalık pencerede):
  - aynı e-postaya 5 hatalı deneme → o e-posta 15 dakika kilitlenir
  - aynı IP'den 30 hatalı deneme   → o IP 15 dakika kilitlenir (çok hesabı tarayan saldırı)
Denemeler veritabanında (login_attempts) tutulur: sunucu yeniden başlasa da sınır sürer.
"""
import time
from datetime import datetime, timedelta
from typing import Optional, Set, Tuple

from fastapi import HTTPException, Request
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.platform import AccountSuspension, LoginAttempt

WINDOW = timedelta(minutes=15)
MAX_PER_EMAIL = 5
MAX_PER_IP = 30
KEEP = timedelta(days=30)


def client_ip(request: Request) -> str:
    """Render gibi ters vekil arkasında gerçek istemci IP'si X-Forwarded-For'un ilk öğesidir."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "bilinmiyor")[:64]


async def _failures(db: AsyncSession, column, value: str, since: datetime) -> int:
    last_ok = (await db.execute(
        select(func.max(LoginAttempt.created_at)).where(column == value, LoginAttempt.success.is_(True))
    )).scalar()
    start = max(since, last_ok) if last_ok else since
    return (await db.execute(
        select(func.count(LoginAttempt.id)).where(
            column == value, LoginAttempt.success.is_(False), LoginAttempt.created_at > start)
    )).scalar() or 0


async def check(db: AsyncSession, email: str, ip: str) -> None:
    """Kilitliyse 429 fırlatır. Hesabın var olup olmadığını sızdırmaz (her e-postaya aynı davranır)."""
    since = datetime.utcnow() - WINDOW
    email = (email or "").strip().lower()
    if await _failures(db, LoginAttempt.email, email, since) >= MAX_PER_EMAIL or \
            await _failures(db, LoginAttempt.ip, ip, since) >= MAX_PER_IP:
        raise HTTPException(
            status_code=429,
            detail="Çok fazla hatalı giriş denemesi. 15 dakika sonra tekrar dene ya da şifreni sıfırla.",
            headers={"Retry-After": str(int(WINDOW.total_seconds()))},
        )


async def record(db: AsyncSession, email: str, ip: str, success: bool) -> None:
    db.add(LoginAttempt(email=(email or "").strip().lower()[:255], ip=ip, success=success,
                        created_at=datetime.utcnow()))
    # Eski kayıtlar tutulmaz (kişisel veri: e-posta + IP).
    await db.execute(delete(LoginAttempt).where(LoginAttempt.created_at < datetime.utcnow() - KEEP))
    await db.commit()


# --- askıya alınmış hesaplar --------------------------------------------------------
# Her istekte veritabanına gitmemek için küçük bir süreç içi önbellek; yönetici
# askıya aldığında önbellek hemen boşaltılır (tek süreçli dağıtımda anında etkili,
# çok süreçte en geç CACHE_TTL saniye sonra).

CACHE_TTL = 30
_cache: Tuple[float, Set[Tuple[str, int]]] = (0.0, set())


def invalidate() -> None:
    global _cache
    _cache = (0.0, set())


def _norm_role(role: Optional[str]) -> str:
    return "teacher" if role in ("teacher", "instructor") else str(role or "")


async def is_suspended(db: AsyncSession, role: Optional[str], user_id) -> bool:
    global _cache
    if role == "admin":
        return False
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        return False
    loaded_at, items = _cache
    if time.monotonic() - loaded_at > CACHE_TTL:
        rows = (await db.execute(select(AccountSuspension.role, AccountSuspension.user_id))).all()
        items = {(r, int(u)) for r, u in rows}
        _cache = (time.monotonic(), items)
    return (_norm_role(role), uid) in items


async def ensure_not_suspended(db: AsyncSession, role: Optional[str], user_id) -> None:
    if await is_suspended(db, role, user_id):
        raise HTTPException(status_code=403, detail="Hesabın askıya alındı. Okulunla ya da GoMufi destek ile iletişime geç.")
