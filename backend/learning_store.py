"""
Öğrenme analitiğinin veritabanı katmanı: olayları yazar, özetleri günceller.

Kurallar learning_analytics / code_provenance / learning_concepts'te (saf);
burası yalnızca onları kursun gerçek verisine bağlar:
  * Kurs bağlamı — hangi slayt hangi düğümde, düğüm hangi kavramları ölçüyor.
  * Olay kaydı — ham olay + görev özeti + kavram hakimiyeti, tek işlemde.
  * Yazım kaydı — paket saklanır, kod kökeni durumu ilerletilir.

Başka router'lar da (teslim, not, koç, ödev değerlendirmesi) olay yazdığı için
bu modül router'lardan bağımsız duruyor; döngüsel içe aktarma olmasın.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

import code_provenance
import concept_registry
import homework_rules
from learning_analytics import apply_event_to_progress, evidences_for_event, update_mastery
from learning_concepts import error_concept
from models.course import Course
from models.learning import (
    CodeEditChunk, CodeProvenance, ConceptMastery, LearningEvent, TaskProgress,
)
from models.lesson_content import LessonContent
from models.student import Student

logger = logging.getLogger(__name__)

# Saklama süresi: kod görüntüleri ve yazım kaydı bundan eski olunca silinir.
# Özet tablolar (görev özeti, kavram hakimiyeti) kalır — içlerinde kod yok.
RETENTION_DAYS = 180
MAX_CODE_SNAPSHOT = 8 * 1024

THEME_STAGES = {
    "purple": "ANLA", "cyan": "UYGULA", "green": "BİRLEŞTİR", "yellow": "ÜRET",
    "quiz": "QUIZ", "homework": "ÖDEV",
}
TASK_TYPE_STAGES = {"challenge": "UYGULA", "connect": "BİRLEŞTİR", "produce": "ÜRET"}
TASK_CONFIG_KEYS = {"challenge": "challengeConfig", "connect": "connectConfig", "produce": "produceConfig"}
TEACHER_EVENT_TYPES = {"teacher_nudge", "teacher_assessment"}


# --- kurs bağlamı ---------------------------------------------------------------

@dataclass
class CourseContext:
    course_id: int
    teacher_id: int
    title: str
    language: Optional[str]
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    node_order: List[str] = field(default_factory=list)
    slides: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    concepts: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    # Şubeler (Sınıflarım): [{id, name, student_ids: set}] — analizde süzgeç.
    classes: List[Dict[str, Any]] = field(default_factory=list)
    # Slayt kimliği → modül kimliği (her slayt; oyun slaytı cevabı doğrulamak için)
    slide_nodes: Dict[str, str] = field(default_factory=dict)
    # "<slayt>:<eleman>" → çoktan seçmeli soru: {node_id, slide_id, element_id, question,
    #   multiple, options: [{id, text, correct, misconception}]} — cevabın doğruluğu ve
    #   yanlış şıkkın yanılgısı istemciden değil buradan okunur.
    questions: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    @property
    def known_concepts(self) -> List[str]:
        return list(self.concepts)

    def node_concepts(self, node_id: Optional[str]) -> Tuple[List[str], Optional[str]]:
        node = self.nodes.get(str(node_id)) if node_id is not None else None
        if not node:
            return [], None
        concepts = [c for c in node.get("concepts") or [] if c in self.concepts]
        primary = node.get("primary") if node.get("primary") in concepts else (concepts[0] if concepts else None)
        return concepts, primary

    def resolve_task(self, task_key: Optional[str]) -> Optional[Dict[str, Any]]:
        """Görev anahtarı -> {node_id, stage, slide}. Kursa ait değilse None."""
        if not task_key:
            return None
        key = str(task_key)
        slide_id = key.split(":", 1)[1] if ":" in key else key
        prefix = key.split(":", 1)[0] if ":" in key else None
        if prefix == "quiz":
            return None
        slide = self.slides.get(slide_id)
        if not slide:
            return None
        if prefix and prefix != slide["type"]:
            return None
        if not prefix and slide["type"] != "homework":
            return None
        return {"node_id": slide["node_id"], "stage": slide["stage"], "slide": slide}


def _slide_title(slide: Dict[str, Any]) -> str:
    kind = slide.get("type")
    cfg = slide.get(TASK_CONFIG_KEYS.get(kind, "")) or slide.get("challengeConfig") or {}
    if kind == "produce" and cfg.get("projectTitle"):
        return str(cfg["projectTitle"])
    if kind == "homework":
        return str((slide.get("homeworkConfig") or {}).get("title") or "Ödev")
    return str(cfg.get("title") or "Görev")


def _starter_texts(slide: Dict[str, Any]) -> List[str]:
    """Görevin başlangıç dosyalarının içerikleri — kod kökeninde 'başlangıç' sayılır."""
    kind = slide.get("type")
    cfg = slide.get(TASK_CONFIG_KEYS.get(kind, "")) or slide.get("challengeConfig") or {}
    texts = [str(f.get("content") or "") for f in cfg.get("files") or [] if isinstance(f, dict)]
    if cfg.get("starterCode"):
        texts.append(str(cfg["starterCode"]))
    return texts


def _int_or(value: Any, default: int) -> int:
    try:
        return max(0, min(10_000, int(value)))
    except (TypeError, ValueError):
        return default


_CONTEXT_CACHE: Dict[int, Tuple[float, CourseContext]] = {}
_CONTEXT_TTL = 60.0


async def course_context(db: AsyncSession, course_id: int, fresh: bool = False) -> Optional[CourseContext]:
    """Kursun analitik bağlamı. Kısa süre önbelleklenir: her "Kontrol Et" buna ihtiyaç duyuyor."""
    cached = _CONTEXT_CACHE.get(course_id)
    if cached and not fresh and time.monotonic() - cached[0] < _CONTEXT_TTL:
        return cached[1]

    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not course:
        return None

    ctx = CourseContext(course_id=course.id, teacher_id=course.teacher_id, title=course.title or "", language=None)
    for cls in course.classes or []:
        if not isinstance(cls, dict) or cls.get("id") is None:
            continue
        ids = set()
        for sid in cls.get("student_ids") or []:
            try:
                ids.add(int(sid))
            except (TypeError, ValueError):
                continue
        ctx.classes.append({"id": str(cls["id"]), "name": str(cls.get("name") or "Şube"), "student_ids": ids})

    curriculum = course.curriculum or []
    for index, node in enumerate(curriculum):
        if not isinstance(node, dict) or node.get("type") == "live_sessions_config":
            continue
        node_id = str(node.get("id"))
        ctx.nodes[node_id] = {
            "id": node_id,
            "title": node.get("title") or node.get("aiModuleTopic") or f"Modül {index + 1}",
            "lesson_topic": node.get("lessonTopic"),
            "stage": THEME_STAGES.get(str(node.get("theme") or "").lower(), "ANLA"),
            "concepts": [str(c) for c in node.get("conceptIds") or []],
            "primary": node.get("primaryConceptId"),
            "outcomes": node.get("outcomes") or [],
            "order": index,
        }
        ctx.node_order.append(node_id)
        if not ctx.language and node.get("conceptLanguage"):
            ctx.language = str(node["conceptLanguage"]).lower()

    lessons: List[Tuple[str, List[Any]]] = []
    for note in course.notes or []:
        if isinstance(note, dict):
            lessons.append((str(note.get("id")), note.get("slides") or []))
    rows = await db.execute(
        select(LessonContent.node_id, LessonContent.slides).where(LessonContent.course_id == course_id)
    )
    lessons.extend((str(node_id), slides or []) for node_id, slides in rows.all())

    for node_id, slides in lessons:
        for slide in slides:
            if not isinstance(slide, dict) or slide.get("id") is None:
                continue
            ctx.slide_nodes[str(slide["id"])] = node_id
            # Çoktan seçmeli sorular: slayttaki soru elemanları ve QUIZ oyunu slaytının soruları
            found = []
            for el in slide.get("elements") or []:
                if isinstance(el, dict) and el.get("type") == "multiple_choice" and el.get("id") is not None:
                    extra = el.get("extra") or {}
                    found.append((el["id"], el.get("content") or extra.get("title"), extra.get("options")))
            game = slide.get("gameConfig") or {}
            if slide.get("type") == "game":
                for q in game.get("questions") or []:
                    if isinstance(q, dict) and q.get("id") is not None and (q.get("type") or "multiple_choice") == "multiple_choice":
                        found.append((q["id"], q.get("text"), q.get("options")))
            for element_id, question, options in found:
                ctx.questions[f"{slide['id']}:{element_id}"] = {
                    "node_id": node_id,
                    "slide_id": str(slide["id"]),
                    "element_id": str(element_id),
                    "question": str(question or "Soru")[:300],
                    "options": [{
                        "id": str(o.get("id")),
                        "text": str(o.get("text") or "")[:200],
                        "correct": bool(o.get("isCorrect")),
                        "misconception": (str(o.get("misconception") or "").strip()[:200] or None),
                    } for o in options or [] if isinstance(o, dict) and o.get("id") is not None],
                }
            kind = slide.get("type")
            if kind not in ("challenge", "connect", "produce", "homework", "HOMEWORK"):
                continue
            kind = "homework" if kind == "HOMEWORK" else kind
            cfg = (slide.get("homeworkConfig") if kind == "homework"
                   else slide.get(TASK_CONFIG_KEYS.get(kind, "")) or slide.get("challengeConfig")) or {}
            ctx.slides[str(slide["id"])] = {
                "id": str(slide["id"]),
                "type": kind,
                "node_id": node_id,
                "stage": TASK_TYPE_STAGES.get(kind, "ÖDEV"),
                "title": _slide_title(slide),
                "prompt": str(((slide.get(TASK_CONFIG_KEYS.get(kind, "")) or {}).get("prompt")) or "")[:600],
                "starters": _starter_texts(slide),
                "language": ((slide.get(TASK_CONFIG_KEYS.get(kind, "")) or {}).get("language")),
                # "Kodunu açıkla": çözüm dışarıdan yapıştırıldıysa öğrenciye iki
                # satırı açıklatır. Varsayılan AÇIK; öğretmen görevde kapatabilir.
                "explain": (slide.get(TASK_CONFIG_KEYS.get(kind, "")) or {}).get("explainIfPasted") is not False,
                # Teslim kuralları (bkz. homework_rules): son tarih UTC, geç teslim, puanlama anahtarı.
                "due": homework_rules.parse_due(cfg.get("dueDate")),
                "allow_late": cfg.get("allowLate") is not False,
                "rubric": homework_rules.normalize_rubric(cfg.get("rubric")),
                "xp": _int_or(cfg.get("points") if kind == "homework" else cfg.get("xp"),
                              100 if kind != "produce" else 200),
                "instructions": str(cfg.get("instructions") or cfg.get("prompt") or "")[:4000],
                "requirements": [str(r) for r in cfg.get("requirements") or [] if str(r).strip()][:12],
                "submission_type": cfg.get("submissionType"),
            }

    if not ctx.language:
        ctx.language = concept_registry.detect_language(course.title, course.description, course.category)
    if ctx.language:
        for concept in await concept_registry.get_dictionary(db, ctx.language):
            ctx.concepts[concept.concept_id] = {
                "label": concept.label,
                "description": concept.description or "",
                "prerequisites": list(concept.prerequisites or []),
            }

    _CONTEXT_CACHE[course_id] = (time.monotonic(), ctx)
    return ctx


# --- olay kaydı -----------------------------------------------------------------

async def _get_or_create(db: AsyncSession, model, unique: Dict[str, Any], defaults: Dict[str, Any]):
    """Eşzamanlı iki istekte çift satır oluşmasın: önce ÇAKIŞMADA HİÇBİR ŞEY YAPMA ile ekle."""
    stmt = pg_insert(model).values(**unique, **defaults).on_conflict_do_nothing()
    await db.execute(stmt)
    query = select(model)
    for key, value in unique.items():
        query = query.where(getattr(model, key) == value)
    return (await db.execute(query.with_for_update())).scalar_one()


def _progress_dict(row: TaskProgress) -> Dict[str, Any]:
    return {c: getattr(row, c) for c in (
        "attempts", "first_seen_at", "last_activity_at", "solved_at", "submitted_at",
        "first_try_pass", "last_outcome", "last_failure", "same_failure_streak",
        "last_error_type", "hints_opened", "coach_messages",
    )}


async def own_share_for_task(db: AsyncSession, course_id: int, student_id: int, task_key: str) -> Optional[float]:
    """Görev dosyalarının toplamında öğrencinin elle yazdığı pay. Yazım kaydı yoksa None."""
    rows = (await db.execute(
        select(CodeProvenance).where(
            CodeProvenance.course_id == course_id,
            CodeProvenance.student_id == student_id,
            CodeProvenance.task_key == task_key,
        )
    )).scalars().all()
    report = provenance_report(list(rows))
    return report["own_share"] if report["chars"] > 0 else None


async def record_event(
    db: AsyncSession,
    ctx: CourseContext,
    student_id: int,
    event: Dict[str, Any],
    now: Optional[datetime] = None,
) -> LearningEvent:
    """Bir öğrenme olayını yazar; görev özetini ve kavram hakimiyetini günceller.

    `event` normalize edilmiş sözlük: type, task_key, node_id, stage, outcome,
    attempt, checks, stderr, code, duration_ms, client ve türe özgü alanlar.
    Çağıran commit eder.
    """
    now = now or datetime.utcnow()
    language = ctx.language or "python"
    known = ctx.known_concepts

    task = ctx.resolve_task(event.get("task_key"))
    node_id = task["node_id"] if task else event.get("node_id")
    if node_id is not None and str(node_id) not in ctx.nodes and not task:
        node_id = None
    stage = (task or {}).get("stage") or event.get("stage")
    if not stage and node_id is not None and str(node_id) in ctx.nodes:
        stage = ctx.nodes[str(node_id)]["stage"]

    error_type = error_line = err_concept = None
    if event.get("stderr"):
        error_type, error_line, err_concept = error_concept(str(event["stderr"]), language, known)
    event["error_type"] = error_type
    event["error_concept"] = err_concept

    node_concepts, primary = ctx.node_concepts(node_id)
    own_share = None
    if event.get("type") == "check" and event.get("outcome") == "pass" and event.get("task_key"):
        own_share = await own_share_for_task(db, ctx.course_id, student_id, str(event["task_key"]))
    evidences = evidences_for_event(event, node_concepts, primary, language, known, own_share)

    concept_ids = sorted({*(e.concept_id for e in evidences), *node_concepts})
    code = event.get("code")
    row = LearningEvent(
        course_id=ctx.course_id,
        student_id=student_id,
        node_id=str(node_id) if node_id is not None else None,
        task_key=event.get("task_key"),
        stage=stage,
        event_type=event["type"],
        outcome=event.get("outcome"),
        attempt=event.get("attempt"),
        error_type=error_type,
        error_line=error_line,
        concept_ids=concept_ids,
        details={**(event.get("details") or {}), **({"own_share": own_share} if own_share is not None else {})},
        code_snapshot=str(code)[:MAX_CODE_SNAPSHOT] if code else None,
        duration_ms=event.get("duration_ms"),
        client=event.get("client"),
        created_at=now,
    )
    db.add(row)

    # Öğretmen kaynaklı olaylar (ipucu, değerlendirme) öğrencinin görev ilerlemesine
    # dokunmaz: "son etkinlik" ve takılma hesabı öğrencinin kendi hareketinden gelir.
    if event.get("task_key") and event["type"] not in TEACHER_EVENT_TYPES:
        progress = await _get_or_create(
            db, TaskProgress,
            {"course_id": ctx.course_id, "student_id": student_id, "task_key": str(event["task_key"])},
            {"node_id": str(node_id) if node_id is not None else None, "stage": stage,
             "attempts": 0, "same_failure_streak": 0, "hints_opened": 0, "coach_messages": 0},
        )
        was_done = bool(progress.solved_at or progress.submitted_at)
        state = apply_event_to_progress(_progress_dict(progress), event, now)
        for key, value in state.items():
            setattr(progress, key, value)
        # Görev XP'si: görev ilk kez çözüldüğünde ya da teslim edildiğinde, bir kez.
        # Eskiden ekranda "+100 XP" yazıyor ama hiçbir yere işlenmiyordu.
        xp = int((task or {}).get("slide", {}).get("xp") or 0)
        if task and xp > 0 and not was_done and (progress.solved_at or progress.submitted_at):
            await db.execute(
                update(Student).where(Student.id == student_id)
                .values(xp=func.coalesce(Student.xp, 0) + xp)
            )
            row.details = {**(row.details or {}), "xp_awarded": xp}

    for ev in evidences:
        mastery = await _get_or_create(
            db, ConceptMastery,
            {"course_id": ctx.course_id, "student_id": student_id, "concept_id": ev.concept_id},
            {"score": 0.5, "evidence_weight": 0.0, "successes": 0, "failures": 0},
        )
        state = update_mastery({
            "score": mastery.score, "evidence_weight": mastery.evidence_weight,
            "successes": mastery.successes, "failures": mastery.failures,
            "last_evidence_at": mastery.last_evidence_at, "last_misconception": mastery.last_misconception,
        }, ev, now)
        for key, value in state.items():
            setattr(mastery, key, value)

    await db.flush()
    return row


async def safe_record_event(course_id: int, student_id: int, event: Dict[str, Any]) -> None:
    """Başka bir işin yan etkisi olarak olay yazar (teslim, not, koç…).

    Analitik yazılamadı diye asıl iş (teslim, not verme) başarısız olmamalı:
    hata loglanır ve yutulur. Ayrı bir oturum kullanılır ki bir hata, çağıranın
    işlemini geri almasın.
    """
    # Modül üzerinden okunuyor (doğrudan içe aktarılmıyor): testler oturum
    # fabrikasını çalışma anında değiştiriyor.
    import connect_db

    try:
        async with connect_db.SessionLocal() as session:
            ctx = await course_context(session, course_id)
            if not ctx:
                return
            # Kursun görev/ödev slaytı olmayan bir anahtar (eski ders notu gibi)
            # özet tablolara girmesin; olay yine de düğüm düzeyinde anlamsız.
            if event.get("task_key") and not ctx.resolve_task(str(event["task_key"])):
                return
            await record_event(session, ctx, student_id, event)
            await session.commit()
        await notify_teacher(ctx, student_id, event)
    except Exception as exc:  # noqa: BLE001 — analitik asla ana akışı bozmamalı
        logger.warning("Öğrenme olayı yazılamadı (%s): %s", event.get("type"), exc)


# --- canlı pano -----------------------------------------------------------------

LIVE_EVENT_TYPES = {"check", "hint_opened", "coach", "submitted", "explain", "help_request", "help_cancel"}


async def notify_teacher(ctx: CourseContext, student_id: int, event: Dict[str, Any]) -> None:
    """Öğretmenin canlı panosuna "bu görevde bir şey oldu" der.

    Yalnızca kursun öğretmenine gider (`target_user`), öğrencilere yayınlanmaz:
    kim nerede takıldı bilgisi tahtaya ya da sınıf arkadaşlarına sızmamalı.
    Mesaj içerik taşımaz — pano güncel durumu uçtan kendisi çeker.
    """
    if event.get("type") not in LIVE_EVENT_TYPES or not event.get("task_key"):
        return
    try:
        from core.ws_manager import manager
        message = {
            "type": "task_event",
            "courseId": ctx.course_id,
            "taskKey": event["task_key"],
            "studentId": student_id,
            "eventType": event["type"],
            "outcome": event.get("outcome"),
        }
        for role in ("teacher", "instructor"):
            await manager.publish({**message, "target_user": f"{role}:{ctx.teacher_id}"})
    except Exception as exc:  # noqa: BLE001 — bildirim gitmezse pano bir sonraki yenilemede yakalar
        logger.debug("Canlı pano bildirimi gönderilemedi: %s", exc)


# --- yazım kaydı ----------------------------------------------------------------

def _provenance_state(row: CodeProvenance) -> Dict[str, Any]:
    return {
        "text": row.text or "",
        "segments": [list(s) for s in row.segments or []],
        "totals": dict(row.totals or {}),
        "recent_deletes": list(row.recent_deletes or []),
        "recent_typed": [list(t) for t in row.recent_typed or []],
        "last_op_ms": row.last_op_ms,
    }


async def apply_edit_chunk(
    db: AsyncSession,
    ctx: CourseContext,
    student_id: int,
    task_key: str,
    chunk: Dict[str, Any],
    client: str,
    ext_version: Optional[str],
    ai_extensions: List[str],
) -> bool:
    """Yazım paketini saklar ve kod kökenini ilerletir. Tekrar gelen paket False döner."""
    task = ctx.resolve_task(task_key)
    starters = task["slide"]["starters"] if task else []

    exists = (await db.execute(
        select(CodeEditChunk.id).where(
            CodeEditChunk.course_id == ctx.course_id,
            CodeEditChunk.student_id == student_id,
            CodeEditChunk.task_key == task_key,
            CodeEditChunk.file_name == chunk["file"],
            CodeEditChunk.session_id == chunk["session"],
            CodeEditChunk.seq == chunk["seq"],
        )
    )).first()
    if exists:
        return False

    db.add(CodeEditChunk(
        course_id=ctx.course_id,
        student_id=student_id,
        task_key=task_key,
        file_name=chunk["file"],
        session_id=chunk["session"],
        seq=chunk["seq"],
        client=client,
        started_at_ms=chunk["started_at_ms"],
        base_text=chunk.get("base_text"),
        ops=chunk["ops"],
        ext_version=ext_version,
        ai_extensions=ai_extensions,
    ))

    row = await _get_or_create(
        db, CodeProvenance,
        {"course_id": ctx.course_id, "student_id": student_id, "task_key": task_key, "file_name": chunk["file"]},
        {"text": "", "segments": [], "totals": {}, "recent_deletes": [], "recent_typed": [], "ai_extensions": []},
    )
    state = code_provenance.apply_chunk(_provenance_state(row), chunk, starters)
    row.text = state["text"]
    row.segments = state["segments"]
    row.totals = state["totals"]
    row.recent_deletes = state["recent_deletes"]
    row.recent_typed = state["recent_typed"]
    row.last_op_ms = state["last_op_ms"]
    if ai_extensions:
        row.ai_extensions = sorted(set(row.ai_extensions or []) | set(ai_extensions))
    await db.flush()
    return True


def provenance_report(rows: List[CodeProvenance]) -> Dict[str, Any]:
    """Bir öğrencinin bir görevdeki dosyalarının birleşik kod kökeni + işaretler."""
    files = []
    composition: Dict[str, int] = {}
    ai_extensions: set = set()
    activity: Dict[str, float] = {}
    for row in rows:
        summary = code_provenance.summarize(_provenance_state(row))
        files.append({"file": row.file_name, **summary})
        for src, n in summary["composition"].items():
            composition[src] = composition.get(src, 0) + n
        for key, value in summary["activity"].items():
            if key in ("max_cpm", "max_paste"):
                activity[key] = max(activity.get(key, 0), value)
            else:
                activity[key] = activity.get(key, 0) + value
        ai_extensions |= set(row.ai_extensions or [])
    total, share = code_provenance.shares(composition)
    combined = {
        "chars": total,
        "starter_chars": composition.get(code_provenance.STARTER, 0),
        "composition": composition,
        "share": share,
        "own_share": round(sum(share.get(s, 0) for s in code_provenance.OWN_SOURCES), 3),
        "activity": activity,
    }
    return {
        "has_recording": bool(rows),
        **combined,
        "ai_extensions": sorted(ai_extensions),
        "flags": code_provenance.flags(combined, ai_extensions) if rows else [],
        "files": files,
    }


# --- saklama süresi ---------------------------------------------------------------

async def purge_expired(db: AsyncSession, days: int = RETENTION_DAYS) -> Dict[str, int]:
    """Süresi dolan kod görüntülerini ve yazım paketlerini siler.

    Olay satırları kalır (içlerinde kod yok), yalnızca kod alanı boşaltılır:
    "bu öğrenci döngülerde zorlandı" bilgisi dönem boyunca değerli, kodun
    kendisi değil.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    snapshots = await db.execute(
        update(LearningEvent)
        .where(LearningEvent.created_at < cutoff, LearningEvent.code_snapshot.isnot(None))
        .values(code_snapshot=None)
    )
    chunks = await db.execute(delete(CodeEditChunk).where(CodeEditChunk.received_at < cutoff))
    await db.commit()
    return {"snapshots": snapshots.rowcount or 0, "chunks": chunks.rowcount or 0}
