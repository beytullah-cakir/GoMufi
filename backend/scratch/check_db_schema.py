import asyncio
from sqlalchemy import inspect
from connect_db import engine

async def check_columns():
    async with engine.connect() as conn:
        def get_cols(connection):
            inst = inspect(connection)
            return inst.get_columns("courses")
        
        columns = await conn.run_sync(get_cols)
        print("Columns in 'courses' table:")
        for col in columns:
            print(f"- {col['name']}")

if __name__ == "__main__":
    asyncio.run(check_columns())
