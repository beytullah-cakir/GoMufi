"""
Rozetler — öğrencinin gerçek etkinliğinden TÜRETİLİR, ayrıca saklanmaz.

Her rozet bir sayaca (bitirilen modül, en uzun seri, ilk denemede çözülen görev…)
ve bir hedefe bağlı. Sayaçlar veritabanındaki kayıtlardan okunduğu için rozet
"verilmeyi unutulamaz" ve istemciden yazılamaz. Yeni rozet eklemek: BADGES'e
bir satır + (gerekiyorsa) `stats()`'a bir sayaç.
"""
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core import gamification, streak
from models.homework_submission import HomeworkSubmission
from models.learning import TaskProgress
from models.school import ModuleProgress, RewardClaim
from models.student import Student

# (anahtar, ad, açıklama, sayaç, hedef, ikon, renk)
BADGES: List[tuple] = [
    ("ilk_adim", "İlk adım", "İlk modülünü bitir", "modules", 1, "footprints", "violet"),
    ("kasif", "Kaşif", "10 modül bitir", "modules", 10, "compass", "violet"),
    ("yildiz_avcisi", "Yıldız avcısı", "5 modülü 3 yıldızla bitir", "perfect", 5, "star", "amber"),
    ("tek_atis", "Tek atış", "Bir görevi ilk denemede çöz", "first_try", 1, "target", "green"),
    ("keskin_nisanci", "Keskin nişancı", "10 görevi ilk denemede çöz", "first_try", 10, "crosshair", "green"),
    ("pes_etmeyen", "Pes etmeyen", "3 ya da daha fazla denemede bir görevi çöz", "persistent", 1, "mountain", "sky"),
    ("isinma", "Isınma turu", "3 gün üst üste çalış", "longest_streak", 3, "flame", "orange"),
    ("alev_alev", "Alev alev", "7 gün üst üste çalış", "longest_streak", 7, "flame", "orange"),
    ("durdurulamaz", "Durdurulamaz", "30 gün üst üste çalış", "longest_streak", 30, "flame", "rose"),
    ("odev_kahramani", "Ödev kahramanı", "3 ödev teslim et", "homework", 3, "backpack", "sky"),
    ("hazine_avcisi", "Hazine avcısı", "Haritada ilk sandığını aç", "chests", 1, "gift", "amber"),
    ("tekrar_ustasi", "Tekrar ustası", "3 kez 'Zorlandığım konular' tekrarını bitir", "reviews", 3, "brain", "violet"),
    ("seviye_5", "Seviye 5", "5. seviyeye ulaş", "level", 5, "trophy", "amber"),
    ("seviye_10", "Seviye 10", "10. seviyeye ulaş", "level", 10, "crown", "amber"),
]


async def stats(db: AsyncSession, student_id: int) -> Dict[str, int]:
    async def count(stmt) -> int:
        return int((await db.execute(stmt)).scalar() or 0)

    xp = await count(select(Student.xp).where(Student.id == student_id))
    summary = await streak.summary(db, student_id)
    return {
        "modules": await count(select(func.count(ModuleProgress.id)).where(ModuleProgress.student_id == student_id)),
        "perfect": await count(select(func.count(ModuleProgress.id)).where(
            ModuleProgress.student_id == student_id, ModuleProgress.stars >= 3)),
        "first_try": await count(select(func.count(TaskProgress.id)).where(
            TaskProgress.student_id == student_id, TaskProgress.first_try_pass.is_(True))),
        "persistent": await count(select(func.count(TaskProgress.id)).where(
            TaskProgress.student_id == student_id, TaskProgress.solved_at.isnot(None), TaskProgress.attempts >= 3)),
        "longest_streak": int(summary.get("longest") or 0),
        "homework": await count(select(func.count(func.distinct(HomeworkSubmission.node_id))).where(
            HomeworkSubmission.student_id == student_id)),
        "chests": await count(select(func.count(RewardClaim.id)).where(
            RewardClaim.student_id == student_id, RewardClaim.key.like("chest:%"))),
        "reviews": await count(select(func.count(RewardClaim.id)).where(
            RewardClaim.student_id == student_id, RewardClaim.key.like("review:%"))),
        "level": gamification.level_for_xp(xp),
    }


def evaluate(values: Dict[str, int]) -> List[Dict[str, Any]]:
    out = []
    for key, name, description, counter, goal, icon, tone in BADGES:
        have = int(values.get(counter, 0))
        out.append({
            "key": key, "name": name, "description": description, "icon": icon, "tone": tone,
            "progress": min(have, goal), "goal": goal, "earned": have >= goal,
        })
    return out


async def for_student(db: AsyncSession, student_id: int) -> Dict[str, Any]:
    badges = evaluate(await stats(db, student_id))
    return {"badges": badges, "earned": sum(1 for b in badges if b["earned"]), "total": len(badges)}
