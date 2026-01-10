from fastapi import APIRouter, Depends, HTTPException, Response


router = APIRouter()

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out"}
from auth.dependencies import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.teacher import Teacher
from models.student import Student



@router.get("/profile")
async def get_profile(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user["user_id"]
    role = user["role"]
    
    if not str(user_id).isdigit():
        raise HTTPException(status_code=400, detail="Invalid user ID format in token")
    
    if role in ["teacher", "instructor"]:
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
            "bio": teacher.bio,
        }
    
    elif role == "student":
        # Fetch student from database
        result = await db.execute(
            select(Student).where(Student.id == int(user_id))
        )
        student = result.scalars().first()
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return {
            "user_id": student.id,
            "role": "student",
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
        }
    
    raise HTTPException(status_code=400, detail="Invalid user role")

from pydantic import BaseModel
from typing import Optional

class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    grade_level: Optional[str] = None
    education_level: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

@router.put("/profile/update")
async def update_profile(
    profile_data: ProfileUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user["user_id"]
    role = user["role"]
    
    if role == "student":
        result = await db.execute(select(Student).where(Student.id == int(user_id)))
        student = result.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
            
        if profile_data.nickname:
            student.nickname = profile_data.nickname
        if profile_data.grade_level:
            student.grade_level = profile_data.grade_level
        if profile_data.education_level:
            student.education_level = profile_data.education_level
            
        await db.commit()
        return {"message": "Profile updated"}
        
    elif role in ["teacher", "instructor"]:
        result = await db.execute(select(Teacher).where(Teacher.id == int(user_id)))
        teacher = result.scalars().first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
            
        if profile_data.department is not None:
            teacher.department = profile_data.department
        if profile_data.bio is not None:
            teacher.bio = profile_data.bio
        if profile_data.first_name is not None:
            teacher.first_name = profile_data.first_name
        if profile_data.last_name is not None:
            teacher.last_name = profile_data.last_name
            
        await db.commit()
        return {"message": "Profile updated"}
    
    raise HTTPException(status_code=400, detail="Invalid role")
