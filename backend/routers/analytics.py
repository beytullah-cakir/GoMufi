"""
Öğrenme analitiği uçları.

Yazma (öğrenci):
  POST /analytics/events   — kontrol sonuçları, ipucu, quiz cevabı, modül bitişi
  POST /analytics/edits    — yazım kaydı (VS Code eklentisi / tarayıcı editörü)

Okuma (kursun öğretmeni):
  GET  /analytics/courses/{id}/overview
  GET  /analytics/courses/{id}/concepts              — kazanım haritası
  GET  /analytics/courses/{id}/tasks                 — görev bazında zorluk
  GET  /analytics/courses/{id}/tasks/{task_key}
  GET  /analytics/courses/{id}/students/{sid}        — öğrenci profili
  GET  /analytics/courses/{id}/students/{sid}/code/{task_key} — kod kökeni + oynatma
  GET  /analytics/courses/{id}/homework              — ödev analizi
  POST /analytics/courses/{id}/tag-concepts          — etiketsiz düğümlere kavram bağla

Öğrencinin gönderdiği hiçbir şeye körü körüne güvenilmez: görev anahtarının
kursa ait olduğu, düğümün müfredatta bulunduğu doğrulanır; kavramlar ve hata
türü istemciden alınmaz, sunucuda türetilir.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

import code_provenance
import homework_rules
import learning_insights
import learning_store
import learning_views
from auth.dependencies import get_current_user_info
from connect_db import get_db
from core.permissions import ensure_course_access, ensure_course_owner
from learning_analytics import (
    STATUS_LABELS, is_stuck, is_stuck_now, mastery_status, root_causes, task_stats,
)
from models.enrollment import Enrollment
from models.homework_submission import HomeworkSubmission
from models.learning import (
    CodeEditChunk, CodeProvenance, ConceptMastery, LearningEvent, LearningInsight, TaskProgress,
)
from models.lesson_content import LessonContent
from models.quiz import Quiz
from models.student import Student
from models.teaching import HelpRequest
from routers.live_teaching import record_action, review_out, reviews_for
from routers.parent_portal import consent_status

router = APIRouter(prefix="/analytics", tags=["analytics"])

MAX_EVENTS_PER_BATCH = 50
MAX_CHUNKS_PER_BATCH = 20
MAX_OPS_PER_CHUNK = 5000
MAX_OP_TEXT = 20_000
MAX_BASE_TEXT = 100_000
CLIENT_EVENT_TYPES = {"check", "hint_opened", "quiz_answer", "module_completed"}
CHECK_OUTCOMES = {"pass", "fail", "error", "ran"}
EDIT_KINDS = {"t", "a", "p", "c", "l", "b", "e", "f", "u", "r"}
_SAFE_FILE = re.compile(r"^[A-Za-z0-9._-]{1,80}$")
_SAFE_SESSION = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


def _require_student(user_info: dict) -> int:
    if user_info.get("role") not in ("student", "admin"):
        raise HTTPException(status_code=403, detail="Yalnızca öğrenciler kayıt gönderebilir.")
    return int(user_info["sub"])


def _clip(value: Any, limit: int) -> Optional[str]:
    if value is None:
        return None
    text = str(value)
    return text[:limit]


# --- yazma: olaylar -------------------------------------------------------------

class CheckItem(BaseModel):
    id: str = ""
    kind: str = ""
    label: str = ""
    status: str = ""
    detail: Optional[str] = None
    value: Optional[str] = None
    conceptId: Optional[str] = None


class ClientEvent(BaseModel):
    type: str
    task_key: Optional[str] = None
    node_id: Optional[str] = None
    outcome: Optional[str] = None
    attempt: Optional[int] = None
    checks: List[CheckItem] = Field(default_factory=list)
    stderr: Optional[str] = None
    code: Optional[str] = None
    duration_ms: Optional[int] = None
    client: Optional[str] = None
    question_id: Optional[int] = None
    correct: Optional[bool] = None
    answer: Optional[str] = None


class EventBatch(BaseModel):
    course_id: int
    events: List[ClientEvent]


@router.post("/events")
async def ingest_events(
    batch: EventBatch,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrencinin tarayıcısından/panelinden gelen öğrenme olayları.

    Geçersiz olay tüm paketi reddetmez, atlanır: istemci eski bir slayt
    kimliği gönderdi diye aynı paketteki geçerli kontroller kaybolmamalı.
    """
    student_id = _require_student(user_info)
    if len(batch.events) > MAX_EVENTS_PER_BATCH:
        raise HTTPException(status_code=413, detail="Tek pakette en fazla 50 olay gönderilebilir.")
    await ensure_course_access(db, batch.course_id, user_info)
    ctx = await learning_store.course_context(db, batch.course_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    # Bağlam kısa süre önbellekte; öğretmen az önce bir görev eklediyse onun
    # anahtarı henüz bilinmiyor olabilir. Bilinmeyen anahtar görülürse bir kez tazele.
    if any(ev.task_key and not ctx.resolve_task(ev.task_key) for ev in batch.events):
        ctx = await learning_store.course_context(db, batch.course_id, fresh=True) or ctx

    recorded: List[Dict[str, Any]] = []
    for ev in batch.events:
        normalized = await _normalize_client_event(db, ctx, ev)
        if normalized is None:
            continue
        await learning_store.record_event(db, ctx, student_id, normalized)
        recorded.append(normalized)
    await db.commit()
    for event in recorded:
        await learning_store.notify_teacher(ctx, student_id, event)
    return {"accepted": len(recorded), "rejected": len(batch.events) - len(recorded)}


async def _normalize_client_event(db: AsyncSession, ctx, ev: ClientEvent) -> Optional[Dict[str, Any]]:
    if ev.type not in CLIENT_EVENT_TYPES:
        return None
    base: Dict[str, Any] = {
        "type": ev.type,
        "client": _clip(ev.client, 20),
        "duration_ms": max(0, min(ev.duration_ms or 0, 24 * 3600 * 1000)) or None,
    }

    if ev.type in ("check", "hint_opened"):
        if not ctx.resolve_task(ev.task_key):
            return None
        base["task_key"] = _clip(ev.task_key, 120)

    if ev.type == "check":
        if ev.outcome not in CHECK_OUTCOMES:
            return None
        checks = [{
            "id": _clip(c.id, 60) or "",
            "kind": _clip(c.kind, 20) or "",
            "label": _clip(c.label, 300) or "",
            "status": _clip(c.status, 10) or "",
            "detail": _clip(c.detail, 500),
            "value": _clip(c.value, 200),
            "conceptId": _clip(c.conceptId, 80),
        } for c in ev.checks[:30]]
        base.update({
            "outcome": ev.outcome,
            "attempt": max(1, min(ev.attempt or 1, 10_000)),
            "checks": checks,
            "stderr": _clip(ev.stderr, 4000),
            "code": _clip(ev.code, learning_store.MAX_CODE_SNAPSHOT),
            "details": {
                "checks": checks,
                "stderr": _clip(ev.stderr, 2000),
            },
        })

    elif ev.type == "quiz_answer":
        if ev.node_id is None or str(ev.node_id) not in ctx.nodes or ev.question_id is None:
            return None
        quiz = (await db.execute(
            select(Quiz.id, Quiz.question_text).where(Quiz.id == ev.question_id, Quiz.course_id == ctx.course_id)
        )).first()
        if not quiz:
            return None
        base.update({
            "node_id": str(ev.node_id),
            "stage": "QUIZ",
            "correct": bool(ev.correct),
            "outcome": "pass" if ev.correct else "fail",
            "details": {
                "question_id": ev.question_id,
                "question": _clip(quiz.question_text, 300),
                "answer": _clip(ev.answer, 300),
                "correct": bool(ev.correct),
            },
        })

    elif ev.type == "module_completed":
        if ev.node_id is None or str(ev.node_id) not in ctx.nodes:
            return None
        base.update({"node_id": str(ev.node_id), "stage": "MODÜL"})

    return base


# --- yazma: yazım kaydı -----------------------------------------------------------

class EditChunkIn(BaseModel):
    file: str
    session: str
    seq: int
    started_at_ms: float
    base_text: Optional[str] = None
    ops: List[List[Any]] = Field(default_factory=list)


class EditBatch(BaseModel):
    course_id: int
    task_key: str
    client: str = "vscode"
    ext_version: Optional[str] = None
    ai_extensions: List[str] = Field(default_factory=list)
    chunks: List[EditChunkIn]


def _sanitize_op(op: List[Any]) -> Optional[List[Any]]:
    if len(op) < 5:
        return None
    try:
        t = float(op[0])
        offset = int(op[1])
        delete_len = int(op[2])
    except (TypeError, ValueError):
        return None
    inserted = str(op[3] or "")[:MAX_OP_TEXT]
    kind = str(op[4] or "")
    if kind not in EDIT_KINDS or offset < 0 or delete_len < 0:
        return None
    return [t, offset, delete_len, inserted, kind]


@router.post("/edits")
async def ingest_edits(
    batch: EditBatch,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Yazım kaydı: görev dosyalarındaki düzenlemeler ve kaynakları.

    Yalnızca GoMufi görev dosyaları kabul edilir — anahtar kursun bir görev
    slaytına ait olmalı. Öğrencinin başka dosyaları bu uca hiç gelmez
    (eklenti yalnızca görev klasörünü izliyor), gelse de reddedilir.
    """
    student_id = _require_student(user_info)
    if len(batch.chunks) > MAX_CHUNKS_PER_BATCH:
        raise HTTPException(status_code=413, detail="Tek pakette en fazla 20 parça gönderilebilir.")
    await ensure_course_access(db, batch.course_id, user_info)
    ctx = await learning_store.course_context(db, batch.course_id)
    if ctx and not ctx.resolve_task(batch.task_key):
        ctx = await learning_store.course_context(db, batch.course_id, fresh=True)
    if not ctx or not ctx.resolve_task(batch.task_key):
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    # Veli yazım kaydını kapattıysa kayıt SAKLANMAZ (bkz. routers/parent_portal.py).
    if await consent_status(db, student_id) == "denied":
        return {"applied": 0, "recording": False}

    client = batch.client if batch.client in ("vscode", "browser") else "vscode"
    ai_extensions = [str(a)[:80] for a in batch.ai_extensions[:10] if a]
    applied = 0
    for chunk in sorted(batch.chunks, key=lambda c: (c.started_at_ms, c.seq)):
        if not _SAFE_FILE.match(chunk.file) or not _SAFE_SESSION.match(chunk.session):
            continue
        if len(chunk.ops) > MAX_OPS_PER_CHUNK:
            continue
        ops = [o for o in (_sanitize_op(op) for op in chunk.ops) if o]
        data = {
            "file": chunk.file,
            "session": chunk.session,
            "seq": chunk.seq,
            "started_at_ms": chunk.started_at_ms,
            "base_text": chunk.base_text[:MAX_BASE_TEXT] if chunk.base_text is not None else None,
            "ops": ops,
        }
        if await learning_store.apply_edit_chunk(
            db, ctx, student_id, batch.task_key, data, client, _clip(batch.ext_version, 20), ai_extensions,
        ):
            applied += 1
    await db.commit()
    return {"applied": applied}


# --- okuma: yardımcılar -----------------------------------------------------------

async def _students(db: AsyncSession, course_id: int) -> Dict[int, str]:
    rows = (await db.execute(
        select(Student.id, Student.first_name, Student.last_name)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.course_id == course_id)
    )).all()
    return {sid: f"{first or ''} {last or ''}".strip() or f"Öğrenci #{sid}" for sid, first, last in rows}


@dataclass
class Scope:
    """Analizin kapsamı: hangi öğrenciler (şube) ve hangi tarihten beri.

    Şube süzgeci öğrencileri daraltır; tarih süzgeci etkinlik temelli sayıları
    (görev denemeleri, düşen ölçütler, teslimler) o tarihten sonrasıyla sınırlar.
    Kazanım durumu birikimlidir — tarihle süzülmez.
    """
    students: Dict[int, str]
    since: Optional[datetime] = None
    class_id: Optional[str] = None
    classes: Optional[List[Dict[str, Any]]] = None

    def keep(self, student_id: int) -> bool:
        return student_id in self.students

    def recent(self, at: Optional[datetime]) -> bool:
        return self.since is None or (at is not None and at >= self.since)


def _parse_since(value: Optional[str]) -> Optional[datetime]:
    """"2026-09-01" (Türkiye saatiyle o günün başı) → UTC."""
    if not value:
        return None
    try:
        day = datetime.strptime(value[:10], "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Tarih YYYY-AA-GG biçiminde olmalı.")
    local = day.replace(tzinfo=ZoneInfo("Europe/Istanbul"))
    return local.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)


async def _scope(db: AsyncSession, ctx, course_id: int, class_id: Optional[str] = None,
                 since: Optional[str] = None) -> Scope:
    students = await _students(db, course_id)
    if class_id:
        cls = next((c for c in ctx.classes if c["id"] == str(class_id)), None)
        if cls is None:
            raise HTTPException(status_code=404, detail="Şube bulunamadı.")
        students = {sid: name for sid, name in students.items() if sid in cls["student_ids"]}
    return Scope(students=students, since=_parse_since(since), class_id=class_id,
                 classes=[{"id": c["id"], "name": c["name"], "students": len(c["student_ids"])} for c in ctx.classes])


def _progress_row(p: TaskProgress) -> Dict[str, Any]:
    return {c: getattr(p, c) for c in (
        "student_id", "task_key", "node_id", "stage", "attempts", "first_seen_at", "last_activity_at",
        "solved_at", "submitted_at", "first_try_pass", "last_outcome", "last_failure",
        "same_failure_streak", "last_error_type", "hints_opened", "coach_messages",
    )}


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _concept_label(ctx, concept_id: str) -> str:
    return ctx.concepts.get(concept_id, {}).get("label", concept_id)


def _course_concepts(ctx, extra: List[str] = ()) -> List[str]:
    """Kursun ölçtüğü kavramlar, yol haritası sırasıyla (ilk geçtiği düğüme göre)."""
    ordered: List[str] = []
    for node_id in ctx.node_order:
        for concept in ctx.nodes[node_id].get("concepts") or []:
            if concept in ctx.concepts and concept not in ordered:
                ordered.append(concept)
    for concept in extra:
        if concept not in ordered:
            ordered.append(concept)
    return ordered


def _task_title(ctx, task_key: str) -> str:
    task = ctx.resolve_task(task_key)
    return task["slide"]["title"] if task else task_key


async def _load_course(db, course_id, user_info):
    await ensure_course_owner(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return ctx


async def _failure_counters(db: AsyncSession, course_id: int, task_key: Optional[str] = None,
                            scope: Optional[Scope] = None):
    """Görev başına en çok düşen ölçütler, hata türleri ve koçun tespit ettiği yanılgılar."""
    query = select(
        LearningEvent.task_key, LearningEvent.event_type, LearningEvent.outcome,
        LearningEvent.error_type, LearningEvent.details, LearningEvent.student_id,
    ).where(
        LearningEvent.course_id == course_id,
        LearningEvent.event_type.in_(("check", "coach")),
    )
    if task_key:
        query = query.where(LearningEvent.task_key == task_key)
    if scope is not None:
        query = query.where(LearningEvent.student_id.in_(list(scope.students) or [-1]))
        if scope.since:
            query = query.where(LearningEvent.created_at >= scope.since)
    failures: Dict[str, Dict[str, set]] = defaultdict(lambda: defaultdict(set))
    errors: Dict[str, Dict[str, set]] = defaultdict(lambda: defaultdict(set))
    misconceptions: Dict[str, Dict[str, set]] = defaultdict(lambda: defaultdict(set))
    for key, kind, outcome, error_type, details, student_id in (await db.execute(query)).all():
        details = details or {}
        if kind == "check" and outcome in ("fail", "error", "ran"):
            for check in details.get("checks") or []:
                if check.get("status") == "fail" and check.get("label"):
                    failures[key][check["label"]].add(student_id)
            if error_type:
                errors[key][error_type].add(student_id)
        elif kind == "coach" and details.get("misconception"):
            misconceptions[key][details["misconception"]].add(student_id)

    def top(bucket: Dict[str, set], n: int = 5):
        # Öğrenci SAYISI: aynı öğrencinin 10 denemesi 10 öğrenci gibi sayılmasın.
        return [{"label": k, "students": len(v)} for k, v in
                sorted(bucket.items(), key=lambda kv: len(kv[1]), reverse=True)[:n]]

    return failures, errors, misconceptions, top


async def _provenance_by_task(db: AsyncSession, course_id: int, student_id: Optional[int] = None):
    query = select(CodeProvenance).where(CodeProvenance.course_id == course_id)
    if student_id is not None:
        query = query.where(CodeProvenance.student_id == student_id)
    grouped: Dict[tuple, List[CodeProvenance]] = defaultdict(list)
    for row in (await db.execute(query)).scalars().all():
        grouped[(row.student_id, row.task_key)].append(row)
    return {key: learning_store.provenance_report(rows) for key, rows in grouped.items()}


async def _open_help(db: AsyncSession, course_id: int, task_key: Optional[str] = None) -> List[HelpRequest]:
    query = select(HelpRequest).where(HelpRequest.course_id == course_id, HelpRequest.resolved_at.is_(None))
    if task_key:
        query = query.where(HelpRequest.task_key == task_key)
    return list((await db.execute(query.order_by(HelpRequest.created_at))).scalars().all())


def _help_out(h: Optional[HelpRequest]) -> Optional[Dict[str, Any]]:
    if not h:
        return None
    return {"id": h.id, "note": h.note, "at": _iso(h.created_at), "responded": bool(h.responded_at),
            "waiting_minutes": round((datetime.utcnow() - h.created_at).total_seconds() / 60, 1)}


# --- okuma: genel bakış -----------------------------------------------------------

@router.get("/courses/{course_id}/overview")
async def course_overview(
    course_id: int,
    class_id: Optional[str] = None,
    since: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    scope = await _scope(db, ctx, course_id, class_id, since)
    students = scope.students
    now = datetime.utcnow()

    masteries = (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == course_id)
    )).scalars().all()
    by_concept: Dict[str, List[ConceptMastery]] = defaultdict(list)
    struggling_by_student: Dict[int, List[str]] = defaultdict(list)
    for m in masteries:
        if not scope.keep(m.student_id):
            continue
        by_concept[m.concept_id].append(m)
        if mastery_status(m.score, m.evidence_weight) == "zorlaniyor":
            struggling_by_student[m.student_id].append(m.concept_id)

    concepts = []
    for concept_id, rows in by_concept.items():
        statuses = Counter(mastery_status(r.score, r.evidence_weight) for r in rows)
        measured = [r.score for r in rows if r.evidence_weight >= 1.0]
        concepts.append({
            "concept_id": concept_id,
            "label": _concept_label(ctx, concept_id),
            "avg_score": round(sum(measured) / len(measured), 3) if measured else None,
            "struggling": statuses.get("zorlaniyor", 0),
            "developing": statuses.get("gelisiyor", 0),
            "mastered": statuses.get("hakim", 0),
            "misconceptions": [m for m, _ in Counter(
                r.last_misconception for r in rows if r.last_misconception).most_common(3)],
        })
    concepts.sort(key=lambda c: (-c["struggling"], c["avg_score"] if c["avg_score"] is not None else 1))

    progress = [_progress_row(p) for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id == course_id)
    )).scalars().all() if scope.keep(p.student_id) and scope.recent(p.last_activity_at)]
    by_task: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    stuck_by_student: Dict[int, int] = defaultdict(int)
    stuck_now = []
    for p in progress:
        by_task[p["task_key"]].append(p)
        if is_stuck(p):
            stuck_by_student[p["student_id"]] += 1
        if is_stuck_now(p, now):
            stuck_now.append({
                "student_id": p["student_id"],
                "student": students.get(p["student_id"], f"Öğrenci #{p['student_id']}"),
                "task_key": p["task_key"],
                "task": _task_title(ctx, p["task_key"]),
                "attempts": p["attempts"],
                "last_failure": p["last_failure"],
                "minutes_on_task": round((p["last_activity_at"] - p["first_seen_at"]).total_seconds() / 60, 1)
                if p["first_seen_at"] and p["last_activity_at"] else None,
            })

    failures, _, _, top = await _failure_counters(db, course_id, scope=scope)
    hard_tasks = []
    for task_key, rows in by_task.items():
        if not ctx.resolve_task(task_key) or ctx.resolve_task(task_key)["slide"]["type"] == "homework":
            continue
        stats = task_stats(rows)
        hard_tasks.append({
            "task_key": task_key, "task": _task_title(ctx, task_key),
            "stage": ctx.resolve_task(task_key)["stage"], **stats,
            "top_failures": top(failures.get(task_key, {}), 3),
        })
    hard_tasks.sort(key=lambda t: (-t["stuck"], t["solve_rate"]))

    at_risk = []
    for sid in set(struggling_by_student) | set(stuck_by_student):
        weak = struggling_by_student.get(sid, [])
        stuck = stuck_by_student.get(sid, 0)
        if len(weak) >= 2 or stuck >= 2:
            at_risk.append({
                "student_id": sid, "student": students.get(sid, f"Öğrenci #{sid}"),
                "struggling_concepts": [{"concept_id": c, "label": _concept_label(ctx, c)} for c in weak],
                "stuck_tasks": stuck,
            })
    at_risk.sort(key=lambda s: (-len(s["struggling_concepts"]), -s["stuck_tasks"]))

    # Öğretmenin "sorun yok" dediği işaretler (ör. yapıştırmayı kendisi söyledi) listeden düşer.
    reviews = await reviews_for(db, course_id)
    integrity = []
    accepted = 0
    for (sid, task_key), report in (await _provenance_by_task(db, course_id)).items():
        if not report["flags"] or not scope.keep(sid):
            continue
        review = reviews.get((sid, task_key))
        if review and review.verdict == "accepted":
            accepted += 1
            continue
        integrity.append({
            "student_id": sid, "student": students.get(sid, f"Öğrenci #{sid}"),
            "task_key": task_key, "task": _task_title(ctx, task_key),
            "own_share": report["own_share"], "flags": report["flags"],
            "review": review_out(review),
        })

    help_open = [{
        **_help_out(h), "student_id": h.student_id, "student": students.get(h.student_id, f"Öğrenci #{h.student_id}"),
        "task_key": h.task_key, "task": _task_title(ctx, h.task_key),
    } for h in await _open_help(db, course_id) if h.student_id in students]

    tagged = sum(1 for n in ctx.nodes.values() if n.get("concepts"))
    return {
        "course": {
            "id": ctx.course_id, "title": ctx.title, "language": ctx.language,
            "nodes": len(ctx.nodes), "tagged_nodes": tagged,
        },
        "student_count": len(students),
        "concepts": concepts[:10],
        "hard_tasks": hard_tasks[:5],
        "stuck_now": stuck_now,
        "at_risk": at_risk,
        "integrity": integrity,
        "integrity_accepted": accepted,
        "help_open": help_open,
        "classes": scope.classes,
    }


# --- okuma: kazanım haritası -------------------------------------------------------

@router.get("/courses/{course_id}/concepts")
async def concept_matrix(
    course_id: int,
    class_id: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    scope = await _scope(db, ctx, course_id, class_id)
    students = scope.students
    masteries = [m for m in (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == course_id)
    )).scalars().all() if scope.keep(m.student_id)]

    cells: Dict[int, Dict[str, Any]] = defaultdict(dict)
    for m in masteries:
        cells[m.student_id][m.concept_id] = {
            "score": round(m.score, 3),
            "status": mastery_status(m.score, m.evidence_weight),
            "evidence": round(m.evidence_weight, 2),
            "successes": m.successes,
            "failures": m.failures,
            "misconception": m.last_misconception,
            "last_evidence_at": _iso(m.last_evidence_at),
        }
    concept_ids = _course_concepts(ctx, sorted({m.concept_id for m in masteries}))
    return {
        "statuses": STATUS_LABELS,
        "concepts": [{
            "concept_id": c,
            "label": _concept_label(ctx, c),
            "prerequisites": ctx.concepts.get(c, {}).get("prerequisites", []),
            "nodes": [ctx.nodes[n]["title"] for n in ctx.node_order if c in (ctx.nodes[n].get("concepts") or [])],
        } for c in concept_ids],
        "students": [{
            "student_id": sid, "student": name, "cells": cells.get(sid, {}),
        } for sid, name in sorted(students.items(), key=lambda kv: kv[1])],
    }


# --- okuma: görevler ------------------------------------------------------------

@router.get("/courses/{course_id}/tasks")
async def task_list(
    course_id: int,
    class_id: Optional[str] = None,
    since: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    scope = await _scope(db, ctx, course_id, class_id, since)
    progress = [_progress_row(p) for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id == course_id)
    )).scalars().all() if scope.keep(p.student_id) and scope.recent(p.last_activity_at)]
    by_task: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for p in progress:
        by_task[p["task_key"]].append(p)
    failures, errors, misconceptions, top = await _failure_counters(db, course_id, scope=scope)

    order = {node_id: i for i, node_id in enumerate(ctx.node_order)}
    tasks = []
    for slide in ctx.slides.values():
        if slide["type"] == "homework":
            continue
        task_key = f"{slide['type']}:{slide['id']}"
        tasks.append({
            "task_key": task_key,
            "task": slide["title"],
            "stage": slide["stage"],
            "node_id": slide["node_id"],
            "node": ctx.nodes.get(slide["node_id"], {}).get("title"),
            **task_stats(by_task.get(task_key, [])),
            "top_failures": top(failures.get(task_key, {})),
            "top_errors": top(errors.get(task_key, {})),
            "top_misconceptions": top(misconceptions.get(task_key, {})),
            "_order": order.get(slide["node_id"], 10_000),
        })
    tasks.sort(key=lambda t: t.pop("_order"))
    return {"tasks": tasks}


@router.get("/courses/{course_id}/tasks/{task_key}")
async def task_detail(
    course_id: int,
    task_key: str,
    class_id: Optional[str] = None,
    since: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    task = ctx.resolve_task(task_key)
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    scope = await _scope(db, ctx, course_id, class_id, since)
    students = scope.students
    now = datetime.utcnow()
    rows = [_progress_row(p) for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id == course_id, TaskProgress.task_key == task_key)
    )).scalars().all() if scope.keep(p.student_id) and scope.recent(p.last_activity_at)]
    failures, errors, misconceptions, top = await _failure_counters(db, course_id, task_key, scope=scope)
    provenance = await _provenance_by_task(db, course_id)
    reviews = await reviews_for(db, course_id)
    help_by_student = {h.student_id: h for h in await _open_help(db, course_id, task_key)}

    seen = {r["student_id"] for r in rows}
    per_student = []
    for r in rows:
        report = provenance.get((r["student_id"], task_key))
        per_student.append({
            "help": _help_out(help_by_student.get(r["student_id"])),
            "review": review_out(reviews.get((r["student_id"], task_key))),
            "student_id": r["student_id"],
            "student": students.get(r["student_id"], f"Öğrenci #{r['student_id']}"),
            "attempts": r["attempts"],
            "solved": bool(r["solved_at"]),
            "first_try": bool(r["first_try_pass"]),
            "submitted": bool(r["submitted_at"]),
            "last_failure": r["last_failure"],
            "last_error_type": r["last_error_type"],
            "stuck": is_stuck(r),
            "stuck_now": is_stuck_now(r, now),
            "hints_opened": r["hints_opened"],
            "coach_messages": r["coach_messages"],
            "minutes": round((r["last_activity_at"] - r["first_seen_at"]).total_seconds() / 60, 1)
            if r["first_seen_at"] and r["last_activity_at"] else None,
            "own_share": report["own_share"] if report and report["has_recording"] else None,
            "flags": report["flags"] if report else [],
        })
    # Kodunu yazıyor ama henüz "Kontrol Et"e basmamış öğrenci de çalışıyordur:
    # yazım kaydı varsa "başlamadı" sayılmaz (canlı panoda yanlış görünüyordu).
    for (sid, key), report in provenance.items():
        if key != task_key or sid in seen or sid not in students or not report["has_recording"]:
            continue
        seen.add(sid)
        per_student.append({
            "help": _help_out(help_by_student.get(sid)),
            "review": review_out(reviews.get((sid, task_key))),
            "student_id": sid, "student": students[sid], "attempts": 0,
            "solved": False, "first_try": False, "submitted": False,
            "last_failure": None, "last_error_type": None, "stuck": False, "stuck_now": False,
            "hints_opened": 0, "coach_messages": 0, "minutes": None,
            "own_share": report["own_share"], "flags": report["flags"],
        })
    not_started = [{"student_id": sid, "student": name} for sid, name in students.items() if sid not in seen]
    # Yardım isteyen en üstte, sonra takılanlar.
    per_student.sort(key=lambda s: (s["help"] is None, not s["stuck"], s["solved"], -s["attempts"]))
    return {
        "task_key": task_key,
        "task": task["slide"]["title"],
        "stage": task["stage"],
        "node": ctx.nodes.get(task["node_id"], {}).get("title"),
        **task_stats(rows),
        "top_failures": top(failures.get(task_key, {}), 10),
        "top_errors": top(errors.get(task_key, {}), 10),
        "top_misconceptions": top(misconceptions.get(task_key, {}), 10),
        "students": per_student,
        "not_started": not_started,
        "help_open": len(help_by_student),
    }


# --- okuma: öğrenci profili ------------------------------------------------------

@router.get("/courses/{course_id}/students/{student_id}")
async def student_profile(
    course_id: int,
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    students = await _students(db, course_id)
    if student_id not in students:
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    now = datetime.utcnow()

    masteries = (await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.course_id == course_id, ConceptMastery.student_id == student_id)
    )).scalars().all()
    statuses = {m.concept_id: mastery_status(m.score, m.evidence_weight) for m in masteries}
    prerequisites = {c: info.get("prerequisites", []) for c, info in ctx.concepts.items()}
    concepts = [{
        "concept_id": m.concept_id,
        "label": _concept_label(ctx, m.concept_id),
        "status": statuses[m.concept_id],
        "score": round(m.score, 3),
        "evidence": round(m.evidence_weight, 2),
        "successes": m.successes,
        "failures": m.failures,
        "misconception": m.last_misconception,
        "last_evidence_at": _iso(m.last_evidence_at),
    } for m in masteries]
    order = {c: i for i, c in enumerate(_course_concepts(ctx))}
    concepts.sort(key=lambda c: order.get(c["concept_id"], 10_000))

    provenance = await _provenance_by_task(db, course_id, student_id)
    reviews = await reviews_for(db, course_id, student_id)
    tasks = []
    for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id == course_id, TaskProgress.student_id == student_id)
    )).scalars().all():
        row = _progress_row(p)
        report = provenance.get((student_id, row["task_key"]))
        tasks.append({
            "task_key": row["task_key"], "task": _task_title(ctx, row["task_key"]), "stage": row["stage"],
            "attempts": row["attempts"], "solved": bool(row["solved_at"]), "submitted": bool(row["submitted_at"]),
            "first_try": bool(row["first_try_pass"]), "last_failure": row["last_failure"],
            "stuck": is_stuck(row), "stuck_now": is_stuck_now(row, now),
            "hints_opened": row["hints_opened"], "coach_messages": row["coach_messages"],
            "own_share": report["own_share"] if report and report["has_recording"] else None,
            "flags": report["flags"] if report else [],
            "review": review_out(reviews.get((student_id, row["task_key"]))),
            "last_activity_at": _iso(row["last_activity_at"]),
        })

    events = (await db.execute(
        select(LearningEvent).where(
            LearningEvent.course_id == course_id, LearningEvent.student_id == student_id)
        .order_by(LearningEvent.created_at.desc()).limit(150)
    )).scalars().all()
    timeline = [{
        "at": _iso(e.created_at),
        "type": e.event_type,
        "task_key": e.task_key,
        "task": _task_title(ctx, e.task_key) if e.task_key else None,
        "node": ctx.nodes.get(e.node_id or "", {}).get("title"),
        "stage": e.stage,
        "outcome": e.outcome,
        "attempt": e.attempt,
        "error_type": e.error_type,
        "error_line": e.error_line,
        "concepts": [_concept_label(ctx, c) for c in e.concept_ids or []],
        "failed": [c.get("label") for c in (e.details or {}).get("checks", []) if c.get("status") == "fail"],
        "coach": (e.details or {}).get("message"),
        "misconception": (e.details or {}).get("misconception"),
        "note": (e.details or {}).get("note") or (e.details or {}).get("text"),
        "has_code": bool(e.code_snapshot),
        "event_id": e.id,
    } for e in events]

    return {
        "student_id": student_id,
        "student": students[student_id],
        "concepts": concepts,
        "root_causes": [{
            "concept_id": rc["concept_id"], "label": _concept_label(ctx, rc["concept_id"]),
            "weak_prerequisites": [{"concept_id": p, "label": _concept_label(ctx, p)} for p in rc["weak_prerequisites"]],
        } for rc in root_causes(statuses, prerequisites)],
        "tasks": tasks,
        "homework": await _student_homework(db, ctx, student_id),
        "timeline": timeline,
        # Velinin yazım kaydı kararı: "denied" ise kod kökeni verisi toplanmıyor.
        "recording": await consent_status(db, student_id),
    }


@router.get("/courses/{course_id}/events/{event_id}/code")
async def event_code(
    course_id: int,
    event_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Bir denemenin kodu — zaman çizelgesinde tıklanınca açılır."""
    await ensure_course_owner(db, course_id, user_info)
    row = (await db.execute(
        select(LearningEvent).where(LearningEvent.id == event_id, LearningEvent.course_id == course_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return {"code": row.code_snapshot, "stderr": (row.details or {}).get("stderr"), "at": _iso(row.created_at)}


@router.get("/courses/{course_id}/students/{student_id}/code/{task_key}")
async def student_code_history(
    course_id: int,
    student_id: int,
    task_key: str,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Kod kökeni ve oynatma verisi: öğretmen kodun nasıl yazıldığını baştan izler."""
    ctx = await _load_course(db, course_id, user_info)
    task = ctx.resolve_task(task_key)
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    chunks = (await db.execute(
        select(CodeEditChunk).where(
            CodeEditChunk.course_id == course_id,
            CodeEditChunk.student_id == student_id,
            CodeEditChunk.task_key == task_key,
        ).order_by(CodeEditChunk.started_at_ms, CodeEditChunk.session_id, CodeEditChunk.seq)
    )).scalars().all()
    files: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for c in chunks:
        files[c.file_name].append({
            "session": c.session_id, "seq": c.seq, "client": c.client,
            "started_at_ms": c.started_at_ms, "base_text": c.base_text, "ops": c.ops,
        })
    provenance_rows = (await db.execute(
        select(CodeProvenance).where(
            CodeProvenance.course_id == course_id,
            CodeProvenance.student_id == student_id,
            CodeProvenance.task_key == task_key,
        )
    )).scalars().all()
    checks = (await db.execute(
        select(LearningEvent.created_at, LearningEvent.outcome, LearningEvent.attempt).where(
            LearningEvent.course_id == course_id,
            LearningEvent.student_id == student_id,
            LearningEvent.task_key == task_key,
            LearningEvent.event_type == "check",
        ).order_by(LearningEvent.created_at)
    )).all()
    return {
        "task_key": task_key,
        "task": task["slide"]["title"],
        "provenance": learning_store.provenance_report(list(provenance_rows)),
        "final": {row.file_name: row.text for row in provenance_rows},
        # Oynatmada başlangıç kodunu öğrencinin yazdığından ayırmak için.
        "starters": task["slide"]["starters"],
        "files": files,
        "checks": [{"at": _iso(at), "outcome": outcome, "attempt": attempt} for at, outcome, attempt in checks],
    }


# --- okuma: ödevler ---------------------------------------------------------------

def _grade_bucket(grade: Optional[int]) -> Optional[str]:
    if grade is None:
        return None
    if grade < 50:
        return "0-49"
    if grade < 70:
        return "50-69"
    if grade < 85:
        return "70-84"
    return "85-100"


async def _homework_events(db: AsyncSession, course_id: int, student_id: Optional[int] = None):
    query = select(LearningEvent).where(
        LearningEvent.course_id == course_id,
        LearningEvent.event_type.in_(("homework_review", "homework_graded")),
    ).order_by(LearningEvent.created_at)
    if student_id is not None:
        query = query.where(LearningEvent.student_id == student_id)
    return (await db.execute(query)).scalars().all()


async def _student_homework(db: AsyncSession, ctx, student_id: int) -> List[Dict[str, Any]]:
    subs = {s.node_id: s for s in (await db.execute(
        select(HomeworkSubmission).where(
            HomeworkSubmission.course_id == ctx.course_id, HomeworkSubmission.student_id == student_id)
    )).scalars().all()}
    reviews: Dict[str, Dict[str, Any]] = {}
    for e in await _homework_events(db, ctx.course_id, student_id):
        if e.event_type == "homework_review":
            reviews[e.task_key] = e.details or {}
    out = []
    for slide in ctx.slides.values():
        if slide["type"] != "homework":
            continue
        sub = subs.get(slide["id"])
        review = reviews.get(slide["id"]) or {}
        out.append({
            "task_key": slide["id"], "title": slide["title"],
            "due_at": homework_rules.due_iso(slide.get("due")),
            "late": homework_rules.is_late(sub.submitted_at, slide.get("due")) if sub else False,
            "overdue": not sub and bool(slide.get("due")) and datetime.utcnow() > slide["due"],
            "submitted": bool(sub), "submitted_at": _iso(sub.submitted_at) if sub else None,
            "grade": sub.grade if sub else None, "feedback": sub.feedback if sub else None,
            "ai_score": review.get("score"), "weaknesses": review.get("weaknesses") or [],
        })
    return out


@router.get("/courses/{course_id}/homework")
async def homework_analysis(
    course_id: int,
    class_id: Optional[str] = None,
    since: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    scope = await _scope(db, ctx, course_id, class_id, since)
    students = scope.students
    subs_by_node: Dict[str, List[HomeworkSubmission]] = defaultdict(list)
    for s in (await db.execute(
        select(HomeworkSubmission).where(HomeworkSubmission.course_id == course_id)
    )).scalars().all():
        if scope.keep(s.student_id) and scope.recent(s.submitted_at):
            subs_by_node[s.node_id].append(s)

    # Öğrenci başına SON YZ değerlendirmesi — aynı ödevi üç kez kontrol eden
    # öğrenci ortak zayıflıkları üç kez saymasın.
    latest_review: Dict[tuple, Dict[str, Any]] = {}
    self_checks: Dict[str, Counter] = defaultdict(Counter)
    for e in await _homework_events(db, course_id):
        if not scope.keep(e.student_id) or not scope.recent(e.created_at):
            continue
        if e.event_type == "homework_review":
            latest_review[(e.task_key, e.student_id)] = e.details or {}
            if (e.details or {}).get("source") == "student":
                self_checks[e.task_key][e.student_id] += 1

    homeworks = []
    for slide in ctx.slides.values():
        if slide["type"] != "homework":
            continue
        subs = subs_by_node.get(slide["id"], [])
        graded = [s for s in subs if s.graded_at]
        grades = [s.grade for s in graded if s.grade is not None]
        reviews = {sid: r for (key, sid), r in latest_review.items() if key == slide["id"]}
        ai_scores = [r["score"] for r in reviews.values() if isinstance(r.get("score"), (int, float))]

        weakness_students: Dict[str, set] = defaultdict(set)
        weakness_notes: Dict[str, Counter] = defaultdict(Counter)
        for sid, review in reviews.items():
            for w in review.get("weaknesses") or []:
                key = w.get("conceptId") or "_diger"
                weakness_students[key].add(sid)
                if w.get("misconception"):
                    weakness_notes[key][w["misconception"]] += 1

        # Öğretmen notu ile YZ puanı arasındaki fark: büyükse YZ bu ödevde güvenilmez.
        gaps = []
        for s in graded:
            review = reviews.get(s.student_id)
            if review and isinstance(review.get("score"), (int, float)) and s.grade is not None:
                gaps.append(abs(s.grade - review["score"]))

        submitted_ids = {s.student_id for s in subs}
        due = slide.get("due")
        homeworks.append({
            "task_key": slide["id"],
            "title": slide["title"],
            "due_at": homework_rules.due_iso(due),
            "late": sum(1 for s in subs if homework_rules.is_late(s.submitted_at, due)),
            "overdue": bool(due) and datetime.utcnow() > due,
            "node": ctx.nodes.get(slide["node_id"], {}).get("title"),
            "enrolled": len(students),
            "submitted": len(submitted_ids),
            "graded": len(graded),
            "pending_grading": len(subs) - len(graded),
            "avg_grade": round(sum(grades) / len(grades), 1) if grades else None,
            "grade_distribution": dict(Counter(_grade_bucket(g) for g in grades)),
            "avg_ai_score": round(sum(ai_scores) / len(ai_scores), 1) if ai_scores else None,
            "ai_teacher_gap": round(sum(gaps) / len(gaps), 1) if gaps else None,
            "common_weaknesses": [{
                "concept_id": None if key == "_diger" else key,
                "label": "Diğer" if key == "_diger" else _concept_label(ctx, key),
                "students": len(sids),
                "misconceptions": [m for m, _ in weakness_notes[key].most_common(3)],
            } for key, sids in sorted(weakness_students.items(), key=lambda kv: -len(kv[1]))[:6]],
            "self_checks": sum(self_checks[slide["id"]].values()),
            "missing": [{"student_id": sid, "student": name}
                        for sid, name in students.items() if sid not in submitted_ids],
        })
    return {"homeworks": homeworks}


# --- kavram etiketleme (eski kurslar) --------------------------------------------

@router.post("/courses/{course_id}/tag-concepts")
async def tag_course_concepts(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Kavram etiketi olmayan düğümlere kazanım ve kavram bağlar.

    Etiketler yol haritası YZ ile üretilirken ekleniyor; elle kurulmuş ya da
    eski kurslarda yok. Etiketsiz bir modüldeki olaylar hiçbir kavrama
    bağlanamaz ve kazanım haritasında görünmez — bu uç o boşluğu kapatır.
    Mevcut etiketlere dokunmaz.
    """
    course = await ensure_course_owner(db, course_id, user_info)
    from routers.ai import EnrichTopicsRequest, enrich_topics_api  # geç: ai modülü ağır

    curriculum = list(course.curriculum or [])
    targets = [
        (i, n) for i, n in enumerate(curriculum)
        if isinstance(n, dict) and n.get("type") != "live_sessions_config" and not n.get("conceptIds")
    ]
    if not targets:
        return {"tagged": 0, "message": "Tüm modüller zaten etiketli."}

    topics = [str(n.get("aiModuleTopic") or n.get("title") or "").strip() or f"Modül {i + 1}" for i, n in targets]
    result = await enrich_topics_api(
        EnrichTopicsRequest(topics=topics, course_topic=course.title or "", audience=""),
        teacher_id=course.teacher_id, db=db,
    )
    if result.get("dictionary_missing"):
        return {"tagged": 0, "dictionary_missing": True, "language": result.get("language")}

    tagged = 0
    for item in result.get("topics") or []:
        idx = item.get("topic_index")
        if not isinstance(idx, int) or idx >= len(targets) or not item.get("concepts"):
            continue
        position, node = targets[idx]
        concepts = item["concepts"]
        node = dict(node)
        node["conceptLanguage"] = result.get("language")
        node["conceptIds"] = [c["concept_id"] for c in concepts]
        node["primaryConceptId"] = next((c["concept_id"] for c in concepts if c.get("primary")), concepts[0]["concept_id"])
        node["outcomes"] = item.get("outcomes") or []
        curriculum[position] = node
        tagged += 1

    course.curriculum = curriculum
    flag_modified(course, "curriculum")
    await db.commit()
    await learning_store.course_context(db, course_id, fresh=True)
    return {"tagged": tagged, "language": result.get("language")}


# --- okuma: öğrenci listesi ve kavram kanıtı ---------------------------------------

@router.get("/courses/{course_id}/students")
async def student_list(
    course_id: int,
    class_id: Optional[str] = None,
    since: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Sınıf listesi: her öğrenci için zorlandığı kavram sayısı, takıldığı görevler, son etkinlik."""
    ctx = await _load_course(db, course_id, user_info)
    scope = await _scope(db, ctx, course_id, class_id, since)
    students = scope.students
    now = datetime.utcnow()

    statuses: Dict[int, Counter] = defaultdict(Counter)
    for m in (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == course_id)
    )).scalars().all():
        statuses[m.student_id][mastery_status(m.score, m.evidence_weight)] += 1

    empty = {"attempted": 0, "solved": 0, "stuck": 0, "stuck_now": 0, "last": None}
    tasks: Dict[int, Dict[str, Any]] = defaultdict(lambda: dict(empty))
    for p in (await db.execute(
        select(TaskProgress).where(TaskProgress.course_id == course_id)
    )).scalars().all():
        if not scope.recent(p.last_activity_at):
            continue
        row = _progress_row(p)
        t = tasks[row["student_id"]]
        t["attempted"] += 1
        t["solved"] += 1 if row["solved_at"] else 0
        t["stuck"] += 1 if is_stuck(row) else 0
        t["stuck_now"] += 1 if is_stuck_now(row, now) else 0
        if row["last_activity_at"] and (t["last"] is None or row["last_activity_at"] > t["last"]):
            t["last"] = row["last_activity_at"]

    flags: Counter = Counter()
    reviews = await reviews_for(db, course_id)
    for (sid, task), report in (await _provenance_by_task(db, course_id)).items():
        review = reviews.get((sid, task))
        if review and review.verdict == "accepted":
            continue
        flags[sid] += len(report["flags"])
    help_open = Counter(h.student_id for h in await _open_help(db, course_id))

    submitted: Counter = Counter()
    for sid, node_id in (await db.execute(
        select(HomeworkSubmission.student_id, HomeworkSubmission.node_id)
        .where(HomeworkSubmission.course_id == course_id)
    )).all():
        if ctx.slides.get(str(node_id), {}).get("type") == "homework":
            submitted[sid] += 1
    homework_total = sum(1 for s in ctx.slides.values() if s["type"] == "homework")

    rows = []
    for sid, name in students.items():
        t = tasks.get(sid, empty)
        rows.append({
            "student_id": sid,
            "student": name,
            "struggling": statuses[sid].get("zorlaniyor", 0),
            "developing": statuses[sid].get("gelisiyor", 0),
            "mastered": statuses[sid].get("hakim", 0),
            "tasks_attempted": t["attempted"],
            "tasks_solved": t["solved"],
            "stuck_tasks": t["stuck"],
            "stuck_now": t["stuck_now"],
            "code_flags": flags.get(sid, 0),
            "help_open": help_open.get(sid, 0),
            "homework_submitted": submitted.get(sid, 0),
            "homework_total": homework_total,
            "last_activity_at": _iso(t["last"]),
        })
    rows.sort(key=lambda r: (-r["help_open"], -r["stuck_now"], -r["struggling"], -r["stuck_tasks"], r["student"]))
    return {"students": rows}


@router.get("/courses/{course_id}/students/{student_id}/concepts/{concept_id}")
async def concept_evidence(
    course_id: int,
    student_id: int,
    concept_id: str,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Kazanım haritasındaki bir hücrenin gerekçesi: bu öğrencinin bu kavramdaki kanıtları."""
    ctx = await _load_course(db, course_id, user_info)
    mastery = (await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.course_id == course_id,
            ConceptMastery.student_id == student_id,
            ConceptMastery.concept_id == concept_id,
        )
    )).scalar_one_or_none()
    events = (await db.execute(
        select(LearningEvent).where(
            LearningEvent.course_id == course_id, LearningEvent.student_id == student_id)
        .order_by(LearningEvent.created_at.desc()).limit(500)
    )).scalars().all()
    evidence = []
    for e in events:
        if concept_id not in (e.concept_ids or []):
            continue
        details = e.details or {}
        evidence.append({
            "event_id": e.id,
            "at": _iso(e.created_at),
            "type": e.event_type,
            "task_key": e.task_key,
            "task": _task_title(ctx, e.task_key) if e.task_key else None,
            "outcome": e.outcome,
            "attempt": e.attempt,
            "error_type": e.error_type,
            "failed": [c.get("label") for c in details.get("checks", []) if c.get("status") == "fail"],
            "misconception": details.get("misconception"),
            "coach": details.get("message"),
            "grade": details.get("grade") if e.event_type == "homework_graded" else details.get("score"),
            "question": details.get("question"),
            "note": details.get("note") or details.get("text"),
            "has_code": bool(e.code_snapshot),
        })
        if len(evidence) >= 60:
            break
    info = ctx.concepts.get(concept_id, {})
    return {
        "concept_id": concept_id,
        "label": info.get("label", concept_id),
        "description": info.get("description", ""),
        "prerequisites": [{"concept_id": p, "label": _concept_label(ctx, p)} for p in info.get("prerequisites", [])],
        "status": mastery_status(mastery.score, mastery.evidence_weight) if mastery else "veri_az",
        "score": round(mastery.score, 3) if mastery else None,
        "misconception": mastery.last_misconception if mastery else None,
        "evidence": evidence,
    }


# --- Faz 5: YZ yorumu ---------------------------------------------------------------

class InsightRequest(BaseModel):
    student_id: Optional[int] = None
    force: bool = False


_TIME_KEYS = {"stuck_now", "minutes_on_task", "last_activity_at", "last_evidence_at", "at", "minutes"}


def _without_time(value: Any) -> Any:
    """Özetten zamana bağlı alanları atar: aynı veri her saniye farklı parmak izi vermesin."""
    if isinstance(value, dict):
        return {k: _without_time(v) for k, v in value.items() if k not in _TIME_KEYS}
    if isinstance(value, list):
        return [_without_time(v) for v in value]
    return value


async def _class_digest(db: AsyncSession, course_id: int, user_info: dict, ctx) -> Dict[str, Any]:
    overview = await course_overview(course_id=course_id, user_info=user_info, db=db)
    tasks = (await task_list(course_id=course_id, user_info=user_info, db=db))["tasks"]
    homework = (await homework_analysis(course_id=course_id, user_info=user_info, db=db))["homeworks"]
    students = await _students(db, course_id)

    # Sınıf düzeyinde kök neden: kaç öğrencide "X zorlanıyor ve önkoşulu Y zayıf".
    statuses: Dict[int, Dict[str, str]] = defaultdict(dict)
    struggling_names: Dict[str, List[str]] = defaultdict(list)
    for m in (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == course_id)
    )).scalars().all():
        status = mastery_status(m.score, m.evidence_weight)
        statuses[m.student_id][m.concept_id] = status
        if status == "zorlaniyor":
            struggling_names[m.concept_id].append(students.get(m.student_id, f"Öğrenci #{m.student_id}"))
    prerequisites = {c: info.get("prerequisites", []) for c, info in ctx.concepts.items()}
    causes: Counter = Counter()
    for per_student in statuses.values():
        for rc in root_causes(per_student, prerequisites):
            for p in rc["weak_prerequisites"]:
                causes[(rc["concept_id"], p)] += 1

    return _without_time({
        "course": overview["course"]["title"],
        "students": overview["student_count"],
        "tagged_modules": f"{overview['course']['tagged_nodes']}/{overview['course']['nodes']}",
        "concepts": [{**c, "struggling_students": sorted(struggling_names.get(c["concept_id"], []))[:8]}
                     for c in overview["concepts"]],
        "root_causes": [{
            "concept": _concept_label(ctx, c), "concept_id": c,
            "weak_prerequisite": _concept_label(ctx, p), "students": n,
        } for (c, p), n in causes.most_common(5)],
        "tasks": [{
            "task": t["task"], "stage": t["stage"], "started": t["started"], "solved": t["solved"],
            "first_try_rate": t["first_try_rate"], "stuck": t["stuck"],
            "top_failures": t["top_failures"][:3], "top_misconceptions": t["top_misconceptions"][:3],
        } for t in tasks if t["started"]],
        "at_risk": [{
            "student": s["student"], "struggling": [c["label"] for c in s["struggling_concepts"]],
            "stuck_tasks": s["stuck_tasks"],
        } for s in overview["at_risk"]],
        "homework": [{
            "title": h["title"], "submitted": f"{h['submitted']}/{h['enrolled']}",
            "avg_grade": h["avg_grade"], "common_weaknesses": h["common_weaknesses"][:4],
        } for h in homework],
        "code_origin": [{
            "student": i["student"], "task": i["task"], "own_share": i["own_share"],
            "flags": [f["label"] for f in i["flags"]],
        } for i in overview["integrity"][:10]],
    })


async def _student_digest(db: AsyncSession, course_id: int, student_id: int, user_info: dict) -> Dict[str, Any]:
    profile = await student_profile(course_id=course_id, student_id=student_id, user_info=user_info, db=db)
    errors = Counter(t["error_type"] for t in profile["timeline"] if t.get("error_type"))
    return _without_time({
        "student": profile["student"],
        "concepts": [{
            "concept_id": c["concept_id"], "label": c["label"], "status": c["status"],
            "successes": c["successes"], "failures": c["failures"], "misconception": c["misconception"],
        } for c in profile["concepts"]],
        "root_causes": [{
            "concept": rc["label"], "weak_prerequisites": [p["label"] for p in rc["weak_prerequisites"]],
        } for rc in profile["root_causes"]],
        "tasks": [{
            "task": t["task"], "stage": t["stage"], "attempts": t["attempts"], "solved": t["solved"],
            "stuck": t["stuck"], "last_failure": t["last_failure"], "hints_opened": t["hints_opened"],
            "own_share": t["own_share"], "flags": [f["label"] for f in t["flags"]],
        } for t in profile["tasks"]],
        "homework": [{
            "title": h["title"], "submitted": h["submitted"], "grade": h["grade"], "ai_score": h["ai_score"],
            "weaknesses": [w.get("misconception") or w.get("explanation") for w in h["weaknesses"]][:4],
        } for h in profile["homework"]],
        "frequent_errors": dict(errors.most_common(5)),
    })


async def _insight_digest(db, course_id, user_info, ctx, student_id: Optional[int]):
    if student_id:
        return await _student_digest(db, course_id, student_id, user_info)
    return await _class_digest(db, course_id, user_info, ctx)


def _insight_out(row: Optional[LearningInsight], current_hash: str) -> Dict[str, Any]:
    if not row:
        return {"insight": None, "stale": True}
    age = datetime.utcnow() - row.created_at if row.created_at else timedelta(days=999)
    return {
        "insight": row.payload,
        "created_at": _iso(row.created_at),
        # Veri değiştiyse ya da bir günden eskiyse yorum "güncel değil" gösterilir.
        "stale": row.digest_hash != current_hash or age > timedelta(hours=24),
    }


async def _insight_row(db, course_id: int, student_id: Optional[int]) -> Optional[LearningInsight]:
    return (await db.execute(
        select(LearningInsight).where(
            LearningInsight.course_id == course_id, LearningInsight.student_id == (student_id or 0))
    )).scalar_one_or_none()


@router.get("/courses/{course_id}/insights")
async def get_insight(
    course_id: int,
    student_id: Optional[int] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Kayıtlı YZ yorumu (model ÇAĞRILMAZ). Yoksa ya da eskidiyse `stale` true."""
    ctx = await _load_course(db, course_id, user_info)
    digest = await _insight_digest(db, course_id, user_info, ctx, student_id)
    row = await _insight_row(db, course_id, student_id)
    return _insight_out(row, learning_insights.digest_hash(digest))


@router.post("/courses/{course_id}/insights")
async def create_insight(
    course_id: int,
    body: InsightRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """YZ yorumu üretir. Aynı veriyle ve 24 saat içinde tekrar istenirse model çağrılmaz."""
    ctx = await _load_course(db, course_id, user_info)
    students = await _students(db, course_id)
    if body.student_id and body.student_id not in students:
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    digest = await _insight_digest(db, course_id, user_info, ctx, body.student_id)
    current = learning_insights.digest_hash(digest)
    row = await _insight_row(db, course_id, body.student_id)
    cached = _insight_out(row, current)
    if row and not cached["stale"] and not body.force:
        return {**cached, "cached": True}

    from routers.ai import record_ai_usage  # geç: ai modülü ağır
    try:
        parsed, response = learning_insights.generate_insight(digest, "student" if body.student_id else "class")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Yorum servisi şu anda yanıt vermiyor.") from exc

    payload = learning_insights.clean_insight(
        parsed,
        {c: info["label"] for c, info in ctx.concepts.items()},
        {name: sid for sid, name in students.items()},
    )
    if row:
        row.payload, row.digest_hash, row.created_at = payload, current, datetime.utcnow()
    else:
        row = LearningInsight(course_id=course_id, student_id=body.student_id or 0,
                              digest_hash=current, payload=payload, created_at=datetime.utcnow())
        db.add(row)
    await record_ai_usage(
        db, int(user_info["sub"]), "learning_insight", learning_insights.settings.GEMINI_MODEL, response,
        details=f"Öğrenme yorumu ({'öğrenci' if body.student_id else 'sınıf'})",
        course_id=course_id, course_title=ctx.title,
    )
    await db.commit()
    return {**_insight_out(row, current), "cached": False}


# --- Faz 5: tekrar görevi -------------------------------------------------------------

class PracticeRequest(BaseModel):
    concept_id: str


class PracticeApply(BaseModel):
    node_id: str
    slide: Dict[str, Any]
    concept_id: Optional[str] = None


def _practice_nodes(ctx, concept_id: str) -> List[str]:
    """Tekrar görevinin eklenebileceği modüller: kavramı ölçen UYGULA modülleri önce."""
    measuring = [n for n in ctx.node_order if concept_id in (ctx.nodes[n].get("concepts") or [])]
    apply_first = [n for n in measuring if ctx.nodes[n]["stage"] == "UYGULA"]
    return apply_first + [n for n in measuring if n not in apply_first]


@router.post("/courses/{course_id}/practice-task")
async def practice_task(
    course_id: int,
    body: PracticeRequest,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Sınıfın zorlandığı kavram için Uygula görevi TASLAĞI. Derse eklenmez; öğretmen onaylar."""
    ctx = await _load_course(db, course_id, user_info)
    info = ctx.concepts.get(body.concept_id)
    if not info:
        raise HTTPException(status_code=404, detail="Kavram bu kursun sözlüğünde yok.")
    rows = (await db.execute(
        select(ConceptMastery.last_misconception).where(
            ConceptMastery.course_id == course_id,
            ConceptMastery.concept_id == body.concept_id,
            ConceptMastery.last_misconception.isnot(None),
        )
    )).all()
    misconceptions = [m for m, _ in Counter(r[0] for r in rows).most_common(5)]
    nodes = _practice_nodes(ctx, body.concept_id) or list(ctx.node_order)
    node_title = ctx.nodes[nodes[0]]["title"] if nodes else None

    from routers.ai import _build_challenge_slide, record_ai_usage
    try:
        parsed, response = learning_insights.generate_practice_task(
            ctx.language or "python", info["label"], info.get("description", ""), misconceptions, node_title,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Görev üretilemedi, tekrar dene.") from exc
    slide = _build_challenge_slide(json.dumps(parsed, ensure_ascii=False))
    await record_ai_usage(
        db, int(user_info["sub"]), "practice_task", learning_insights.settings.GEMINI_MODEL, response,
        details=f"Tekrar görevi: {info['label']}", course_id=course_id, course_title=ctx.title,
    )
    await db.commit()
    return {
        "slide": slide,
        "concept": info["label"],
        "misconceptions": misconceptions,
        "nodes": [{"node_id": n, "title": ctx.nodes[n]["title"], "stage": ctx.nodes[n]["stage"]} for n in nodes],
    }


@router.post("/courses/{course_id}/practice-task/apply")
async def apply_practice_task(
    course_id: int,
    body: PracticeApply,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Onaylanan tekrar görevini modülün sonuna ekler."""
    ctx = await _load_course(db, course_id, user_info)
    node = ctx.nodes.get(body.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Modül bulunamadı.")
    from routers.ai import _build_challenge_slide
    # İstemciden gelen slayt olduğu gibi yazılmaz: görev kurucusundan geçer.
    config = body.slide.get("challengeConfig") if isinstance(body.slide, dict) else None
    slide = _build_challenge_slide(json.dumps(config or {}, ensure_ascii=False))

    content = (await db.execute(
        select(LessonContent).where(LessonContent.course_id == course_id, LessonContent.node_id == body.node_id)
    )).scalar_one_or_none()
    if content:
        content.slides = [*(content.slides or []), slide]
        flag_modified(content, "slides")
    else:
        db.add(LessonContent(course_id=course_id, node_id=body.node_id, title=node["title"], slides=[slide]))
    # Müdahale olarak kaydedilir: "Yapılanlar" kartı sonrasını öncesiyle karşılaştırır.
    if body.concept_id and body.concept_id in ctx.concepts:
        title = (slide.get("challengeConfig") or {}).get("title") or "Görev"
        await record_action(
            db, course_id, ctx.teacher_id, "practice_task", f"Tekrar görevi eklendi: {title}",
            concept_id=body.concept_id, note=f"{node['title']} modülüne",
        )
    await db.commit()
    await learning_store.course_context(db, course_id, fresh=True)
    return {"ok": True, "slide_id": slide["id"], "node_id": body.node_id, "node": node["title"]}


# --- "Kodunu açıkla" ------------------------------------------------------------------

EXPLAIN_FLAGS = {"paste_heavy", "bulk_heavy", "external_change"}


class ExplainStart(BaseModel):
    course_id: int
    task_key: str


class ExplainAnswer(BaseModel):
    file: str = ""
    line_no: int
    code: str
    answer: str = ""


class ExplainSubmit(BaseModel):
    course_id: int
    task_key: str
    answers: List[ExplainAnswer]


@router.post("/explain/start")
async def explain_start(
    body: ExplainStart,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Çözüm büyük ölçüde dışarıdan geldiyse öğrenciye açıklatılacak satırları verir.

    Ceza değil, anlama kontrolü: satırları açıklayan öğrenci görevi tamamlar;
    öğretmen açıklamanın yeterli olup olmadığını görür.
    """
    student_id = _require_student(user_info)
    await ensure_course_access(db, body.course_id, user_info)
    ctx = await learning_store.course_context(db, body.course_id)
    task = ctx.resolve_task(body.task_key) if ctx else None
    if not task or not task["slide"].get("explain"):
        return {"required": False}
    done = (await db.execute(
        select(LearningEvent.id).where(
            LearningEvent.course_id == body.course_id, LearningEvent.student_id == student_id,
            LearningEvent.task_key == body.task_key, LearningEvent.event_type == "explain",
        ).limit(1)
    )).first()
    if done:
        return {"required": False, "done": True}

    rows = (await db.execute(
        select(CodeProvenance).where(
            CodeProvenance.course_id == body.course_id, CodeProvenance.student_id == student_id,
            CodeProvenance.task_key == body.task_key,
        )
    )).scalars().all()
    report = learning_store.provenance_report(list(rows))
    reasons = [f for f in report["flags"] if f["code"] in EXPLAIN_FLAGS]
    if not reasons:
        return {"required": False}
    lines = []
    for row in rows:
        for line in code_provenance.foreign_lines(learning_store._provenance_state(row), limit=2):
            lines.append({"file": row.file_name, **line})
    lines = sorted(lines, key=lambda item: -len(item["code"]))[:2]
    if not lines:
        return {"required": False}
    return {"required": True, "reason": reasons[0]["label"], "lines": lines}


@router.post("/explain/answer")
async def explain_answer(
    body: ExplainSubmit,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    student_id = _require_student(user_info)
    if not body.answers or len(body.answers) > 3:
        raise HTTPException(status_code=400, detail="1-3 satır açıklanmalı.")
    await ensure_course_access(db, body.course_id, user_info)
    ctx = await learning_store.course_context(db, body.course_id)
    task = ctx.resolve_task(body.task_key) if ctx else None
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")

    answers = [{
        "file": _clip(a.file, 80) or "", "line_no": a.line_no,
        "code": _clip(a.code, 200) or "", "answer": (_clip(a.answer, 1000) or "").strip(),
    } for a in body.answers]

    response = None
    if all(not a["answer"] for a in answers):
        # Boş cevap için model çağırmaya gerek yok.
        verdicts = [{"line_no": a["line_no"], "understood": False,
                     "feedback": "Bu satırın ne yaptığını kendi cümlelerinle yazmayı dene."} for a in answers]
    else:
        task_text = f"{task['slide']['title']}\n{task['slide'].get('prompt', '')}"
        try:
            verdicts, response = learning_insights.judge_explanations(task_text, answers)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail="Açıklama şu anda değerlendirilemedi.") from exc
        for verdict, answer in zip(verdicts, answers):
            if not answer["answer"]:
                verdict["understood"] = False

    understood = all(v["understood"] for v in verdicts)
    event = {
        "type": "explain",
        "task_key": body.task_key,
        "outcome": "pass" if understood else "fail",
        "client": "server",
        "details": {"lines": answers, "verdicts": verdicts},
    }
    await learning_store.record_event(db, ctx, student_id, event)
    if response is not None:
        from routers.ai import record_ai_usage
        await record_ai_usage(
            db, None, "explain_check", learning_insights.settings.GEMINI_MODEL, response,
            details="Kodunu açıkla değerlendirmesi", course_id=body.course_id, course_title=ctx.title,
        )
    await db.commit()
    await learning_store.notify_teacher(ctx, student_id, event)
    return {"understood": understood, "verdicts": verdicts}


# --- öğrencinin kendi kazanımları ------------------------------------------------------

@router.get("/me/courses/{course_id}/concepts")
async def my_concepts(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrenci kendi kazanım haritasını görür: neyi biliyor, neye çalışmalı.

    Öğretmen sayfasındaki dil öğrenciye göre yumuşatılır ("zorlanıyor" değil
    "tekrar etmeye değer"); yanılgı etiketleri ve kod kökeni gösterilmez.
    """
    student_id = _require_student(user_info)
    await ensure_course_access(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return await learning_views.concept_view(db, ctx, student_id)
