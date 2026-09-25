"""
Kavram sözlüğü API'si.

Sözlük DİLE aittir, kursa değil: bir kez yazılır, o dilin bütün kurslarında
kullanılır. Bu router sözlüğü okutur, eksik dil için taslak ürettirir ve
öğretmenin onayladığı sözlüğü KALICI olarak kaydeder.

Kütüphanenin kendiliğinden büyümesi buradan gelir: "Arduino ile Robotik"
kursunu ilk açan öğretmen 5 dakikalık bir onay maliyeti öder, aynı dili
sonra açan herkes hazır bulur.
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google import genai
from sqlalchemy import select

from auth.dependencies import get_current_teacher_id
from connect_db import AsyncSession, get_db
from core.config import settings
from models.concept import Concept, UnmatchedConcept
import concept_registry as registry
# gen_config / record_ai_usage AI router'ında tanımlı. ai.py bu modülden hiçbir
# şey almadığı için döngüsel import yok; maliyet kaydını tek yerden yürütmek
# için oradaki yardımcıları paylaşıyoruz.
from routers.ai import PLATFORM_CONTEXT, gen_config, record_ai_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/concepts", tags=["concepts"])


class ConceptEntryPayload(BaseModel):
    concept_id: Optional[str] = None
    label: str
    description: Optional[str] = ""
    prerequisites: List[str] = []


class ApproveDictionaryRequest(BaseModel):
    entries: List[ConceptEntryPayload]


class DraftDictionaryRequest(BaseModel):
    course_topic: Optional[str] = None
    audience: Optional[str] = None
    difficulty: Optional[str] = "Beginner"


class DraftConceptItem(BaseModel):
    concept_id: str
    label: str
    prerequisites: List[str]
    description: str


class DraftDictionaryResponse(BaseModel):
    concepts: List[DraftConceptItem]


@router.get("/languages")
async def list_languages(
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """Sözlüğü olan diller ve kavram sayıları."""
    result = await db.execute(select(Concept.language))
    counts: dict = {}
    for (language,) in result.all():
        counts[language] = counts.get(language, 0) + 1

    # Kodda tohumu olup henüz veritabanına yazılmamış diller de listelenir:
    # öğretmen açısından bunlar zaten hazırdır, ilk kullanımda yazılırlar.
    from concept_seeds import SEED_DICTIONARIES
    for language in SEED_DICTIONARIES:
        counts.setdefault(language, len(SEED_DICTIONARIES[language]))

    return {
        "success": True,
        "languages": [
            {"language": lang, "label": registry.language_label(lang), "concept_count": count}
            for lang, count in sorted(counts.items())
        ],
    }


@router.get("/detect")
async def detect_language_api(
    course_topic: str,
    audience: Optional[str] = None,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Kurs konusundan dili tahmin eder ve sözlüğü var mı söyler.

    Sihirbaz bunu konu adımında çağırır: sözlük yoksa öğretmene taslak
    onayı akışı gösterilir, sözlük varsa hiçbir şey sorulmaz.
    """
    language = registry.detect_language(course_topic, audience)
    if not language:
        return {"success": True, "language": None, "has_dictionary": False}

    entries = await registry.get_dictionary(db, language)
    return {
        "success": True,
        "language": language,
        "label": registry.language_label(language),
        "has_dictionary": len(entries) > 0,
        "concept_count": len(entries),
    }


