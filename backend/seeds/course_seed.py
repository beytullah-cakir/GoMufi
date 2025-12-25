from sqlalchemy.future import select
from models.course import Course
from models.teacher import Teacher
from core.security import hash_password
from connect_db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends


sample_teachers = [
    Teacher(
        id=1,
        first_name="Ali",
        last_name="Yılmaz",
        email="ali.yilmaz@example.com",
        department="Yazılım",
        password=hash_password("password123")
    ),
    Teacher(
        id=2,
        first_name="Ayşe",
        last_name="Demir",
        email="ayse.demir@example.com",
        department="Müzik",
        password=hash_password("password123")
    ),
    Teacher(
        id=3,
        first_name="Mehmet",
        last_name="Kaya",
        email="mehmet.kaya@example.com",
        department="Dil",
        password=hash_password("password123")
    ),
]

sample_courses_data = [
    {
        "teacher_id": 1, 
        "title": "Sıfırdan İleri Seviye Python Programlama", 
        "description": "Python dilini temelden başlayarak öğrenin. Veri analizi, web geliştirme ve yapay zeka uygulamaları ile yeteneklerinizi geliştirin.",
        "category": "Yazılım",
        "progress": 0
    },
    {
        "teacher_id": 2, 
        "title": "Temel Müzik Teorisi ve Solfej Eğitimi", 
        "description": "Müziğin temellerini, nota okumayı ve ritim duygusunu geliştirmeyi hedefleyen kapsamlı bir başlangıç kursu.",
        "category": "Müzik",
        "progress": 0
    },
    {
        "teacher_id": 1, 
        "title": "Dijital Çizim ve Karakter Tasarımı", 
        "description": "Tablet kullanarak dijital sanatın inceliklerini keşfedin. Kendi özgün karakterlerinizi tasarlamayı öğrenin.",
        "category": "Sanat",
        "progress": 0
    },
    {
        "teacher_id": 2, 
        "title": "LGS Hazırlık Matematik Kampı", 
        "description": "Sınavlara yönelik pratik çözümler, yeni nesil soru taktikleri ve konu anlatımları ile matematiği sevin.",
        "category": "Matematik",
        "progress": 0
    },
    {
        "teacher_id": 3, 
        "title": "İngilizce Speaking Club: Günlük Konuşma", 
        "description": "Akıcı İngilizce konuşmak için pratik odaklı, eğlenceli ve interaktif dersler.",
        "category": "Dil",
        "progress": 0
    },
]



async def add_sample_courses(db:AsyncSession=Depends(get_db)):
    # 1. Ensure Teachers exist
    # We check specifically for the IDs we need (1, 2, 3)
    for teacher in sample_teachers:
        stmt = select(Teacher).where(Teacher.id == teacher.id)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if not existing:
            print(f"Creating teacher with ID {teacher.id}...")
            # Create a new instance to avoid any issues with the module-level object if reused
            new_teacher = Teacher(
                id=teacher.id,
                first_name=teacher.first_name,
                last_name=teacher.last_name,
                email=teacher.email,
                department=teacher.department,
                password=teacher.password
            )
            db.add(new_teacher)
    
    await db.commit()
    
    # 2. Ensure Courses exist
    result_courses = await db.execute(select(Course))
    existing_courses = result_courses.scalars().all()
    
    if len(existing_courses) == 0:
        for course_data in sample_courses_data:
            new_course = Course(**course_data)
            db.add(new_course)
        await db.commit()
        print(f"✅ {len(sample_courses_data)} kurs başarıyla eklendi!")
    else:
        print(f"ℹ️  Veritabanında zaten {len(existing_courses)} kurs var, seed atlanıyor.")
    
