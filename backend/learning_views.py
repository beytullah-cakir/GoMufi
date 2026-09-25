"""
Öğrenciye ve veliye gösterilen, yumuşatılmış öğrenme görünümleri.

Öğretmen sayfasındaki dil ("zorlanıyor", yanılgı etiketleri, kod kökeni)
öğrenciye ve veliye gösterilmez. Burada aynı veri, "neyi öğrendi, neye
çalışmalı" sorusuna cevap verecek sadelikte sunulur.
"""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from learning_analytics import mastery_status
from models.learning import ConceptMastery

STUDENT_STATUS_LABELS = {
    "hakim": "Öğrendi",
    "gelisiyor": "Gelişiyor",
    "zorlaniyor": "Tekrar etmeye değer",
    "veri_az": "Henüz yeterli çalışma yok",
}


def course_concepts(ctx, extra: List[str] = ()) -> List[str]:
    """Kursun ölçtüğü kavramlar, yol haritası sırasıyla."""
    ordered: List[str] = []
    for node_id in ctx.node_order:
        for concept in ctx.nodes[node_id].get("concepts") or []:
            if concept in ctx.concepts and concept not in ordered:
                ordered.append(concept)
    for concept in extra:
        if concept not in ordered:
            ordered.append(concept)
    return ordered


async def concept_view(db: AsyncSession, ctx, student_id: int) -> Dict[str, Any]:
    masteries = {m.concept_id: m for m in (await db.execute(
        select(ConceptMastery).where(ConceptMastery.course_id == ctx.course_id, ConceptMastery.student_id == student_id)
    )).scalars().all()}
    concepts = []
    for concept_id in course_concepts(ctx, sorted(masteries)):
        m = masteries.get(concept_id)
        status = mastery_status(m.score, m.evidence_weight) if m else "veri_az"
        info = ctx.concepts.get(concept_id, {})
        concepts.append({
            "concept_id": concept_id,
            "label": info.get("label", concept_id),
            "description": info.get("description", ""),
            "status": status,
            "status_label": STUDENT_STATUS_LABELS[status],
            "modules": [ctx.nodes[n]["title"] for n in ctx.node_order if concept_id in (ctx.nodes[n].get("concepts") or [])],
        })
    rank = {"zorlaniyor": 0, "gelisiyor": 1}
    next_steps = sorted([c for c in concepts if c["status"] in rank], key=lambda c: rank[c["status"]])[:3]
    counts = Counter(c["status"] for c in concepts)
    return {
        "course": ctx.title,
        "concepts": concepts,
        "next_steps": [{"label": c["label"], "status": c["status"], "modules": c["modules"][:2]} for c in next_steps],
        "counts": {k: counts.get(k, 0) for k in STUDENT_STATUS_LABELS},
    }
