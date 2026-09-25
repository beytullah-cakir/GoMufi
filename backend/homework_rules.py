"""
Ödev ve görev teslimlerinin kuralları — veritabanından bağımsız, saf.

  * Son teslim tarihi: öğretmen ders oluşturucuda yerel saatle ("2026-10-01T23:59")
    girer; burada UTC'ye çevrilir (veritabanı UTC yazıyor).
  * Geç teslim: tarih geçtiyse teslim "geç" işaretlenir; öğretmen geç teslime
    izin vermediyse teslim reddedilir.
  * Dereceli puanlama anahtarı: ölçütler ve seviyeler. Notu seviye puanlarından
    hesaplar (100 üzerinden) — öğretmen notu elle de değiştirebilir.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("Europe/Istanbul")
UTC = ZoneInfo("UTC")

MAX_CRITERIA = 10
MAX_LEVELS = 6
_ID = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


# --- son tarih -------------------------------------------------------------------

def parse_due(value: Any) -> Optional[datetime]:
    """"YYYY-MM-DDTHH:MM" (yerel) ya da ISO → UTC, saat dilimsiz. Geçersizse None."""
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.strptime(text[:10], "%Y-%m-%d").replace(hour=23, minute=59)
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=LOCAL_TZ)
    return parsed.astimezone(UTC).replace(tzinfo=None)


def is_late(submitted_at: Optional[datetime], due: Optional[datetime]) -> bool:
    return bool(due and submitted_at and submitted_at > due)


def due_iso(due: Optional[datetime]) -> Optional[str]:
    """İstemciye UTC olarak (sonunda Z ile) — tarayıcı yerel saate çevirir."""
    return f"{due.isoformat()}Z" if due else None


# --- dereceli puanlama anahtarı -----------------------------------------------------

def normalize_rubric(raw: Any) -> Optional[Dict[str, Any]]:
    """Slayttaki anahtarı doğrular; kullanılamazsa None.

    Biçim: {"criteria": [{"id", "title", "description"?, "levels": [{"label", "points", "description"?}]}]}
    Seviyeler düşükten yükseğe. Puanlar 0 ile 100 arası tam sayı.
    """
    if not isinstance(raw, dict):
        return None
    criteria: List[Dict[str, Any]] = []
    seen = set()
    for item in (raw.get("criteria") or [])[:MAX_CRITERIA]:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("id") or "").strip()
        title = str(item.get("title") or "").strip()[:120]
        if not _ID.match(cid) or not title or cid in seen:
            continue
        levels = []
        for level in (item.get("levels") or [])[:MAX_LEVELS]:
            if not isinstance(level, dict):
                continue
            try:
                points = int(level.get("points"))
            except (TypeError, ValueError):
                continue
            label = str(level.get("label") or "").strip()[:60]
            if not label or not 0 <= points <= 100:
                continue
            levels.append({"label": label, "points": points,
                           "description": str(level.get("description") or "").strip()[:300]})
        if len(levels) < 2 or max(l["points"] for l in levels) <= 0:
            continue
        seen.add(cid)
        criteria.append({"id": cid, "title": title,
                         "description": str(item.get("description") or "").strip()[:300],
                         "levels": levels})
    return {"criteria": criteria} if criteria else None


def rubric_grade(rubric: Optional[Dict[str, Any]], scores: Any) -> Tuple[Optional[int], Dict[str, int]]:
    """Seçilen seviyelerden 100 üzerinden not. Eksik ölçüt varsa not hesaplanmaz.

    `scores`: {"<ölçüt id>": <seviye sırası>}. Geçersiz girdiler atılır.
    Dönen ikinci değer temizlenmiş seçimler (kaydedilecek olan).
    """
    if not rubric or not isinstance(scores, dict):
        return None, {}
    clean: Dict[str, int] = {}
    earned = maximum = 0
    complete = True
    for criterion in rubric["criteria"]:
        levels = criterion["levels"]
        top = max(level["points"] for level in levels)
        maximum += top
        raw = scores.get(criterion["id"])
        try:
            index = int(raw)
        except (TypeError, ValueError):
            complete = False
            continue
        if not 0 <= index < len(levels):
            complete = False
            continue
        clean[criterion["id"]] = index
        earned += levels[index]["points"]
    if not complete or maximum <= 0:
        return None, clean
    return round(100 * earned / maximum), clean


def rubric_prompt(rubric: Dict[str, Any]) -> str:
    """Modele anahtarı anlatan blok: her ölçüt için seviye sırası seçilecek."""
    lines = [
        "DERECELİ PUANLAMA ANAHTARI — her ölçüt için öğrencinin ulaştığı seviyeyi seç.",
        "rubricScores listesine her ölçüt için bir kayıt yaz: criterionId, level (seviye SIRASI, 0'dan başlar), reason (tek cümle).",
    ]
    for criterion in rubric["criteria"]:
        lines.append(f"- Ölçüt {criterion['id']}: {criterion['title']}" +
                     (f" — {criterion['description']}" if criterion.get("description") else ""))
        for index, level in enumerate(criterion["levels"]):
            desc = f": {level['description']}" if level.get("description") else ""
            lines.append(f"    {index}) {level['label']} ({level['points']} puan){desc}")
    return "\n".join(lines)


def ai_rubric_scores(rubric: Dict[str, Any], items: Any) -> Tuple[Dict[str, int], Dict[str, str]]:
    """Modelin döndürdüğü seviyeleri anahtara göre süzer (uydurma ölçüt/seviye atılır)."""
    valid = {c["id"]: len(c["levels"]) for c in rubric["criteria"]}
    scores: Dict[str, int] = {}
    reasons: Dict[str, str] = {}
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("criterionId") or "")
        try:
            level = int(item.get("level"))
        except (TypeError, ValueError):
            continue
        if cid in valid and 0 <= level < valid[cid]:
            scores[cid] = level
            reasons[cid] = str(item.get("reason") or "").strip()[:300]
    return scores, reasons
