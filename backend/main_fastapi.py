"""
GoMufi — FastAPI ana uygulama dosyası.
"""
import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.csrf import CSRFMiddleware
from core.admin_audit import AdminAuditMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from connect_db import engine, Base, SessionLocal
from core.config import settings
from routers import profile, courses, student_auth, teacher_auth, oauth, builder, utils
from routers import quiz, ws, admin, ai, device_auth, devices, concepts, analytics, teacher_home, messages, live_teaching, rubrics, gradebook
from routers import parent_reports, parent_portal
from routers import password_reset, attendance, announcements, classroom, files, account, admin_ops, organizations, student_extras
from core.ws_manager import manager

# Logging seviyesi env'den kontrol edilebilir
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _keep_alive_ping():
    """
    Render.com free tier'ın 15 dakikalık uyku modunu engellemek için
    10 dakikada bir kendi /utils/health endpoint'ine istek atar.
    Sadece IS_PRODUCTION=True olduğunda çalışır.
    """
    import httpx
    # İlk ping'den önce uygulama tam olarak ayağa kalksın diye kısa bekleme
    await asyncio.sleep(30)
    ping_url = f"{settings.BACKEND_URL}/utils/health"
    logger.info(f"Keep-alive ping görevi başladı → {ping_url} (10 dk'da bir)")
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(ping_url)
                logger.debug(f"Keep-alive ping: {resp.status_code}")
        except Exception as e:
            logger.warning(f"Keep-alive ping başarısız: {e}")
        await asyncio.sleep(600)  # 10 dakika


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
                await conn.execute(text("ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS rubric_scores JSON;"))
                await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS meeting_url VARCHAR(500);"))
                # Kurs satışı kaldırıldı; eski kurulumlarda NOT NULL fiyat sütunu yeni kursu engellemesin.
                await conn.execute(text("ALTER TABLE courses DROP COLUMN IF EXISTS price;"))
                # Can ve elmas kaldırıldı (hataya ceza veren, işlevsiz mekanik).
                await conn.execute(text("ALTER TABLE students DROP COLUMN IF EXISTS hearts;"))
                await conn.execute(text("ALTER TABLE students DROP COLUMN IF EXISTS gems;"))
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
        
    # Süresi dolan kod görüntüleri ve yazım kaydı (bkz. learning_store.RETENTION_DAYS).
    try:
        import learning_store
        async with SessionLocal() as session:
            purged = await learning_store.purge_expired(session)
        logger.info("Öğrenme verisi temizliği: %s", purged)
    except Exception as purge_err:
        logger.warning(f"Öğrenme verisi temizliği atlandı: {purge_err}")

    await manager.initialize_redis()

    # Otomatik e-postalar (ödev hatırlatma, öğretmene teslim özeti) — saatte bir
    notifications_task = None
    if os.getenv("NOTIFICATIONS_ENABLED", "true").lower() != "false":
        from core import notifications
        notifications_task = asyncio.create_task(notifications.loop())

    # Keep-alive ping: sadece production'da çalışır, local geliştirmeyi etkilemez
    if settings.IS_PRODUCTION:
        asyncio.create_task(_keep_alive_ping())
        logger.info("Keep-alive ping görevi planlandı (10 dk aralıklı).")

    yield
    if notifications_task:
        notifications_task.cancel()
    await manager.close_redis()
    logger.info("Uygulama kapatılıyor.")


app = FastAPI(
    lifespan=lifespan,
    title="GoMufi API",
    description="Eğitim platformu backend API",
    version="1.0.0",
    # Canlıda API belgesi kapalı: bütün uçların haritasını herkese vermenin gereği yok.
    docs_url=None if settings.IS_PRODUCTION else "/docs",
    redoc_url=None if settings.IS_PRODUCTION else "/redoc",
    openapi_url=None if settings.IS_PRODUCTION else "/openapi.json",
)


from fastapi.exception_handlers import http_exception_handler as _default_http_handler
from fastapi.responses import JSONResponse as _JSONResponse
from starlette.exceptions import HTTPException as _StarletteHTTPException

