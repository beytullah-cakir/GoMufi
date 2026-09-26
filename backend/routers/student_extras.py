"""
Öğrenciyi motive eden küçük parçalar.

  GET  /progress/badges                          rozetler (gerçek etkinlikten türetilir)
  GET  /progress/courses/{id}/review             "Zorlandığım konular" tekrarı: kavramlar + sorular
  POST /progress/courses/{id}/review/answer      {key, selected}  bir soruyu değerlendir
  POST /progress/courses/{id}/review/complete    {answers: [{key, selected}]}  tekrarı bitir (günde bir XP)
  GET  /student/upcoming-live                    önümüzdeki 24 saatteki canlı dersler (zil ve hatırlatma)

Harita sandıkları modül ilerlemesiyle birlikte: routers/classroom.py.
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

import learning_store
import review_session
from auth.dependencies import get_current_user_info
from connect_db import get_db
from core import badges, live_schedule, ratelimit, streak
from models.course import Course
from models.enrollment import Enrollment
from models.school import RewardClaim
from models.student import Student
from routers.classroom import _enrolled_course

router = APIRouter(tags=["student-extras"])


def _student_or_admin(user_info: dict) -> int:
    if user_info.get("role") not in ("student", "admin") or not str(user_info.get("sub")).isdigit():
        raise HTTPException(status_code=403, detail="Bu bölüm öğrenci hesaplarında.")
    return int(user_info["sub"])


@router.get("/progress/badges")
async def my_badges(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    return await badges.for_student(db, _student_or_admin(user_info))


# --- zorlandığım konular -----------------------------------------------------------

class AnswerIn(BaseModel):
    key: str = Field(..., min_length=1, max_length=250)
    selected: List[str] = Field(default_factory=list, max_length=10)


class CompleteReviewIn(BaseModel):
    answers: List[AnswerIn] = Field(default_factory=list, max_length=review_session.MAX_QUESTIONS)


async def _review_ctx(db: AsyncSession, course_id: int, user_info: dict):
    await _enrolled_course(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return ctx


@router.get("/progress/courses/{course_id}/review")
async def get_review(course_id: int, user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    ctx = await _review_ctx(db, course_id, user_info)
    student_id = int(user_info["sub"])
    data = await review_session.build(db, ctx, student_id)
    done = (await db.execute(select(RewardClaim.id).where(
        RewardClaim.student_id == student_id, RewardClaim.key == review_session.review_key(course_id, streak.today()))
    )).first() is not None
    return {**data, "done_today": done}


@router.post("/progress/courses/{course_id}/review/answer")
async def answer_review(course_id: int, body: AnswerIn, user_info: dict = Depends(get_current_user_info),
                        db: AsyncSession = Depends(get_db)):
    ctx = await _review_ctx(db, course_id, user_info)
    await ratelimit.check("review-answer", str(user_info["sub"]), per_minute=30, per_day=400)
    result = review_session.grade(ctx, body.key, body.selected)
    if not result:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    return result


@router.post("/progress/courses/{course_id}/review/complete")
async def complete_review(course_id: int, body: CompleteReviewIn, user_info: dict = Depends(get_current_user_info),
                          db: AsyncSession = Depends(get_db)):
    ctx = await _review_ctx(db, course_id, user_info)
    student_id = int(user_info["sub"])
    plan = await review_session.build(db, ctx, student_id)
    allowed = {q["key"] for q in plan["questions"]}
    results = [r for r in (review_session.grade(ctx, a.key, a.selected) for a in body.answers if a.key in allowed) if r]
    answered = len({r["key"] for r in results})
    if not plan["questions"] or answered < plan["min_answered"]:
        raise HTTPException(status_code=400, detail="Tekrarı bitirmek için soruları cevapla.")
    correct = sum(1 for r in results if r["correct"])
    claimed = (await db.execute(
        insert(RewardClaim).values(student_id=student_id, key=review_session.review_key(course_id, streak.today()),
                                   xp=review_session.REVIEW_XP, claimed_at=datetime.utcnow())
        .on_conflict_do_nothing(constraint="uq_reward_once").returning(RewardClaim.id)
    )).first()
    xp_awarded = review_session.REVIEW_XP if claimed else 0
    if xp_awarded:
        await db.execute(update(Student).where(Student.id == student_id).values(xp=Student.xp + xp_awarded))
    await streak.record(db, student_id, xp=xp_awarded)
    await db.commit()
    return {"answered": answered, "correct": correct, "xp_awarded": xp_awarded}


# --- canlı ders hatırlatması ---------------------------------------------------------

@router.get("/student/upcoming-live")
async def upcoming_live(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    student_id = _student_or_admin(user_info)
    courses = (await db.execute(
        select(Course).join(Enrollment, Enrollment.course_id == Course.id).where(Enrollment.student_id == student_id)
    )).scalars().all()
    now = datetime.utcnow()
    items = []
    for course in courses:
        items.extend(live_schedule.upcoming_for_student(course, student_id, now, timedelta(hours=24)))
    return {"now": now.isoformat() + "Z", "items": sorted(items, key=lambda i: i["start"])[:5]}
