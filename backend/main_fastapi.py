from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from connect_db import engine, Base
import asyncio
from routers import auth, profile, courses
import uvicorn

app = FastAPI()
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(create_tables())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# app.include_router(auth.router, prefix="/api")
# app.include_router(profile.router, prefix="/api")
# app.include_router(courses.router, prefix="/api")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(courses.router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
