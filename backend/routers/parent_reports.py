"""
Veli raporu: öğretmenin onayladığı kısa dönem özeti.

Öğretmen (kursun sahibi):
  GET    /analytics/courses/{id}/students/{sid}/parent-reports
  POST   /analytics/courses/{id}/students/{sid}/parent-reports   {days, use_ai, teacher_note}
  PUT    /analytics/parent-reports/{rid}                         {content}   (yalnızca taslak)
  POST   /analytics/parent-reports/{rid}/send
  DELETE /analytics/parent-reports/{rid}                                     (yalnızca taslak)

Akış: sistem dönemin sayılarını toplar (facts), YZ ya da şablon sade bir
taslak yazar, öğretmen düzenleyip gönderir. Veli YALNIZCA gönderilmiş raporu
görür; ham analiz (kod kökeni, yanılgı etiketleri, öğretmen notları) veliye
hiçbir zaman gitmez.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from core import plans
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import learning_insights
import learning_store
from auth.dependencies import get_current_user_info
from core import mailer
from core.config import settings
from connect_db import get_db
from core.permissions import ensure_course_owner
from learning_analytics import is_stuck, mastery_status
from models.course import Course
from models.enrollment import Enrollment
from models.parent import Parent
from models.homework_submission import HomeworkSubmission
from models.learning import ConceptMastery, LearningEvent, TaskProgress
from models.student import Student
from models.teaching import ParentReport

router = APIRouter(prefix="/analytics", tags=["parent-reports"])

LOCAL_TZ = ZoneInfo("Europe/Istanbul")
UTC = ZoneInfo("UTC")


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _local_date(value: datetime) -> str:
    return value.replace(tzinfo=UTC).astimezone(LOCAL_TZ).strftime("%Y-%m-%d")


async def build_facts(db: AsyncSession, ctx, student_id: int, start: datetime, end: datetime) -> Dict[str, Any]:
    """Dönemin veliye anlatılabilir sayıları. Ham kod ya da yanılgı metni YOK."""
    events = (await db.execute(
        select(LearningEvent).where(
            LearningEvent.course_id == ctx.course_id, LearningEvent.student_id == student_id,
            LearningEvent.created_at >= start, LearningEvent.created_at < end,
        )
    )).scalars().all()
    active_days = {_local_date(e.created_at) for e in events
                   if e.event_type not in learning_store.TEACHER_EVENT_TYPES}

    progress = (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id == ctx.course_id, TaskProgress.student_id == student_id)
    )).scalars().all()

    def title(key: str) -> str:
        task = ctx.resolve_task(key)
        return task["slide"]["title"] if task else key

    solved = [title(p.task_key) for p in progress if p.solved_at and start <= p.solved_at < end]
    stuck = [title(p.task_key) for p in progress if p.last_activity_at and start <= p.last_activity_at < end
             and is_stuck({c: getattr(p, c) for c in (
                 "attempts", "first_seen_at", "last_activity_at", "solved_at", "submitted_at",
                 "last_outcome", "same_failure_streak")})]
    modules = []
    for e in events:
        if e.event_type == "module_completed" and e.node_id:
            name = ctx.nodes.get(e.node_id, {}).get("title")
            if name and name not in modules:
                modules.append(name)
    quiz = [e for e in events if e.event_type == "quiz_answer"]

    subs = {str(s.node_id): s for s in (await db.execute(
        select(HomeworkSubmission).where(
            HomeworkSubmission.course_id == ctx.course_id, HomeworkSubmission.student_id == student_id)
    )).scalars().all()}
    now = datetime.utcnow()
    homework = []
    for slide in ctx.slides.values():
        if slide["type"] != "homework":
            continue
        sub = subs.get(slide["id"])
        due = slide.get("due")
        if sub and sub.graded_at and sub.grade is not None:
            status, grade = "notlandı", sub.grade
        elif sub:
            status, grade = "teslim edildi", None
        elif due and now > due:
            status, grade = "teslim edilmedi (süre doldu)", None
        else:
            status, grade = "henüz teslim edilmedi", None
        homework.append({"title": slide["title"], "status": status, "grade": grade,
                         "due": _local_date(due) if due else None})

    focus, strong = [], []
    for m in (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == ctx.course_id, ConceptMastery.student_id == student_id)
    )).scalars().all():
        label = ctx.concepts.get(m.concept_id, {}).get("label", m.concept_id)
        status = mastery_status(m.score, m.evidence_weight)
        if status == "zorlaniyor":
            focus.append(label)
        elif status == "hakim" and m.last_evidence_at and m.last_evidence_at >= start:
            strong.append(label)

    return {
        "period": f"{_local_date(start)} – {_local_date(end - timedelta(seconds=1))}",
        "active_days": len(active_days),
        "tasks_solved": solved[:8],
        "tasks_in_progress": stuck[:4],
        "modules_completed": modules[:6],
        "quiz": {"answered": len(quiz), "correct": sum(1 for e in quiz if e.outcome == "pass")},
        "homework": homework[:10],
        "strong_concepts": strong[:4],
        "focus_concepts": focus[:3],
        "help_requests": sum(1 for e in events if e.event_type == "help_request"),
    }


def _out(r: ParentReport) -> Dict[str, Any]:
    return {
        "id": r.id, "course_id": r.course_id, "student_id": r.student_id,
        "period_start": _iso(r.period_start), "period_end": _iso(r.period_end),
        "content": r.content or {}, "facts": r.facts or {}, "status": r.status,
        "ai_generated": r.ai_generated, "created_at": _iso(r.created_at),
        "sent_at": _iso(r.sent_at), "parent_seen_at": _iso(r.parent_seen_at),
    }


async def _enrolled(db: AsyncSession, course_id: int, student_id: int) -> Student:
    student = (await db.execute(
        select(Student).join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.course_id == course_id, Student.id == student_id)
    )).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    return student


@router.get("/courses/{course_id}/students/{student_id}/parent-reports")
async def list_reports(
    course_id: int,
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    student = await _enrolled(db, course_id, student_id)
    rows = (await db.execute(
        select(ParentReport).where(ParentReport.course_id == course_id, ParentReport.student_id == student_id)
        .order_by(ParentReport.created_at.desc())
    )).scalars().all()
    return {"reports": [_out(r) for r in rows], "has_parent": student.parent_id is not None}


class DraftIn(BaseModel):
    days: int = Field(7, ge=1, le=120)
    use_ai: bool = True
    teacher_note: str = Field("", max_length=2000)


@router.post("/courses/{course_id}/students/{student_id}/parent-reports")
async def create_draft(
    course_id: int,
    student_id: int,
    body: DraftIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
    _credit: None = Depends(plans.ai_credit_guard),  # öğretmenin YZ kredisi (core/plans.py)
):
    """Dönem taslağı: sayılar toplanır, YZ (ya da şablon) yazar. Gönderilmez — öğretmen onaylar."""
    course = await ensure_course_owner(db, course_id, user_info)
    student = await _enrolled(db, course_id, student_id)
    ctx = await learning_store.course_context(db, course_id)
    end = datetime.utcnow()
    start = end - timedelta(days=body.days)
    facts = await build_facts(db, ctx, student_id, start, end)

    content, ai_generated, response = None, False, None
    if body.use_ai:
        try:
            content, response = learning_insights.generate_parent_report(facts, student.first_name or "", ctx.title)
            ai_generated = bool(content.get("summary"))
        except Exception:  # noqa: BLE001 — YZ yoksa şablon; öğretmen yine düzenler
            content = None
    if not content or not content.get("summary"):
        content = learning_insights.template_parent_report(facts, student.first_name or "")
        ai_generated = False
    content["teacher_note"] = body.teacher_note.strip()

    row = ParentReport(course_id=course_id, student_id=student_id, teacher_id=course.teacher_id,
                       period_start=start, period_end=end, content=content, facts=facts,
                       status="draft", ai_generated=ai_generated)
    db.add(row)
    if response is not None:
        from routers.ai import record_ai_usage
        await record_ai_usage(db, course.teacher_id, "parent_report", learning_insights.settings.GEMINI_MODEL,
                              response, details="Veli raporu taslağı", course_id=course_id, course_title=ctx.title)
    await db.commit()
    await db.refresh(row)
    return {"report": _out(row)}


async def _own_report(db: AsyncSession, report_id: int, user_info: dict) -> ParentReport:
    row = (await db.execute(select(ParentReport).where(ParentReport.id == report_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı.")
    await ensure_course_owner(db, row.course_id, user_info)
    return row


class ContentIn(BaseModel):
    content: Dict[str, Any]


@router.put("/parent-reports/{report_id}")
async def update_report(
    report_id: int,
    body: ContentIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    row = await _own_report(db, report_id, user_info)
    if row.status != "draft":
        raise HTTPException(status_code=409, detail="Gönderilmiş rapor değiştirilemez.")
    clean = learning_insights.clean_parent_report(body.content)
    clean["teacher_note"] = str(body.content.get("teacher_note") or "").strip()[:2000]
    if not clean["summary"]:
        raise HTTPException(status_code=400, detail="Özet boş olamaz.")
    row.content = clean
    await db.commit()
    return {"report": _out(row)}


def report_email(report: ParentReport, student: Student, course_title: str):
    content = report.content or {}
    child = f"{student.first_name or ''} {student.last_name or ''}".strip() or "Öğrenciniz"
    paragraphs = [f"{child} için {course_title} kursunun dönem raporu hazır."]
    if content.get("summary"):
        paragraphs.append(str(content["summary"]))
    for label, key in (("Öğrendikleri", "learned"), ("Odaklanılacaklar", "focus")):
        items = [str(x) for x in content.get(key) or [] if x]
        if items:
            paragraphs.append(f"{label}:\n" + "\n".join(f"• {x}" for x in items))
    if content.get("homework"):
        paragraphs.append(f"Ödevler: {content['homework']}")
    if content.get("teacher_note"):
        paragraphs.append(f"Öğretmenin notu: {content['teacher_note']}")
    return mailer.render(f"{child} · dönem raporu", paragraphs,
                         ("Raporu veli panelinde aç", f"{settings.FRONTEND_URL.rstrip('/')}/parent"))


@router.post("/parent-reports/{report_id}/send")
async def send_report(
    report_id: int,
    background: BackgroundTasks,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    row = await _own_report(db, report_id, user_info)
    if row.status == "sent":
        return {"report": _out(row)}
    student = (await db.execute(select(Student).where(Student.id == row.student_id))).scalar_one()
    if student.parent_id is None:
        raise HTTPException(status_code=409, detail="Bu öğrenciye bağlı bir veli hesabı yok; rapor gönderilemez.")
    row.status, row.sent_at = "sent", datetime.utcnow()
    await db.commit()
    try:
        from core.ws_manager import manager
        await manager.publish({"type": "parent_report", "studentId": row.student_id, "reportId": row.id,
                               "target_user": f"parent:{student.parent_id}"})
    except Exception:  # noqa: BLE001
        pass
    # Veli uygulamayı açmasa da raporu görsün.
    parent_email = (await db.execute(select(Parent.email).where(Parent.id == student.parent_id))).scalar()
    # Rapor veli uygulamasına her pakette gider; e-posta kopyası ücretli paketlerde.
    teacher_id = (await db.execute(select(Course.teacher_id).where(Course.id == row.course_id))).scalar()
    email_allowed = teacher_id is None or (await plans.entitlements(db, teacher_id)).parent_report_email
    if parent_email and email_allowed:
        course_title = (await db.execute(select(Course.title).where(Course.id == row.course_id))).scalar() or "GoMufi"
        text, html_body = report_email(row, student, course_title)
        background.add_task(mailer.send_email, parent_email, f"GoMufi dönem raporu · {course_title}", text, html_body)
    return {"report": _out(row), "email_sent": bool(parent_email and email_allowed),
            "email_note": None if email_allowed else "Rapor veli uygulamasına gönderildi. E-posta kopyası ücretli paketlerde."}


@router.delete("/parent-reports/{report_id}")
async def delete_report(
    report_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    row = await _own_report(db, report_id, user_info)
    if row.status != "draft":
        raise HTTPException(status_code=409, detail="Gönderilmiş rapor silinemez.")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
