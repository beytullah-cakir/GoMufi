"""
Öğrencinin modül ilerlemesi ve öğretmenin sınıf yönetimi ayarları.

Öğrenci:
  GET  /progress/courses/{id}              bitirdiği modüller, açık modül sınırı, teslim ettiği ödevler
  POST /progress/courses/{id}/complete     {node_id, stars?, via?}  modülü bitir (XP bir kez verilir)

Öğretmen:
  GET  /courses/{id}/classroom-settings    liderlik tablosu açık mı, şube başına açık modül sınırı
  PUT  /courses/{id}/classroom-settings    {leaderboard_enabled?, unlocked_until?}

İlerleme eskiden öğrencinin tarayıcısında tutuluyordu: okulda ve evde farklı
görünüyor, ortak laboratuvar bilgisayarında başkasına geçiyordu, öğretmen
göremiyordu. Artık hesaba bağlı ve sunucuda.

Kural: modüller sırayla açılır (ilki her zaman açık, sonraki bir öncekinin
bitmesiyle). Öğretmen şube için "buraya kadar açık" sınırı koyabilir. Canlı
derste öğretmenin işlediği modüller (oturum başlığındaki sıra) öğrenci için
bitmiş sayılır.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

import learning_store
from auth.dependencies import get_current_teacher_id, get_current_user_info
from connect_db import get_db
from core import classroom, meb
from models.course import Course
from models.enrollment import Enrollment
from models.homework_submission import HomeworkSubmission
from models.live_session import LiveSession
from models.school import ModuleProgress
from models.student import Student

router = APIRouter(tags=["classroom"])

DEFAULT_MODULE_XP = 500
MAX_MODULE_XP = 1000
LIVE_PREFIX = "gomufi_session:"


class CompleteIn(BaseModel):
    node_id: str = Field(..., min_length=1, max_length=100)
    stars: int = Field(3, ge=0, le=3)
    # "live": öğretmen canlı derste dersi bitirdi (kurs o an canlı olmalı)
    via: str = "self"


class ClassroomSettingsIn(BaseModel):
    leaderboard_enabled: Optional[bool] = None
    # şube kimliği ya da "*" → açık son modül sırası; None ya da eksik → sınır yok
    unlocked_until: Optional[Dict[str, Optional[int]]] = None


def _modules(course: Course) -> List[Dict[str, Any]]:
    """Öğrencinin yol haritasındaki sırayla modüller (canlı ders ayarı hariç)."""
    out = []
    for node in course.curriculum or []:
        if isinstance(node, dict) and node.get("type") != "live_sessions_config":
            out.append(node)
    return out


def _module_xp(node: Dict[str, Any]) -> int:
    try:
        xp = int(node.get("xp")) if node.get("xp") is not None else DEFAULT_MODULE_XP
    except (TypeError, ValueError):
        xp = DEFAULT_MODULE_XP
    return max(0, min(MAX_MODULE_XP, xp))


async def _enrolled_course(db: AsyncSession, course_id: int, user_info: dict) -> Course:
    if user_info.get("role") != "student":
        raise HTTPException(status_code=403, detail="İlerleme öğrenci hesaplarında tutulur.")
    student_id = int(user_info["sub"])
    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    enrolled = (await db.execute(
        select(Enrollment.id).where(Enrollment.course_id == course_id, Enrollment.student_id == student_id)
    )).first()
    if not course or not enrolled:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return course


async def _live_taught_until(db: AsyncSession, course_id: int) -> int:
    """Canlı derslerde öğretmenin bitirdiği en ileri modül sırası (1'den başlar)."""
    best = 0
    for title, in (await db.execute(
        select(LiveSession.title).where(LiveSession.course_id == course_id, LiveSession.status != "live")
    )).all():
        if title and title.startswith(LIVE_PREFIX):
            try:
                best = max(best, int(title.split(":")[1]))
            except (IndexError, ValueError):
                continue
    return best


async def _is_live(db: AsyncSession, course_id: int) -> bool:
    return (await db.execute(
        select(LiveSession.id).where(LiveSession.course_id == course_id, LiveSession.status == "live")
    )).first() is not None


async def _state(db: AsyncSession, course: Course, student_id: int) -> Dict[str, Any]:
    modules = _modules(course)
    rows = {r.node_id: r for r in (await db.execute(
        select(ModuleProgress).where(ModuleProgress.course_id == course.id, ModuleProgress.student_id == student_id)
    )).scalars().all()}
    live_until = await _live_taught_until(db, course.id)
    completed: Dict[str, Dict[str, Any]] = {}
    for index, node in enumerate(modules, start=1):
        node_id = str(node.get("id"))
        row = rows.get(node_id)
        if row:
            completed[node_id] = {"stars": row.stars, "source": row.source}
        elif index <= live_until:
            completed[node_id] = {"stars": 3, "source": "live"}
    settings = await classroom.load(db, course.id)
    my_class = classroom.student_class(course, student_id)
    submitted = sorted({str(n) for n, in (await db.execute(
        select(HomeworkSubmission.node_id).where(
            HomeworkSubmission.course_id == course.id, HomeworkSubmission.student_id == student_id)
    )).all()})
    pending = classroom.pending_review_ids(course)
    return {
        "order": [str(n.get("id")) for n in modules],
        # YZ modülü öğretmen onaylayana kadar kapalı (ve sonrası da)
        "review_block": next((i for i, n in enumerate(modules, start=1) if str(n.get("id")) in pending), None),
        "completed": completed,
        "unlocked_until": classroom.unlock_limit(settings, my_class.get("id") if my_class else None),
        "submitted_homework": submitted,
        "leaderboard_enabled": settings["leaderboard_enabled"],
    }


def _open_index(state: Dict[str, Any]) -> int:
    """Açık son modülün sırası: bitmiş ardışık modüller + 1, öğretmen sınırıyla kırpılmış."""
    done = 0
    for node_id in state["order"]:
        if node_id in state["completed"]:
            done += 1
        else:
            break
    limit = state["unlocked_until"]
    top = min(done + 1, len(state["order"]))
    if state.get("review_block"):
        top = min(top, state["review_block"] - 1)
    return min(top, limit) if limit is not None else top


@router.get("/progress/courses/{course_id}")
async def my_progress(course_id: int, user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    course = await _enrolled_course(db, course_id, user_info)
    state = await _state(db, course, int(user_info["sub"]))
    return {**state, "open_until": _open_index(state)}


@router.post("/progress/courses/{course_id}/complete")
async def complete_module(
    course_id: int,
    body: CompleteIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    course = await _enrolled_course(db, course_id, user_info)
    student_id = int(user_info["sub"])
    state = await _state(db, course, student_id)
    if body.node_id not in state["order"]:
        raise HTTPException(status_code=404, detail="Modül bulunamadı.")
    index = state["order"].index(body.node_id) + 1
    live = body.via == "live" and await _is_live(db, course_id)
    if not live and index > _open_index(state):
        raise HTTPException(status_code=409, detail="Bu modül henüz açılmadı.")

    existing = (await db.execute(
        select(ModuleProgress).where(ModuleProgress.course_id == course_id, ModuleProgress.student_id == student_id,
                                     ModuleProgress.node_id == body.node_id)
    )).scalar_one_or_none()
    xp_awarded = 0
    if existing:
        existing.stars = max(existing.stars or 0, body.stars)
    else:
        node = _modules(course)[index - 1]
        xp_awarded = _module_xp(node)
        db.add(ModuleProgress(course_id=course_id, student_id=student_id, node_id=body.node_id, stars=body.stars,
                              xp_awarded=xp_awarded, source="live" if live else "self", completed_at=datetime.utcnow()))
        if xp_awarded:
            await db.execute(update(Student).where(Student.id == student_id).values(xp=Student.xp + xp_awarded))
        # Öğretmenin analizleri (tamamlanan modül sayısı) öğrenme kaydını okur.
        ctx = await learning_store.course_context(db, course_id)
        if ctx and body.node_id in ctx.nodes:
            await learning_store.record_event(db, ctx, student_id, {"type": "module_completed", "node_id": body.node_id})
    await db.commit()

    state = await _state(db, course, student_id)
    xp = (await db.execute(select(Student.xp).where(Student.id == student_id))).scalar() or 0
    return {**state, "open_until": _open_index(state), "xp_awarded": xp_awarded, "xp": xp}


# --- öğretmen: sınıf yönetimi ayarları ---------------------------------------------

async def _own_course(db: AsyncSession, course_id: int, teacher_id: int) -> Course:
    course = (await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return course


def _settings_out(course: Course, settings: Dict[str, Any]) -> Dict[str, Any]:
    return {
        **settings,
        "classes": [{"id": str(c.get("id")), "name": c.get("name") or "Şube"}
                    for c in course.classes or [] if isinstance(c, dict) and c.get("id") is not None],
        "modules": [{"id": str(n.get("id")), "index": i, "title": n.get("title") or f"Modül {i}",
                     "lesson_topic": n.get("lessonTopic"), "theme": n.get("theme"),
                     "pending_review": n.get(classroom.AI_REVIEW_KEY) == classroom.AI_REVIEW_PENDING}
                    for i, n in enumerate(_modules(course), start=1)],
    }


@router.get("/courses/{course_id}/classroom-settings")
async def get_classroom_settings(
    course_id: int, teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db),
):
    course = await _own_course(db, course_id, teacher_id)
    return _settings_out(course, await classroom.load(db, course_id))


@router.put("/courses/{course_id}/classroom-settings")
async def put_classroom_settings(
    course_id: int,
    body: ClassroomSettingsIn,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    course = await _own_course(db, course_id, teacher_id)
    values: Dict[str, Any] = {}
    if body.leaderboard_enabled is not None:
        values["leaderboard_enabled"] = body.leaderboard_enabled
    if body.unlocked_until is not None:
        valid = {"*"} | {str(c.get("id")) for c in course.classes or [] if isinstance(c, dict)}
        count = len(_modules(course))
        limits: Dict[str, int] = {}
        for key, value in body.unlocked_until.items():
            if key not in valid:
                raise HTTPException(status_code=400, detail="Şube bulunamadı.")
            if value is None:
                continue
            if not 1 <= value <= max(1, count):
                raise HTTPException(status_code=400, detail=f"Açık modül sınırı 1 ile {max(1, count)} arasında olmalı.")
            limits[key] = value
        values["unlocked_until"] = limits
    return _settings_out(course, await classroom.save(db, course_id, values))


# --- YZ içeriği: öğretmen onayı ------------------------------------------------------

class ReviewIn(BaseModel):
    # Boşsa onay bekleyen tüm modüller
    node_ids: List[str] = []


@router.post("/courses/{course_id}/ai-review/approve")
async def approve_ai_modules(
    course_id: int,
    body: ReviewIn,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """Öğretmen YZ'nin ürettiği modülü kontrol etti: öğrencilere açılabilir."""
    course = await _own_course(db, course_id, teacher_id)
    wanted = {str(n) for n in body.node_ids}
    approved = []
    curriculum = []
    for node in course.curriculum or []:
        if (isinstance(node, dict) and node.get(classroom.AI_REVIEW_KEY) == classroom.AI_REVIEW_PENDING
                and (not wanted or str(node.get("id")) in wanted)):
            node = {k: v for k, v in node.items() if k != classroom.AI_REVIEW_KEY}
            approved.append(str(node.get("id")))
        curriculum.append(node)
    if approved:
        course.curriculum = curriculum
        flag_modified(course, "curriculum")
        await db.commit()
    return {"approved": approved, "pending": sorted(classroom.pending_review_ids(course))}


# --- MEB kazanım eşlemesi ------------------------------------------------------------

class MebIn(BaseModel):
    outcomes: List[Dict[str, Any]] = []
    mapping: Dict[str, List[str]] = {}


class MebParseIn(BaseModel):
    text: str = Field(default="", max_length=60_000)


def _meb_out(course: Course, value: Dict[str, Any]) -> Dict[str, Any]:
    modules = _modules(course)
    return {
        **meb.clean(value["outcomes"], value["mapping"], [str(n.get("id")) for n in modules]),
        "modules": [{"id": str(n.get("id")), "index": i, "title": n.get("title") or f"Modül {i}"}
                    for i, n in enumerate(modules, start=1)],
    }


@router.get("/courses/{course_id}/meb-outcomes")
async def get_meb_outcomes(
    course_id: int, teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db),
):
    course = await _own_course(db, course_id, teacher_id)
    return _meb_out(course, await meb.load(db, course_id))


@router.put("/courses/{course_id}/meb-outcomes")
async def put_meb_outcomes(
    course_id: int, body: MebIn, teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db),
):
    course = await _own_course(db, course_id, teacher_id)
    value = _meb_out(course, {"outcomes": body.outcomes, "mapping": body.mapping})
    await meb.save(db, course_id, {"outcomes": value["outcomes"], "mapping": value["mapping"]})
    return value


@router.post("/meb-outcomes/parse")
async def parse_meb_outcomes(body: MebParseIn, teacher_id: int = Depends(get_current_teacher_id)):
    """Öğretim programından yapıştırılan metni kazanım listesine çevirir (kaydetmez)."""
    return {"outcomes": meb.parse_outcomes(body.text)}
