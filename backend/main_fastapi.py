from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from connect_db import SessionLocal, engine, Base
from starlette.middleware.sessions import SessionMiddleware
from routers import profile, courses, student_auth, teacher_auth, oauth
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

# 2. SESSION MIDDLEWARE
app.add_middleware(
    SessionMiddleware, 
    secret_key="supersecretkey" # Canlıda bunu os.getenv ile çekmeniz önerilir
)

# 3. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://go-mufi.vercel.app",
        "http://localhost:5173",
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

# Railway'de uvicorn genellikle Dockerfile CMD üzerinden başlatılır.
# Eğer yerelde çalıştıracaksanız bu blok kalabilir.
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000)) # Railway'in portunu oku
    uvicorn.run(app, host="0.0.0.0", port=port)