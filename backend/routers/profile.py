from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.teacher import Teacher

router = APIRouter()

@router.get("/profile")
async def get_profile(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete user profile information based on JWT token.
    Returns different data based on user role (teacher/student).
    """
    user_id = user["user_id"]
    role = user["role"]
    
    if role == "teacher":
        # Fetch teacher from database
        result = await db.execute(
            select(Teacher).where(Teacher.id == int(user_id))
        )
        teacher = result.scalars().first()
        
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        
        return {
            "user_id": teacher.id,
            "role": "teacher",
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "email": teacher.email,
            # Add more fields as needed
        }
    
    # TODO: Add student profile logic when Student model is ready
    # elif role == "student":
    #     result = await db.execute(
    #         select(Student).where(Student.id == int(user_id))
    #     )
    #     student = result.scalars().first()
    #     if not student:
    #         raise HTTPException(status_code=404, detail="Student not found")
    #     return {
    #         "user_id": student.id,
    #         "role": "student",
    #         "first_name": student.first_name,
    #         ...
    #     }
    
    raise HTTPException(status_code=400, detail="Invalid user role")