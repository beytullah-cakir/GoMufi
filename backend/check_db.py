
import asyncio
from sqlalchemy.future import select
from connect_db import SessionLocal
from models import Quiz

async def check():
    session = SessionLocal()
    try:
        result = await session.execute(select(Quiz))
        quizzes = result.scalars().all()
        print("--- QUIZZES TABLE CONTENT ---")
        for q in quizzes:
            print(f"ID: {q.id} | Course: {q.course_id} | Section: '{q.section_id}' | Node: {q.node_id} | Topic: {q.topic}")
        print("--- END ---")
    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(check())
