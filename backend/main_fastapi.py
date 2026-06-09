"""
GoMufi — FastAPI ana uygulama dosyası.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from connect_db import engine, Base
from core.config import settings
from routers import profile, courses, student_auth, teacher_auth, oauth, builder, payment, utils
from routers import quiz

# Logging seviyesi env'den kontrol edilebilir
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başladığında tabloları oluştur."""
    logger.info("Uygulama başlatılıyor — tablo oluşturma kontrol ediliyor...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Tablolar hazır.")
    except Exception as e:
        logger.error(f"Tablo oluşturma hatası: {e}")
    yield
    logger.info("Uygulama kapatılıyor.")


app = FastAPI(
    lifespan=lifespan,
    title="GoMufi API",
    description="Eğitim platformu backend API",
    version="1.0.0",
)

# 1. Proxy headers (Railway / production reverse proxy için)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# 2. Session middleware (Google OAuth için)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="gomufi_session",
    same_site="lax",
    https_only=settings.IS_PRODUCTION,
    max_age=3600,
)

# 3. CORS
_allowed_origins = [
    "https://www.gomufi.com",
    "https://gomufi.com",
    "https://go-mufi.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://0.0.0.0:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları kaydet
app.include_router(student_auth.router)
app.include_router(teacher_auth.router)
app.include_router(profile.router)
app.include_router(courses.router)
app.include_router(oauth.router)
app.include_router(builder.router)
app.include_router(payment.router)
app.include_router(utils.router)
app.include_router(quiz.router)

# Eski endpoint yollarıyla geriye dönük uyumluluk (frontend güncellenene kadar)
# /generate_quiz -> /quiz/generate
# /quizzes       -> /quiz/list
# /assign_quiz   -> /quiz/assign
# /quiz_by_node  -> /quiz/by-node
from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from connect_db import get_db

@app.post("/generate_quiz", include_in_schema=False)
async def generate_quiz_legacy(request: Request, db: AsyncSession = Depends(get_db)):
    """Eski endpoint — geriye dönük uyumluluk için korunuyor."""
    from routers.quiz import generate_quiz
    return await generate_quiz(request, db)

@app.get("/quizzes", include_in_schema=False)
async def get_quizzes_legacy(db: AsyncSession = Depends(get_db)):
    from routers.quiz import get_quizzes
    return await get_quizzes(db)

@app.post("/assign_quiz", include_in_schema=False)
async def assign_quiz_legacy(request: Request, db: AsyncSession = Depends(get_db)):
    from routers.quiz import assign_quiz
    return await assign_quiz(request, db)

@app.get("/quiz_by_node", include_in_schema=False)
async def get_quiz_by_node_legacy(
    course_id: int,
    section_id: str,
    node_id: int,
    db: AsyncSession = Depends(get_db),
):
    from routers.quiz import get_quiz_by_node
    return await get_quiz_by_node(course_id, section_id, node_id, db)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)