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
        return result
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
    quiz_data = data.get("quiz_data")
    course_id = data.get("course_id")
    section_id = data.get("section_id")
    node_id = data.get("node_id")

    if not quiz_data or not course_id or node_id is None or section_id is None:
        raise HTTPException(
            status_code=400,
            detail="Eksik parametre: quiz_data, course_id, section_id veya node_id gerekli.",
        )

    try:
        new_quiz = Quiz(
            topic=quiz_data.get("topic", "Genel"),
            difficulty=quiz_data.get("difficulty", "Orta"),
            question_type=quiz_data.get("type", "multiple-choice"),
            question_text=quiz_data.get("text", ""),
            options=quiz_data.get("options"),
            correct_answer=quiz_data.get("correctAnswer", ""),
            explanation=quiz_data.get("explanation", ""),
            course_id=int(course_id),
            section_id=str(section_id),
            node_id=int(node_id)
        )
        db.add(new_quiz)
        await db.commit()
        await db.refresh(new_quiz)
        return {"success": True, "quiz": new_quiz.to_dict()}
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
