from fastapi import APIRouter, Depends, HTTPException, Response, Request
from auth.dependencies import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.teacher import Teacher
from models.student import Student
from models.parent import Parent
from models.enrollment import Enrollment
from models.course import Course
from schemas.user import ProfileUpdate, LinkStudentRequest
from pydantic import BaseModel
from typing import Optional

router = APIRouter()





import os



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
            "student_code": student.student_code,
            "grade_level": student.grade_level,
            "education_level": student.education_level,
            "gems": student.gems,
            "hearts": student.hearts,
            "streak": student.streak,
            "xp": student.xp,
        }
    
    elif role == "parent":
        result = await db.execute(
            select(Parent).where(Parent.id == int(user_id))
        )
        parent = result.scalars().first()
        
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")
        
        # Fetch linked students
        result_students = await db.execute(
            select(Student).where(Student.parent_id == parent.id)
        )
        students = result_students.scalars().all()
        
        return {
            "user_id": parent.id,
            "role": "parent",
            "first_name": parent.first_name,
            "last_name": parent.last_name,
            "email": parent.email,
            "students": [
                {
                    "id": s.id,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "nickname": s.nickname,
                    "grade_level": s.grade_level,
                    "education_level": s.education_level
                } for s in students
            ]
        }
    
    raise HTTPException(status_code=400, detail="Invalid user role")



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

    elif role == "parent":
        result = await db.execute(select(Parent).where(Parent.id == int(user_id)))
        parent = result.scalars().first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")
        
        if profile_data.first_name:
            parent.first_name = profile_data.first_name
        if profile_data.last_name:
            parent.last_name = profile_data.last_name
            
        await db.commit()
        return {"message": "Profile updated"}
    
    raise HTTPException(status_code=400, detail="Invalid role")



@router.post("/profile/link-student")
async def link_student(
    data: LinkStudentRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user["role"] != "parent":
        raise HTTPException(status_code=403, detail="Sadece ebeveynler öğrenci bağlayabilir")
    
    # Find student by code
    result = await db.execute(select(Student).where(Student.student_code == data.student_code.upper()))
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Geçersiz öğrenci kodu")
    
    if student.parent_id:
        raise HTTPException(status_code=400, detail="Bu öğrenci zaten başka bir ebeveyne bağlı")
    
    student.parent_id = int(user["user_id"])
    await db.commit()
    
    return {"message": f"Öğrenci ({student.first_name} {student.last_name}) başarıyla bağlandı"}
    
@router.post("/profile/unlink-student/{student_id}")
async def unlink_student(
    student_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user["role"] != "parent":
        raise HTTPException(status_code=403, detail="Sadece ebeveynler öğrenci bağını koparabilir")
    
    # Check if student belongs to this parent
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.parent_id == int(user["user_id"]))
    )
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı veya size bağlı değil")
    
    student.parent_id = None
    await db.commit()
    
    return {"message": "Öğrenci başarıyla hesabınızdan ayrıldı"}

@router.get("/profile/parent/teachers")
async def get_parent_teachers(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user["role"] != "parent":
        raise HTTPException(status_code=403, detail="Sadece ebeveynler bu veriye erişebilir")
    
    parent_id = int(user["user_id"])
    
    # Query to get teachers of students belonging to this parent
    # Parent -> Student -> Enrollment -> Course -> Teacher
    query = (
        select(Teacher)
        .join(Course, Teacher.id == Course.teacher_id)
        .join(Enrollment, Course.id == Enrollment.course_id)
        .join(Student, Enrollment.student_id == Student.id)
        .where(Student.parent_id == parent_id)
        .distinct()
    )
    
    result = await db.execute(query)
    teachers = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "first_name": t.first_name,
            "last_name": t.last_name,
            "email": t.email,
            "expertises": t.expertises,
            "bio": t.bio
        } for t in teachers
    ]

@router.get("/profile/parent/student/{student_id}")
async def get_parent_student_detail(
    student_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user["role"] != "parent":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    parent_id = int(user["user_id"])
    
    # Check if student belongs to this parent
    result = await db.execute(
        select(Student).where(Student.id == student_id, Student.parent_id == parent_id)
    )
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or not linked to you")
    
    # Get enrollments and courses to calculate progress
    result_courses = await db.execute(
        select(Course)
        .join(Enrollment, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == student.id)
    )
    courses = result_courses.scalars().all()
    
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "nickname": student.nickname,
        "student_code": student.student_code,
        "grade_level": student.grade_level,
        "education_level": student.education_level,
        "xp": student.xp,
        "gems": student.gems,
        "hearts": student.hearts,
        "streak": student.streak,
        "courses": [
            {
                "id": c.id,
                "title": c.title,
                "progress": c.progress,
                "category": c.category
            } for c in courses
        ]
    }

class StatsUpdate(BaseModel):
    xp_gain: int = 0
    gems_gain: int = 0
    hearts_change: int = 0

@router.post("/profile/student/stats")
async def update_student_stats(
    stats: StatsUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    student_id = int(user["user_id"])
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.xp += stats.xp_gain
    student.gems += stats.gems_gain
    
    # Update hearts and ensure it's within 0-5
    new_hearts = (student.hearts or 0) + stats.hearts_change
    student.hearts = max(0, min(5, new_hearts))
    
    await db.commit()
    await db.refresh(student)
    
    return {
        "xp": student.xp,
        "gems": student.gems,
        "hearts": student.hearts
    }
