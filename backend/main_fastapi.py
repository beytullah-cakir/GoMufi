"""
GoMufi — FastAPI ana uygulama dosyası.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from connect_db import engine, Base
from core.config import settings
from routers import profile, courses, student_auth, teacher_auth, oauth, builder, payment, utils
from routers import quiz, ws, jitsi, admin, ai
from core.ws_manager import manager

# Logging seviyesi env'den kontrol edilebilir
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başladığında tabloları ve Redis bağlantısını oluştur."""
    logger.info("Uygulama başlatılıyor — tablo oluşturma kontrol ediliyor...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS classes JSON DEFAULT '[]';"))
                await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS start_date VARCHAR(50);"))
                await conn.execute(text("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS details VARCHAR;"))
                await conn.execute(text("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS course_id INTEGER;"))
                await conn.execute(text("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS course_title VARCHAR;"))
                await conn.execute(text("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS thoughts_tokens INTEGER DEFAULT 0;"))
                logger.info("Database migration: classes, start_date, and ai_usage_logs details/course_id/course_title checked/added.")
            except Exception as dberr:
                logger.warning(f"Alter table column checking: {dberr}")
            
            # Clean up dangling live sessions from previous runs
            try:
                await conn.execute(text("UPDATE live_sessions SET status = 'ended' WHERE status = 'live';"))
                logger.info("Database cleanup: Leftover live sessions marked as ended on startup.")
            except Exception as cleanerr:
                logger.warning(f"Live sessions cleanup failed: {cleanerr}")
        logger.info("Tablolar hazır.")
    except Exception as e:
        logger.error(f"Tablo oluşturma hatası: {e}")
        
    await manager.initialize_redis()
    yield
    await manager.close_redis()
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
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Yüklenen dosyalar (builder/upload-image ve upload-chat-file bu yolu döndürür).
# NOT: Bu dizin container içinde kalıcı DEĞİLDİR — kalıcılık için object storage gerekir.
_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(os.path.join(_static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

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
app.include_router(ws.router)
app.include_router(jitsi.router)
app.include_router(admin.router)
app.include_router(ai.router)

# Eski endpoint yollarıyla geriye dönük uyumluluk (frontend güncellenene kadar)
# /generate_quiz -> /quiz/generate
# /quizzes       -> /quiz/list
# /assign_quiz   -> /quiz/assign
# /quiz_by_node  -> /quiz/by-node
from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from connect_db import get_db
from auth.dependencies import get_current_user_info, get_current_teacher_id
from routers import quiz as quiz_router

# NOT: Bu shim'ler router'daki fonksiyonları düz Python fonksiyonu gibi çağırır;
# bu yüzden hedef fonksiyonun dependency'lerini burada da bildirip elden geçirmek
# ZORUNLUDUR. Aksi halde yetki kontrolleri sessizce atlanır.

@app.post("/generate_quiz", include_in_schema=False)
async def generate_quiz_legacy(
    request: Request,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """Eski endpoint — geriye dönük uyumluluk için korunuyor."""
    return await quiz_router.generate_quiz(request, teacher_id, db)

@app.get("/quizzes", include_in_schema=False)
async def get_quizzes_legacy(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    return await quiz_router.get_quizzes(user_info, db)

@app.post("/assign_quiz", include_in_schema=False)
async def assign_quiz_legacy(
    request: Request,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    return await quiz_router.assign_quiz(request, user_info, db)

@app.get("/quiz_by_node", include_in_schema=False)
async def get_quiz_by_node_legacy(
    course_id: int,
    section_id: str,
    node_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    return await quiz_router.get_quiz_by_node(course_id, section_id, node_id, user_info, db)


if __name__ == "__main__":
    import uvicorn
    from urllib.parse import urlparse
    
    # Yerel geliştirme ortamında (IS_PRODUCTION False ise) daima BACKEND_URL'deki portu veya 8000'i kullan,
    # böylece sistemdeki diğer çevre değişkenleri (PORT gibi) çakışma yaratmaz.
    # Production ortamında ise platformun (örn. Railway) atadığı PORT env varını kullan.
    if settings.IS_PRODUCTION:
        port = int(os.getenv("PORT", 8000))
    else:
        try:
            parsed = urlparse(settings.BACKEND_URL)
            port = parsed.port if parsed.port and parsed.port > 0 else 8000
        except Exception:
            port = 8000
            
    logger.info(f"Uygulama {port} portu üzerinde başlatılıyor...")
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)