from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from connect_db import SessionLocal, engine, Base
from starlette.middleware.sessions import SessionMiddleware
from routers import profile, courses, student_auth, teacher_auth, oauth, builder, payment
import os
from models import Student, Teacher, Course, Enrollment

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:        
        await conn.run_sync(Base.metadata.create_all) 
    yield

app = FastAPI(lifespan=lifespan)

# 1. PROXY HEADERS (Railway için zorunlu)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Production veya Local tespiti
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
is_production = "localhost" not in FRONTEND_URL and FRONTEND_URL.startswith("https")

# 2. SESSION MIDDLEWARE
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SECRET_KEY", "fallback-cok-gizli-anahtar"),
    same_site="none" if is_production else "lax", 
    https_only=is_production,  # Local'de HTTP (False), Production'da HTTPS (True)
    max_age=3600
)

# lifespan bloğu kalsın; Supabase'e bağlandığında tabloları otomatik oluşturur.

# 3. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.gomufi.com",         
        "https://gomufi.com",             
        "https://go-mufi.vercel.app",     
        "http://localhost:5173",    
        "http://127.0.0.1:5173",
        "http://0.0.0.0:5173", # Docker veya harici host erişimi için
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student_auth.router)
app.include_router(teacher_auth.router)
app.include_router(profile.router)
app.include_router(courses.router)
app.include_router(oauth.router)
app.include_router(builder.router)
app.include_router(payment.router)

# Railway'de uvicorn genellikle Dockerfile CMD üzerinden başlatılır.
# Eğer yerelde çalıştıracaksanız bu blok kalabilir.
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000)) # Railway'in portunu oku
    uvicorn.run(app, host="0.0.0.0", port=port)