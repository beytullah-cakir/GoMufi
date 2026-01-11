from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from connect_db import SessionLocal, engine, Base
import asyncio
from starlette.middleware.sessions import SessionMiddleware
from routers import profile, courses, student_auth, teacher_auth, oauth
import uvicorn

# Modelleri import et - Bu, Base.metadata'ya tabloları kaydeder
# create_all çağrılmadan önce modellerin yüklenmesi GEREKLİDİR
from models import Student, Teacher, Course, Enrollment

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    async with engine.begin() as conn:        
        await conn.run_sync(Base.metadata.create_all)   
    
    yield

    pass


app = FastAPI(lifespan=lifespan)

app.add_middleware(SessionMiddleware, secret_key="supersecretkey")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://go-mufi.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(student_auth.router)
app.include_router(teacher_auth.router)
app.include_router(profile.router)
app.include_router(courses.router)
app.include_router(oauth.router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
