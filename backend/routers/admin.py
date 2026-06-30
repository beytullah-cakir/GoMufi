from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.attributes import flag_modified
from connect_db import get_db
from auth.dependencies import get_current_user_info
from models.student import Student
from models.teacher import Teacher
from models.course import Course
from models.quiz import Quiz
from models.enrollment import Enrollment
from core.security import hash_password
from core.config import settings
from pydantic import BaseModel
from typing import List, Optional, Any

router = APIRouter(prefix="/admin", tags=["admin"])

# --- Pydantic Schemas ---

class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    nickname: Optional[str] = None
    password: str
    role: str # "student" or "teacher"
    grade_level: Optional[str] = None
    education_level: Optional[str] = None
    expertises: Optional[str] = None
    bio: Optional[str] = None

class UpdateUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    nickname: Optional[str] = None
    password: Optional[str] = None
    grade_level: Optional[str] = None
    education_level: Optional[str] = None
    expertises: Optional[str] = None
    bio: Optional[str] = None
    gems: Optional[int] = None
    hearts: Optional[int] = None
    streak: Optional[int] = None
    xp: Optional[int] = None

class EnrollUserRequest(BaseModel):
    course_id: int

class CreateCourseRequest(BaseModel):
    teacher_id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = 0
    curriculum: Optional[List[Any]] = []

class UpdateCourseRequest(BaseModel):
    teacher_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    curriculum: Optional[List[Any]] = None

class CreateQuizRequest(BaseModel):
    course_id: Optional[int] = None
    section_id: Optional[str] = None
    node_id: Optional[int] = None
    topic: str
    difficulty: Optional[str] = "Orta"
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None
    question_type: Optional[str] = "multiple-choice"

class UpdateQuizRequest(BaseModel):
    course_id: Optional[int] = None
    section_id: Optional[str] = None
    node_id: Optional[int] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    question_type: Optional[str] = None

# --- Helpers ---

def verify_admin(user_info: dict):
    if user_info.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yönetici yetkisi gerekiyor."
        )

# --- Endpoints: Users ---

