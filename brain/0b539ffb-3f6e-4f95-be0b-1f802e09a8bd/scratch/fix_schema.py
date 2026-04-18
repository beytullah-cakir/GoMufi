import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from connect_db import engine
from sqlalchemy import text

async def fix_schema():
    async with engine.begin() as conn:
        print("Checking for 'rating' column in 'courses' table...")
        # Check if column exists
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='courses' AND column_name='rating';"))
        exists = res.fetchone()
        
        if not exists:
            print("Adding 'rating' column...")
            await conn.execute(text("ALTER TABLE courses ADD COLUMN rating INTEGER DEFAULT 5;"))
            print("Column 'rating' added successfully.")
        else:
            print("Column 'rating' already exists.")

if __name__ == "__main__":
    asyncio.run(fix_schema())
