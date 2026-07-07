import asyncio
from connect_db import SessionLocal
from sqlalchemy.future import select
from models.course import Course
from models.student import Student
from models.enrollment import Enrollment

async def check():
    async with SessionLocal() as db:
        # Get courses
        res = await db.execute(select(Course))
        courses = res.scalars().all()
        print("COURSES:")
        for c in courses:
            print(f"Course: ID={c.id}, Title={c.title}, Classes={c.classes}")
            
        # Get enrollments
        res_e = await db.execute(select(Enrollment))
        enrollments = res_e.scalars().all()
        print("\nENROLLMENTS:")
        for e in enrollments:
            print(f"Enrollment: StudentID={e.student_id}, CourseID={e.course_id}")
            
        # Get students
        res_s = await db.execute(select(Student))
        students = res_s.scalars().all()
        print("\nSTUDENTS:")
        for s in students:
            print(f"Student: ID={s.id}, Name={s.first_name} {s.last_name}, Email={s.email}")

if __name__ == "__main__":
    asyncio.run(check())
