import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# Railway 'DATABASE_URL' isminde bir değişkeni otomatik sağlar. 
# Eğer o yoksa, Docker içindeki 'db:5432' adresini kullanır.
# O da yoksa (local/docker dışı), localhost'u kullanır.
DATABASE_URL = os.getenv("DATABASE_URL")

# ÖNEMLİ: Railway bazen url'i "postgres://" ile başlatır, 
# ama SQLAlchemy "postgresql+asyncpg://" bekler. Bunu düzeltelim:
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif "postgresql://" in DATABASE_URL and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session