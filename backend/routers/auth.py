from fastapi import APIRouter, Depends
from models.auth_request import RegisterRequest, LoginRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.user import User


router = APIRouter()

users = []
current_user = None


@router.post("/register")
async def register_user(data: RegisterRequest,db:AsyncSession = Depends(get_db)):
    global current_user

    new_user = User(
        username=data.name,
        email=data.email,
        password=data.password
    )

    db.add(new_user)
    await db.commit()
    current_user = new_user

    return {"status": "registered"}


@router.post("/login")
async def login_user(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    global current_user

    result = await db.execute(
        select(User).where(User.email == data.email, User.password == data.password)
    )
    user = result.scalars().first()
    if user:
        return {"status": "logged_in", "username": user.username}
    return {"error": "Invalid credentials"}

def get_current_user():
    return current_user

def get_users():
    return users
