from fastapi import APIRouter
from routers.student_auth import get_current_student
from routers.teacher_auth import get_current_teacher

router = APIRouter()

@router.get("/teacher/profile")
def get_teacher_profile():
    teacher = get_current_teacher()
    return teacher


@router.get("/student/profile")
def get_student_profile():
    student = get_current_student()
    return student
    