@router.get("/unmatched")
async def list_unmatched(
    language: Optional[str] = None,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Modelin sözlükte bulamadığı öneriler.

    Bu liste sözlüğün eksik kalan yerlerinin haritasıdır: aynı öneri tekrar
    tekrar geliyorsa (hit_count) o kavram gerçekten eksiktir.
    """
    query = select(UnmatchedConcept).order_by(UnmatchedConcept.hit_count.desc())
    if language:
        query = query.where(UnmatchedConcept.language == language.lower())
    result = await db.execute(query.limit(200))
    return {
        "success": True,
        "unmatched": [
            {
                "language": row.language,
                "raw_label": row.raw_label,
                "topic_title": row.topic_title,
                "course_topic": row.course_topic,
                "hit_count": row.hit_count or 1,
            }
            for row in result.scalars().all()
        ],
    }


@router.get("/{language}")
async def get_dictionary_api(
    language: str,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    entries = await registry.get_dictionary(db, language)
    return {
        "success": True,
        "language": language.lower(),
        "label": registry.language_label(language.lower()),
        "concepts": [registry.serialize(c) for c in entries],
    }


@router.post("/{language}/draft", response_model=None)
async def draft_dictionary_api(
    language: str,
    req: DraftDictionaryRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Sözlüğü olmayan bir dil için TASLAK üretir. KAYDETMEZ.

    Kaydetmemesi kasıtlı: sözlük ölçüm birimidir, onaysız girmemelidir.
    Öğretmen taslağı görür, siler/düzeltir, sonra /approve ile sabitler.
    """
    language = language.strip().lower()
    if not language:
        raise HTTPException(status_code=400, detail="Dil belirtilmedi.")

    existing = await registry.get_dictionary(db, language)
    if existing:
        # Sözlük zaten var — taslak üretmek hem para harcar hem kimlikleri böler.
        return {
            "success": True,
            "language": language,
            "already_exists": True,
            "concepts": [registry.serialize(c) for c in existing],
        }

    label = registry.language_label(language)
    prompt = f"""
{PLATFORM_CONTEXT}
Role: You are a curriculum measurement designer. Türkçe cevap ver (etiketler ve açıklamalar Türkçe olmalı).

Task: Produce the CONCEPT DICTIONARY for teaching **{label}** at beginner level.

A concept is the SMALLEST thing a student can separately understand or fail to understand.
- Too broad (REJECT): "Döngüler", "Fonksiyonlar", "Nesne Yönelimli Programlama"
- Right size (ACCEPT): "range() bitiş değerini kapsamaz", "return ile print farkı"

Hard requirements:
1. Produce between 25 and 30 concepts. Not more.
2. `concept_id`: lowercase ASCII snake_case, stable, no Turkish characters (e.g. `degisken_atama`).
3. `label`: short Turkish name the teacher will read.
4. `description`: one Turkish sentence naming the exact thing students get wrong.
5. `prerequisites`: a list of OTHER concept_id values from THIS SAME list. Use [] for entry-level
   concepts. Never reference an id that is not in the list.
6. Order the list from earliest-teachable to latest.
7. These are language/subject concepts, NOT course topics and NOT editor setup steps.

Course context (only to calibrate the level; the dictionary must still work for ANY {label} course):
Course topic: {req.course_topic or '-'}
Audience: {req.audience or '-'}
Difficulty: {req.difficulty or 'Beginner'}

Return ONLY valid JSON. No markdown.
"""

    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=gen_config(DraftDictionaryResponse, thinking_budget=1024, model=settings.GEMINI_MODEL),
        )
        await record_ai_usage(
            db, teacher_id, "draft_concept_dictionary", settings.GEMINI_MODEL, response,
            details=f"Dil: {language}", prompt_chars=len(prompt),
        )
        data = json.loads(response.text.strip())
    except Exception as e:
        logger.error("Kavram sözlüğü taslağı üretilemedi (%s): %s", language, e)
        raise HTTPException(status_code=500, detail=f"Kavram sözlüğü taslağı üretilemedi: {e}")

    drafted = []
    seen = set()
    for item in data.get("concepts", []):
        concept_id = registry.slugify(item.get("concept_id") or item.get("label") or "")
        if not concept_id or concept_id in seen:
            continue
        seen.add(concept_id)
        drafted.append({
            "concept_id": concept_id,
            "label": (item.get("label") or concept_id).strip()[:200],
            "description": (item.get("description") or "").strip(),
            "prerequisites": [registry.slugify(p) for p in (item.get("prerequisites") or [])],
        })

    # Listede olmayan ön koşul, öğrencinin göremeyeceği bir bağ demektir; düşürülür.
    for entry in drafted:
        entry["prerequisites"] = [p for p in entry["prerequisites"] if p in seen and p != entry["concept_id"]]

    return {
        "success": True,
        "language": language,
        "label": label,
        "already_exists": False,
        "concepts": drafted,
    }


@router.post("/{language}/approve")
async def approve_dictionary_api(
    language: str,
    req: ApproveDictionaryRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Öğretmenin onayladığı sözlüğü kalıcı yazar (upsert).

    Var olan kimlik güncellenir, yeni kimlik eklenir. Kimlik ASLA yeniden
    yazılmaz: ona bağlı konu eşleşmeleri ve ölçümler kopardı.
    """
    language = language.strip().lower()
    if not language:
        raise HTTPException(status_code=400, detail="Dil belirtilmedi.")
    if not req.entries:
        raise HTTPException(status_code=400, detail="Kaydedilecek kavram yok.")

    existing = {c.concept_id: c for c in await registry.get_dictionary(db, language)}

    prepared = []
    seen = set()
    for entry in req.entries:
        concept_id = registry.slugify(entry.concept_id or entry.label)
        if not concept_id or concept_id in seen:
            continue
        seen.add(concept_id)
        prepared.append((concept_id, entry))

    valid_ids = seen | set(existing.keys())

    created, updated = 0, 0
    for concept_id, entry in prepared:
        prereqs = [
            registry.slugify(p) for p in (entry.prerequisites or [])
        ]
        prereqs = [p for p in prereqs if p in valid_ids and p != concept_id]

        row = existing.get(concept_id)
        if row:
            row.label = entry.label.strip()[:200]
            row.description = (entry.description or "").strip()
            row.prerequisites = prereqs
            updated += 1
        else:
            db.add(Concept(
                language=language,
                concept_id=concept_id,
                label=entry.label.strip()[:200],
                description=(entry.description or "").strip(),
                prerequisites=prereqs,
                source="teacher" if existing else "ai",
                created_by=teacher_id,
            ))
            created += 1

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error("Kavram sözlüğü kaydedilemedi (%s): %s", language, e)
        raise HTTPException(status_code=500, detail=f"Kavram sözlüğü kaydedilemedi: {e}")

    entries = await registry.get_dictionary(db, language)
    return {
        "success": True,
        "language": language,
        "created": created,
        "updated": updated,
        "concepts": [registry.serialize(c) for c in entries],
    }


@router.delete("/{language}/{concept_id}")
async def delete_concept_api(
    language: str,
    concept_id: str,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Bir kavramı sözlükten kaldırır ve ona ön koşul veren bağları temizler.

    Bağları temizlemek şart: silinen kimliğe işaret eden bir ön koşul,
    hiçbir zaman çözülemeyen ölü bir bağ olurdu.
    """
    language = language.strip().lower()
    result = await db.execute(
        select(Concept).where(Concept.language == language, Concept.concept_id == concept_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Kavram bulunamadı.")

    await db.delete(row)

    others = await db.execute(select(Concept).where(Concept.language == language))
    for other in others.scalars().all():
        if concept_id in (other.prerequisites or []):
            other.prerequisites = [p for p in other.prerequisites if p != concept_id]

    await db.commit()
    return {"success": True, "deleted": concept_id}
