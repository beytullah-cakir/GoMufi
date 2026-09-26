"""
Yönetici paneli — işletme uçları (kullanıcı/kurs/soru düzenleme routers/admin.py'de).

  GET    /admin/overview                         platformun durumu: sayılar, etkinlik, YZ maliyeti, uyarılar
  GET    /admin/accounts                         arama + rol/durum süzgeci + sayfalama (veliler dahil)
  POST   /admin/users/{role}/{id}/suspend        hesabı askıya al (giriş ve açık oturum reddedilir)
  DELETE /admin/users/{role}/{id}/suspend        hesabı yeniden aç
  GET    /admin/users/{role}/{id}/export         KVKK talebi: kullanıcının verisi (JSON)
  GET    /admin/audit                            yönetici işlem kaydı
  GET    /admin/security                         son 24 saatin başarısız girişleri, kilitli hesaplar
  DELETE /admin/security/lock?email=             bir e-postanın giriş kilidini kaldır
"""
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user_info
from connect_db import get_db
from core import accounts, login_guard, mailer, plans, storage
from core.config import settings
from models.ai_usage_log import AIUsageLog
from models.course import Course
from models.enrollment import Enrollment
from models.learning import LearningEvent
from models.parent import Parent
from models.organization import Organization, OrganizationInvite, OrganizationMember, Subscription
from models.platform import AccountSuspension, AdminAction, LoginAttempt
from models.school import ModuleProgress
from models.student import Student
from models.teacher import Teacher

router = APIRouter(prefix="/admin", tags=["admin"])

ROLES = {"student": Student, "teacher": Teacher, "parent": Parent}
PAGE_SIZE = 25


def _admin(user_info: dict = Depends(get_current_user_info)) -> dict:
    if user_info.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor.")
    return user_info


def _iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    if value.tzinfo is not None:            # saat dilimli sütunları UTC'ye indir, biçim tek olsun
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.isoformat()


async def _count(db: AsyncSession, stmt) -> int:
    return int((await db.execute(stmt)).scalar() or 0)


# --- genel bakış ------------------------------------------------------------------

def _warnings() -> List[Dict[str, str]]:
    out = []
    if mailer.provider() == "log":
        out.append({"level": "high", "text": "E-posta sağlayıcısı tanımlı değil (RESEND_API_KEY ya da SMTP_HOST): "
                                            "şifre sıfırlama, duyuru ve veli raporu e-postaları gönderilmiyor."})
    if not settings.MY_API_KEY:
        out.append({"level": "high", "text": "Gemini API anahtarı tanımlı değil: YZ ile içerik üretimi çalışmaz."})
    if not settings.IS_PRODUCTION:
        out.append({"level": "info", "text": "Sunucu geliştirme modunda çalışıyor (IS_PRODUCTION kapalı)."})
    return out


@router.get("/overview")
async def overview(_: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    week, month = now - timedelta(days=7), now - timedelta(days=30)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    users: Dict[str, Dict[str, int]] = {}
    for role, model in ROLES.items():
        created = model.created_at
        # velilerin created_at'i saat dilimli; karşılaştırma aynı türde olmalı
        aware = getattr(created.type, "timezone", False)
        w, m = (week.replace(tzinfo=timezone.utc), month.replace(tzinfo=timezone.utc)) if aware else (week, month)
        users[role] = {
            "total": await _count(db, select(func.count(model.id))),
            "new_7d": await _count(db, select(func.count(model.id)).where(created >= w)),
            "new_30d": await _count(db, select(func.count(model.id)).where(created >= m)),
        }
    active_students = await _count(db, select(func.count(distinct(LearningEvent.student_id)))
                                   .where(LearningEvent.created_at >= week))
    completed_7d = await _count(db, select(func.count(ModuleProgress.id)).where(ModuleProgress.completed_at >= week))

    ai = {}
    for key, since in (("this_month", month_start), ("last_30d", month)):
        cost, calls = (await db.execute(
            select(func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0), func.count(AIUsageLog.id))
            .where(AIUsageLog.created_at >= since)
        )).one()
        ai[key] = {"cost_usd": round(float(cost or 0), 4), "calls": int(calls or 0)}
    top_rows = (await db.execute(
        select(AIUsageLog.teacher_id, func.sum(AIUsageLog.cost_usd).label("cost"), func.count(AIUsageLog.id))
        .where(AIUsageLog.created_at >= month_start).group_by(AIUsageLog.teacher_id)
        .order_by(func.sum(AIUsageLog.cost_usd).desc()).limit(5)
    )).all()
    names = {t.id: f"{t.first_name or ''} {t.last_name or ''}".strip() for t in (await db.execute(
        select(Teacher).where(Teacher.id.in_([r[0] for r in top_rows if r[0]] or [-1]))
    )).scalars().all()}
    ai["top_teachers"] = [{"teacher_id": tid, "name": names.get(tid, f"#{tid}"), "cost_usd": round(float(c or 0), 4),
                           "calls": int(n)} for tid, c, n in top_rows]

    pending_review = 0
    for curriculum, in (await db.execute(select(Course.curriculum))).all():
        pending_review += sum(1 for n in curriculum or [] if isinstance(n, dict) and n.get("aiReview") == "pending")

    failed_24h = await _count(db, select(func.count(LoginAttempt.id)).where(
        LoginAttempt.success.is_(False), LoginAttempt.created_at >= now - timedelta(hours=24)))

    return {
        "users": users,
        "courses": {"total": await _count(db, select(func.count(Course.id))),
                    "new_30d": await _count(db, select(func.count(Course.id)).where(Course.created_at >= month)),
                    "enrollments": await _count(db, select(func.count(Enrollment.id))),
                    "modules_pending_review": pending_review},
        "activity": {"active_students_7d": active_students, "modules_completed_7d": completed_7d},
        "ai": ai,
        "storage": await storage.usage(db),
        "security": {"failed_logins_24h": failed_24h,
                     "suspended": await _count(db, select(func.count(AccountSuspension.id)))},
        "email_provider": mailer.provider(),
        "warnings": _warnings(),
    }


