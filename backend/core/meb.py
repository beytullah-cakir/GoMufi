"""
MEB kazanım eşlemesi — course_settings.settings["meb"].

  outcomes   öğretmenin resmî öğretim programından aldığı kazanımlar: [{code, text}]
  mapping    modül kimliği → o modülün karşıladığı kazanım kodları

Kazanım listesi bilerek YERLEŞİK DEĞİL: programlar sınıfa, derse ve yıla göre
değişiyor, yanlış bir kod öğretmeni resmî evrakta yanıltır. Öğretmen kendi
programından yapıştırır ("BT.7.2.1.1. Algoritma kavramını açıklar." gibi satırlar),
modülleri eşler; rapor her kazanımda sınıfın durumunu gösterir.
"""
import re
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from models.teaching import CourseSettings

MAX_OUTCOMES = 200
MAX_CODE = 40
MAX_TEXT = 400

# Satır başındaki kod: harf/rakam ve noktalı bölümler ("BT.7.2.1.1", "M.5.1.2.3", "F.8.4.1")
_CODE = re.compile(r"^\s*([A-Za-zÇĞİÖŞÜçğıöşü]{1,6}(?:[.\-]\w{1,4}){2,7})[.\s:)\-–]+(.*)$")


def parse_outcomes(text: str) -> List[Dict[str, str]]:
    """Yapıştırılan metni kazanımlara ayırır: satır başında kod varsa kod, yoksa satır numarası."""
    out: List[Dict[str, str]] = []
    seen = set()
    for line in (text or "").splitlines():
        line = line.strip().lstrip("•-*–").strip()
        if not line:
            continue
        m = _CODE.match(line)
        code, body = (m.group(1), m.group(2).strip()) if m else ("", line)
        if not body:
            continue
        code = (code or f"K{len(out) + 1}")[:MAX_CODE]
        if code.upper() in seen:
            continue
        seen.add(code.upper())
        out.append({"code": code, "text": body[:MAX_TEXT]})
        if len(out) >= MAX_OUTCOMES:
            break
    return out


def clean(outcomes: List[Dict[str, Any]], mapping: Dict[str, List[str]], node_ids: List[str]) -> Dict[str, Any]:
    items, seen = [], set()
    for o in outcomes[:MAX_OUTCOMES]:
        code = str(o.get("code") or "").strip()[:MAX_CODE]
        text = str(o.get("text") or "").strip()[:MAX_TEXT]
        if code and text and code.upper() not in seen:
            seen.add(code.upper())
            items.append({"code": code, "text": text})
    codes = {i["code"] for i in items}
    valid_nodes = set(node_ids)
    clean_map = {}
    for node_id, node_codes in (mapping or {}).items():
        kept = [c for c in dict.fromkeys(str(c) for c in node_codes or []) if c in codes]
        if str(node_id) in valid_nodes and kept:
            clean_map[str(node_id)] = kept
    return {"outcomes": items, "mapping": clean_map}


async def load(db: AsyncSession, course_id: int) -> Dict[str, Any]:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    stored = ((row.settings or {}) if row else {}).get("meb") or {}
    return {"outcomes": stored.get("outcomes") or [], "mapping": stored.get("mapping") or {}}


async def save(db: AsyncSession, course_id: int, value: Dict[str, Any]) -> None:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    if not row:
        row = CourseSettings(course_id=course_id, settings={})
        db.add(row)
    row.settings = {**(row.settings or {}), "meb": value}
    flag_modified(row, "settings")
    await db.commit()
