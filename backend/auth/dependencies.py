from fastapi import Request, HTTPException, Depends, status
import jwt
from core.config import settings


def get_current_user(request: Request):
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

        return {
            "user_id": payload["sub"],
            "role": payload["role"]
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def get_current_user_info(request: Request) -> dict:
    """
    courses.py, payment.py gibi router'ların kullandığı formatta payload döner.
    {'sub': '...', 'role': '...', 'type': '...'} şeklinde raw JWT payload.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_teacher_id(request: Request) -> int:
    """Yalnızca teacher rolündeki kullanıcının ID'sini döner."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role = payload.get("role")
        user_id = payload.get("sub")
        if role != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized as teacher"
            )
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def student_required(user=Depends(get_current_user)):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return user


def teacher_required(user=Depends(get_current_user)):
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user


def parent_required(user=Depends(get_current_user)):
    if user["role"] != "parent":
        raise HTTPException(status_code=403, detail="Parent access required")
    return user
