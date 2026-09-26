"""
Paketler ve haklar — öğretmen neyi, ne kadar kullanabilir? TEK KAYNAK.

Paket çözümü (öğretmen için):
  1. Kuruma üye ve kurumun etkin paketi varsa → kurum paketi (kredi kurum havuzundan)
  2. Kendi etkin paketi varsa → o paket (ör. Öğretmen Pro)
  3. Hiçbiri yoksa → Ücretsiz

YZ kredisi: 1 kredi = 0,01 USD Gemini maliyeti (ai_usage_logs.cost_usd). Kur
dalgalansa da kredi sabit kalır. Kullanım takvim ayı başından sayılır.
Öğretmenin kullanımı = kendi başlattığı çağrılar + kurslarındaki öğrencilerin
çağrıları (koç, görev değerlendirme). Öğrencinin YZ özellikleri kredi bitince
ENGELLENMEZ (öğrenci ödeme duvarı görmez); yalnızca öğretmenin başlattığı üretim durur.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user_info
from connect_db import get_db
from models.ai_usage_log import AIUsageLog
from models.course import Course
from models.enrollment import Enrollment
from models.organization import Organization, OrganizationMember, Subscription

USD_PER_CREDIT = 0.01

PLANS: Dict[str, Dict[str, Any]] = {
    "free": {
        "label": "Ücretsiz",
        "credits": 500,                 # ≈ 5 USD/ay YZ maliyeti — ilk aylarda cömert, veriyle daraltılır
        "max_students": 100,
        "parent_report_email": False,
    },
    "pro": {
        "label": "Öğretmen Pro",
        "credits": 5000,
        "max_students": None,
        "parent_report_email": True,
    },
    "kurum": {
        "label": "Kurum",
        "credits_per_teacher": 5000,    # havuz belirtilmediyse öğretmen sayısı × bu değer
        "max_students": None,
        "parent_report_email": True,
    },
}


def month_start(now: Optional[datetime] = None) -> datetime:
    now = now or datetime.utcnow()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def credits_of(usd: float) -> int:
    return int(round((usd or 0) / USD_PER_CREDIT))


async def active_subscription(db: AsyncSession, owner_type: str, owner_id: int) -> Optional[Subscription]:
    now = datetime.utcnow()
    return (await db.execute(
        select(Subscription).where(
            Subscription.owner_type == owner_type, Subscription.owner_id == owner_id,
            Subscription.starts_at <= now, or_(Subscription.ends_at.is_(None), Subscription.ends_at > now),
        ).order_by(Subscription.starts_at.desc()).limit(1)
    )).scalar_one_or_none()


async def membership(db: AsyncSession, teacher_id: int) -> Optional[OrganizationMember]:
    return (await db.execute(
        select(OrganizationMember).where(OrganizationMember.teacher_id == teacher_id)
    )).scalar_one_or_none()


async def org_teacher_ids(db: AsyncSession, org_id: int) -> List[int]:
    return [t for t, in (await db.execute(
        select(OrganizationMember.teacher_id).where(OrganizationMember.organization_id == org_id)
    )).all()]


async def usage_usd(db: AsyncSession, teacher_ids: List[int], since: datetime) -> Dict[int, float]:
    """Öğretmen başına bu dönemin YZ maliyeti (kendi çağrıları + kurslarındaki öğrenci çağrıları)."""
    if not teacher_ids:
        return {}
    out = {t: 0.0 for t in teacher_ids}
    for tid, cost in (await db.execute(
        select(AIUsageLog.teacher_id, func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0))
        .where(AIUsageLog.teacher_id.in_(teacher_ids), AIUsageLog.created_at >= since)
        .group_by(AIUsageLog.teacher_id)
    )).all():
        out[tid] += float(cost or 0)
    for tid, cost in (await db.execute(
        select(Course.teacher_id, func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0))
        .join(Course, Course.id == AIUsageLog.course_id)
        .where(AIUsageLog.teacher_id.is_(None), Course.teacher_id.in_(teacher_ids), AIUsageLog.created_at >= since)
        .group_by(Course.teacher_id)
    )).all():
        out[tid] += float(cost or 0)
    return out


async def student_count(db: AsyncSession, teacher_ids: List[int]) -> int:
    if not teacher_ids:
        return 0
    return int((await db.execute(
        select(func.count(func.distinct(Enrollment.student_id)))
        .join(Course, Course.id == Enrollment.course_id).where(Course.teacher_id.in_(teacher_ids))
    )).scalar() or 0)


@dataclass
class Entitlements:
    plan: str
    label: str
    source: str                                   # "free" | "teacher" | "organization"
    credits_total: int
    credits_used: int                             # havuzun tamamında kullanılan
    my_credits_used: int                          # bu öğretmenin kullandığı
    my_cap: Optional[int]                         # kurum yöneticisinin koyduğu kişisel sınır
    max_students: Optional[int]
    students: int
    parent_report_email: bool
    ends_at: Optional[datetime] = None
    organization: Optional[Dict[str, Any]] = None
    note: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    @property
    def credits_left(self) -> int:
        left = self.credits_total - self.credits_used
        if self.my_cap is not None:
            left = min(left, self.my_cap - self.my_credits_used)
        return max(0, left)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "plan": self.plan, "label": self.label, "source": self.source,
            "credits": {"total": self.credits_total, "used": self.credits_used, "mine": self.my_credits_used,
                        "my_cap": self.my_cap, "left": self.credits_left},
            "students": {"count": self.students, "max": self.max_students},
            "features": {"parent_report_email": self.parent_report_email},
            "ends_at": self.ends_at.isoformat() if self.ends_at else None,
            "organization": self.organization,
            "note": self.note,
            "period_start": month_start().isoformat(),
        }


async def entitlements(db: AsyncSession, teacher_id: int) -> Entitlements:
    since = month_start()
    member = await membership(db, teacher_id)
    if member:
        org = await db.get(Organization, member.organization_id)
        sub = await active_subscription(db, "organization", member.organization_id)
        if sub and org:
            ids = await org_teacher_ids(db, org.id)
            usage = await usage_usd(db, ids, since)
            plan = PLANS.get(sub.plan) or PLANS["kurum"]
            total = sub.pool_credits if sub.pool_credits is not None else plan.get("credits_per_teacher", 0) * max(1, len(ids))
            return Entitlements(
                plan=sub.plan, label=plan["label"], source="organization",
                credits_total=int(total), credits_used=credits_of(sum(usage.values())),
                my_credits_used=credits_of(usage.get(teacher_id, 0)), my_cap=member.ai_cap_credits,
                max_students=plan["max_students"], students=await student_count(db, ids),
                parent_report_email=plan["parent_report_email"], ends_at=sub.ends_at,
                organization={"id": org.id, "name": org.name, "role": member.role}, note=sub.note,
            )
    sub = await active_subscription(db, "teacher", teacher_id)
    plan_key = sub.plan if sub and sub.plan in PLANS else "free"
    plan = PLANS[plan_key]
    used = credits_of((await usage_usd(db, [teacher_id], since)).get(teacher_id, 0))
    org_info = None
    if member:
        org = await db.get(Organization, member.organization_id)
        org_info = {"id": org.id, "name": org.name, "role": member.role} if org else None
    return Entitlements(
        plan=plan_key, label=plan["label"], source="teacher" if sub else "free",
        credits_total=int(plan.get("credits") or 0), credits_used=used, my_credits_used=used, my_cap=None,
        max_students=plan["max_students"], students=await student_count(db, [teacher_id]),
        parent_report_email=plan["parent_report_email"], ends_at=sub.ends_at if sub else None,
        organization=org_info, note=sub.note if sub else None,
    )


# --- uygulama noktaları -----------------------------------------------------------

async def ensure_ai_credit(db: AsyncSession, teacher_id: int) -> None:
    ent = await entitlements(db, teacher_id)
    if ent.credits_left > 0:
        return
    if ent.my_cap is not None and ent.my_credits_used >= ent.my_cap and ent.credits_used < ent.credits_total:
        msg = "Kurumunun sana ayırdığı bu ayki YZ kredisi doldu. Kurum yöneticinden sınırı artırmasını isteyebilirsin."
    elif ent.source == "organization":
        msg = "Kurumunun bu ayki YZ kredi havuzu doldu. Yeni ay başında yenilenir; kurum yöneticinle görüşebilirsin."
    else:
        msg = (f"{ent.label} paketindeki bu ayki YZ kredin doldu ({ent.credits_total} kredi). "
               "Yeni ay başında yenilenir; daha fazlası için Paketim sayfasına bak.")
    raise HTTPException(status_code=402, detail=msg)


async def ai_credit_guard(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)) -> None:
    """Öğretmenin başlattığı YZ uçlarına bağımlılık olarak eklenir: kredi yoksa 402.
    Yönetici için sınır yok; öğrenci uçlarında kullanılmaz (öğrenci ödeme duvarı görmez)."""
    if user_info.get("role") in ("teacher", "instructor"):
        await ensure_ai_credit(db, int(user_info["sub"]))


async def ensure_student_capacity(db: AsyncSession, course: Course, student_id: int) -> None:
    """Yeni bir öğrenci bu öğretmenin (ya da kurumunun) sınırını aşacaksa katılım reddedilir.
    Zaten kayıtlı öğrenci (başka kurstan) sayıyı artırmaz."""
    ent = await entitlements(db, course.teacher_id)
    if ent.max_students is None or ent.students < ent.max_students:
        return
    already = (await db.execute(
        select(Enrollment.id).join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == student_id, Course.teacher_id == course.teacher_id).limit(1)
    )).first()
    if already:
        return
    raise HTTPException(status_code=403, detail=(
        f"Öğretmeninin paketindeki öğrenci sınırı ({ent.max_students}) doldu. "
        "Öğretmenine haber ver; paketini yükselttiğinde katılabilirsin."))
