import asyncio
import json
import os
import sys
from connect_db import SessionLocal
from sqlalchemy.future import select
from models.course import Course
from models.teacher import Teacher

SEED_FILE = "shared_courses.json"

async def create_default_teacher_if_needed(db):
    res = await db.execute(select(Teacher))
    teacher = res.scalars().first()
    if not teacher:
        print("Default teacher creating...")
        from core.security import hash_password
        teacher = Teacher(
            first_name="GoMufi",
            last_name="Eğitmen",
            email="teacher@gomufi.com",
            password=hash_password("teacher123"),
            expertises="Python, Kodlama",
            bio="GoMufi Sistem Eğitmeni"
        )
        db.add(teacher)
        await db.commit()
        await db.refresh(teacher)
        print(f"Default teacher created: ID={teacher.id}, Email={teacher.email}")
    return teacher.id

async def export_courses():
    async with SessionLocal() as db:
        res = await db.execute(select(Course))
        courses = res.scalars().all()
        data = []
        for c in courses:
            data.append({
                "title": c.title,
                "description": c.description,
                "category": c.category,
                "progress": c.progress,
                "price": c.price,
                "learning_outcomes": c.learning_outcomes,
                "requirements": c.requirements,
                "curriculum": c.curriculum,
                "notes": c.notes,
                "rating": c.rating,
                "status": c.status,
                "schedule": c.schedule,
                "classes": c.classes,
                "start_date": c.start_date
            })
        
        with open(SEED_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully exported {len(data)} courses to '{SEED_FILE}'. You can now push this file to GitHub.")

async def import_courses():
    if not os.path.exists(SEED_FILE):
        print(f"Error: '{SEED_FILE}' not found! Run export first or make sure you pulled it from Git.")
        return

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with SessionLocal() as db:
        teacher_id = await create_default_teacher_if_needed(db)
        
        imported_count = 0
        for item in data:
            # Check if course with same title already exists to avoid duplication
            res = await db.execute(select(Course).where(Course.title == item["title"]))
            existing = res.scalars().first()
            if existing:
                print(f"Skipping duplicate course: '{item['title']}'")
                continue
                
            course = Course(
                teacher_id=teacher_id,
                title=item["title"],
                description=item.get("description"),
                category=item.get("category"),
                progress=item.get("progress", 0),
                price=item.get("price", 0),
                learning_outcomes=item.get("learning_outcomes", []),
                requirements=item.get("requirements", []),
                curriculum=item.get("curriculum", []),
                notes=item.get("notes", []),
                rating=item.get("rating", 5),
                status=item.get("status", "active"),
                schedule=item.get("schedule", []),
                classes=item.get("classes", []),
                start_date=item.get("start_date")
            )
            db.add(course)
            imported_count += 1
            
        await db.commit()
        print(f"Successfully imported {imported_count} courses from '{SEED_FILE}'.")

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ["export", "import"]:
        print("Usage: python seed_db.py [export|import]")
        sys.exit(1)
        
    action = sys.argv[1]
    if action == "export":
        asyncio.run(export_courses())
    elif action == "import":
        asyncio.run(import_courses())
