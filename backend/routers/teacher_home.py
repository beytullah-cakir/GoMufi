"""
Öğretmen ana paneli: "bugün neye bakmalıyım?" sorusunun cevabı.

  GET /teacher/home — sayılar, yapılacaklar, kurs performansı, son etkinlikler

Yapılacaklar listesi analizden türetilir: değerlendirme bekleyen teslimler,
yardım isteyen ve şu an takılı öğrenciler, sınıfın zorlandığı kavram,
okunmamış mesajlar. Hiçbiri yoksa liste boş döner — panel uydurmaz.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import learning_store
import teacher_summary
from auth.dependencies import get_current_teacher_id
from connect_db import get_db
from models.course import Course
from models.learning import LearningEvent, TaskProgress
from models.messaging import Conversation
from models.teaching import HelpRequest

router = APIRouter(tags=["teacher-home"])


@router.get("/teacher/home")
async def teacher_home(
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    courses = (await db.execute(select(Course).where(Course.teacher_id == teacher_id))).scalars().all()
    course_ids = [c.id for c in courses]
    signals = await teacher_summary.student_signals(db, courses, now)
    names = await teacher_summary.student_names(db, [sid for _, sid in signals])
    pending = await teacher_summary.pending_grading(db, course_ids)

    today = teacher_summary.local_midnight_utc(now)
    week = now - timedelta(days=7)
    active_today: set = set()
    active_week: set = set()
    if course_ids:
        for sid, last in (await db.execute(
            select(LearningEvent.student_id, func.max(LearningEvent.created_at))
            .where(LearningEvent.course_id.in_(course_ids), LearningEvent.created_at >= week)
            .group_by(LearningEvent.student_id)
        )).all():
            active_week.add(sid)
            if last >= today:
                active_today.add(sid)

    started = sum(s.tasks_started for s in signals.values())
    solved = sum(s.tasks_solved for s in signals.values())

    graded = []
    if course_ids:
        from models.homework_submission import HomeworkSubmission
        graded = [g for (g,) in (await db.execute(
            select(HomeworkSubmission.grade).where(
                HomeworkSubmission.course_id.in_(course_ids), HomeworkSubmission.grade.isnot(None))
        )).all()]

    help_open = []
    if course_ids:
        help_open = (await db.execute(
            select(HelpRequest).where(HelpRequest.course_id.in_(course_ids), HelpRequest.resolved_at.is_(None))
            .order_by(HelpRequest.created_at)
        )).scalars().all()

    unread = (await db.execute(
        select(func.coalesce(func.sum(Conversation.teacher_unread), 0)).where(
            Conversation.teacher_id == teacher_id, Conversation.teacher_archived.is_(False))
    )).scalar_one()

    # Kurs başına performans + sınıfın en çok zorlandığı kavram.
    course_rows = []
    struggling_concepts: List[Dict[str, Any]] = []
    stuck_now_list: List[Dict[str, Any]] = []
    for course in courses:
        rows = {sid: s for (cid, sid), s in signals.items() if cid == course.id}
        ctx = await learning_store.course_context(db, course.id)
        concept_counts: Counter = Counter()
        for s in rows.values():
            concept_counts.update(set(s.struggling))
        top = concept_counts.most_common(1)
        top_concept = None
        if top and ctx:
            concept_id, count = top[0]
            top_concept = {
                "concept_id": concept_id,
                "label": ctx.concepts.get(concept_id, {}).get("label", concept_id),
                "students": count,
            }
            struggling_concepts.append({**top_concept, "course_id": course.id, "course": course.title})
        c_started = sum(s.tasks_started for s in rows.values())
        c_solved = sum(s.tasks_solved for s in rows.values())
        course_rows.append({
            "id": course.id,
            "title": course.title,
            "students": len(rows),
            "modules": teacher_summary.course_node_count(course),
            "completion_rate": round(sum(s.progress for s in rows.values()) / len(rows)) if rows else None,
            "solve_rate": round(100 * c_solved / c_started) if c_started else None,
            "stuck_now": sum(1 for s in rows.values() if s.stuck_now),
            "struggling_students": sum(1 for s in rows.values() if s.status(now) == "struggling"),
            "pending_grading": pending.get(course.id, 0),
            "help_open": sum(1 for h in help_open if h.course_id == course.id),
            "top_concept": top_concept,
        })

    if course_ids:
        for p in (await db.execute(
            select(TaskProgress).where(
                TaskProgress.course_id.in_(course_ids),
                TaskProgress.last_activity_at >= now - timedelta(minutes=15),
            )
        )).scalars().all():
            row = {c: getattr(p, c) for c in (
                "attempts", "first_seen_at", "last_activity_at", "solved_at", "submitted_at",
                "last_outcome", "same_failure_streak",
            )}
            if teacher_summary.is_stuck_now(row, now):
                ctx = await learning_store.course_context(db, p.course_id)
                task = ctx.resolve_task(p.task_key) if ctx else None
                stuck_now_list.append({
                    "course_id": p.course_id, "student_id": p.student_id,
                    "student": names.get(p.student_id, f"Öğrenci #{p.student_id}"),
                    "task_key": p.task_key, "task": task["slide"]["title"] if task else p.task_key,
                    "last_failure": p.last_failure,
                })

    struggling_concepts.sort(key=lambda c: -c["students"])
    todos = _todos(sum(pending.values()), help_open, stuck_now_list, struggling_concepts, unread, courses)

    return {
        "student_count": len({sid for _, sid in signals}),
        "course_count": len(courses),
        "active_today": len(active_today),
        "active_week": len(active_week),
        "solve_rate": round(100 * solved / started) if started else None,
        "tasks_started": started,
        "avg_homework_grade": round(sum(graded) / len(graded), 1) if graded else None,
        "pending_grading": sum(pending.values()),
        "help_open": [{
            "id": h.id, "course_id": h.course_id, "student_id": h.student_id,
            "student": names.get(h.student_id, f"Öğrenci #{h.student_id}"),
            "task_key": h.task_key, "note": h.note, "at": h.created_at.isoformat(),
        } for h in help_open],
        "stuck_now": stuck_now_list,
        "unread_messages": int(unread or 0),
        "struggling_concepts": struggling_concepts[:3],
        "courses": course_rows,
        "todos": todos,
        "activity": await teacher_summary.recent_activity(db, list(courses), names),
    }


def _todos(pending: int, help_open, stuck_now, concepts, unread: int, courses) -> List[Dict[str, Any]]:
    """Bugün yapılacaklar: önem sırasıyla, her biri bir sayfaya götürür."""
    todos: List[Dict[str, Any]] = []
    if help_open:
        todos.append({
            "kind": "help", "priority": 1,
            "title": f"{len(help_open)} öğrenci yardım bekliyor",
            "detail": "Canlı panodan ipucu ya da mesaj gönderebilirsin.",
            "link": f"/instructor/learning?course={help_open[0].course_id}",
        })
    if stuck_now:
        todos.append({
            "kind": "stuck", "priority": 2,
            "title": f"{len(stuck_now)} öğrenci şu an bir görevde takılı",
            "detail": ", ".join(sorted({s['student'] for s in stuck_now})[:4]),
            "link": f"/instructor/learning?course={stuck_now[0]['course_id']}",
        })
    if pending:
        todos.append({
            "kind": "grading", "priority": 3,
            "title": f"{pending} teslim değerlendirme bekliyor",
            "detail": "Ödev ve görev teslimlerini puanla, geri bildirim yaz.",
            "link": "/instructor/homework-submissions",
        })
    if unread:
        todos.append({
            "kind": "messages", "priority": 4,
            "title": f"{unread} okunmamış mesaj",
            "detail": "Öğrenci ve velilerden gelen sorular.",
            "link": "/instructor/messages",
        })
    for concept in concepts[:2]:
        if concept["students"] < 2:
            continue
        todos.append({
            "kind": "concept", "priority": 5,
            "title": f"{concept['students']} öğrenci “{concept['label']}” kavramında zorlanıyor",
            "detail": f"{concept['course']} — tekrar görevi ya da kısa bir tekrar düşünebilirsin.",
            "link": f"/instructor/learning?course={concept['course_id']}&tab=concepts",
        })
    if not courses:
        todos.append({
            "kind": "setup", "priority": 9,
            "title": "İlk kursunu oluştur",
            "detail": "Yapay zekâ ile müfredat ve ders taslağı hazırlayabilirsin.",
            "link": "/instructor/courses",
        })
    return todos
