from fastapi import APIRouter
from routers.auth import get_current_user

router = APIRouter()

@router.get("/profile")
def read_profile():
    user = get_current_user()

    if user is None:
        return {"error": "No user logged in"}

    return {
        "username": user["username"],
        "email": user["email"]
    }