# --- kullanıcılar ------------------------------------------------------------------

@router.get("/accounts")
async def list_accounts(
    q: str = "",
    role: Optional[str] = Query(default=None, pattern="^(student|teacher|parent)$"),
    status: Optional[str] = Query(default=None, pattern="^(active|suspended)$"),
    page: int = Query(default=1, ge=1),
    _: dict = Depends(_admin),
    db: AsyncSession = Depends(get_db),
):
    suspended = {(r, int(u)): reason for r, u, reason in (await db.execute(
        select(AccountSuspension.role, AccountSuspension.user_id, AccountSuspension.reason))).all()}
    term = f"%{q.strip().lower()}%" if q.strip() else None
    rows: List[Dict[str, Any]] = []
    for r, model in ROLES.items():
        if role and role != r:
            continue
        stmt = select(model)
        if term:
            stmt = stmt.where(or_(func.lower(model.email).like(term), func.lower(model.first_name).like(term),
                                  func.lower(model.last_name).like(term)))
        for u in (await db.execute(stmt)).scalars().all():
            is_suspended = (r, u.id) in suspended
            if status == "suspended" and not is_suspended or status == "active" and is_suspended:
                continue
            rows.append({
                "role": r, "id": u.id, "first_name": u.first_name, "last_name": u.last_name, "email": u.email,
                "created_at": _iso(u.created_at), "suspended": is_suspended,
                "suspension_reason": suspended.get((r, u.id)),
                "is_admin": bool(settings.ADMIN_EMAIL and (u.email or "").lower() == settings.ADMIN_EMAIL.lower()),
            })
    rows.sort(key=lambda x: x["created_at"] or "", reverse=True)
    total = len(rows)
    rows = rows[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]

    # Sayfadaki kullanıcılar için ek bilgi: son giriş, kurs sayısı
    emails = [x["email"].lower() for x in rows if x["email"]]
    last_login = dict((await db.execute(
        select(LoginAttempt.email, func.max(LoginAttempt.created_at))
        .where(LoginAttempt.email.in_(emails or [""]), LoginAttempt.success.is_(True)).group_by(LoginAttempt.email)
    )).all())
    student_ids = [x["id"] for x in rows if x["role"] == "student"]
    teacher_ids = [x["id"] for x in rows if x["role"] == "teacher"]
    enrolled = dict((await db.execute(select(Enrollment.student_id, func.count(Enrollment.id))
                                      .where(Enrollment.student_id.in_(student_ids or [-1])).group_by(Enrollment.student_id))).all())
    owned = dict((await db.execute(select(Course.teacher_id, func.count(Course.id))
                                   .where(Course.teacher_id.in_(teacher_ids or [-1])).group_by(Course.teacher_id))).all())
    for x in rows:
        x["last_login"] = _iso(last_login.get((x["email"] or "").lower()))
        x["courses"] = enrolled.get(x["id"], 0) if x["role"] == "student" else owned.get(x["id"], 0) if x["role"] == "teacher" else None
    return {"items": rows, "total": total, "page": page, "page_size": PAGE_SIZE}


