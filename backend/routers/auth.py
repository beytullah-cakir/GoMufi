from fastapi import APIRouter
from models.user_models import RegisterRequest, LoginRequest

router = APIRouter()

users = []
current_user = None


@router.post("/register")
def register_user(data: RegisterRequest):
    global current_user

    new_user = {
        "username": data.name,
        "email": data.email,
        "password": data.password
    }

    users.append(new_user)
    current_user = new_user

    return {"status": "registered"}


@router.post("/login")
def login_user(data: LoginRequest):
    global current_user

    for user in users:
        if user["email"] == data.email and user["password"] == data.password:
            current_user = user
            return {"status": "logged_in"}

    return {"error": "Invalid credentials"}

def get_current_user():
    return current_user

def get_users():
    return users
