from pydantic import BaseModel

class StudentRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    #nickname:str
    #grade_level: str
    #education_level: str


class TeacherRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    #department: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    message: str

