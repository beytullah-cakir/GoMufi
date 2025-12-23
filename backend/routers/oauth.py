from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from core.oauth import oauth
from core.security import create_access_token
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.student import Student
from models.teacher import Teacher

router = APIRouter()

@router.get("/auth/google/login")
async def google_login(request: Request, role: str = "student"):
    redirect_uri = "http://localhost:8000/auth/google/callback"  # Hardcoded for local dev stability
    request.session['role'] = role
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/google/callback")
async def auth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        # Explicitly pass redirect_uri to match the one used in login
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OAuth Token Error: {str(e)}")
        
    try:
        user_info = token.get('userinfo')
        if not user_info:
            user_info = await oauth.google.userinfo(token=token)
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"User Info Error: {str(e)}")
        
    email = user_info.get('email')
    first_name = user_info.get('given_name', '')
    last_name = user_info.get('family_name', '')
    
    role = request.session.get('role', 'student')
    user_id = None
    is_new_user = False
    
    if role == 'student':
        result = await db.execute(select(Student).where(Student.email == email))
        user = result.scalars().first()
        
        if not user:
            is_new_user = True
            user = Student(
                first_name=first_name,
                last_name=last_name,
                email=email,
                nickname=first_name,
                password="",
                grade_level="Unknown",
                education_level="Unknown"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        user_id = user.id
        
    elif role == 'teacher':
        result = await db.execute(select(Teacher).where(Teacher.email == email))
        user = result.scalars().first()
        
        if not user:
            is_new_user = True
            user = Teacher(
                first_name=first_name,
                last_name=last_name,
                email=email,
                department="General",
                password=""
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        user_id = user.id
    
    access_token = create_access_token(user_id=str(user_id), role=role)
    
    redirect_url = "http://localhost:5173/complete-profile" if is_new_user else "http://localhost:5173/"
    response = RedirectResponse(url=redirect_url)
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    return response
