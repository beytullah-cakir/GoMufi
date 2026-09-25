"""
Öğretmenin gördüğünü harekete çevirdiği uçlar.

Öğrenci:
  POST /analytics/help                 — "yardım istiyorum" (canlı panoda sıraya girer)
  POST /analytics/help/cancel          — "çözdüm, gerek kalmadı"
  GET  /analytics/nudges               — öğretmenin bu göreve gönderdiği, görülmemiş ipuçları
  POST /analytics/nudges/{id}/seen

Öğretmen (kursun sahibi):
  GET  /analytics/courses/{id}/help                     — açık yardım istekleri
  POST /analytics/courses/{id}/help/{rid}/resolve
  POST /analytics/courses/{id}/nudges                   — takılan öğrenciye ipucu / mesaj
  POST /analytics/courses/{id}/board                    — bir çözümü İSİMSİZ tahtaya al
  POST /analytics/courses/{id}/board/clear
  GET  /analytics/courses/{id}/actions                  — yapılan müdahaleler ve etkisi
  POST /analytics/courses/{id}/actions
  DELETE /analytics/courses/{id}/actions/{aid}
  POST /analytics/courses/{id}/students/{sid}/concepts/{cid}/assess — öğretmen değerlendirmesi
  PUT  /analytics/courses/{id}/students/{sid}/code/{task_key}/review — kod kökeni kararı
  GET/POST /analytics/courses/{id}/students/{sid}/notes, DELETE .../notes/{nid}
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import learning_store
from auth.dependencies import get_current_user_info
from connect_db import get_db
from core.permissions import ensure_course_access, ensure_course_owner
from learning_analytics import mastery_status
from models.enrollment import Enrollment
from models.learning import CodeProvenance, ConceptMastery, LearningEvent
from models.student import Student
from models.teaching import HelpRequest, ProvenanceReview, TeacherAction, TeacherNote, TeacherNudge

router = APIRouter(prefix="/analytics", tags=["live-teaching"])

ACTION_KINDS = {"reteach", "practice_task", "talk", "check_code", "other"}
REVIEW_VERDICTS = {"accepted", "concern"}
ASSESS_STATUSES = {"hakim", "gelisiyor", "zorlaniyor"}
# "Yeni kanıt" sayılan olaylar: kavram hakimiyetini gerçekten değiştirenler
# (ipucu açmak, modül bitirmek kanıt değil).
EVIDENCE_EVENTS = ("check", "quiz_answer", "homework_review", "homework_graded", "explain", "teacher_assessment")


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _require_student(user_info: dict) -> int:
    if user_info.get("role") not in ("student", "admin"):
        raise HTTPException(status_code=403, detail="Yalnızca öğrenciler.")
    return int(user_info["sub"])


async def _student_names(db: AsyncSession, ids) -> Dict[int, str]:
    ids = list(set(ids))
    if not ids:
        return {}
    return {sid: f"{f or ''} {l or ''}".strip() or f"Öğrenci #{sid}" for sid, f, l in (await db.execute(
        select(Student.id, Student.first_name, Student.last_name).where(Student.id.in_(ids))
    )).all()}


async def _enrolled_ids(db: AsyncSession, course_id: int) -> List[int]:
    return [sid for (sid,) in (await db.execute(
        select(Enrollment.student_id).where(Enrollment.course_id == course_id)
    )).all()]


async def _publish(targets: List[str], payload: Dict[str, Any]) -> None:
    try:
        from core.ws_manager import manager
        for target in targets:
            await manager.publish({**payload, "target_user": target})
    except Exception:  # noqa: BLE001 — bildirim gitmezse öğrenci sayfayı açınca görür
        pass


async def _task_ctx(db: AsyncSession, course_id: int, task_key: Optional[str], required: bool = True):
    ctx = await learning_store.course_context(db, course_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    task = ctx.resolve_task(task_key) if task_key else None
    if required and not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    return ctx, task


# --- yardım isteği (öğrenci) --------------------------------------------------------

class HelpIn(BaseModel):
    course_id: int
    task_key: str
    note: str = Field("", max_length=300)


@router.post("/help")
async def request_help(
    body: HelpIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrenci "yardım istiyorum" dedi: öğretmenin canlı panosunda sıraya girer."""
    student_id = _require_student(user_info)
    await ensure_course_access(db, body.course_id, user_info)
    ctx, task = await _task_ctx(db, body.course_id, body.task_key)
    note = body.note.strip()[:300] or None
    row = (await db.execute(
        select(HelpRequest).where(
            HelpRequest.course_id == body.course_id, HelpRequest.student_id == student_id,
            HelpRequest.task_key == body.task_key, HelpRequest.resolved_at.is_(None),
        )
    )).scalar_one_or_none()
    if row:
        row.note = note or row.note
    else:
        row = HelpRequest(course_id=body.course_id, student_id=student_id, task_key=body.task_key,
                          note=note, created_at=datetime.utcnow())
        db.add(row)
    event = {"type": "help_request", "task_key": body.task_key, "client": "server", "details": {"note": note}}
    await learning_store.record_event(db, ctx, student_id, event)
    await db.commit()
    names = await _student_names(db, [student_id])
    await _publish(
        [f"teacher:{ctx.teacher_id}", f"instructor:{ctx.teacher_id}"],
        {"type": "help_request", "courseId": body.course_id, "taskKey": body.task_key,
         "task": task["slide"]["title"], "studentId": student_id,
         "student": names.get(student_id), "note": note, "requestId": row.id},
    )
    await learning_store.notify_teacher(ctx, student_id, event)
    return {"ok": True, "request_id": row.id, "at": _iso(row.created_at)}


