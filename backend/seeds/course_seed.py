from sqlalchemy.future import select
from models.course import Course
from models.teacher import Teacher
from core.security import hash_password
from connect_db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends


sample_teachers_data = [
    {
        "first_name": "Ali",
        "last_name": "Yılmaz",
        "email": "ali.yilmaz@example.com",
        "department": "Yazılım",
        "password": hash_password("password123")
    },
    {
        "first_name": "Ayşe",
        "last_name": "Demir",
        "email": "ayse.demir@example.com",
        "department": "Müzik",
        "password": hash_password("password123")
    },
    {
        "first_name": "Mehmet",
        "last_name": "Kaya",
        "email": "mehmet.kaya@example.com",
        "department": "Dil",
        "password": hash_password("password123")
    },
]

sample_courses_data = [
    {
        "teacher_email": "ali.yilmaz@example.com", 
        "title": "Sıfırdan İleri Seviye Python Programlama", 
        "description": "Python dilini temelden başlayarak öğrenin. Veri analizi, web geliştirme ve yapay zeka uygulamaları ile yeteneklerinizi geliştirin.",
        "category": "Yazılım",
        "progress": 0
    },
    {
        "teacher_email": "ayse.demir@example.com", 
        "title": "Temel Müzik Teorisi ve Solfej Eğitimi", 
        "description": "Müziğin temellerini, nota okumayı ve ritim duygusunu geliştirmeyi hedefleyen kapsamlı bir başlangıç kursu.",
        "category": "Müzik",
        "progress": 0
    },
    {
        "teacher_email": "ali.yilmaz@example.com", 
        "title": "Dijital Çizim ve Karakter Tasarımı", 
        "description": "Tablet kullanarak dijital sanatın inceliklerini keşfedin. Kendi özgün karakterlerinizi tasarlamayı öğrenin.",
        "category": "Sanat",
        "progress": 0
    },
    {
        "teacher_email": "ayse.demir@example.com", 
        "title": "LGS Hazırlık Matematik Kampı", 
        "description": "Sınavlara yönelik pratik çözümler, yeni nesil soru taktikleri ve konu anlatımları ile matematiği sevin.",
        "category": "Matematik",
        "progress": 0
    },
    {
        "teacher_email": "mehmet.kaya@example.com", 
        "title": "İngilizce Speaking Club: Günlük Konuşma", 
        "description": "Akıcı İngilizce konuşmak için pratik odaklı, eğlenceli ve interaktif dersler.",
        "category": "Dil",
        "progress": 0
    },
]



async def add_sample_courses(db:AsyncSession=Depends(get_db)):
    # 1. Ensure Teachers exist
    for t_data in sample_teachers_data:
        stmt = select(Teacher).where(Teacher.email == t_data["email"])
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if not existing:
            print(f"Creating teacher {t_data['email']}...")
            new_teacher = Teacher(**t_data)
            db.add(new_teacher)
    
    await db.commit()
    
    # 2. Ensure Courses exist
    result_courses = await db.execute(select(Course))
    existing_courses = result_courses.scalars().all()
    
    if len(existing_courses) == 0:
        for course_data in sample_courses_data:
            # Map email to ID
            email = course_data.pop("teacher_email")
            stmt = select(Teacher).where(Teacher.email == email)
            result = await db.execute(stmt)
            t = result.scalar_one_or_none()
            
            if t:
                new_course = Course(teacher_id=t.id, **course_data)
                db.add(new_course)
            
        await db.commit()
        print(f"✅ {len(sample_courses_data)} kurs başarıyla eklendi!")
    else:
        print(f"ℹ️  Veritabanında zaten {len(existing_courses)} kurs var, seed atlanıyor.")
