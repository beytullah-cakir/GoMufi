"""
Not defteri: ödev notları, görev tamamlama, proje notları ve quiz başarısı tek
tabloda; öğretmenin belirlediği ağırlıklarla bir performans notu önerisi.

  GET /analytics/courses/{id}/gradebook?class_id=…
  PUT /analytics/courses/{id}/gradebook/settings   {weights, missing_as_zero}

Öneri, karar değil: öğretmen e-Okul'a girerken elle hesapladığı ortalamayı
burada görür; sayı, bileşenleri ve ağırlıklarıyla birlikte gösterilir.

Bileşenler (0-100, veri yoksa boş — boş bileşen ortalamaya girmez):
  homework  — notlanan ödevlerin ortalaması. Süresi dolmuş ve teslim edilmemiş
              ödev, öğretmen isterse 0 sayılır; notlanmamış teslim sayılmaz.
  tasks     — Uygula ve Birleştir görevlerinin çözülen/teslim edilen oranı.
  projects  — Üret projelerinin öğretmen notlarının ortalaması.
  quiz      — quiz sorularında doğru oranı (her sorunun son cevabı).
  mastery   — ölçülen kavramlarda ortalama hakimiyet.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from auth.dependencies import get_current_user_info
from connect_db import get_db
from models.homework_submission import HomeworkSubmission
from models.learning import ConceptMastery, LearningEvent, TaskProgress
from models.teaching import CourseSettings
from routers.analytics import _load_course, _scope

router = APIRouter(prefix="/analytics", tags=["gradebook"])

COMPONENTS = ("homework", "tasks", "projects", "quiz", "mastery")
DEFAULT_WEIGHTS = {"homework": 40, "tasks": 25, "projects": 20, "quiz": 15, "mastery": 0}


def _mean(values: List[float]) -> Optional[float]:
    return round(sum(values) / len(values), 1) if values else None


async def _settings(db: AsyncSession, course_id: int) -> Dict[str, Any]:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    stored = ((row.settings or {}) if row else {}).get("gradebook") or {}
    weights = {k: int(stored.get("weights", {}).get(k, DEFAULT_WEIGHTS[k])) for k in COMPONENTS}
    return {"weights": weights, "missing_as_zero": stored.get("missing_as_zero", True) is not False}


def weighted_total(components: Dict[str, Optional[float]], weights: Dict[str, int]) -> Optional[float]:
    """Veri olan bileşenlerin ağırlıklı ortalaması; hiç veri yoksa boş."""
    used = [(components[k], weights.get(k, 0)) for k in COMPONENTS if components.get(k) is not None and weights.get(k, 0) > 0]
    total_weight = sum(w for _, w in used)
    if not total_weight:
        return None
    return round(sum(v * w for v, w in used) / total_weight, 1)


@router.get("/courses/{course_id}/gradebook")
async def gradebook(
    course_id: int,
    class_id: Optional[str] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _load_course(db, course_id, user_info)
    scope = await _scope(db, ctx, course_id, class_id)
    settings = await _settings(db, course_id)
    now = datetime.utcnow()
    order = {n: i for i, n in enumerate(ctx.node_order)}
    slides = sorted(ctx.slides.values(), key=lambda s: order.get(s["node_id"], 10_000))
    homeworks = [s for s in slides if s["type"] == "homework"]
    tasks = [s for s in slides if s["type"] in ("challenge", "connect")]
    projects = [s for s in slides if s["type"] == "produce"]

    # Öğrenci × düğüm başına en son teslim.
    subs: Dict[tuple, HomeworkSubmission] = {}
    for sub in (await db.execute(
        select(HomeworkSubmission).where(HomeworkSubmission.course_id == course_id)
        .order_by(HomeworkSubmission.submitted_at)
    )).scalars().all():
        subs[(sub.student_id, str(sub.node_id))] = sub

    done: Dict[tuple, bool] = {}
    for p in (await db.execute(select(TaskProgress).where(TaskProgress.course_id == course_id))).scalars().all():
        done[(p.student_id, p.task_key)] = bool(p.solved_at or p.submitted_at)

    quiz: Dict[int, Dict[Any, bool]] = defaultdict(dict)
    for student_id, details, outcome in (await db.execute(
        select(LearningEvent.student_id, LearningEvent.details, LearningEvent.outcome).where(
            LearningEvent.course_id == course_id, LearningEvent.event_type == "quiz_answer",
        ).order_by(LearningEvent.created_at)
    )).all():
        question = (details or {}).get("question_id")
        if question is not None:
            quiz[student_id][question] = outcome == "pass"

    mastery: Dict[int, List[float]] = defaultdict(list)
    for m in (await db.execute(select(ConceptMastery).where(ConceptMastery.course_id == course_id))).scalars().all():
        if m.evidence_weight >= 1.0:
            mastery[m.student_id].append(m.score * 100)

    def graded_cell(student_id: int, slide: Dict[str, Any], key: str) -> Dict[str, Any]:
        sub = subs.get((student_id, key))
        overdue = bool(slide.get("due")) and now > slide["due"]
        if sub and sub.graded_at and sub.grade is not None:
            return {"grade": sub.grade, "status": "graded"}
        if sub:
            return {"grade": None, "status": "pending"}
        if overdue and settings["missing_as_zero"]:
            return {"grade": 0, "status": "missing"}
        return {"grade": None, "status": "overdue" if overdue else "open"}

    class_names = {}
    for cls in ctx.classes:
        for sid in cls["student_ids"]:
            class_names.setdefault(sid, cls["name"])

    rows = []
    for sid, name in sorted(scope.students.items(), key=lambda kv: kv[1]):
        hw_cells = {s["id"]: graded_cell(sid, s, s["id"]) for s in homeworks}
        project_cells = {s["id"]: graded_cell(sid, s, f"produce:{s['id']}") for s in projects}
        answers = quiz.get(sid, {})
        components = {
            "homework": _mean([c["grade"] for c in hw_cells.values() if c["grade"] is not None]),
            "tasks": round(100 * sum(1 for s in tasks if done.get((sid, f"{s['type']}:{s['id']}"))) / len(tasks), 1) if tasks else None,
            "projects": _mean([c["grade"] for c in project_cells.values() if c["grade"] is not None]),
            "quiz": round(100 * sum(answers.values()) / len(answers), 1) if answers else None,
            "mastery": _mean(mastery.get(sid, [])),
        }
        rows.append({
            "student_id": sid, "student": name, "class_name": class_names.get(sid),
            "components": components,
            "homework": hw_cells, "projects": project_cells,
            "tasks_done": sum(1 for s in tasks if done.get((sid, f"{s['type']}:{s['id']}"))),
            "quiz_answered": len(answers),
            "total": weighted_total(components, settings["weights"]),
        })

    totals = [r["total"] for r in rows if r["total"] is not None]
    return {
        **settings,
        "homeworks": [{"task_key": s["id"], "title": s["title"], "due_at": f"{s['due'].isoformat()}Z" if s.get("due") else None} for s in homeworks],
        "projects": [{"task_key": s["id"], "title": s["title"]} for s in projects],
        "task_count": len(tasks),
        "students": rows,
        "class_average": _mean(totals),
        "classes": scope.classes,
    }


class GradebookSettingsIn(BaseModel):
    weights: Dict[str, int]
    missing_as_zero: bool = True


@router.put("/courses/{course_id}/gradebook/settings")
async def save_gradebook_settings(
    course_id: int,
    body: GradebookSettingsIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    await _load_course(db, course_id, user_info)
    weights = {}
    for key in COMPONENTS:
        value = int(body.weights.get(key, 0))
        if not 0 <= value <= 100:
            raise HTTPException(status_code=400, detail="Ağırlıklar 0 ile 100 arasında olmalı.")
        weights[key] = value
    if sum(weights.values()) == 0:
        raise HTTPException(status_code=400, detail="En az bir bileşenin ağırlığı sıfırdan büyük olmalı.")
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    if not row:
        row = CourseSettings(course_id=course_id, settings={})
        db.add(row)
    row.settings = {**(row.settings or {}), "gradebook": {"weights": weights, "missing_as_zero": body.missing_as_zero}}
    flag_modified(row, "settings")
    await db.commit()
    return {"weights": weights, "missing_as_zero": body.missing_as_zero}
