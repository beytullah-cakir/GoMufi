import asyncio
import sys
import os

# Append current directory to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from connect_db import SessionLocal
from models.student import Student
from core.security import hash_password
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        q = select(Student).where(Student.email == "ogr@gomufi.com")
        res = await db.execute(q)
        existing = res.scalars().first()
        if existing:
            print("Student ogr@gomufi.com already exists. Updating password...")
            existing.password = hash_password("admin123")
            await db.commit()
            print("Password updated successfully!")
            return
        
        student = Student(
            first_name="Öğrenci",
            last_name="GoMufi",
            email="ogr@gomufi.com",
            nickname="ogrenci1",
            grade_level="5",
            education_level="Ortaokul",
            password=hash_password("admin123"),
            gems=100,
            hearts=5,
            xp=150
        )
        db.add(student)
        await db.commit()
        print("Student ogr@gomufi.com created successfully!")

if __name__ == "__main__":
    asyncio.run(main())
