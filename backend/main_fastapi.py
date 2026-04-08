from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from connect_db import SessionLocal, engine, Base
from starlette.middleware.sessions import SessionMiddleware
from routers import profile, courses, student_auth, teacher_auth, oauth, builder, payment
import os
from models import Student, Teacher, Course, Enrollment # quiz ekledim
from models.Quiz import Quiz

#yz için 
from fastapi import Request, HTTPException, Depends # <-- Bunları ekle
from sqlalchemy.orm import Session 
import quiz_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:        
        await conn.run_sync(Base.metadata.create_all) 
    yield

app = FastAPI(lifespan=lifespan)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. PROXY HEADERS (Railway için zorunlu)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Production veya Local tespiti
FRONTEND_URL = os.getenv("FRONTEND_URL")
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


@app.post("/generate_quiz")
async def generate_quiz(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    topic = data.get('topic')
    difficulty = data.get('difficult', 'Orta')

    if not topic:
        raise HTTPException(status_code=400, detail='Lütfen "topic" parametresi gönderin')

    result = quiz_service.generate_quiz_question(topic, difficulty)

    if result.get('success'):
        try:
            new_quiz = Quiz(
                topic=topic,
                difficulty=difficulty,
                question_text=result['quiz']['soru'],
                options=result['quiz']['secenekler'],
                correct_answer=result['quiz']['cevap']
            )
            db.add(new_quiz)
            db.commit()
            db.refresh(new_quiz)
            
            result['db_id'] = new_quiz.id
            return result
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Veritabanı kayıt hatası: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail="Quiz üretilemedi")

@app.get("/quizzes")
async def get_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).order_by(Quiz.id.desc()).all()
    return {
        "success": True,
        "count": len(quizzes),
        "data": [q.to_dict() for q in quizzes]
    }

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