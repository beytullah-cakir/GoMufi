"""
Veli portalı: çocuğunun gerçek durumu, öğretmenin gönderdiği raporlar ve
yazım kaydı izni.

  GET /parent/students/{sid}/overview   — kurs başına ilerleme, ödevler, etkinlik
  GET /parent/students/{sid}/reports    — öğretmenin GÖNDERDİĞİ raporlar (okundu işaretlenir)
  GET /parent/students/{sid}/consent    — yazım kaydı aydınlatması ve mevcut karar
  PUT /parent/students/{sid}/consent    — {status: granted | denied}

Eskiden veli sayfası uydurma sayılarla doluydu ("42 saat", "%95 katılım",
sabit bir "eğitmen notu", örnek ders geçmişi). Buradaki her şey gerçek veri;
veliye ham analiz (kod kökeni, yanılgı etiketleri, öğretmenin özel notları)
gönderilmez.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import homework_rules
import learning_store
import learning_views
import teacher_summary
from auth.dependencies import get_current_user_info
from connect_db import get_db
from models.course import Course
from models.enrollment import Enrollment
from models.homework_submission import HomeworkSubmission
from models.learning import LearningEvent
from models.student import Student
from models.teacher import Teacher
from models.teaching import ParentReport, RecordingConsent

router = APIRouter(prefix="/parent", tags=["parent-portal"])

# Aydınlatma metni. Metin değişirse sürüm artırılır; eski onaylar eski sürüme bağlı kalır.
RECORDING_NOTICE_VERSION = "2026-09"
RECORDING_NOTICE = {
    "version": RECORDING_NOTICE_VERSION,
    "title": "Kodlama görevlerinde yazım kaydı",
    "paragraphs": [
        "Çocuğunuz kodlama görevlerini çözerken, görev dosyasına yazdığı, sildiği ve yapıştırdığı "
        "metin kaydedilir (yazım kaydı). Bu kayıt yalnızca görev dosyalarını kapsar; bilgisayardaki "
        "başka dosyalar, tarayıcı geçmişi, ekran ya da kamera kaydedilmez.",
        "Amaç öğretmenin çocuğunuzun nerede zorlandığını görebilmesi ve kodun ne kadarının çocuğunuzun "
        "kendi yazdığı olduğunu anlayabilmesidir. Bu bilgi bir not ya da ceza değildir; öğretmen bunu "
        "çocuğunuzla konuşmak ve ona yardım etmek için kullanır.",
        "Kayıtları yalnızca kursun öğretmeni görür. Diğer öğrenciler ve siz ham kaydı görmezsiniz. "
        "Kod içeren kayıtlar 180 gün sonra silinir.",
        "Yazım kaydını kapatırsanız çocuğunuzun görevleri çalışmaya devam eder; yalnızca yazma/yapıştırma "
        "ayrıntısı saklanmaz. Görev kontrol edildiği andaki kod, öğretmenin yardım edebilmesi için yine görülür.",
    ],
}


async def _child(db: AsyncSession, user_info: dict, student_id: int) -> Student:
    if user_info.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Bu sayfa velilere özeldir.")
    child = (await db.execute(
        select(Student).where(Student.id == student_id, Student.parent_id == int(user_info["sub"]))
    )).scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı.")
    return child


async def consent_status(db: AsyncSession, student_id: int) -> Optional[str]:
    row = (await db.execute(
        select(RecordingConsent).where(RecordingConsent.student_id == student_id)
    )).scalar_one_or_none()
    return row.status if row else None


@router.get("/students/{student_id}/overview")
async def child_overview(
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    child = await _child(db, user_info, student_id)
    courses = (await db.execute(
        select(Course).join(Enrollment, Enrollment.course_id == Course.id).where(Enrollment.student_id == student_id)
    )).scalars().all()
    signals = await teacher_summary.student_signals(db, courses)
    teachers = {tid: f"{f or ''} {l or ''}".strip() for tid, f, l in (await db.execute(
        select(Teacher.id, Teacher.first_name, Teacher.last_name).where(Teacher.id.in_([c.teacher_id for c in courses] or [-1]))
    )).all()}
    now = datetime.utcnow()
    two_weeks = now - timedelta(days=14)

    out_courses: List[Dict[str, Any]] = []
    for course in courses:
        sig = signals.get((course.id, student_id)) or teacher_summary.StudentSignal()
        ctx = await learning_store.course_context(db, course.id)
        subs = {str(s.node_id): s for s in (await db.execute(
            select(HomeworkSubmission).where(
                HomeworkSubmission.course_id == course.id, HomeworkSubmission.student_id == student_id)
        )).scalars().all()}
        homework = []
        for slide in (ctx.slides.values() if ctx else []):
            if slide["type"] != "homework":
                continue
            sub = subs.get(slide["id"])
            due = slide.get("due")
            homework.append({
                "title": slide["title"],
                "due_at": homework_rules.due_iso(due),
                "submitted": bool(sub),
                "late": homework_rules.is_late(sub.submitted_at, due) if sub else False,
                "overdue": not sub and bool(due) and now > due,
                "grade": sub.grade if sub and sub.graded_at else None,
                "feedback": sub.feedback if sub and sub.graded_at else None,
            })
        active_days = (await db.execute(
            select(func.count(func.distinct(func.date(LearningEvent.created_at)))).where(
                LearningEvent.course_id == course.id, LearningEvent.student_id == student_id,
                LearningEvent.created_at >= two_weeks,
                LearningEvent.event_type.notin_(tuple(learning_store.TEACHER_EVENT_TYPES)),
            )
        )).scalar() or 0
        out_courses.append({
            "id": course.id,
            "title": course.title,
            "teacher": teachers.get(course.teacher_id) or "Öğretmen",
            "progress": sig.progress,
            "modules_done": sig.modules_done,
            "modules_total": sig.modules_total,
            "tasks_solved": sig.tasks_solved,
            "active_days_14": int(active_days),
            "last_activity_at": sig.last_activity.isoformat() if sig.last_activity else None,
            "homework": homework,
        })

    latest = (await db.execute(
        select(ParentReport).where(ParentReport.student_id == student_id, ParentReport.status == "sent")
        .order_by(ParentReport.sent_at.desc()).limit(1)
    )).scalar_one_or_none()
    unread = (await db.execute(
        select(func.count(ParentReport.id)).where(
            ParentReport.student_id == student_id, ParentReport.status == "sent",
            ParentReport.parent_seen_at.is_(None))
    )).scalar() or 0

    return {
        "student": {
            "id": child.id, "first_name": child.first_name, "last_name": child.last_name,
            "nickname": child.nickname, "grade_level": child.grade_level,
            "xp": child.xp or 0, "streak": child.streak or 0, "student_code": child.student_code,
        },
        "courses": out_courses,
        "latest_report": {"id": latest.id, "sent_at": latest.sent_at.isoformat() if latest.sent_at else None,
                          "summary": (latest.content or {}).get("summary")} if latest else None,
        "unread_reports": int(unread),
        "recording": await consent_status(db, student_id),
    }


@router.get("/students/{student_id}/reports")
async def child_reports(
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await _child(db, user_info, student_id)
    rows = (await db.execute(
        select(ParentReport).where(ParentReport.student_id == student_id, ParentReport.status == "sent")
        .order_by(ParentReport.sent_at.desc())
    )).scalars().all()
    titles = {cid: title for cid, title in (await db.execute(
        select(Course.id, Course.title).where(Course.id.in_([r.course_id for r in rows] or [-1]))
    )).all()}
    now = datetime.utcnow()
    changed = False
    for r in rows:
        if r.parent_seen_at is None:
            r.parent_seen_at = now
            changed = True
    if changed:
        await db.commit()
    return {"reports": [{
        "id": r.id, "course": titles.get(r.course_id), "sent_at": r.sent_at.isoformat() if r.sent_at else None,
        "period_start": r.period_start.isoformat(), "period_end": r.period_end.isoformat(),
        # Veli için yalnızca öğretmenin onayladığı metin ve özet sayılar.
        "content": r.content or {},
        "facts": {k: (r.facts or {}).get(k) for k in ("active_days", "tasks_solved", "modules_completed", "quiz", "homework")},
    } for r in rows]}


@router.get("/students/{student_id}/consent")
async def get_consent(
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await _child(db, user_info, student_id)
    row = (await db.execute(
        select(RecordingConsent).where(RecordingConsent.student_id == student_id)
    )).scalar_one_or_none()
    return {
        "notice": RECORDING_NOTICE,
        "status": row.status if row else None,
        "decided_at": row.decided_at.isoformat() if row else None,
        "version": row.text_version if row else None,
    }


class ConsentIn(BaseModel):
    status: str


@router.put("/students/{student_id}/consent")
async def set_consent(
    student_id: int,
    body: ConsentIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    if body.status not in ("granted", "denied"):
        raise HTTPException(status_code=400, detail="Karar granted ya da denied olmalı.")
    await _child(db, user_info, student_id)
    row = (await db.execute(
        select(RecordingConsent).where(RecordingConsent.student_id == student_id)
    )).scalar_one_or_none()
    if not row:
        row = RecordingConsent(student_id=student_id, status=body.status)
        db.add(row)
    row.status = body.status
    row.parent_id = int(user_info["sub"])
    row.text_version = RECORDING_NOTICE_VERSION
    row.decided_at = datetime.utcnow()
    await db.commit()
    return {"status": row.status, "decided_at": row.decided_at.isoformat()}


@router.get("/summary")
async def parent_summary(
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Veli paneli: her çocuk için kısa durum — uydurma sayı yok, hepsi kayıttan."""
    if user_info.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Bu sayfa velilere özeldir.")
    children = (await db.execute(
        select(Student).where(Student.parent_id == int(user_info["sub"]))
    )).scalars().all()
    now = datetime.utcnow()
    out = []
    for child in children:
        overview = await child_overview(child.id, user_info=user_info, db=db)
        homework = [h for c in overview["courses"] for h in c["homework"]]
        due_soon = []
        for c in overview["courses"]:
            for h in c["homework"]:
                if h["submitted"] or not h["due_at"]:
                    continue
                due = datetime.fromisoformat(h["due_at"].rstrip("Z"))
                if now <= due <= now + timedelta(days=7):
                    due_soon.append({"title": h["title"], "course": c["title"], "due_at": h["due_at"]})
        last = max((c["last_activity_at"] for c in overview["courses"] if c["last_activity_at"]), default=None)
        out.append({
            "student_id": child.id,
            "name": f"{child.first_name or ''} {child.last_name or ''}".strip(),
            "xp": child.xp or 0,
            "streak": child.streak or 0,
            "courses": len(overview["courses"]),
            "active_days_14": sum(c["active_days_14"] for c in overview["courses"]),
            "last_activity_at": last,
            "homework_due_soon": due_soon,
            "homework_overdue": sum(1 for h in homework if h["overdue"]),
            "unread_reports": overview["unread_reports"],
            "latest_report": overview["latest_report"],
        })
    return {"children": out}


@router.get("/students/{student_id}/concepts")
async def child_concepts(
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Çocuğun kurs başına kazanım görünümü (öğrencinin gördüğüyle aynı, yumuşatılmış dil)."""
    await _child(db, user_info, student_id)
    courses = (await db.execute(
        select(Course).join(Enrollment, Enrollment.course_id == Course.id).where(Enrollment.student_id == student_id)
    )).scalars().all()
    views = []
    for course in courses:
        ctx = await learning_store.course_context(db, course.id)
        if ctx:
            views.append({"course_id": course.id, **(await learning_views.concept_view(db, ctx, student_id))})
    return {"courses": views}
