import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from connect_db import SessionLocal
from sqlalchemy.future import select
from models.course import Course
from models.enrollment import Enrollment
from models.student import Student

async def check_data():
    async with SessionLocal() as db:
        # Check Courses
        res = await db.execute(select(Course))
        courses = res.scalars().all()
        print(f"Total Courses: {len(courses)}")
        for c in courses:
            print(f" - Course ID {c.id}: {c.title} (Teacher ID: {c.teacher_id})")

        # Check Enrollments
        res = await db.execute(select(Enrollment))
        enrollments = res.scalars().all()
        print(f"\nTotal Enrollments: {len(enrollments)}")
        for e in enrollments:
            print(f" - Enrollment: Student {e.student_id} in Course {e.course_id}")

        # Check Students
        res = await db.execute(select(Student))
        students = res.scalars().all()
        print(f"\nTotal Students: {len(students)}")
        for s in students:
            print(f" - Student ID {s.id}: {s.first_name} {s.last_name}")

if __name__ == "__main__":
    asyncio.run(check_data())
