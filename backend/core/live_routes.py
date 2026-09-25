"""
İstemciden gelen WebSocket mesajlarının kime gideceği.

ESKİDEN: istemcinin gönderdiği her mesaj bağlı HERKESE yayınlanıyordu.
Canlı derste öğrencinin adı ve bulunduğu slayt (student_status, 3 saniyede
bir) platformdaki bütün kullanıcılara ulaşıyor, kurs filtresi yalnızca
alıcının tarayıcısında yapılıyordu. Bir istemci `target_user` yazarak
istediği kişiye mesaj da iletebiliyordu.

ŞİMDİ: her mesaj türünün bir yönü var ve sunucu alıcıları kurs üyeliğinden
çıkarıyor:
  öğretmen → sınıf   : slayt senkronu, sonraki soru, ders aç/kapat, görev süresi
  öğrenci → öğretmen : öğrenci durumu, oyun/soru sonucu, "hoca nerede?" isteği
  kendine           : test bildirimi
Tanınmayan tür ya da kursa ait olmayan gönderen: mesaj düşer.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import select

logger = logging.getLogger(__name__)

TEACHER_TO_CLASS = {
    "slide_status", "next_question", "level_changed", "lesson_completed", "task_timer",
}
CLASS_TO_TEACHER = {
    "student_status", "game_status", "question_answered", "request_slide_status",
}
SELF_ONLY = {"notification"}

_TTL = 30.0
_members: Dict[int, Tuple[float, int, Set[int]]] = {}


async def course_members(course_id: int) -> Optional[Tuple[int, Set[int]]]:
    """(öğretmen, kayıtlı öğrenciler) — kısa süre önbelleklenir: slayt senkronu sık."""
    cached = _members.get(course_id)
    if cached and time.monotonic() - cached[0] < _TTL:
        return cached[1], cached[2]
    import connect_db  # çalışma anında: testler oturum fabrikasını değiştiriyor
    from models.course import Course
    from models.enrollment import Enrollment

    async with connect_db.SessionLocal() as session:
        teacher_id = (await session.execute(
            select(Course.teacher_id).where(Course.id == course_id)
        )).scalar_one_or_none()
        if teacher_id is None:
            return None
        students = {sid for (sid,) in (await session.execute(
            select(Enrollment.student_id).where(Enrollment.course_id == course_id)
        )).all()}
    _members[course_id] = (time.monotonic(), teacher_id, students)
    return teacher_id, students


def forget_course(course_id: int) -> None:
    """Kayıt değişti (yeni öğrenci): önbellek beklemesin."""
    _members.pop(course_id, None)


def teacher_keys(teacher_id: int) -> List[str]:
    return [f"teacher:{teacher_id}", f"instructor:{teacher_id}"]


async def targets_for(sender_key: str, message: dict) -> List[str]:
    """Bu mesajın gideceği kanal anahtarları. Boş liste: mesaj düşer."""
    kind = message.get("type")
    if kind in SELF_ONLY:
        return [sender_key]
    if kind not in TEACHER_TO_CLASS and kind not in CLASS_TO_TEACHER:
        return []
    try:
        course_id = int(message.get("courseId"))
    except (TypeError, ValueError):
        return []
    members = await course_members(course_id)
    if not members:
        return []
    teacher_id, students = members
    role, _, raw_id = sender_key.partition(":")
    try:
        sender_id = int(raw_id)
    except ValueError:
        sender_id = None

    if kind in TEACHER_TO_CLASS:
        is_teacher = role == "admin" or (role in ("teacher", "instructor") and sender_id == teacher_id)
        return [f"student:{sid}" for sid in sorted(students)] if is_teacher else []

    is_member = role == "admin" or (role == "student" and sender_id in students)
    return teacher_keys(teacher_id) if is_member else []