@router.get("/users")
async def get_users(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    # Get students with eager loaded enrollments
    students_res = await db.execute(
        select(Student).options(
            joinedload(Student.enrollments).joinedload(Enrollment.course)
        )
    )
    students = students_res.unique().scalars().all()
    
    # Get teachers
    teachers_res = await db.execute(select(Teacher))
    teachers = teachers_res.scalars().all()
    
    users_list = []
    for s in students:
        is_admin = s.email.lower() == settings.ADMIN_EMAIL.lower()
        enrolled_courses = []
        for enroll in s.enrollments:
            if enroll.course:
                enrolled_courses.append({
                    "id": enroll.course.id,
                    "title": enroll.course.title
                })
        users_list.append({
            "id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "nickname": s.nickname,
            "role": "admin" if is_admin else "student",
            "grade_level": s.grade_level,
            "education_level": s.education_level,
            "gems": s.gems,
            "hearts": s.hearts,
            "streak": s.streak,
            "xp": s.xp,
            "enrolled_courses": enrolled_courses,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
        
    for t in teachers:
        users_list.append({
            "id": t.id,
            "first_name": t.first_name,
            "last_name": t.last_name,
            "email": t.email,
            "nickname": t.first_name, # Fallback
            "role": "teacher",
            "expertises": t.expertises,
            "bio": t.bio,
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
        
    return users_list

@router.post("/users")
async def create_user(
    user_data: CreateUserRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    hashed_pwd = hash_password(user_data.password)
    
    if user_data.role == "student":
        # Check duplicate student email
        dup = await db.execute(select(Student).where(Student.email == user_data.email))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu e-posta adresiyle kayıtlı bir öğrenci zaten var.")
            
        new_student = Student(
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            email=user_data.email.lower(),
            nickname=user_data.nickname or user_data.first_name.lower(),
            password=hashed_pwd,
            grade_level=user_data.grade_level or "Unknown",
            education_level=user_data.education_level or "Unknown",
            gems=0,
            hearts=5,
            streak=0,
            xp=0
        )
        db.add(new_student)
        await db.commit()
        await db.refresh(new_student)
        return {"message": "Öğrenci başarıyla oluşturuldu", "id": new_student.id}
        
    elif user_data.role == "teacher":
        # Check duplicate teacher email
        dup = await db.execute(select(Teacher).where(Teacher.email == user_data.email))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu e-posta adresiyle kayıtlı bir öğretmen zaten var.")
            
        new_teacher = Teacher(
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            email=user_data.email.lower(),
            password=hashed_pwd,
            expertises=user_data.expertises or "",
            bio=user_data.bio or ""
        )
        db.add(new_teacher)
        await db.commit()
        await db.refresh(new_teacher)
        return {"message": "Öğretmen başarıyla oluşturuldu", "id": new_teacher.id}
    else:
        raise HTTPException(status_code=400, detail="Geçersiz rol tipi. 'student' veya 'teacher' olmalıdır.")

@router.put("/users/{role}/{user_id}")
async def update_user(
    role: str,
    user_id: int,
    user_data: UpdateUserRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    if role == "student":
        res = await db.execute(select(Student).where(Student.id == user_id))
        student = res.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Öğrenci bulunamadı.")
            
        if user_data.first_name is not None: student.first_name = user_data.first_name
        if user_data.last_name is not None: student.last_name = user_data.last_name
        if user_data.email is not None: student.email = user_data.email.lower()
        if user_data.nickname is not None: student.nickname = user_data.nickname
        if user_data.grade_level is not None: student.grade_level = user_data.grade_level
        if user_data.education_level is not None: student.education_level = user_data.education_level
        if user_data.gems is not None: student.gems = user_data.gems
        if user_data.hearts is not None: student.hearts = user_data.hearts
        if user_data.streak is not None: student.streak = user_data.streak
        if user_data.xp is not None: student.xp = user_data.xp
        if user_data.password is not None and user_data.password != "":
            student.password = hash_password(user_data.password)
            
        await db.commit()
        return {"message": "Öğrenci bilgileri güncellendi."}
        
    elif role == "teacher":
        res = await db.execute(select(Teacher).where(Teacher.id == user_id))
        teacher = res.scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=404, detail="Öğretmen bulunamadı.")
            
        if user_data.first_name is not None: teacher.first_name = user_data.first_name
        if user_data.last_name is not None: teacher.last_name = user_data.last_name
        if user_data.email is not None: teacher.email = user_data.email.lower()
        if user_data.expertises is not None: teacher.expertises = user_data.expertises
        if user_data.bio is not None: teacher.bio = user_data.bio
        if user_data.password is not None and user_data.password != "":
            teacher.password = hash_password(user_data.password)
            
        await db.commit()
        return {"message": "Öğretmen bilgileri güncellendi."}
    else:
        raise HTTPException(status_code=400, detail="Geçersiz rol.")

@router.delete("/users/{role}/{user_id}")
async def delete_user(
    role: str,
    user_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    if role == "student":
        res = await db.execute(select(Student).where(Student.id == user_id))
        student = res.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Öğrenci bulunamadı.")
            
        # Clean enrollments
        await db.execute(select(Enrollment).where(Enrollment.student_id == user_id))
        enrolls_res = await db.execute(select(Enrollment).where(Enrollment.student_id == user_id))
        for enroll in enrolls_res.scalars().all():
            await db.delete(enroll)
            
        await db.delete(student)
        await db.commit()
        return {"message": "Öğrenci hesabı ve kayıtları silindi."}
        
    elif role == "teacher":
        res = await db.execute(select(Teacher).where(Teacher.id == user_id))
        teacher = res.scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=404, detail="Öğretmen bulunamadı.")
            
        # Set teacher's courses teacher_id or delete them? We'll re-assign them to admin teacher or just block delete if they have courses.
        courses_res = await db.execute(select(Course).where(Course.teacher_id == user_id))
        if courses_res.scalars().all():
            raise HTTPException(status_code=400, detail="Bu öğretmene ait aktif kurslar var. Önce kursları silmeli veya başka bir eğitmene atamalısınız.")
            
        await db.delete(teacher)
        await db.commit()
        return {"message": "Öğretmen hesabı silindi."}
    else:
        raise HTTPException(status_code=400, detail="Geçersiz rol.")


@router.post("/users/student/{student_id}/enroll")
async def enroll_student(
    student_id: int,
    req: EnrollUserRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı.")
        
    course = await db.get(Course, req.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
        
    dup_res = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_id == req.course_id
        )
    )
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Öğrenci zaten bu kursa kayıtlı.")
        
    new_enroll = Enrollment(
        student_id=student_id,
        course_id=req.course_id
    )
    db.add(new_enroll)
    await db.commit()
    return {"message": "Kursa atama başarıyla yapıldı."}


@router.delete("/users/student/{student_id}/enroll/{course_id}")
async def unenroll_student(
    student_id: int,
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    enroll_res = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course_id
        )
    )
    enroll = enroll_res.scalar_one_or_none()
    if not enroll:
        raise HTTPException(status_code=404, detail="Atama kaydı bulunamadı.")
        
    await db.delete(enroll)
    await db.commit()
    return {"message": "Kurs ataması kaldırıldı."}


# --- Endpoints: Courses ---

@router.get("/courses")
async def get_courses(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    result = await db.execute(select(Course).options(joinedload(Course.teacher)))
    courses = result.unique().scalars().all()
    
    res_list = []
    for c in courses:
        res_list.append({
            "id": c.id,
            "teacher_id": c.teacher_id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "price": c.price,
            "rating": c.rating,
            "status": c.status,
            "curriculum": c.curriculum,
            "teacher_name": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else "Bilinmeyen Eğitmen"
        })
    return res_list

@router.post("/courses")
async def admin_create_course(
    course_data: CreateCourseRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    new_course = Course(
        teacher_id=course_data.teacher_id,
        title=course_data.title,
        description=course_data.description,
        category=course_data.category or "Diğer",
        price=course_data.price or 0,
        curriculum=course_data.curriculum or [],
        status="active"
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)
    return {"message": "Kurs başarıyla oluşturuldu.", "id": new_course.id}

@router.put("/courses/{course_id}")
async def admin_update_course(
    course_id: int,
    course_data: UpdateCourseRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    res = await db.execute(select(Course).where(Course.id == course_id))
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
        
    if course_data.teacher_id is not None: course.teacher_id = course_data.teacher_id
    if course_data.title is not None: course.title = course_data.title
    if course_data.description is not None: course.description = course_data.description
    if course_data.category is not None: course.category = course_data.category
    if course_data.price is not None: course.price = course_data.price
    if course_data.curriculum is not None: 
        course.curriculum = course_data.curriculum
        flag_modified(course, "curriculum")
        
    await db.commit()
    return {"message": "Kurs güncellendi."}

@router.delete("/courses/{course_id}")
async def admin_delete_course(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    res = await db.execute(select(Course).where(Course.id == course_id))
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
        
    # Delete enrollment references
    enrolls_res = await db.execute(select(Enrollment).where(Enrollment.course_id == course_id))
    for enroll in enrolls_res.scalars().all():
        await db.delete(enroll)
        
    await db.delete(course)
    await db.commit()
    return {"message": "Kurs ve kayıtları silindi."}


# --- Endpoints: Quizzes ---

@router.get("/quizzes")
async def get_quizzes(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    res = await db.execute(select(Quiz))
    quizzes = res.scalars().all()
    
    # Enrich with course titles
    courses_res = await db.execute(select(Course))
    courses_map = {c.id: c.title for c in courses_res.scalars().all()}
    
    quizzes_list = []
    for q in quizzes:
        quizzes_list.append({
            "id": q.id,
            "course_id": q.course_id,
            "course_title": courses_map.get(q.course_id, "Bilinmeyen Kurs"),
            "section_id": q.section_id,
            "node_id": q.node_id,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
            "question_type": q.question_type
        })
    return quizzes_list

@router.post("/quizzes")
async def admin_create_quiz(
    quiz_data: CreateQuizRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    new_quiz = Quiz(
        course_id=quiz_data.course_id,
        section_id=quiz_data.section_id,
        node_id=quiz_data.node_id,
        topic=quiz_data.topic,
        difficulty=quiz_data.difficulty,
        question_text=quiz_data.question_text,
        options=quiz_data.options,
        correct_answer=quiz_data.correct_answer,
        explanation=quiz_data.explanation,
        question_type=quiz_data.question_type
    )
    db.add(new_quiz)
    await db.commit()
    await db.refresh(new_quiz)
    return {"message": "Test sorusu başarıyla oluşturuldu.", "id": new_quiz.id}

@router.put("/quizzes/{quiz_id}")
async def admin_update_quiz(
    quiz_id: int,
    quiz_data: UpdateQuizRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Test sorusu bulunamadı.")
        
    if quiz_data.course_id is not None: quiz.course_id = quiz_data.course_id
    if quiz_data.section_id is not None: quiz.section_id = quiz_data.section_id
    if quiz_data.node_id is not None: quiz.node_id = quiz_data.node_id
    if quiz_data.topic is not None: quiz.topic = quiz_data.topic
    if quiz_data.difficulty is not None: quiz.difficulty = quiz_data.difficulty
    if quiz_data.question_text is not None: quiz.question_text = quiz_data.question_text
    if quiz_data.options is not None: 
        quiz.options = quiz_data.options
        flag_modified(quiz, "options")
    if quiz_data.correct_answer is not None: quiz.correct_answer = quiz_data.correct_answer
    if quiz_data.explanation is not None: quiz.explanation = quiz_data.explanation
    if quiz_data.question_type is not None: quiz.question_type = quiz_data.question_type
    
    await db.commit()
    return {"message": "Test sorusu güncellendi."}

@router.delete("/quizzes/{quiz_id}")
async def admin_delete_quiz(
    quiz_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(user_info)
    
    res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Test sorusu bulunamadı.")
        
    await db.delete(quiz)
    await db.commit()
    return {"message": "Test sorusu silindi."}
