"""
Quiz router — AI tabanlı soru üretimi ve kurs atama endpoint'leri.
main_fastapi.py'den buraya taşındı.
"""
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from connect_db import get_db
from models.quiz import Quiz
import quiz_service

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate")
async def generate_quiz(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    topic = data.get("topic")
    difficulty = data.get("difficulty", "Orta")
    question_type = data.get("type", "multiple-choice")

    if not topic:
        raise HTTPException(status_code=400, detail='Lütfen "topic" parametresi gönderin')

    # Senkron quiz_service fonksiyonunu thread pool'da çalıştır — event loop'u bloke etmez
    result = await asyncio.to_thread(
        quiz_service.generate_quiz_question, topic, difficulty, question_type
    )

    if result.get("success"):
        try:
            new_quiz = Quiz(
                topic=topic,
                difficulty=difficulty,
                question_type=question_type,
                question_text=result["quiz"]["soru"],
                options=result["quiz"].get("secenekler"),
                correct_answer=result["quiz"]["cevap"],
                explanation=result["quiz"].get("aciklama"),
            )
            db.add(new_quiz)
            await db.commit()
            await db.refresh(new_quiz)

            result["db_id"] = new_quiz.id
            return result
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Veritabanı kayıt hatası: {str(e)}")
    else:
        error_msg = result.get("error", "Bilinmeyen quiz servis hatası")
        raise HTTPException(status_code=500, detail=f"Quiz üretilemedi: {error_msg}")


@router.get("/list")
async def get_quizzes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Quiz).order_by(Quiz.id.desc()))
    quizzes = result.scalars().all()
    return {
        "success": True,
        "count": len(quizzes),
        "data": [q.to_dict() for q in quizzes],
    }


@router.post("/assign")
async def assign_quiz(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    quiz_id = data.get("quiz_id")
    course_id = data.get("course_id")
    section_id = data.get("section_id")
    node_id = data.get("node_id")

    if not quiz_id or not course_id or node_id is None or section_id is None:
        raise HTTPException(
            status_code=400,
            detail="Eksik parametre: quiz_id, course_id, section_id veya node_id gerekli.",
        )

    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz bulunamadı.")

    try:
        quiz.course_id = int(course_id)
        quiz.section_id = str(section_id)
        quiz.node_id = int(node_id)

        await db.commit()
        await db.refresh(quiz)
        return {"success": True, "quiz": quiz.to_dict()}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Atama hatası: {str(e)}")


@router.get("/by-node")
async def get_quiz_by_node(
    course_id: int,
    section_id: str,
    node_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz)
        .where(
            Quiz.course_id == course_id,
            Quiz.section_id == section_id,
            Quiz.node_id == node_id,
        )
        .order_by(Quiz.id.asc())
    )
    quizzes = result.scalars().all()

    if not quizzes:
        return {"success": False, "message": "Bu düğüm için atanmış soru bulunamadı."}

    return {"success": True, "quizzes": [q.to_dict() for q in quizzes]}