_GENERIC_500 = "Sunucuda beklenmeyen bir hata oluştu. Lütfen biraz sonra tekrar dene."


@app.exception_handler(_StarletteHTTPException)
async def _hide_internal_details(request, exc):
    """Canlıda 500 hatalarının ayrıntısı (istisna metni: tablo adı, dosya yolu,
    SQL parçası…) kullanıcıya gitmez; loga yazılır. Yerelde ayrıntı görünür."""
    if exc.status_code >= 500 and settings.IS_PRODUCTION:
        logger.error("500 %s %s: %s", request.method, request.url.path, exc.detail)
        return _JSONResponse({"detail": _GENERIC_500}, status_code=exc.status_code)
    return await _default_http_handler(request, exc)

# 1. Proxy headers (Railway / production reverse proxy için)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# 2. Session middleware (Google OAuth için)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="gomufi_session",
    same_site="none" if settings.IS_PRODUCTION else "lax",
    https_only=settings.IS_PRODUCTION,
    max_age=3600,
)

# 3. CORS
# İzinli kökenler tek yerde (CORS, CSRF ve WebSocket aynı listeyi kullanır).
from core import origins as _origins
_allowed_origins = _origins.allowed_origins()
_dev_origin_regex = _origins.dev_origin_regex()

logger.info(f"CORS allowed origins: {_allowed_origins}")

# CSRF: çerezli değiştirici istekler yalnızca izinli kökenlerden (bkz. core/csrf.py).
# CORS'tan önce eklenir; böylece CORS en dışta kalır ve ret yanıtı da CORS başlığı taşır.
app.add_middleware(AdminAuditMiddleware)
app.add_middleware(CSRFMiddleware, allowed_origins=_allowed_origins, allowed_regex=_dev_origin_regex)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_dev_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Eski yüklemeler (yenileri veritabanında, /files altında — bkz. routers/files.py).
_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(os.path.join(_static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

# Router'ları kaydet
app.include_router(student_auth.router)
# VS Code eklentisi gibi tarayıcı dışı istemciler için Bearer token ucu
app.include_router(device_auth.router)
# Tarayici <-> VS Code eklentisi eslesmesi
app.include_router(devices.router)
app.include_router(teacher_auth.router)
app.include_router(profile.router)
app.include_router(courses.router)
app.include_router(oauth.router)
app.include_router(builder.router)
app.include_router(utils.router)
app.include_router(quiz.router)
app.include_router(ws.router)
app.include_router(admin.router)
app.include_router(ai.router)
# Dil bazlı kavram sözlüğü (kursa değil DİLE ait — bkz. concept_seeds.py)
app.include_router(concepts.router)
app.include_router(analytics.router)
# Öğretmen ana paneli: gerçek sayılar ve bugün yapılacaklar
app.include_router(teacher_home.router)
# Mesajlaşma: veritabanında, yalnızca karşı tarafa bildirim
app.include_router(messages.router)
# Canlı ders müdahaleleri: yardım isteği, ipucu, tahta, öneri takibi, öğretmen düzeltmeleri
app.include_router(live_teaching.router)
# Dereceli puanlama anahtarı kütüphanesi
app.include_router(rubrics.router)
# Not defteri: bileşenler ve ağırlıklı performans notu önerisi
app.include_router(gradebook.router)
# Veli raporu (öğretmen onaylar) ve veli portalı (gerçek veri, yazım kaydı izni)
app.include_router(parent_reports.router)
app.include_router(parent_portal.router)
# Okulun günlük işleri: şifremi unuttum, yoklama, duyurular
app.include_router(password_reset.router)
app.include_router(attendance.router)
app.include_router(announcements.router)
# Öğrenci modül ilerlemesi (sunucuda) ve öğretmenin sınıf ayarları (liderlik, tempo)
app.include_router(classroom.router)
app.include_router(student_extras.router)
app.include_router(files.router)
app.include_router(account.router)
app.include_router(admin_ops.router)
app.include_router(organizations.router)

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