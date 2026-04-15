from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from connect_db import SessionLocal, engine, Base, get_db
from starlette.middleware.sessions import SessionMiddleware
from routers import profile, courses, student_auth, teacher_auth, oauth, builder, payment
import os
from models import Student, Teacher, Course, Enrollment, Quiz 

#yz için 
from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import quiz_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:        
        await conn.run_sync(Base.metadata.create_all) 
    yield

app = FastAPI(lifespan=lifespan)

# get_db artık connect_db'den alınıyor.

# 1. PROXY HEADERS (Railway için zorunlu)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Production veya Local tespiti
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
is_production = FRONTEND_URL and "localhost" not in FRONTEND_URL and FRONTEND_URL.startswith("https")

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
async def generate_quiz(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    topic = data.get('topic')
    difficulty = data.get('difficulty', 'Orta')
    question_type = data.get('type', 'multiple-choice')

    if not topic:
        raise HTTPException(status_code=400, detail='Lütfen "topic" parametresi gönderin')

    # Note: quiz_service is sync, so it might block. 
    # But for now we continue like this for simplicity.
    result = quiz_service.generate_quiz_question(topic, difficulty, question_type)

    if result.get('success'):
        try:
            new_quiz = Quiz(
                topic=topic,
                difficulty=difficulty,
                question_type=question_type,
                question_text=result['quiz']['soru'],
                options=result['quiz'].get('secenekler'),
                correct_answer=result['quiz']['cevap'],
                explanation=result['quiz'].get('aciklama')
            )
            db.add(new_quiz)
            await db.commit()
            await db.refresh(new_quiz)
            
            result['db_id'] = new_quiz.id
            return result
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Veritabanı kayıt hatası: {str(e)}")
    else:
        # Error detail from the service
        error_msg = result.get('error', 'Bilinmeyen quiz servis hatası')
        raise HTTPException(status_code=500, detail=f"Quiz üretilemedi: {error_msg}")

@app.get("/quizzes")
async def get_quizzes(db: AsyncSession = Depends(get_db)):
    from sqlalchemy.future import select
    result = await db.execute(select(Quiz).order_by(Quiz.id.desc()))
    quizzes = result.scalars().all()
    return {
        "success": True,
        "count": len(quizzes),
        "data": [q.to_dict() for q in quizzes]
    }
@app.post("/assign_quiz")
async def assign_quiz(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    quiz_id = data.get('quiz_id')
    course_id = data.get('course_id')
    section_id = data.get('section_id')
    node_id = data.get('node_id')

    if not quiz_id or not course_id or node_id is None or section_id is None:
        print(f"DEBUG: assign_quiz EKSIK PARAMETRE - quiz_id: {quiz_id}, course_id: {course_id}, section_id: {section_id}, node_id: {node_id}")
        raise HTTPException(status_code=400, detail="Eksik parametre: quiz_id, course_id, section_id veya node_id gerekli.")

    print(f"DEBUG: assign_quiz basarili parametreler - quiz_id: {quiz_id}, course_id: {course_id}, section_id: {section_id}, node_id: {node_id}")

    from sqlalchemy.future import select
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz bulunamadı.")

    try:
        # Explicit casting to ensure DB compatibility
        quiz.course_id = int(course_id)
        quiz.section_id = str(section_id)
        quiz.node_id = int(node_id)
        
        await db.commit()
        await db.refresh(quiz)
        print(f"DEBUG: Atama BASARILI -> QuizID: {quiz.id}, Course: {quiz.course_id}, Section: {quiz.section_id}, Node: {quiz.node_id}")
        return {"success": True, "quiz": quiz.to_dict()}
    except Exception as e:
        await db.rollback()
        print(f"DEBUG: Atama HATASI -> {str(e)}")
        raise HTTPException(status_code=500, detail=f"Atama hatası: {str(e)}")

@app.get("/quiz_by_node")
async def get_quiz_by_node(course_id: int, section_id: str, node_id: int, db: AsyncSession = Depends(get_db)):
    print(f"DEBUG: get_quiz_by_node talep - course_id: {course_id}, section_id: {section_id}, node_id: {node_id}")
    from sqlalchemy.future import select
    result = await db.execute(
        select(Quiz).where(
            Quiz.course_id == course_id,
            Quiz.section_id == section_id,
            Quiz.node_id == node_id
        ).order_by(Quiz.id.desc())
    )
    quiz = result.scalar_one_or_none()
    
    if not quiz:
        print(f"DEBUG: get_quiz_by_node -> Soru bulunamadi (Course:{course_id}, Section:{section_id}, Node:{node_id})")
        return {"success": False, "message": "Bu düğüm için atanmış soru bulunamadı."}
        
    print(f"DEBUG: get_quiz_by_node -> Soru BULUNDU (ID: {quiz.id})")
    return {"success": True, "quiz": quiz.to_dict()}

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