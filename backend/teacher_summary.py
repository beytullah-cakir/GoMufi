"""
Öğretmenin ana paneli ve öğrenci listesi için özetler.

Eskiden bu ekranlardaki sayılar koda gömülüydü ("%86 başarı", "142 bugün
aktif", Ali/Ayşe/Mehmet'in aktivite akışı, kursun sırasına göre dönüşümlü
%84/%76 tamamlanma). Öğretmen karar verirken bu sayılara bakar; hepsi artık
öğrenme kaydından ve teslimlerden hesaplanıyor. Veri yoksa sayı değil "—"
gösterilir — uydurma sıfır da yanıltır.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import learning_store
from learning_analytics import is_stuck, is_stuck_now, mastery_status
from models.course import Course
from models.enrollment import Enrollment
from models.homework_submission import HomeworkSubmission
from models.learning import ConceptMastery, LearningEvent, TaskProgress
from models.student import Student

LOCAL_TZ = ZoneInfo("Europe/Istanbul")
INACTIVE_DAYS = 14
NEW_ENROLLMENT_GRACE_DAYS = 7


def local_midnight_utc(now: Optional[datetime] = None) -> datetime:
    """Türkiye saatine göre bugünün başlangıcı, UTC (veritabanı UTC yazıyor)."""
    now = now or datetime.utcnow()
    local = now.replace(tzinfo=ZoneInfo("UTC")).astimezone(LOCAL_TZ)
    start = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)


def student_name(first: Optional[str], last: Optional[str], sid: int) -> str:
    return f"{first or ''} {last or ''}".strip() or f"Öğrenci #{sid}"


def course_node_count(course: Course) -> int:
    return sum(
        1 for n in (course.curriculum or [])
        if isinstance(n, dict) and n.get("type") != "live_sessions_config"
    )


def class_of(course: Course, student_id: int) -> Optional[Dict[str, Any]]:
    """Öğrencinin bu kurstaki şubesi (Sınıflarım sayfasındaki A/B sınıfı)."""
    for cls in course.classes or []:
        if not isinstance(cls, dict):
            continue
        ids = {str(s) for s in cls.get("student_ids") or []}
        if str(student_id) in ids:
            return {"id": cls.get("id"), "name": cls.get("name")}
    return None


@dataclass
class StudentSignal:
    """Bir öğrencinin bir kurstaki durumu — öğrenci listesinin bir satırı."""
    modules_done: int = 0
    modules_total: int = 0
    struggling: List[str] = field(default_factory=list)
    stuck_tasks: int = 0
    stuck_now: int = 0
    tasks_started: int = 0
    tasks_solved: int = 0
    last_activity: Optional[datetime] = None
    enrolled_at: Optional[datetime] = None

    @property
    def progress(self) -> int:
        if not self.modules_total:
            return 0
        return round(100 * min(self.modules_done, self.modules_total) / self.modules_total)

    def status(self, now: datetime) -> str:
        """active | struggling | completed | inactive — öğretmenin listede süzdüğü durum."""
        if self.modules_total and self.modules_done >= self.modules_total:
            return "completed"
        if self.stuck_now or len(self.struggling) >= 2 or self.stuck_tasks >= 2:
            return "struggling"
        reference = self.last_activity or self.enrolled_at
        grace = timedelta(days=INACTIVE_DAYS if self.last_activity else NEW_ENROLLMENT_GRACE_DAYS)
        if reference is None or now - reference > grace:
            return "inactive"
        return "active"


async def student_signals(
    db: AsyncSession, courses: Iterable[Course], now: Optional[datetime] = None,
) -> Dict[Tuple[int, int], StudentSignal]:
    """(kurs, öğrenci) → durum. Tek seferde tüm kurslar için; sayfa başına birkaç sorgu."""
    now = now or datetime.utcnow()
    courses = list(courses)
    course_ids = [c.id for c in courses]
    if not course_ids:
        return {}
    totals = {c.id: course_node_count(c) for c in courses}
    signals: Dict[Tuple[int, int], StudentSignal] = {}

    for course_id, student_id, enrolled_at in (await db.execute(
        select(Enrollment.course_id, Enrollment.student_id, Enrollment.enrolled_at)
        .where(Enrollment.course_id.in_(course_ids))
    )).all():
        signals[(course_id, student_id)] = StudentSignal(
            modules_total=totals.get(course_id, 0), enrolled_at=enrolled_at,
        )

    def sig(course_id: int, student_id: int) -> Optional[StudentSignal]:
        return signals.get((course_id, student_id))

    # Modül tamamlama: öğrencinin bitirdiği FARKLI modüller.
    for course_id, student_id, done in (await db.execute(
        select(LearningEvent.course_id, LearningEvent.student_id, func.count(func.distinct(LearningEvent.node_id)))
        .where(LearningEvent.course_id.in_(course_ids), LearningEvent.event_type == "module_completed")
        .group_by(LearningEvent.course_id, LearningEvent.student_id)
    )).all():
        s = sig(course_id, student_id)
        if s:
            s.modules_done = int(done)

    for course_id, student_id, last in (await db.execute(
        select(LearningEvent.course_id, LearningEvent.student_id, func.max(LearningEvent.created_at))
        .where(LearningEvent.course_id.in_(course_ids))
        .group_by(LearningEvent.course_id, LearningEvent.student_id)
    )).all():
        s = sig(course_id, student_id)
        if s:
            s.last_activity = last

    for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id.in_(course_ids))
    )).scalars().all():
        s = sig(p.course_id, p.student_id)
        if not s:
            continue
        row = {c: getattr(p, c) for c in (
            "attempts", "first_seen_at", "last_activity_at", "solved_at", "submitted_at",
            "last_outcome", "same_failure_streak",
        )}
        s.tasks_started += 1
        s.tasks_solved += 1 if p.solved_at else 0
        s.stuck_tasks += 1 if is_stuck(row) else 0
        s.stuck_now += 1 if is_stuck_now(row, now) else 0

    for m in (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id.in_(course_ids))
    )).scalars().all():
        s = sig(m.course_id, m.student_id)
        if s and mastery_status(m.score, m.evidence_weight) == "zorlaniyor":
            s.struggling.append(m.concept_id)

    return signals


async def pending_grading(db: AsyncSession, course_ids: List[int]) -> Counter:
    """Kurs başına değerlendirme bekleyen teslim (öğrenci × düğüm başına en son teslim)."""
    counts: Counter = Counter()
    if not course_ids:
        return counts
    seen = set()
    for course_id, student_id, node_id, graded_at in (await db.execute(
        select(HomeworkSubmission.course_id, HomeworkSubmission.student_id,
               HomeworkSubmission.node_id, HomeworkSubmission.graded_at)
        .where(HomeworkSubmission.course_id.in_(course_ids))
        .order_by(HomeworkSubmission.submitted_at.desc())
    )).all():
        key = (course_id, student_id, node_id)
        if key in seen:
            continue
        seen.add(key)
        if graded_at is None:
            counts[course_id] += 1
    return counts


async def recent_activity(
    db: AsyncSession, courses: List[Course], names: Dict[int, str], limit: int = 12,
) -> List[Dict[str, Any]]:
    """Son etkinlikler: çözülen görev, teslim, biten modül, yeni kayıt, yardım isteği."""
    from models.teaching import HelpRequest  # geç: döngüsel içe aktarma olmasın

    course_ids = [c.id for c in courses]
    if not course_ids:
        return []
    titles = {c.id: c.title for c in courses}
    contexts = {cid: await learning_store.course_context(db, cid) for cid in course_ids}
    items: List[Dict[str, Any]] = []

    def task_title(course_id: int, key: Optional[str]) -> str:
        ctx = contexts.get(course_id)
        task = ctx.resolve_task(key) if ctx and key else None
        return task["slide"]["title"] if task else "bir görev"

    def node_title(course_id: int, node_id: Optional[str]) -> str:
        ctx = contexts.get(course_id)
        return (ctx.nodes.get(str(node_id), {}) if ctx else {}).get("title") or "bir modül"

    for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id.in_(course_ids), TaskProgress.solved_at.isnot(None))
        .order_by(TaskProgress.solved_at.desc()).limit(limit)
    )).scalars().all():
        items.append({"at": p.solved_at, "kind": "solved", "course_id": p.course_id, "student_id": p.student_id,
                      "text": f"“{task_title(p.course_id, p.task_key)}” görevini çözdü"})

    for e in (await db.execute(
        select(LearningEvent).where(
            LearningEvent.course_id.in_(course_ids),
            LearningEvent.event_type.in_(("submitted", "module_completed")),
        ).order_by(LearningEvent.created_at.desc()).limit(limit)
    )).scalars().all():
        if e.event_type == "submitted":
            ctx = contexts.get(e.course_id)
            task = ctx.resolve_task(e.task_key) if ctx else None
            is_homework = bool(task and task["slide"]["type"] == "homework")
            text = f"“{task_title(e.course_id, e.task_key)}” {'ödevini' if is_homework else 'görevini'} teslim etti"
            kind = "homework" if is_homework else "submitted"
        else:
            text, kind = f"“{node_title(e.course_id, e.node_id)}” modülünü bitirdi", "module"
        items.append({"at": e.created_at, "kind": kind, "course_id": e.course_id,
                      "student_id": e.student_id, "text": text})

    for course_id, student_id, enrolled_at in (await db.execute(
        select(Enrollment.course_id, Enrollment.student_id, Enrollment.enrolled_at)
        .where(Enrollment.course_id.in_(course_ids), Enrollment.enrolled_at.isnot(None))
        .order_by(Enrollment.enrolled_at.desc()).limit(limit)
    )).all():
        items.append({"at": enrolled_at, "kind": "joined", "course_id": course_id,
                      "student_id": student_id, "text": "kursa katıldı"})

    for h in (await db.execute(
        select(HelpRequest).where(HelpRequest.course_id.in_(course_ids))
        .order_by(HelpRequest.created_at.desc()).limit(limit)
    )).scalars().all():
        items.append({"at": h.created_at, "kind": "help", "course_id": h.course_id, "student_id": h.student_id,
                      "text": f"“{task_title(h.course_id, h.task_key)}” görevinde yardım istedi"})

    items.sort(key=lambda i: i["at"], reverse=True)
    return [{
        **item,
        "at": item["at"].isoformat(),
        "student": names.get(item["student_id"], f"Öğrenci #{item['student_id']}"),
        "course": titles.get(item["course_id"], ""),
    } for item in items[:limit]]


async def student_names(db: AsyncSession, student_ids: Iterable[int]) -> Dict[int, str]:
    ids = list(set(student_ids))
    if not ids:
        return {}
    return {sid: student_name(first, last, sid) for sid, first, last in (await db.execute(
        select(Student.id, Student.first_name, Student.last_name).where(Student.id.in_(ids))
    )).all()}