class SuspendIn(BaseModel):
    reason: str = Field(default="", max_length=500)


async def _account(db: AsyncSession, role: str, user_id: int):
    model = ROLES.get(role)
    if not model:
        raise HTTPException(status_code=400, detail="Geçersiz rol.")
    account = await db.get(model, user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı.")
    return account


@router.post("/users/{role}/{user_id}/suspend")
async def suspend(role: str, user_id: int, body: SuspendIn, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    account = await _account(db, role, user_id)
    if settings.ADMIN_EMAIL and (account.email or "").lower() == settings.ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Yönetici hesabı askıya alınamaz.")
    existing = (await db.execute(select(AccountSuspension).where(
        AccountSuspension.role == role, AccountSuspension.user_id == user_id))).scalar_one_or_none()
    if existing:
        existing.reason = body.reason.strip() or existing.reason
    else:
        db.add(AccountSuspension(role=role, user_id=user_id, reason=body.reason.strip() or None))
    await db.commit()
    login_guard.invalidate()
    return {"suspended": True}


@router.delete("/users/{role}/{user_id}/suspend")
async def unsuspend(role: str, user_id: int, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    await _account(db, role, user_id)
    await db.execute(delete(AccountSuspension).where(AccountSuspension.role == role, AccountSuspension.user_id == user_id))
    await db.commit()
    login_guard.invalidate()
    return {"suspended": False}


@router.get("/users/{role}/{user_id}/export")
async def export_user(role: str, user_id: int, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    await _account(db, role, user_id)
    data = await accounts.export(db, role, user_id)
    return Response(content=json.dumps(data, ensure_ascii=False, indent=2), media_type="application/json",
                    headers={"Content-Disposition": f'attachment; filename="gomufi-{role}-{user_id}.json"',
                             "Cache-Control": "no-store"})


# --- işlem kaydı ve güvenlik ----------------------------------------------------------

@router.get("/audit")
async def audit_log(page: int = Query(default=1, ge=1), _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    total = await _count(db, select(func.count(AdminAction.id)))
    rows = (await db.execute(select(AdminAction).order_by(AdminAction.created_at.desc(), AdminAction.id.desc())
                             .offset((page - 1) * 50).limit(50))).scalars().all()
    return {"items": [{"id": a.id, "action": a.action, "summary": a.summary, "target": a.target,
                       "at": _iso(a.created_at)} for a in rows],
            "total": total, "page": page, "page_size": 50}


@router.get("/security")
async def security(_: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)
    by_email = (await db.execute(
        select(LoginAttempt.email, func.count(LoginAttempt.id), func.max(LoginAttempt.created_at))
        .where(LoginAttempt.success.is_(False), LoginAttempt.created_at >= since)
        .group_by(LoginAttempt.email).order_by(func.count(LoginAttempt.id).desc()).limit(20)
    )).all()
    by_ip = (await db.execute(
        select(LoginAttempt.ip, func.count(LoginAttempt.id), func.count(distinct(LoginAttempt.email)))
        .where(LoginAttempt.success.is_(False), LoginAttempt.created_at >= since)
        .group_by(LoginAttempt.ip).order_by(func.count(LoginAttempt.id).desc()).limit(20)
    )).all()
    window_start = datetime.utcnow() - login_guard.WINDOW
    locked = []
    for email, _n, _last in by_email:
        pair_max = (await db.execute(
            select(func.count(LoginAttempt.id)).where(
                LoginAttempt.email == email, LoginAttempt.success.is_(False), LoginAttempt.created_at > window_start)
            .group_by(LoginAttempt.ip).order_by(func.count(LoginAttempt.id).desc()).limit(1)
        )).scalar() or 0
        if pair_max >= login_guard.MAX_PER_EMAIL_IP or \
                await login_guard._failures(db, LoginAttempt.email, email, window_start) >= login_guard.MAX_PER_EMAIL:
            locked.append(email)
    return {
        "failed_by_email": [{"email": e, "count": n, "last": _iso(t), "locked": e in locked} for e, n, t in by_email],
        "failed_by_ip": [{"ip": ip, "count": n, "emails": m} for ip, n, m in by_ip],
        "limits": {"per_email": login_guard.MAX_PER_EMAIL, "per_email_ip": login_guard.MAX_PER_EMAIL_IP,
                   "per_ip": login_guard.MAX_PER_IP,
                   "window_minutes": int(login_guard.WINDOW.total_seconds() // 60)},
    }


@router.delete("/security/lock")
async def clear_lock(email: str, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    """Kilitlenen e-postayı açar: son başarısız denemeleri siler (öğrenci şifresini hatırladıysa)."""
    email = email.strip().lower()
    await db.execute(delete(LoginAttempt).where(LoginAttempt.email == email, LoginAttempt.success.is_(False)))
    await db.commit()
    return {"unlocked": email}


# --- kurumlar ve paketler ----------------------------------------------------------
# Ödeme entegrasyonu yok: kurum paketleri ve pilotlar buradan elle verilir.

class OrgIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    kind: str = Field(default="okul", pattern="^(okul|dershane|kurs)$")
    city: Optional[str] = Field(default=None, max_length=80)
    admin_email: Optional[str] = Field(default=None, max_length=255)


def _sub_out(s: Subscription) -> Dict[str, Any]:
    now = datetime.utcnow()
    return {"id": s.id, "owner_type": s.owner_type, "owner_id": s.owner_id, "plan": s.plan,
            "plan_label": plans.PLANS.get(s.plan, {}).get("label", s.plan),
            "starts_at": _iso(s.starts_at), "ends_at": _iso(s.ends_at), "pool_credits": s.pool_credits, "note": s.note,
            "active": s.starts_at <= now and (s.ends_at is None or s.ends_at > now)}


@router.get("/organizations")
async def list_organizations(_: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    orgs = (await db.execute(select(Organization).order_by(Organization.created_at.desc()))).scalars().all()
    counts = dict((await db.execute(select(OrganizationMember.organization_id, func.count(OrganizationMember.id))
                                    .group_by(OrganizationMember.organization_id))).all())
    since = plans.month_start()
    out = []
    for o in orgs:
        sub = await plans.active_subscription(db, "organization", o.id)
        ids = await plans.org_teacher_ids(db, o.id)
        used = plans.credits_of(sum((await plans.usage_usd(db, ids, since)).values()))
        admins = (await db.execute(select(Teacher).join(OrganizationMember, OrganizationMember.teacher_id == Teacher.id)
                                   .where(OrganizationMember.organization_id == o.id, OrganizationMember.role == "admin"))).scalars().all()
        out.append({"id": o.id, "name": o.name, "kind": o.kind, "city": o.city, "created_at": _iso(o.created_at),
                    "teachers": counts.get(o.id, 0), "students": await plans.student_count(db, ids),
                    "admins": [{"id": a.id, "name": f"{a.first_name or ''} {a.last_name or ''}".strip(), "email": a.email} for a in admins],
                    "subscription": _sub_out(sub) if sub else None, "credits_used": used})
    return {"organizations": out}


@router.post("/organizations")
async def create_organization(body: OrgIn, background: BackgroundTasks, _: dict = Depends(_admin),
                              db: AsyncSession = Depends(get_db)):
    from routers.organizations import create_invite
    org = Organization(name=body.name.strip(), kind=body.kind, city=(body.city or "").strip() or None)
    db.add(org)
    await db.commit()
    invited = None
    if body.admin_email:
        invited = (await create_invite(db, org, body.admin_email, "admin", None, background)).email
    return {"id": org.id, "name": org.name, "admin_invited": invited}


@router.get("/organizations/{org_id}")
async def organization_detail(org_id: int, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
    members = (await db.execute(select(OrganizationMember, Teacher).join(Teacher, Teacher.id == OrganizationMember.teacher_id)
                                .where(OrganizationMember.organization_id == org_id))).all()
    invites = (await db.execute(select(OrganizationInvite).where(
        OrganizationInvite.organization_id == org_id, OrganizationInvite.accepted_at.is_(None)))).scalars().all()
    subs = (await db.execute(select(Subscription).where(Subscription.owner_type == "organization", Subscription.owner_id == org_id)
                             .order_by(Subscription.starts_at.desc()))).scalars().all()
    return {
        "organization": {"id": org.id, "name": org.name, "kind": org.kind, "city": org.city},
        "members": [{"teacher_id": t.id, "name": f"{t.first_name or ''} {t.last_name or ''}".strip(), "email": t.email,
                     "role": m.role} for m, t in members],
        "invites": [{"id": i.id, "email": i.email, "role": i.role, "expires_at": _iso(i.expires_at)} for i in invites],
        "subscriptions": [_sub_out(s) for s in subs],
    }


@router.put("/organizations/{org_id}")
async def update_organization(org_id: int, body: OrgIn, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
    org.name, org.kind, org.city = body.name.strip(), body.kind, (body.city or "").strip() or None
    await db.commit()
    return {"id": org.id}


@router.delete("/organizations/{org_id}")
async def delete_organization(org_id: int, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    """Kurumu siler: öğretmen hesapları ve kursları KALIR, yalnızca kurum bağı ve kurum paketi gider."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
    await db.execute(delete(Subscription).where(Subscription.owner_type == "organization", Subscription.owner_id == org_id))
    await db.delete(org)
    await db.commit()
    return {"deleted": True}


class OrgInviteIn(BaseModel):
    email: str = Field(max_length=255)
    role: str = Field(default="admin", pattern="^(admin|teacher)$")


@router.post("/organizations/{org_id}/invites")
async def invite_to_organization(org_id: int, body: OrgInviteIn, background: BackgroundTasks, _: dict = Depends(_admin),
                                 db: AsyncSession = Depends(get_db)):
    from routers.organizations import create_invite
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
    row = await create_invite(db, org, body.email, body.role, None, background)
    return {"invited": row.email}


class SubscriptionIn(BaseModel):
    owner_type: str = Field(pattern="^(teacher|organization)$")
    owner_id: Optional[int] = None
    teacher_email: Optional[str] = Field(default=None, max_length=255)
    plan: str
    months: Optional[int] = Field(default=None, ge=1, le=60)       # boşsa süresiz
    pool_credits: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    note: Optional[str] = Field(default=None, max_length=300)


@router.get("/subscriptions")
async def list_subscriptions(_: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    subs = (await db.execute(select(Subscription).order_by(Subscription.created_at.desc()).limit(200))).scalars().all()
    teacher_names = {t.id: (f"{t.first_name or ''} {t.last_name or ''}".strip() or t.email) for t in (await db.execute(
        select(Teacher).where(Teacher.id.in_([s.owner_id for s in subs if s.owner_type == "teacher"] or [-1])))).scalars().all()}
    org_names = {o.id: o.name for o in (await db.execute(
        select(Organization).where(Organization.id.in_([s.owner_id for s in subs if s.owner_type == "organization"] or [-1])))).scalars().all()}
    return {"subscriptions": [{**_sub_out(s), "owner_name": (teacher_names if s.owner_type == "teacher" else org_names).get(s.owner_id)}
                              for s in subs],
            "plans": {k: v["label"] for k, v in plans.PLANS.items() if k != "free"}}


@router.post("/subscriptions")
async def create_subscription(body: SubscriptionIn, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    if body.plan not in plans.PLANS or body.plan == "free":
        raise HTTPException(status_code=400, detail="Geçersiz paket.")
    owner_id = body.owner_id
    if body.owner_type == "teacher":
        if body.plan == "kurum":
            raise HTTPException(status_code=400, detail="Kurum paketi kuruma verilir.")
        if owner_id is None and body.teacher_email:
            owner_id = (await db.execute(select(Teacher.id).where(
                func.lower(Teacher.email) == body.teacher_email.strip().lower()))).scalar()
        if owner_id is None or not await db.get(Teacher, owner_id):
            raise HTTPException(status_code=404, detail="Öğretmen bulunamadı.")
    elif owner_id is None or not await db.get(Organization, owner_id):
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
    now = datetime.utcnow()
    # Aynı sahibin etkin paketi yenisiyle değişir
    for old in (await db.execute(select(Subscription).where(
            Subscription.owner_type == body.owner_type, Subscription.owner_id == owner_id))).scalars().all():
        if old.ends_at is None or old.ends_at > now:
            old.ends_at = now
    sub = Subscription(owner_type=body.owner_type, owner_id=owner_id, plan=body.plan, starts_at=now,
                       ends_at=now + timedelta(days=30 * body.months) if body.months else None,
                       pool_credits=body.pool_credits if body.owner_type == "organization" else None,
                       note=(body.note or "").strip() or None)
    db.add(sub)
    await db.commit()
    return _sub_out(sub)


@router.delete("/subscriptions/{sub_id}")
async def end_subscription(sub_id: int, _: dict = Depends(_admin), db: AsyncSession = Depends(get_db)):
    sub = await db.get(Subscription, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Paket bulunamadı.")
    now = datetime.utcnow()
    if sub.ends_at is None or sub.ends_at > now:
        sub.ends_at = now
    await db.commit()
    return _sub_out(sub)
