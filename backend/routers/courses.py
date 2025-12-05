from fastapi import APIRouter

router = APIRouter()

@router.get("/courses")
def read_courses():
    return {"courses": ["Course 1", "Course 2", "Course 3"]}