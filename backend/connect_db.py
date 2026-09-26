import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

DATABASE_URL = settings.DATABASE_URL

# Railway'den gelen URL bazen 'postgresql://' ile başlar. 
# Bunu asenkron sürücü olan 'postgresql+asyncpg://' ile değiştirmeliyiz.
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Eğer DATABASE_URL None ise (Local çalışma durumu için koruma)
if not DATABASE_URL:
    raise ValueError("DATABASE_URL ortam değişkeni ayarlanmamış!")

# SQL günlüğü yalnızca açıkça istenirse (SQL_ECHO=1): açık olduğunda her sorgu
# parametreleriyle (e-posta, parola özeti, mesaj metni) log'a düşüyordu — KVKK.
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true"),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0}  # Required for Supabase/PgBouncer
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session