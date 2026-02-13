import os
from fastapi import APIRouter, Request, HTTPException, Depends, Response
from fastapi.responses import RedirectResponse
from core.oauth import oauth
from core.security import create_access_token
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.student import Student
from models.teacher import Teacher
from models.parent import Parent

router = APIRouter()

# Environment variables for OAuth URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

@router.get("/auth/google/login")
async def google_login(request: Request, role: str):
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    request.session['role'] = role
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/google/callback")
async def auth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
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
        

        role = request.session.get('role')        
            
        user_id = None
        is_new_user = False
        
        print(f"DEBUG: Processing login for {email} with role {role}")
        
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
                    expertises="",
                    bio="",
                    password=""
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            user_id = user.id
        elif role == 'parent':
            result = await db.execute(select(Parent).where(Parent.email == email))
            user = result.scalars().first()
            
            if not user:
                is_new_user = True
                user = Parent(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    hashed_password=""
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            user_id = user.id
        else:
            raise HTTPException(status_code=400, detail=f"Invalid role in session: {role}")
        
        if user_id is None:
            raise HTTPException(status_code=500, detail="User ID could not be determined")
        
        # Check for incomplete profile
        is_profile_incomplete = False
        if role == 'student':
            if user.grade_level == "Unknown" or user.education_level == "Unknown" or not user.nickname:
                is_profile_incomplete = True
        elif role == 'teacher':
             if not user.expertises or user.expertises == "General":
                is_profile_incomplete = True

        access_token = create_access_token(user_id=str(user_id), role=role)
        
        print(f"DEBUG: Redirect decision - Role: {role}, IsNew: {is_new_user}, Incomplete: {is_profile_incomplete}")
        
        if (is_new_user or is_profile_incomplete) and role != 'parent':
            redirect_url = f"{FRONTEND_URL.rstrip('/')}/complete-profile"
        elif role == 'teacher':
            redirect_url = f"{FRONTEND_URL.rstrip('/')}/instructor"
        elif role == 'student':
            redirect_url = f"{FRONTEND_URL.rstrip('/')}/student"
        elif role == 'parent':
            redirect_url = f"{FRONTEND_URL.rstrip('/')}/parent"
        else:
            print(f"DEBUG: Unknown role {role}, defaulting to root")
            redirect_url = f"{FRONTEND_URL.rstrip('/')}/"

        print(f"DEBUG: Redirecting to {redirect_url}")
        response = RedirectResponse(url=redirect_url)
        
        is_production = "localhost" not in FRONTEND_URL
        
        response.set_cookie(
            key="access_token", 
            value=access_token, 
            httponly=True,
            secure=True, # True in production (HTTPS), False in dev (HTTP)
            samesite='None' if is_production else 'Lax', # None for cross-site (prod), Lax for local
            path="/"
        )
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal Callback Error: {str(e)}")


@router.post("/auth/logout")
async def logout(response: Response):
    try:
        is_production = "localhost" not in FRONTEND_URL
    
        response.delete_cookie(
            key="access_token",
            path="/",
            secure=is_production,
            httponly=True,
            samesite='None' if is_production else 'Lax'
        )
        
        return {"message": "Successfully logged out"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Logout Error: {str(e)}")
    

