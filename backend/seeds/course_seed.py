from sqlalchemy.future import select
from models.course import Course
from connect_db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends


sample_courses = [
    Course(teacher_id=1, title="Python Temelleri", progress=0),
    Course(teacher_id=1, title="Unity ile Oyun Geliştirme", progress=0),
    Course(teacher_id=2, title="Matematik Özel Ders", progress=0),
    Course(teacher_id=3, title="İngilizce Konuşma Pratiği", progress=0),
    Course(teacher_id=1, title="Web Geliştirme (HTML–CSS–JS)", progress=0),
]



async def add_sample_courses(db:AsyncSession=Depends(get_db)):
    result = await db.execute(select(Course))
    existing_courses = result.scalars().all()
    
    if len(existing_courses) == 0:
        for course in sample_courses:
            db.add(course)
        await db.commit()
        print(f"✅ {len(sample_courses)} kurs başarıyla eklendi!")
    else:
        print(f"ℹ️  Veritabanında zaten {len(existing_courses)} kurs var, seed atlanıyor.")
    
