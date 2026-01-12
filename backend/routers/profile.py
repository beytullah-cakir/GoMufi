from fastapi import APIRouter, Depends, HTTPException, Response, Request
from auth.dependencies import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.teacher import Teacher
from models.student import Student
from models.tag import Tag
from pydantic import BaseModel
from typing import Optional

router = APIRouter()





import os

@router.get("/profile/tags")
async def get_tags(db: AsyncSession = Depends(get_db)):
    print("DEBUG: Fetching tags...")
    result = await db.execute(select(Tag))
    tags = result.scalars().all()
    return [{"id": t.id, "name": t.name} for t in tags]

class TagCreate(BaseModel):
    name: str

@router.post("/profile/tags")
async def create_tag(tag_data: TagCreate, db: AsyncSession = Depends(get_db)):
    # Check if tag already exists
    existing = await db.execute(select(Tag).where(Tag.name == tag_data.name))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Tag zaten mevcut")
    
    new_tag = Tag(name=tag_data.name)
    db.add(new_tag)
    await db.commit()
    return {"message": "Tag başarıyla eklendi", "name": new_tag.name}

@router.get("/profile")
async def get_profile(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user["user_id"]
    role = user["role"]
    
    if not str(user_id).isdigit():
        raise HTTPException(status_code=400, detail="Invalid user ID format in token")
    
    if role =="teacher":
        
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
            "expertises": teacher.expertises,
        }
    
    elif role == "student":
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
            "nickname": student.nickname,
            "grade_level": student.grade_level,
            "education_level": student.education_level,
        }
    
    raise HTTPException(status_code=400, detail="Invalid user role")


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    grade_level: Optional[str] = None
    education_level: Optional[str] = None
    expertises: Optional[str] = None
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
        
    elif role =="teacher":
        result = await db.execute(select(Teacher).where(Teacher.id == int(user_id)))
        teacher = result.scalars().first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
            
        if profile_data.expertises:
            teacher.expertises = profile_data.expertises
        if profile_data.bio:
            teacher.bio = profile_data.bio
        if profile_data.first_name:
            teacher.first_name = profile_data.first_name
        if profile_data.last_name:
            teacher.last_name = profile_data.last_name
            
        await db.commit()
        return {"message": "Profile updated"}
    
    raise HTTPException(status_code=400, detail="Invalid role")
