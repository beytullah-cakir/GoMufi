"""
Günlük seri ve günlük görevler.

Eskiden `students.streak` hiçbir yerde artmıyordu (yalnızca yönetici elle
yazabiliyordu); ana sayfadaki "günlük görevler" de XP'nin 10'a bölümünden
kalanla uydurulmuş sahte çubuklardı. Artık öğrencinin her gerçek etkinliği
(modül bitirme ya da tekrar etme, ödev teslimi, oyun XP'si) Türkiye saatine
göre o günün satırına yazılır; seri ve görevler bu satırlardan hesaplanır.

Seri: bugünden (bugün henüz bir şey yapılmadıysa dünden) geriye kesintisiz
etkin gün sayısı. Dün de boşsa seri 0'dır; saklanan değer bayatlamasın diye
okuyan her yer `current()` ile hesaplar.
"""
from datetime import date, datetime, timedelta
from typing import Dict, List
from zoneinfo import ZoneInfo

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.school import StudentActivityDay
from models.student import Student

TZ = ZoneInfo("Europe/Istanbul")
# Günlük görevler: herkes için aynı, küçük ve ulaşılabilir hedefler.
DAILY_XP_GOAL = 300
LOOKBACK_DAYS = 400


def today() -> date:
    return datetime.now(TZ).date()


async def record(db: AsyncSession, student_id: int, *, modules: int = 0, perfect: int = 0,
                 xp: int = 0, homework: int = 0) -> None:
    """Bugünün satırına etkinlik ekler (commit çağıranın). Seriyi de günceller."""
    values = {"modules": modules, "perfect": perfect, "xp": max(0, xp), "homework": homework}
    stmt = insert(StudentActivityDay).values(student_id=student_id, day=today(), **values)
    stmt = stmt.on_conflict_do_update(
        index_elements=[StudentActivityDay.student_id, StudentActivityDay.day],
        set_={k: getattr(StudentActivityDay, k) + stmt.excluded[k] for k in values},
    )
    await db.execute(stmt)
    await db.execute(update(Student).where(Student.id == student_id).values(streak=await current(db, student_id)))


async def _days(db: AsyncSession, student_id: int) -> List[date]:
    since = today() - timedelta(days=LOOKBACK_DAYS)
    return [d for d, in (await db.execute(
        select(StudentActivityDay.day).where(StudentActivityDay.student_id == student_id, StudentActivityDay.day >= since)
        .order_by(StudentActivityDay.day.desc())
    )).all()]


def _streak(days: List[date], now: date) -> int:
    active = set(days)
    cursor = now if now in active else now - timedelta(days=1)
    count = 0
    while cursor in active:
        count += 1
        cursor -= timedelta(days=1)
    return count


async def current(db: AsyncSession, student_id: int) -> int:
    return _streak(await _days(db, student_id), today())


async def current_many(db: AsyncSession, student_ids: List[int]) -> Dict[int, int]:
    if not student_ids:
        return {}
    since = today() - timedelta(days=LOOKBACK_DAYS)
    by_student: Dict[int, List[date]] = {sid: [] for sid in student_ids}
    for sid, day in (await db.execute(
        select(StudentActivityDay.student_id, StudentActivityDay.day)
        .where(StudentActivityDay.student_id.in_(student_ids), StudentActivityDay.day >= since)
    )).all():
        by_student[sid].append(day)
    now = today()
    return {sid: _streak(days, now) for sid, days in by_student.items()}


async def summary(db: AsyncSession, student_id: int) -> dict:
    """Ana sayfa ve profil için: seri, en uzun seri, son 7 gün ve bugünün görevleri."""
    days = await _days(db, student_id)
    now = today()
    active = set(days)
    longest = run = 0
    prev = None
    for d in sorted(active):
        run = run + 1 if prev and d - prev == timedelta(days=1) else 1
        longest = max(longest, run)
        prev = d
    row = (await db.execute(
        select(StudentActivityDay).where(StudentActivityDay.student_id == student_id, StudentActivityDay.day == now)
    )).scalar_one_or_none()
    t = {"modules": row.modules if row else 0, "perfect": row.perfect if row else 0,
         "xp": row.xp if row else 0, "homework": row.homework if row else 0}
    quests = [
        {"key": "module", "title": "Bir modül bitir ya da tekrar et", "progress": min(t["modules"], 1), "goal": 1},
        {"key": "perfect", "title": "Bir modülü 3 yıldızla bitir", "progress": min(t["perfect"], 1), "goal": 1},
        {"key": "xp", "title": f"{DAILY_XP_GOAL} XP kazan", "progress": min(t["xp"], DAILY_XP_GOAL), "goal": DAILY_XP_GOAL},
    ]
    return {
        "streak": _streak(days, now),
        "longest": longest,
        "active_today": now in active,
        "week": [{"day": (now - timedelta(days=i)).isoformat(), "active": (now - timedelta(days=i)) in active}
                 for i in range(6, -1, -1)],
        "today": t,
        "quests": quests,
        "active_days": len(active),
    }
