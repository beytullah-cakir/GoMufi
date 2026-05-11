import asyncio
from sqlalchemy import text
from connect_db import engine

async def add_column():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN schedule JSONB DEFAULT '[]'::jsonb"))
            print("Successfully added 'schedule' column to 'courses' table.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
