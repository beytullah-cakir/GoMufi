from pydantic import BaseModel, EmailStr, Field, field_validator

# Parola kuralı şifre sıfırlamayla aynı (bkz. routers/password_reset.py).
# Üst sınır bayt olarak: bcrypt 72 bayttan sonrasını SESSİZCE yok sayıyor.
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72


def _check_password(value: str) -> str:
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalı.")
    if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Şifre çok uzun (en fazla 72 bayt).")
    return value


def _clean(value: str) -> str:
    value = (value or "").strip()
    if any(ch in value for ch in "<>"):
        raise ValueError("Bu alanda < ve > kullanılamaz.")
    return value


class StudentRegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(default="", max_length=60)
    email: EmailStr
    password: str
    nickname: str = Field(default="", max_length=30)
    grade_level: str = Field(default="", max_length=40)
    education_level: str = Field(default="", max_length=40)

    _password = field_validator("password")(_check_password)
    _names = field_validator("first_name", "last_name", "nickname", "grade_level", "education_level")(_clean)


class TeacherRegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(default="", max_length=60)
    email: EmailStr
    expertises: str = Field(default="", max_length=300)
    password: str

    _password = field_validator("password")(_check_password)
    _names = field_validator("first_name", "last_name")(_clean)


class LoginRequest(BaseModel):
    # Girişte biçim kontrolü yok: eski hesaplar (ör. admin) standart dışı olabilir.
    email: str = Field(max_length=320)
    password: str = Field(max_length=200)


class TokenResponse(BaseModel):
    message: str
