"""
Giriş koruması: kaba kuvvet şifre denemesine sınır ve askıya alınmış hesaplar.

Sınır (son başarılı girişten sonraki başarısız denemeler, 15 dakikalık pencerede):
  - aynı e-postaya 5 hatalı deneme → o e-posta 15 dakika kilitlenir
  - aynı IP'den 30 hatalı deneme   → o IP 15 dakika kilitlenir (çok hesabı tarayan saldırı)
Denemeler veritabanında (login_attempts) tutulur: sunucu yeniden başlasa da sınır sürer.
"""
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Set, Tuple

from fastapi import HTTPException, Request
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.platform import AccountSuspension, LoginAttempt, SessionReset

WINDOW = timedelta(minutes=15)
# Aynı e-posta + aynı IP: 5 hata. Başka biri bir öğrencinin hesabını kendi
# IP'sinden 5 yanlış denemeyle 15 dakika KİLİTLEYEMESİN diye e-posta sınırı
# tek başına bu kadar düşük değil; dağıtık denemeye karşı ayrıca e-posta başına
# toplam sınır var.
MAX_PER_EMAIL_IP = 5
MAX_PER_EMAIL = 50
# Okulda bütün sınıf tek IP (NAT): düşük bir IP sınırı okulun tamamını kilitlerdi.
MAX_PER_IP = 200
KEEP = timedelta(days=30)
# Ters vekil sayısı (Render: 1). X-Forwarded-For'un SOLDAKİ değerleri
# istemcinin kendi yazabildiği değerlerdir; güvenilir olan, bizim vekilimizin
# eklediği sağdaki değerdir. Eskiden ilk değer alınıyordu: başlığa her istekte
# başka bir IP yazan saldırgan IP sınırına hiç takılmıyordu.
TRUSTED_PROXY_HOPS = int(os.getenv("TRUSTED_PROXY_HOPS", "1"))


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and TRUSTED_PROXY_HOPS > 0:
        hops = [h.strip() for h in forwarded.split(",") if h.strip()]
        if hops:
            return hops[-min(TRUSTED_PROXY_HOPS, len(hops))][:64]
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


async def _failures_pair(db: AsyncSession, email: str, ip: str, since: datetime) -> int:
    last_ok = (await db.execute(
        select(func.max(LoginAttempt.created_at)).where(
            LoginAttempt.email == email, LoginAttempt.ip == ip, LoginAttempt.success.is_(True))
    )).scalar()
    start = max(since, last_ok) if last_ok else since
    return (await db.execute(
        select(func.count(LoginAttempt.id)).where(
            LoginAttempt.email == email, LoginAttempt.ip == ip,
            LoginAttempt.success.is_(False), LoginAttempt.created_at > start)
    )).scalar() or 0


async def check(db: AsyncSession, email: str, ip: str) -> None:
    """Kilitliyse 429 fırlatır. Hesabın var olup olmadığını sızdırmaz (her e-postaya aynı davranır)."""
    since = datetime.utcnow() - WINDOW
    email = (email or "").strip().lower()
    if await _failures_pair(db, email, ip, since) >= MAX_PER_EMAIL_IP or \
            await _failures(db, LoginAttempt.email, email, since) >= MAX_PER_EMAIL or \
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



# --- oturum iptali (şifre değişti) ---------------------------------------------------

_resets: Tuple[float, Dict[Tuple[str, int], float]] = (0.0, {})


def invalidate_resets() -> None:
    global _resets
    _resets = (0.0, {})


async def ensure_session_valid(db: AsyncSession, role: Optional[str], user_id, issued_at) -> None:
    """Token, kullanıcının oturumları sıfırlanmadan ÖNCE verildiyse 401."""
    global _resets
    if role == "admin":
        return
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        return
    loaded_at, items = _resets
    if time.monotonic() - loaded_at > CACHE_TTL:
        rows = (await db.execute(select(SessionReset.role, SessionReset.user_id, SessionReset.after))).all()
        items = {(r, int(u)): a.replace(tzinfo=timezone.utc).timestamp() for r, u, a in rows}
        _resets = (time.monotonic(), items)
    after = items.get((_norm_role(role), uid))
    if after is not None and float(issued_at or 0) < after:
        raise HTTPException(status_code=401, detail="Oturumun sona erdi (şifre değişti). Lütfen tekrar giriş yap.")


async def reset_sessions(db: AsyncSession, role: str, user_id: int) -> None:
    """Kullanıcının şimdiye kadar verilmiş bütün token'larını geçersiz kılar (commit çağıranın)."""
    now = datetime.utcnow().replace(microsecond=0)
    row = await db.get(SessionReset, (_norm_role(role), int(user_id)))
    if row:
        row.after = now
    else:
        db.add(SessionReset(role=_norm_role(role), user_id=int(user_id), after=now))
    invalidate_resets()
