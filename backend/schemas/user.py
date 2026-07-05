from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str

class StudentSchema(UserBase):
    id: int
    nickname: Optional[str] = None
    student_code: str
    grade_level: Optional[str] = None
    education_level: Optional[str] = None

    class Config:
        from_attributes = True

class TeacherSchema(UserBase):
    id: int
    bio: Optional[str] = None
    expertises: Optional[str] = None

    class Config:
        from_attributes = True

class ParentSchema(UserBase):
    id: int
    students: List[StudentSchema] = []

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    grade_level: Optional[str] = None
    education_level: Optional[str] = None
    expertises: Optional[str] = None
    bio: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class LinkStudentRequest(BaseModel):
    student_code: str
