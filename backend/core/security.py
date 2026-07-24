from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import jwt
from passlib.context import CryptContext
from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    # OAuth ile kaydolan kullanıcıların password alanı boş olabilir; passlib bu durumda
    # "hash could not be identified" hatası fırlatır. Sessizce False dönmek doğrusu.
    if not hashed:
        return False
    try:
        return pwd_context.verify(password, hashed)
    except ValueError:
        return False

def is_admin_credentials(email: str, password: str) -> bool:
    """
    Ortam değişkeniyle tanımlanmış admin hesabıyla eşleşiyor mu?

    ADMIN_EMAIL/ADMIN_PASSWORD tanımlı değilse daima False döner — yani
    e-posta ile admin girişi kapalıdır, varsayılan bir hesaba düşülmez.
    Karşılaştırma zamanlama saldırılarına karşı compare_digest ile yapılır.
    """
    if not settings.ADMIN_LOGIN_ENABLED:
        return False
    email_ok = secrets.compare_digest(
        (email or "").strip().lower(), settings.ADMIN_EMAIL.strip().lower()
    )
    password_ok = secrets.compare_digest(password or "", settings.ADMIN_PASSWORD)
    return email_ok and password_ok


def decode_access_token(token: Optional[str]) -> Optional[dict]:
    """
    Access token'ı doğrular ve payload'ı döner. Geçersiz/süresi dolmuş token'da None döner.

    HTTPException fırlatmaz — WebSocket gibi HTTP hata mekanizmasının olmadığı
    yerlerden de kullanılabilsin diye.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    if not payload.get("sub") or not payload.get("role"):
        return None
    return payload

def create_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_access_token(user_id: str, role: str):
    return create_token(
        {
            "sub": str(user_id),
            "role": role,
            "type": "access"
        },
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

def create_refresh_token(user_id: str):
    return create_token(
        {
            "sub": str(user_id),
            "type": "refresh"
        },
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
