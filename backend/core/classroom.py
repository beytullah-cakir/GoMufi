"""
Öğretmenin sınıf yönetimi ayarları — course_settings.settings["classroom"].

  leaderboard_enabled   öğrencilere şube sıralaması gösterilsin mi (varsayılan açık)
  unlocked_until        şube kimliği → öğrencinin açabileceği son modül sırası (1'den başlar);
                        "*" tüm şubeler için; yoksa sınır yok, modüller sırayla açılır

Şube bilgisi course.classes JSON'unda; öğrenci en fazla bir şubede olur.
"""
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from models.course import Course
from models.teaching import CourseSettings

DEFAULTS: Dict[str, Any] = {"leaderboard_enabled": True, "unlocked_until": {}}


def student_class(course: Course, student_id: int) -> Optional[Dict[str, Any]]:
    for cls in course.classes or []:
        if not isinstance(cls, dict):
            continue
        for sid in cls.get("student_ids") or []:
            try:
                if int(sid) == student_id:
                    return cls
            except (TypeError, ValueError):
                continue
    return None


def class_student_ids(cls: Dict[str, Any]) -> List[int]:
    out = []
    for sid in cls.get("student_ids") or []:
        try:
            out.append(int(sid))
        except (TypeError, ValueError):
            continue
    return out


async def load(db: AsyncSession, course_id: int) -> Dict[str, Any]:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    stored = ((row.settings or {}) if row else {}).get("classroom") or {}
    return {
        "leaderboard_enabled": stored.get("leaderboard_enabled", True) is not False,
        "unlocked_until": {str(k): int(v) for k, v in (stored.get("unlocked_until") or {}).items()
                           if isinstance(v, int) and v >= 0},
    }


async def save(db: AsyncSession, course_id: int, values: Dict[str, Any]) -> Dict[str, Any]:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    if not row:
        row = CourseSettings(course_id=course_id, settings={})
        db.add(row)
    current = {**DEFAULTS, **((row.settings or {}).get("classroom") or {})}
    current.update(values)
    row.settings = {**(row.settings or {}), "classroom": current}
    flag_modified(row, "settings")
    await db.commit()
    return await load(db, course_id)


def unlock_limit(settings: Dict[str, Any], class_id: Optional[str]) -> Optional[int]:
    """Öğrencinin şubesi için öğretmenin koyduğu sınır; şubeye özel sınır geneli ezer."""
    limits = settings.get("unlocked_until") or {}
    if class_id is not None and str(class_id) in limits:
        return limits[str(class_id)]
    return limits.get("*")
