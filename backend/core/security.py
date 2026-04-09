from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

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
