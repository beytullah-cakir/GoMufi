import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

DATABASE_URL = "postgresql+asyncpg://postgres.irjbpzhgoryppxyccgvk:betocakir.102@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

async def fix():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding section_id to quizzes table...")
        await conn.execute(text("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS section_id VARCHAR(100);"))
        print("Done!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix())
