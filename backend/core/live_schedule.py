"""
Canlı derslerin haftalık programından sıradaki ders saatleri.

Program şubede (`course.classes[].schedule`), şube programı boşsa kursta
(`course.schedule`) tutulur: [{"day": "Pazartesi", "time": "18:00"}, …]. Saatler
Türkiye saatidir; burada UTC'ye çevrilir (bildirim döngüsü ve istemci UTC'yle çalışır).
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Istanbul")
UTC = ZoneInfo("UTC")
DAYS = {
    "pazartesi": 0, "monday": 0, "salı": 1, "sali": 1, "tuesday": 1, "çarşamba": 2, "carsamba": 2, "wednesday": 2,
    "perşembe": 3, "persembe": 3, "thursday": 3, "cuma": 4, "friday": 4, "cumartesi": 5, "saturday": 5,
    "pazar": 6, "sunday": 6,
}
LESSON_MINUTES = 60


def _slot(raw: Any) -> Optional[tuple]:
    if not isinstance(raw, dict):
        return None
    day = DAYS.get(str(raw.get("day") or "").strip().lower())
    try:
        hour, minute = (int(p) for p in str(raw.get("time") or "").strip().split(":")[:2])
    except ValueError:
        return None
    if day is None or not (0 <= hour < 24 and 0 <= minute < 60):
        return None
    return day, hour, minute


def next_start(raw: Any, now_utc: datetime) -> Optional[datetime]:
    """Slotun, şu an sürmekte olan ya da sıradaki başlangıcı (naive UTC)."""
    slot = _slot(raw)
    if not slot:
        return None
    day, hour, minute = slot
    local_now = now_utc.replace(tzinfo=UTC).astimezone(TZ)
    for offset in range(0, 8):
        date = (local_now + timedelta(days=offset)).date()
        if date.weekday() != day:
            continue
        start = datetime(date.year, date.month, date.day, hour, minute, tzinfo=TZ).astimezone(UTC).replace(tzinfo=None)
        if start + timedelta(minutes=LESSON_MINUTES) > now_utc:
            return start
    return None


def class_schedules(course) -> List[Dict[str, Any]]:
    """[{class_id, class_name, student_ids:set|None, slots}] — şubesi olmayan kursta tek kayıt (herkes)."""
    out = []
    for cls in course.classes or []:
        if not isinstance(cls, dict):
            continue
        slots = cls.get("schedule") or []
        ids = set()
        for sid in cls.get("student_ids") or []:
            try:
                ids.add(int(sid))
            except (TypeError, ValueError):
                continue
        out.append({"class_id": str(cls.get("id")), "class_name": cls.get("name") or "Şube",
                    "student_ids": ids, "slots": slots or course.schedule or []})
    if not out:
        out.append({"class_id": "-", "class_name": None, "student_ids": None, "slots": course.schedule or []})
    return out


def upcoming_for_student(course, student_id: int, now_utc: datetime, within: timedelta) -> List[Dict[str, Any]]:
    result = []
    for entry in class_schedules(course):
        if entry["student_ids"] is not None and student_id not in entry["student_ids"] and len(course.classes or []) > 1:
            continue
        for slot in entry["slots"]:
            start = next_start(slot, now_utc)
            if start and start - now_utc <= within:
                result.append({"course_id": course.id, "course_title": course.title,
                               "class_name": entry["class_name"], "start": start.isoformat() + "Z",
                               "minutes_left": int((start - now_utc).total_seconds() // 60)})
    return sorted(result, key=lambda r: r["start"])