class HelpCancel(BaseModel):
    course_id: int
    task_key: str


@router.post("/help/cancel")
async def cancel_help(
    body: HelpCancel,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    student_id = _require_student(user_info)
    rows = (await db.execute(
        select(HelpRequest).where(
            HelpRequest.course_id == body.course_id, HelpRequest.student_id == student_id,
            HelpRequest.task_key == body.task_key, HelpRequest.resolved_at.is_(None),
        )
    )).scalars().all()
    for row in rows:
        row.resolved_at, row.resolved_by = datetime.utcnow(), "student"
    await db.commit()
    if rows:
        ctx = await learning_store.course_context(db, body.course_id)
        if ctx:
            await learning_store.notify_teacher(ctx, student_id, {"type": "help_cancel", "task_key": body.task_key})
    return {"ok": True, "closed": len(rows)}


@router.get("/help/mine")
async def my_help(
    course_id: int,
    task_key: str,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Görev açılınca: bu görevde açık bir yardım isteğim var mı?"""
    student_id = _require_student(user_info)
    row = (await db.execute(
        select(HelpRequest).where(
            HelpRequest.course_id == course_id, HelpRequest.student_id == student_id,
            HelpRequest.task_key == task_key, HelpRequest.resolved_at.is_(None),
        )
    )).scalar_one_or_none()
    return {"open": bool(row), "at": _iso(row.created_at) if row else None,
            "responded": bool(row and row.responded_at)}


# --- öğretmen ipucu (öğrenci tarafı) ------------------------------------------------

@router.get("/nudges")
async def my_nudges(
    course_id: int,
    task_key: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    student_id = _require_student(user_info)
    query = select(TeacherNudge).where(
        TeacherNudge.course_id == course_id, TeacherNudge.student_id == student_id,
        TeacherNudge.seen_at.is_(None),
    )
    if task_key:
        query = query.where((TeacherNudge.task_key == task_key) | (TeacherNudge.task_key.is_(None)))
    rows = (await db.execute(query.order_by(TeacherNudge.created_at))).scalars().all()
    return {"nudges": [{"id": n.id, "task_key": n.task_key, "text": n.text, "at": _iso(n.created_at)} for n in rows]}


@router.post("/nudges/{nudge_id}/seen")
async def nudge_seen(
    nudge_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    student_id = _require_student(user_info)
    row = (await db.execute(
        select(TeacherNudge).where(TeacherNudge.id == nudge_id, TeacherNudge.student_id == student_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Bulunamadı.")
    row.seen_at = row.seen_at or datetime.utcnow()
    await db.commit()
    return {"ok": True}


# --- öğretmen: yardım kuyruğu ve ipucu ----------------------------------------------

@router.get("/courses/{course_id}/help")
async def open_help(
    course_id: int,
    task_key: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    query = select(HelpRequest).where(HelpRequest.course_id == course_id, HelpRequest.resolved_at.is_(None))
    if task_key:
        query = query.where(HelpRequest.task_key == task_key)
    rows = (await db.execute(query.order_by(HelpRequest.created_at))).scalars().all()
    names = await _student_names(db, [r.student_id for r in rows])
    now = datetime.utcnow()
    return {"requests": [{
        "id": r.id, "student_id": r.student_id, "student": names.get(r.student_id),
        "task_key": r.task_key,
        "task": (ctx.resolve_task(r.task_key) or {}).get("slide", {}).get("title") if ctx else r.task_key,
        "note": r.note, "at": _iso(r.created_at),
        "waiting_minutes": round((now - r.created_at).total_seconds() / 60, 1),
        "responded": bool(r.responded_at),
    } for r in rows]}


@router.post("/courses/{course_id}/help/{request_id}/resolve")
async def resolve_help(
    course_id: int,
    request_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    row = (await db.execute(
        select(HelpRequest).where(HelpRequest.id == request_id, HelpRequest.course_id == course_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="İstek bulunamadı.")
    row.resolved_at = row.resolved_at or datetime.utcnow()
    row.resolved_by = row.resolved_by or "teacher"
    await db.commit()
    await _publish([f"student:{row.student_id}"], {
        "type": "help_resolved", "courseId": course_id, "taskKey": row.task_key,
    })
    return {"ok": True}


class NudgeIn(BaseModel):
    student_id: int
    task_key: Optional[str] = None
    text: str = Field(..., min_length=1, max_length=1000)


@router.post("/courses/{course_id}/nudges")
async def send_nudge(
    course_id: int,
    body: NudgeIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Takılan öğrenciye ipucu/mesaj: öğrencinin görev ekranında anında görünür."""
    course = await ensure_course_owner(db, course_id, user_info)
    if body.student_id not in await _enrolled_ids(db, course_id):
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    ctx, task = await _task_ctx(db, course_id, body.task_key, required=bool(body.task_key))
    text = body.text.strip()
    now = datetime.utcnow()
    nudge = TeacherNudge(course_id=course_id, student_id=body.student_id, teacher_id=course.teacher_id,
                         task_key=body.task_key, text=text, created_at=now)
    db.add(nudge)
    for req in (await db.execute(
        select(HelpRequest).where(
            HelpRequest.course_id == course_id, HelpRequest.student_id == body.student_id,
            HelpRequest.resolved_at.is_(None),
            *( [HelpRequest.task_key == body.task_key] if body.task_key else [] ),
        )
    )).scalars().all():
        req.responded_at = req.responded_at or now
    if body.task_key:
        # Zaman çizelgesinde "öğretmen ipucu gönderdi" görünsün.
        await learning_store.record_event(db, ctx, body.student_id, {
            "type": "teacher_nudge", "task_key": body.task_key, "client": "server",
            "details": {"text": text[:500]},
        })
    await db.commit()
    await _publish([f"student:{body.student_id}"], {
        "type": "teacher_nudge", "courseId": course_id, "taskKey": body.task_key,
        "id": nudge.id, "text": text, "at": _iso(now),
    })
    return {"ok": True, "id": nudge.id}


# --- tahtada göster ------------------------------------------------------------------

class BoardIn(BaseModel):
    task_key: str
    student_id: int
    event_id: Optional[int] = None
    note: str = Field("", max_length=300)
    # Canlı derse bağlı öğrencilerin ekranına da gönder (çevrimiçi ders).
    broadcast: bool = False


@router.post("/courses/{course_id}/board")
async def share_on_board(
    course_id: int,
    body: BoardIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Bir öğrencinin çözümünü İSİMSİZ olarak tahtaya al: sık düşen ölçütü sınıfça tartışmak için.

    Öğrencinin adı yanıta bile konmaz; öğretmen ekranı tahtaya yansıyor olabilir.
    """
    await ensure_course_owner(db, course_id, user_info)
    ctx, task = await _task_ctx(db, course_id, body.task_key)
    query = select(LearningEvent).where(
        LearningEvent.course_id == course_id, LearningEvent.student_id == body.student_id,
        LearningEvent.task_key == body.task_key, LearningEvent.code_snapshot.isnot(None),
    )
    if body.event_id:
        query = query.where(LearningEvent.id == body.event_id)
    event = (await db.execute(query.order_by(LearningEvent.created_at.desc()).limit(1))).scalar_one_or_none()
    code = event.code_snapshot if event else None
    failed = [c.get("label") for c in ((event.details or {}).get("checks") or []) if c.get("status") == "fail"] if event else []
    if not code:
        files = (await db.execute(
            select(CodeProvenance.file_name, CodeProvenance.text).where(
                CodeProvenance.course_id == course_id, CodeProvenance.student_id == body.student_id,
                CodeProvenance.task_key == body.task_key,
            )
        )).all()
        code = "\n\n".join(f"# {name}\n{text}" if len(files) > 1 else text for name, text in files) or None
    if not code:
        raise HTTPException(status_code=404, detail="Bu öğrencinin bu görevde kaydedilmiş kodu yok.")
    payload = {
        "task_key": body.task_key, "task": task["slide"]["title"],
        "language": task["slide"].get("language") or ctx.language or "python",
        "code": code[:8000], "failed": [f for f in failed if f][:3],
        "note": body.note.strip() or None,
    }
    if body.broadcast:
        students = await _enrolled_ids(db, course_id)
        await _publish([f"student:{sid}" for sid in students], {"type": "board_share", "courseId": course_id, **payload})
    return payload


@router.post("/courses/{course_id}/board/clear")
async def clear_board(
    course_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    students = await _enrolled_ids(db, course_id)
    await _publish([f"student:{sid}" for sid in students], {"type": "board_clear", "courseId": course_id})
    return {"ok": True}


# --- müdahaleler ve etkisi -----------------------------------------------------------

async def _concept_snapshot(db: AsyncSession, course_id: int, concept_id: str,
                            student_id: Optional[int] = None) -> Dict[str, Any]:
    query = select(ConceptMastery).where(
        ConceptMastery.course_id == course_id, ConceptMastery.concept_id == concept_id)
    if student_id:
        query = query.where(ConceptMastery.student_id == student_id)
    rows = (await db.execute(query)).scalars().all()
    statuses = Counter(mastery_status(r.score, r.evidence_weight) for r in rows)
    measured = [r.score for r in rows if r.evidence_weight >= 1.0]
    return {
        "struggling": statuses.get("zorlaniyor", 0),
        "developing": statuses.get("gelisiyor", 0),
        "mastered": statuses.get("hakim", 0),
        "no_data": statuses.get("veri_az", 0),
        "avg_score": round(sum(measured) / len(measured), 3) if measured else None,
        "status": mastery_status(rows[0].score, rows[0].evidence_weight) if student_id and rows else None,
    }


async def _student_snapshot(db: AsyncSession, course_id: int, student_id: int) -> Dict[str, Any]:
    rows = (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == course_id, ConceptMastery.student_id == student_id)
    )).scalars().all()
    return {"struggling": sum(1 for r in rows if mastery_status(r.score, r.evidence_weight) == "zorlaniyor")}


def _verdict(kind_scope: str, before: Dict[str, Any], after: Dict[str, Any], new_evidence: int) -> str:
    """iyilesti | degismedi | kotulesti | veri_bekleniyor — öğretmene "işe yaradı mı?" cevabı."""
    if new_evidence < 2:
        return "veri_bekleniyor"
    b_score, a_score = before.get("avg_score"), after.get("avg_score")
    if kind_scope == "student_concept":
        order = {"zorlaniyor": 0, "veri_az": 1, "gelisiyor": 1, "hakim": 2}
        b, a = order.get(before.get("status") or "veri_az", 1), order.get(after.get("status") or "veri_az", 1)
        if a > b or (b_score is not None and a_score is not None and a_score - b_score >= 0.05):
            return "iyilesti"
        if a < b or (b_score is not None and a_score is not None and b_score - a_score >= 0.05):
            return "kotulesti"
        return "degismedi"
    b_struggling, a_struggling = before.get("struggling", 0), after.get("struggling", 0)
    if a_struggling < b_struggling or (b_score is not None and a_score is not None and a_score - b_score >= 0.05):
        return "iyilesti"
    if a_struggling > b_struggling or (b_score is not None and a_score is not None and b_score - a_score >= 0.05):
        return "kotulesti"
    return "degismedi"


async def record_action(db: AsyncSession, course_id: int, teacher_id: int, kind: str, title: str,
                        concept_id: Optional[str] = None, student_id: Optional[int] = None,
                        note: Optional[str] = None) -> TeacherAction:
    """Müdahaleyi o anki durumun fotoğrafıyla yazar. Çağıran commit eder."""
    if concept_id:
        baseline = await _concept_snapshot(db, course_id, concept_id, student_id)
    elif student_id:
        baseline = await _student_snapshot(db, course_id, student_id)
    else:
        baseline = {}
    action = TeacherAction(course_id=course_id, teacher_id=teacher_id, kind=kind if kind in ACTION_KINDS else "other",
                           title=title[:200], note=(note or "").strip() or None, concept_id=concept_id,
                           student_id=student_id, baseline=baseline, created_at=datetime.utcnow())
    db.add(action)
    await db.flush()
    return action


class ActionIn(BaseModel):
    kind: str = "other"
    title: str = Field(..., min_length=1, max_length=200)
    note: Optional[str] = Field(None, max_length=2000)
    concept_id: Optional[str] = None
    student_id: Optional[int] = None


@router.post("/courses/{course_id}/actions")
async def create_action(
    course_id: int,
    body: ActionIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """"Yaptım": öneriye göre yapılan müdahale; sonrası öncesiyle karşılaştırılır."""
    course = await ensure_course_owner(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    if body.concept_id and ctx and body.concept_id not in ctx.concepts:
        raise HTTPException(status_code=400, detail="Kavram bu kursun sözlüğünde yok.")
    if body.student_id and body.student_id not in await _enrolled_ids(db, course_id):
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    action = await record_action(db, course_id, course.teacher_id, body.kind, body.title,
                                 body.concept_id, body.student_id, body.note)
    await db.commit()
    return {"ok": True, "id": action.id}


@router.get("/courses/{course_id}/actions")
async def list_actions(
    course_id: int,
    student_id: Optional[int] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    query = select(TeacherAction).where(TeacherAction.course_id == course_id)
    if student_id:
        query = query.where(TeacherAction.student_id == student_id)
    actions = (await db.execute(query.order_by(TeacherAction.created_at.desc()).limit(50))).scalars().all()
    names = await _student_names(db, [a.student_id for a in actions if a.student_id])
    out = []
    for a in actions:
        if a.concept_id:
            current = await _concept_snapshot(db, course_id, a.concept_id, a.student_id)
            scope = "student_concept" if a.student_id else "class_concept"
            evidence_query = select(LearningEvent.concept_ids).where(
                LearningEvent.course_id == course_id, LearningEvent.created_at > a.created_at,
                LearningEvent.event_type.in_(EVIDENCE_EVENTS))
            if a.student_id:
                evidence_query = evidence_query.where(LearningEvent.student_id == a.student_id)
            new_evidence = sum(1 for (concepts,) in (await db.execute(evidence_query)).all()
                               if a.concept_id in (concepts or []))
        elif a.student_id:
            current = await _student_snapshot(db, course_id, a.student_id)
            scope = "student"
            new_evidence = len((await db.execute(
                select(LearningEvent.id).where(
                    LearningEvent.course_id == course_id, LearningEvent.student_id == a.student_id,
                    LearningEvent.created_at > a.created_at, LearningEvent.event_type.in_(EVIDENCE_EVENTS))
            )).all())
        else:
            current, scope, new_evidence = {}, "other", 0
        out.append({
            "id": a.id, "kind": a.kind, "title": a.title, "note": a.note,
            "concept_id": a.concept_id,
            "concept": ctx.concepts.get(a.concept_id, {}).get("label", a.concept_id) if ctx and a.concept_id else None,
            "student_id": a.student_id, "student": names.get(a.student_id) if a.student_id else None,
            "at": _iso(a.created_at), "before": a.baseline or {}, "after": current,
            "new_evidence": new_evidence,
            "verdict": _verdict(scope, a.baseline or {}, current, new_evidence) if scope != "other" else None,
        })
    return {"actions": out}


@router.delete("/courses/{course_id}/actions/{action_id}")
async def delete_action(
    course_id: int,
    action_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    row = (await db.execute(
        select(TeacherAction).where(TeacherAction.id == action_id, TeacherAction.course_id == course_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


# --- öğretmen düzeltmeleri -----------------------------------------------------------

class AssessIn(BaseModel):
    status: str
    note: str = Field("", max_length=500)


@router.post("/courses/{course_id}/students/{student_id}/concepts/{concept_id}/assess")
async def assess_concept(
    course_id: int,
    student_id: int,
    concept_id: str,
    body: AssessIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğretmen değerlendirmesi: sistem yanıldığında öğretmen durumu düzeltir.

    Kilit değil, en güçlü tek kanıt: sonraki denemeler durumu yine değiştirir.
    Kanıt listesinde öğretmenin notuyla görünür.
    """
    if body.status not in ASSESS_STATUSES:
        raise HTTPException(status_code=400, detail="Durum hakim, gelisiyor ya da zorlaniyor olmalı.")
    await ensure_course_owner(db, course_id, user_info)
    ctx = await learning_store.course_context(db, course_id)
    if not ctx or concept_id not in ctx.concepts:
        raise HTTPException(status_code=404, detail="Kavram bu kursun sözlüğünde yok.")
    if student_id not in await _enrolled_ids(db, course_id):
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    await learning_store.record_event(db, ctx, student_id, {
        "type": "teacher_assessment", "client": "server", "outcome": body.status,
        "concept_id": concept_id, "status": body.status,
        "details": {"status": body.status, "note": body.note.strip() or None},
    })
    await db.commit()
    mastery = (await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.course_id == course_id, ConceptMastery.student_id == student_id,
            ConceptMastery.concept_id == concept_id)
    )).scalar_one_or_none()
    return {"ok": True, "status": mastery_status(mastery.score, mastery.evidence_weight) if mastery else body.status}


class ReviewIn(BaseModel):
    # accepted: "ben söyledim / konuştum, sorun yok" — clear: kararı geri al
    verdict: str
    note: str = Field("", max_length=500)


@router.put("/courses/{course_id}/students/{student_id}/code/{task_key}/review")
async def review_provenance(
    course_id: int,
    student_id: int,
    task_key: str,
    body: ReviewIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    course = await ensure_course_owner(db, course_id, user_info)
    row = (await db.execute(
        select(ProvenanceReview).where(
            ProvenanceReview.course_id == course_id, ProvenanceReview.student_id == student_id,
            ProvenanceReview.task_key == task_key)
    )).scalar_one_or_none()
    if body.verdict == "clear":
        if row:
            await db.delete(row)
            await db.commit()
        return {"ok": True, "review": None}
    if body.verdict not in REVIEW_VERDICTS:
        raise HTTPException(status_code=400, detail="Karar accepted, concern ya da clear olmalı.")
    if not row:
        row = ProvenanceReview(course_id=course_id, student_id=student_id, task_key=task_key,
                               teacher_id=course.teacher_id, verdict=body.verdict)
        db.add(row)
    row.verdict, row.note, row.created_at = body.verdict, body.note.strip() or None, datetime.utcnow()
    await db.commit()
    return {"ok": True, "review": review_out(row)}


def review_out(row: Optional[ProvenanceReview]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    return {"verdict": row.verdict, "note": row.note, "at": _iso(row.created_at)}


async def reviews_for(db: AsyncSession, course_id: int, student_id: Optional[int] = None):
    """(öğrenci, görev) → öğretmenin kod kökeni kararı."""
    query = select(ProvenanceReview).where(ProvenanceReview.course_id == course_id)
    if student_id is not None:
        query = query.where(ProvenanceReview.student_id == student_id)
    return {(r.student_id, r.task_key): r for r in (await db.execute(query)).scalars().all()}


# --- öğretmen notları ----------------------------------------------------------------

class NoteIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


@router.get("/courses/{course_id}/students/{student_id}/notes")
async def list_notes(
    course_id: int,
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    rows = (await db.execute(
        select(TeacherNote).where(TeacherNote.course_id == course_id, TeacherNote.student_id == student_id)
        .order_by(TeacherNote.created_at.desc())
    )).scalars().all()
    return {"notes": [{"id": n.id, "text": n.text, "at": _iso(n.created_at)} for n in rows]}


@router.post("/courses/{course_id}/students/{student_id}/notes")
async def add_note(
    course_id: int,
    student_id: int,
    body: NoteIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğretmenin özel notu — yalnızca kursun öğretmeni görür (öğrenci ve veli görmez)."""
    course = await ensure_course_owner(db, course_id, user_info)
    if student_id not in await _enrolled_ids(db, course_id):
        raise HTTPException(status_code=404, detail="Öğrenci bu kursa kayıtlı değil.")
    note = TeacherNote(course_id=course_id, student_id=student_id, teacher_id=course.teacher_id,
                       text=body.text.strip(), created_at=datetime.utcnow())
    db.add(note)
    await db.commit()
    return {"ok": True, "note": {"id": note.id, "text": note.text, "at": _iso(note.created_at)}}


@router.delete("/courses/{course_id}/students/{student_id}/notes/{note_id}")
async def delete_note(
    course_id: int,
    student_id: int,
    note_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await ensure_course_owner(db, course_id, user_info)
    row = (await db.execute(
        select(TeacherNote).where(TeacherNote.id == note_id, TeacherNote.course_id == course_id,
                                  TeacherNote.student_id == student_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}
