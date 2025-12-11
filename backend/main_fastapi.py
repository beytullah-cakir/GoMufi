from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from connect_db import SessionLocal, engine, Base
import asyncio
from routers import profile, courses
import uvicorn
from seeds.course_seed import add_sample_courses

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Tabloları oluştur ve seed data ekle
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Sample kursları ekle
    # async with SessionLocal() as db:
    #     await add_sample_courses(db)    
    yield

    pass


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(courses.router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
