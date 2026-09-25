"""
Kavram sözlüğünün çalışma zamanı katmanı: dil tespiti, tohumlama, doğrulama.

Sözlük DİLE aittir (bkz. concept_seeds). Bu modül üç işi yapar:

1. Kurs konusundan dili çıkarır ("Çocuklar için Python Oyunları" -> python).
2. Dilin sözlüğünü verir; kodda tohumu varsa ilk istekte veritabanına yazar.
3. Modelin seçtiği kavramları sözlüğe karşı DOĞRULAR. Uydurma kavram
   sözlüğe girmez; eşleşmeyenler ayrı tabloya loglanır.

Doğrulamanın kuralları (ürün kararı, gevşetilmemeli):
  * En fazla 4 kavram. Daha fazlası çıkıyorsa konu çok geniştir.
  * Tam olarak bir tane birincil kavram.
  * Sadece sözlükteki kimlikler.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from concept_seeds import SEED_DICTIONARIES, seed_entries
from models.concept import Concept, UnmatchedConcept

# Bir konuya bağlanabilecek en fazla kavram sayısı.
MAX_CONCEPTS_PER_TOPIC = 4

# Kurs konusundaki anahtar kelime -> dil kimliği.
# Sıra ÖNEMLİ: "javascript" içinde "java" geçer, önce uzun olan denenir.
_LANGUAGE_PATTERNS: Tuple[Tuple[str, str], ...] = (
    (r"javascript|js\b|node\.?js|react|vue|angular", "javascript"),
    (r"typescript", "typescript"),
    (r"python|django|flask|pandas|pygame", "python"),
    (r"scratch", "scratch"),
    (r"\bsql\b|veritaban|mysql|postgre|sqlite", "sql"),
    (r"c#|c sharp|csharp|\.net|unity", "csharp"),
    (r"c\+\+|cpp", "cpp"),
    (r"\bjava\b|spring", "java"),
    (r"kotlin|android", "kotlin"),
    (r"swift|ios", "swift"),
    (r"\bgo\b|golang", "go"),
    (r"\brust\b", "rust"),
    (r"\bphp\b|laravel", "php"),
    (r"\bhtml\b|\bcss\b|web tasarım", "html"),
    (r"arduino|robotik", "arduino"),
)

# Öğretmene gösterilecek dil adları. Listede olmayan dil kimliği ham haliyle
# gösterilir — eksik etiket bir hata değil, sadece güzellik meselesi.
LANGUAGE_LABELS: Dict[str, str] = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "csharp": "C#",
    "cpp": "C++",
    "c": "C",
    "scratch": "Scratch",
    "sql": "SQL",
    "html": "HTML/CSS",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "go": "Go",
    "rust": "Rust",
    "php": "PHP",
    "arduino": "Arduino",
}


def language_label(language: str) -> str:
    if language in LANGUAGE_LABELS:
        return LANGUAGE_LABELS[language]
    return language.upper() if len(language) <= 3 else language.title()


def detect_language(*texts: Optional[str]) -> Optional[str]:
    """
    Kurs konusu/hedef kitle metninden dili çıkarır.

    Bulamazsa None döner ve çağıran taraf UYDURMAZ: öğretmene "bu kurs için
    hangi dilin sözlüğü kullanılsın?" diye sorulur ya da taslak üretilir.
    """
    haystack = " ".join(t for t in texts if t).lower()
    if not haystack:
        return None
    for pattern, language in _LANGUAGE_PATTERNS:
        if re.search(pattern, haystack):
            return language
    return None


def slugify(raw: str) -> str:
    """Serbest metni kavram kimliği biçimine çeker (ASCII, snake_case)."""
    text = (raw or "").strip().lower()
    text = text.replace("ı", "i").replace("ğ", "g").replace("ş", "s")
    text = text.replace("ö", "o").replace("ü", "u").replace("ç", "c")
    text = "".join(
        ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch)
    )
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return text[:80]


async def get_dictionary(db: AsyncSession, language: str) -> List[Concept]:
    """
    Dilin sözlüğünü döndürür; kodda tohumu varsa ilk çağrıda veritabanına yazar.

    Tohumlama idempotent: yalnızca o dilde HİÇ kayıt yoksa çalışır. Böylece
    öğretmenin sildiği bir kavram bir sonraki istekte geri gelmez.
    """
    language = (language or "").strip().lower()
    if not language:
        return []

    result = await db.execute(
        select(Concept).where(Concept.language == language).order_by(Concept.id)
    )
    rows = list(result.scalars().all())
    if rows or language not in SEED_DICTIONARIES:
        return rows

    for entry in seed_entries(language):
        db.add(Concept(language=language, source="seed", **entry))
    await db.commit()

    result = await db.execute(
        select(Concept).where(Concept.language == language).order_by(Concept.id)
    )
    return list(result.scalars().all())


def serialize(concept: Concept) -> Dict[str, Any]:
    return {
        "concept_id": concept.concept_id,
        "label": concept.label,
        "description": concept.description or "",
        "prerequisites": concept.prerequisites or [],
        "source": concept.source or "seed",
    }


def dictionary_prompt_block(concepts: Iterable[Concept]) -> str:
    """
    Sözlüğü prompt'a yazılacak biçime çevirir.

    Model bu listeyi GÖRÜR ve yalnızca buradan seçer. Listeyi vermeden
    "kavram üret" demek, her kursta yeni bir ölçüm birimi icat ettirmektir.
    """
    lines = []
    for c in concepts:
        prereq = ", ".join(c.prerequisites or []) or "-"
        line = f"- {c.concept_id} | {c.label} | ön koşul: {prereq} | {c.description or ''}"
        lines.append(line.rstrip())
    return "\n".join(lines)


def normalize_topic_concepts(
    raw_concepts: Any,
    known: Dict[str, Concept],
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Modelin bir konu için seçtiği kavramları sözlüğe karşı doğrular.

    Döndürür: (kabul edilen kavramlar, eşleşmeyen ham etiketler)

    Kabul edilenlerde daima tam olarak bir birincil kavram vardır: model
    hiç işaretlememişse ilk kavram birincil sayılır (sıra modelin verdiği
    önem sırasıdır), birden fazla işaretlemişse ilki korunur.
    """
    accepted: List[Dict[str, Any]] = []
    unmatched: List[str] = []
    seen: set = set()

    for item in raw_concepts or []:
        if isinstance(item, str):
            candidate, is_primary = item, False
        elif isinstance(item, dict):
            candidate = item.get("concept_id") or item.get("id") or item.get("label") or ""
            is_primary = bool(item.get("primary") or item.get("is_primary"))
        else:
            continue

        candidate = str(candidate).strip()
        if not candidate:
            continue

        concept = known.get(candidate) or known.get(slugify(candidate))
        if not concept:
            unmatched.append(candidate)
            continue
        if concept.concept_id in seen:
            continue

        seen.add(concept.concept_id)
        accepted.append({
            "concept_id": concept.concept_id,
            "label": concept.label,
            "primary": is_primary,
        })

    # Fazlası, konunun çok geniş olduğunun işaretidir. Prompt zaten 4 sınırını
    # söylüyor; model yine de aşarsa ilk 4'ü tutuyoruz (sıra = modelin önem sırası).
    accepted = accepted[:MAX_CONCEPTS_PER_TOPIC]

    if accepted:
        primaries = [c for c in accepted if c["primary"]]
        for c in accepted:
            c["primary"] = False
        (primaries[0] if primaries else accepted[0])["primary"] = True

    return accepted, unmatched


async def log_unmatched(
    db: AsyncSession,
    language: str,
    labels: Iterable[str],
    topic_title: Optional[str] = None,
    course_topic: Optional[str] = None,
    teacher_id: Optional[int] = None,
) -> None:
    """Eşleşmeyen önerileri sayaçlı olarak biriktirir. Hata asla akışı kesmez."""
    unique = {(label or "").strip()[:200] for label in labels if (label or "").strip()}
    for raw in unique:
        try:
            result = await db.execute(
                select(UnmatchedConcept).where(
                    UnmatchedConcept.language == language,
                    UnmatchedConcept.raw_label == raw,
                )
            )
            row = result.scalar_one_or_none()
            if row:
                row.hit_count = (row.hit_count or 1) + 1
            else:
                db.add(UnmatchedConcept(
                    language=language,
                    raw_label=raw,
                    topic_title=(topic_title or "")[:300] or None,
                    course_topic=(course_topic or "")[:300] or None,
                    teacher_id=teacher_id,
                ))
            await db.commit()
        except Exception:
            await db.rollback()
