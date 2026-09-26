"""
"Zorlandığım konular" — 3 dakikalık kişisel tekrar.

Öğrencinin kavram hakimiyetinden (ConceptMastery) en zayıf üç kavram seçilir;
her biri için kısa açıklama ve öğrencinin ZATEN GÖRDÜĞÜ modüllerden birkaç
çoktan seçmeli soru gelir (önce daha önce yanlış cevapladıkları). Doğru şık
istemciye gitmez: cevap sunucuda değerlendirilir ve yanlış şıkkın yanılgısı
açıklama olarak döner. Tekrarı bitiren öğrenci günde bir kez küçük XP alır.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from learning_analytics import MIN_EVIDENCE_WEIGHT
from models.learning import ConceptMastery, LearningEvent
from models.school import ModuleProgress

MAX_CONCEPTS = 3
MAX_QUESTIONS = 5
REVIEW_XP = 20
# Tekrar sayılması için en az bu kadar soru cevaplanmalı (soru azsa hepsi).
MIN_ANSWERED = 3


async def _seen_nodes(db: AsyncSession, course_id: int, student_id: int) -> set:
    done = {n for n, in (await db.execute(
        select(ModuleProgress.node_id).where(ModuleProgress.course_id == course_id, ModuleProgress.student_id == student_id)
    )).all()}
    touched = {n for n, in (await db.execute(
        select(LearningEvent.node_id).where(LearningEvent.course_id == course_id, LearningEvent.student_id == student_id,
                                            LearningEvent.node_id.isnot(None)).distinct()
    )).all()}
    return {str(n) for n in done | touched}


async def _wrong_questions(db: AsyncSession, course_id: int, student_id: int) -> Dict[str, int]:
    """Soru anahtarı → yanlış cevap sayısı (son cevap doğruysa düşülür)."""
    rows = (await db.execute(
        select(LearningEvent.details).where(
            LearningEvent.course_id == course_id, LearningEvent.student_id == student_id,
            LearningEvent.event_type == "slide_answer").order_by(LearningEvent.id)
    )).all()
    wrong: Dict[str, int] = {}
    for details, in rows:
        if not isinstance(details, dict) or details.get("kind") != "mcq":
            continue
        key = f"{details.get('slide_id')}:{details.get('element_id')}"
        if details.get("correct"):
            wrong.pop(key, None)
        else:
            wrong[key] = wrong.get(key, 0) + 1
    return wrong


def public_question(key: str, q: Dict[str, Any], concept: Optional[str]) -> Dict[str, Any]:
    return {
        "key": key,
        "question": q["question"],
        "multiple": sum(1 for o in q["options"] if o["correct"]) > 1,
        "options": [{"id": o["id"], "text": o["text"]} for o in q["options"]],
        "concept": concept,
    }


async def build(db: AsyncSession, ctx, student_id: int) -> Dict[str, Any]:
    masteries = (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == ctx.course_id, ConceptMastery.student_id == student_id)
    )).scalars().all()
    weak = sorted(
        [m for m in masteries if m.concept_id in ctx.concepts
         and ((m.evidence_weight >= MIN_EVIDENCE_WEIGHT and m.score < 0.75) or (m.failures or 0) > (m.successes or 0))],
        key=lambda m: m.score,
    )[:MAX_CONCEPTS]
    seen = await _seen_nodes(db, ctx.course_id, student_id)
    wrong = await _wrong_questions(db, ctx.course_id, student_id)

    concepts = []
    for m in weak:
        info = ctx.concepts[m.concept_id]
        concepts.append({
            "concept_id": m.concept_id,
            "label": info.get("label", m.concept_id),
            "description": info.get("description", ""),
            "modules": [ctx.nodes[n]["title"] for n in ctx.node_order if m.concept_id in (ctx.nodes[n].get("concepts") or [])][:2],
        })
    weak_ids = [c["concept_id"] for c in concepts]

    def concept_of(q: Dict[str, Any]) -> Optional[str]:
        node_concepts = (ctx.nodes.get(q["node_id"]) or {}).get("concepts") or []
        return next((c for c in weak_ids if c in node_concepts), None)

    candidates = []
    for key, q in ctx.questions.items():
        if q["node_id"] not in seen or not any(o["correct"] for o in q["options"]) or len(q["options"]) < 2:
            continue
        concept = concept_of(q)
        if key not in wrong and not concept:
            continue
        # Önce yanlış cevaplanan, sonra zayıf kavramın sorusu; kavram sırası korunur.
        rank = (0 if key in wrong else 1, weak_ids.index(concept) if concept else len(weak_ids), -wrong.get(key, 0))
        candidates.append((rank, key, q, concept))
    candidates.sort(key=lambda c: c[0])
    labels = {c["concept_id"]: c["label"] for c in concepts}
    questions = [public_question(key, q, labels.get(concept) if concept else None)
                 for _, key, q, concept in candidates[:MAX_QUESTIONS]]
    return {"concepts": concepts, "questions": questions, "xp_reward": REVIEW_XP,
            "min_answered": min(MIN_ANSWERED, len(questions))}


def grade(ctx, key: str, selected: List[str]) -> Optional[Dict[str, Any]]:
    q = ctx.questions.get(key)
    if not q:
        return None
    options = {o["id"]: o for o in q["options"]}
    picked = [str(s) for s in selected[:10] if str(s) in options]
    correct_ids = sorted(o["id"] for o in q["options"] if o["correct"])
    correct = bool(picked) and set(picked) == set(correct_ids)
    wrong = [options[s] for s in picked if not options[s]["correct"]]
    return {
        "key": key,
        "correct": correct,
        "correct_ids": correct_ids,
        "explanation": next((o["misconception"] for o in wrong if o["misconception"]), None),
    }


def review_key(course_id: int, day) -> str:
    return f"review:{course_id}:{day.isoformat() if hasattr(day, 'isoformat') else day}"


