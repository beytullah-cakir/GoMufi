
import asyncio
from sqlalchemy.future import select
from connect_db import SessionLocal
from models.live_session import LiveSession
from models.course import Course

async def check():
    session = SessionLocal()
    try:
        print("--- LIVE SESSIONS ---")
        result = await session.execute(select(LiveSession))
        sessions = result.scalars().all()
        for s in sessions:
            print(f"ID: {s.id} | Course: {s.course_id} | Title: {s.title} | Day: {s.day_of_week} | Start: {s.start_time} | Status: {s.status}")
        
        print("\n--- COURSES ---")
        result = await session.execute(select(Course))
        courses = result.scalars().all()
        for c in courses:
            print(f"ID: {c.id} | Title: {c.title} | Teacher: {c.teacher_id}")
            print(f"  Curriculum: {c.curriculum}")
            
    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(check())
