"""
Kurum (okul, dershane, kurs merkezi) — öğretmen ve kurum yöneticisi uçları.

Öğretmen:
  GET  /org/plan                           paketim: kredi, öğrenci sınırı, kurum
  GET  /org/me                             kurumum ve bana gelen davetler
  POST /org/invites/{id}/accept            e-postama gelen daveti kabul et
  POST /org/invites/accept-token           e-postadaki bağlantıyla kabul et
  POST /org/leave                          kurumdan ayrıl (kurslarım bende kalır)

Kurum yöneticisi:
  GET    /org/overview                     öğretmenler, kredi havuzu, özet sayılar
  GET    /org/classes                      kurs/şube bazında özet (öğrenci ayrıntısı yok)
  GET    /org/invites  ·  POST /org/invites  ·  DELETE /org/invites/{id}
  PUT    /org/members/{teacher_id}         rol, aylık YZ kredisi sınırı
  DELETE /org/members/{teacher_id}         kurumdan çıkar; ?copy_to= ile kurslarının kopyası kurumda kalır

Kararlar: öğretmen ayrılınca kursları kendisinde kalır, kurum isterse bir kopyasını
başka öğretmene alır. Kurum yöneticisi öğrenci ayrıntısını değil sınıf/öğretmen
özetini görür (öğrenci ayrıntısı öğretmenin sayfasında). YZ kredisi ortak havuz;
yönetici öğretmen başına üst sınır koyabilir.
"""
import hashlib
import secrets
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_teacher_id, get_current_user_info
from connect_db import get_db
from core import mailer, plans
from core.config import settings
from learning_analytics import mastery_status
from models.course import Course
from models.enrollment import Enrollment
from models.learning import ConceptMastery, LearningEvent
from models.organization import Organization, OrganizationInvite, OrganizationMember
from models.school import ModuleProgress
from models.teacher import Teacher

router = APIRouter(prefix="/org", tags=["organization"])

INVITE_TTL = timedelta(days=14)
ROLES = {"admin": "Kurum yöneticisi", "teacher": "Öğretmen"}
KINDS = {"okul": "Okul", "dershane": "Dershane", "kurs": "Kurs merkezi"}


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _name(t: Teacher) -> str:
    return f"{t.first_name or ''} {t.last_name or ''}".strip() or t.email


async def create_invite(db: AsyncSession, org: Organization, email: str, role: str, invited_by: Optional[int],
                        background: Optional[BackgroundTasks]) -> OrganizationInvite:
    """Davet oluşturur ve e-postayı gönderir. GoMufi yönetici paneli de kullanır."""
    email = email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Geçerli bir e-posta adresi yaz.")
    if role not in ROLES:
        raise HTTPException(status_code=400, detail="Geçersiz rol.")
    teacher = (await db.execute(select(Teacher).where(func.lower(Teacher.email) == email))).scalar_one_or_none()
    if teacher:
        member = await plans.membership(db, teacher.id)
        if member and member.organization_id == org.id:
            raise HTTPException(status_code=409, detail="Bu öğretmen zaten kurumunda.")
    # Aynı adrese bekleyen eski davet varsa yenisiyle değiştir
    await db.execute(delete(OrganizationInvite).where(
        OrganizationInvite.organization_id == org.id, OrganizationInvite.email == email,
        OrganizationInvite.accepted_at.is_(None)))
    token = secrets.token_urlsafe(32)
    invite = OrganizationInvite(organization_id=org.id, email=email, role=role, token_hash=_digest(token),
                                invited_by=invited_by, expires_at=datetime.utcnow() + INVITE_TTL)
    db.add(invite)
    await db.commit()
    link = f"{settings.FRONTEND_URL.rstrip('/')}/kurum/davet?token={token}"
    text, html_body = mailer.render(
        f"{org.name} seni GoMufi'ye davet ediyor",
        [f"{org.name} kurumu seni GoMufi'de {ROLES[role].lower()} olarak davet etti.",
         "Kabul etmek için aşağıdaki düğmeye tıkla. Hesabın yoksa aynı e-posta adresiyle öğretmen hesabı açman yeterli.",
         "Davet 14 gün geçerlidir. Bu kurumu tanımıyorsan e-postayı yok say."],
        ("Daveti kabul et", link),
    )
    if background is not None:
        background.add_task(mailer.send_email, email, f"GoMufi · {org.name} daveti", text, html_body)
    return invite


def _invite_out(i: OrganizationInvite, org: Optional[Organization] = None) -> Dict[str, Any]:
    out = {"id": i.id, "email": i.email, "role": i.role, "role_label": ROLES.get(i.role, i.role),
           "created_at": _iso(i.created_at), "expires_at": _iso(i.expires_at),
           "expired": i.expires_at < datetime.utcnow()}
    if org is not None:
        out["organization"] = {"id": org.id, "name": org.name, "kind": KINDS.get(org.kind, org.kind)}
    return out


async def _join(db: AsyncSession, invite: OrganizationInvite, teacher_id: int) -> Dict[str, Any]:
    if invite.accepted_at is not None:
        raise HTTPException(status_code=409, detail="Bu davet zaten kullanılmış.")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Davetin süresi dolmuş; kurum yöneticinden yeni davet iste.")
    current = await plans.membership(db, teacher_id)
    if current and current.organization_id != invite.organization_id:
        raise HTTPException(status_code=409, detail="Zaten başka bir kurumdasın. Önce mevcut kurumundan ayrıl.")
    if current:
        current.role = invite.role if invite.role == "admin" else current.role
    else:
        db.add(OrganizationMember(organization_id=invite.organization_id, teacher_id=teacher_id, role=invite.role))
    invite.accepted_at = datetime.utcnow()
    await db.commit()
    org = await db.get(Organization, invite.organization_id)
    return {"joined": True, "organization": {"id": org.id, "name": org.name}, "role": invite.role}


# --- öğretmen ------------------------------------------------------------------------

@router.get("/plan")
async def my_plan(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    if user_info.get("role") == "admin":
        return {"plan": "admin", "label": "Yönetici", "source": "admin", "unlimited": True}
    if user_info.get("role") not in ("teacher", "instructor"):
        raise HTTPException(status_code=403, detail="Paketler öğretmen hesaplarına aittir.")
    ent = await plans.entitlements(db, int(user_info["sub"]))
    return {**ent.as_dict(), "plans": {k: {"label": v["label"], "credits": v.get("credits") or v.get("credits_per_teacher"),
                                            "max_students": v["max_students"],
                                            "parent_report_email": v["parent_report_email"]} for k, v in plans.PLANS.items()}}


@router.get("/me")
async def my_org(teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db)):
    teacher = await db.get(Teacher, teacher_id)
    member = await plans.membership(db, teacher_id)
    org = await db.get(Organization, member.organization_id) if member else None
    invites = []
    if teacher and teacher.email:
        rows = (await db.execute(
            select(OrganizationInvite, Organization).join(Organization, Organization.id == OrganizationInvite.organization_id)
            .where(OrganizationInvite.email == teacher.email.lower(), OrganizationInvite.accepted_at.is_(None),
                   OrganizationInvite.expires_at > datetime.utcnow())
        )).all()
        invites = [_invite_out(i, o) for i, o in rows if not org or o.id != org.id or i.role == "admin" and member.role != "admin"]
    return {
        "organization": {"id": org.id, "name": org.name, "kind": KINDS.get(org.kind, org.kind), "city": org.city} if org else None,
        "role": member.role if member else None,
        "invites": invites,
    }


@router.post("/invites/{invite_id}/accept")
async def accept_invite(invite_id: int, teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db)):
    invite = await db.get(OrganizationInvite, invite_id)
    teacher = await db.get(Teacher, teacher_id)
    if not invite or not teacher or invite.email != (teacher.email or "").lower():
        raise HTTPException(status_code=404, detail="Davet bulunamadı.")
    return await _join(db, invite, teacher_id)


class TokenIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


@router.post("/invites/accept-token")
async def accept_invite_token(body: TokenIn, teacher_id: int = Depends(get_current_teacher_id),
                              db: AsyncSession = Depends(get_db)):
    invite = (await db.execute(select(OrganizationInvite).where(
        OrganizationInvite.token_hash == _digest(body.token)))).scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Davet bağlantısı geçersiz.")
    return await _join(db, invite, teacher_id)


async def _admin_count(db: AsyncSession, org_id: int) -> int:
    return int((await db.execute(select(func.count(OrganizationMember.id)).where(
        OrganizationMember.organization_id == org_id, OrganizationMember.role == "admin"))).scalar() or 0)


@router.post("/leave")
async def leave(teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db)):
    member = await plans.membership(db, teacher_id)
    if not member:
        raise HTTPException(status_code=404, detail="Bir kuruma üye değilsin.")
    if member.role == "admin" and await _admin_count(db, member.organization_id) <= 1:
        raise HTTPException(status_code=409, detail="Kurumun tek yöneticisisin. Ayrılmadan önce başka bir öğretmeni yönetici yap.")
    await db.delete(member)
    await db.commit()
    return {"left": True}


# --- kurum yöneticisi ------------------------------------------------------------------

async def _org_admin(teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db)):
    member = await plans.membership(db, teacher_id)
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Bu sayfa kurum yöneticilerine açık.")
    org = await db.get(Organization, member.organization_id)
    return org, member


@router.get("/overview")
async def overview(ctx=Depends(_org_admin), db: AsyncSession = Depends(get_db)):
    org, me = ctx
    members = (await db.execute(
        select(OrganizationMember, Teacher).join(Teacher, Teacher.id == OrganizationMember.teacher_id)
        .where(OrganizationMember.organization_id == org.id).order_by(Teacher.first_name)
    )).all()
    ids = [t.id for _m, t in members]
    usage = await plans.usage_usd(db, ids, plans.month_start())
    week = datetime.utcnow() - timedelta(days=7)

    courses_by_teacher = defaultdict(list)
    for cid, tid in (await db.execute(select(Course.id, Course.teacher_id).where(Course.teacher_id.in_(ids or [-1])))).all():
        courses_by_teacher[tid].append(cid)
    all_courses = [c for cs in courses_by_teacher.values() for c in cs]
    students_by_course = defaultdict(set)
    for cid, sid in (await db.execute(select(Enrollment.course_id, Enrollment.student_id)
                                      .where(Enrollment.course_id.in_(all_courses or [-1])))).all():
        students_by_course[cid].add(sid)
    active_by_course = defaultdict(set)
    last_by_course: Dict[int, datetime] = {}
    for cid, sid, at in (await db.execute(
        select(LearningEvent.course_id, LearningEvent.student_id, LearningEvent.created_at)
        .where(LearningEvent.course_id.in_(all_courses or [-1]), LearningEvent.created_at >= week)
    )).all():
        active_by_course[cid].add(sid)
        last_by_course[cid] = max(at, last_by_course.get(cid, at))

    teachers = []
    for m, t in members:
        cs = courses_by_teacher.get(t.id, [])
        students = set().union(*[students_by_course[c] for c in cs]) if cs else set()
        active = set().union(*[active_by_course[c] for c in cs]) if cs else set()
        last = max((last_by_course[c] for c in cs if c in last_by_course), default=None)
        teachers.append({
            "teacher_id": t.id, "name": _name(t), "email": t.email, "role": m.role, "role_label": ROLES.get(m.role, m.role),
            "joined_at": _iso(m.joined_at), "courses": len(cs), "students": len(students),
            "active_students_7d": len(active), "last_student_activity": _iso(last),
            "credits_used": plans.credits_of(usage.get(t.id, 0)), "ai_cap_credits": m.ai_cap_credits,
        })
    ent = await plans.entitlements(db, me.teacher_id)
    all_students = set().union(*students_by_course.values()) if students_by_course else set()
    all_active = set().union(*active_by_course.values()) if active_by_course else set()
    pending = (await db.execute(select(func.count(OrganizationInvite.id)).where(
        OrganizationInvite.organization_id == org.id, OrganizationInvite.accepted_at.is_(None),
        OrganizationInvite.expires_at > datetime.utcnow()))).scalar() or 0
    return {
        "organization": {"id": org.id, "name": org.name, "kind": KINDS.get(org.kind, org.kind), "city": org.city},
        "plan": ent.as_dict() if ent.source == "organization" else None,
        "totals": {"teachers": len(teachers), "courses": len(all_courses), "students": len(all_students),
                   "active_students_7d": len(all_active), "pending_invites": int(pending)},
        "teachers": teachers,
    }


@router.get("/classes")
async def classes(ctx=Depends(_org_admin), db: AsyncSession = Depends(get_db)):
    """Kurs ve şube özeti. Öğrenci adı yok: yönetici sınıfın durumunu görür, öğrenci
    ayrıntısı öğretmenin Öğrenme Analizi sayfasındadır."""
    org, _me = ctx
    ids = await plans.org_teacher_ids(db, org.id)
    teachers = {t.id: _name(t) for t in (await db.execute(select(Teacher).where(Teacher.id.in_(ids or [-1])))).scalars().all()}
    courses = (await db.execute(select(Course).where(Course.teacher_id.in_(ids or [-1])).order_by(Course.title))).scalars().all()
    cids = [c.id for c in courses]
    week, month = datetime.utcnow() - timedelta(days=7), datetime.utcnow() - timedelta(days=30)
    enrolled = defaultdict(set)
    for cid, sid in (await db.execute(select(Enrollment.course_id, Enrollment.student_id)
                                      .where(Enrollment.course_id.in_(cids or [-1])))).all():
        enrolled[cid].add(sid)
    active = defaultdict(set)
    for cid, sid in (await db.execute(select(LearningEvent.course_id, LearningEvent.student_id)
                                      .where(LearningEvent.course_id.in_(cids or [-1]), LearningEvent.created_at >= week)
                                      .distinct())).all():
        active[cid].add(sid)
    completed = dict((await db.execute(
        select(ModuleProgress.course_id, func.count(ModuleProgress.id))
        .where(ModuleProgress.course_id.in_(cids or [-1]), ModuleProgress.completed_at >= month)
        .group_by(ModuleProgress.course_id))).all())
    struggling: Dict[int, set] = defaultdict(set)
    misconceptions: Dict[int, Counter] = defaultdict(Counter)
    for m in (await db.execute(select(ConceptMastery).where(ConceptMastery.course_id.in_(cids or [-1])))).scalars().all():
        if mastery_status(m.score, m.evidence_weight) == "zorlaniyor":
            struggling[m.course_id].add(m.student_id)
        if m.last_misconception:
            misconceptions[m.course_id][m.last_misconception] += 1

    out = []
    for c in courses:
        class_rows = [{"name": cl.get("name") or "Şube", "students": len(cl.get("student_ids") or [])}
                      for cl in c.classes or [] if isinstance(cl, dict)]
        n = len(enrolled[c.id])
        out.append({
            "course_id": c.id, "title": c.title, "teacher": teachers.get(c.teacher_id), "teacher_id": c.teacher_id,
            "classes": class_rows, "students": n, "active_students_7d": len(active[c.id]),
            "active_rate": round(len(active[c.id]) / n, 3) if n else None,
            "modules_completed_30d": int(completed.get(c.id, 0)),
            "struggling_students": len(struggling[c.id]),
            "top_misconceptions": [{"label": k, "students": v} for k, v in misconceptions[c.id].most_common(3)],
        })
    return {"courses": out}


class InviteIn(BaseModel):
    email: str = Field(max_length=255)
    role: str = "teacher"


@router.get("/invites")
async def list_invites(ctx=Depends(_org_admin), db: AsyncSession = Depends(get_db)):
    org, _me = ctx
    rows = (await db.execute(select(OrganizationInvite).where(
        OrganizationInvite.organization_id == org.id, OrganizationInvite.accepted_at.is_(None))
        .order_by(OrganizationInvite.created_at.desc()))).scalars().all()
    return {"invites": [_invite_out(i) for i in rows]}


@router.post("/invites")
async def invite(body: InviteIn, background: BackgroundTasks, ctx=Depends(_org_admin), db: AsyncSession = Depends(get_db)):
    org, me = ctx
    row = await create_invite(db, org, body.email, body.role, me.teacher_id, background)
    return {"invite": _invite_out(row), "email_sent": mailer.provider() != "log"}


@router.delete("/invites/{invite_id}")
async def cancel_invite(invite_id: int, ctx=Depends(_org_admin), db: AsyncSession = Depends(get_db)):
    org, _me = ctx
    row = await db.get(OrganizationInvite, invite_id)
    if not row or row.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Davet bulunamadı.")
    await db.delete(row)
    await db.commit()
    return {"deleted": True}


class MemberIn(BaseModel):
    role: Optional[str] = None
    ai_cap_credits: Optional[int] = Field(default=None, ge=0, le=1_000_000)
    clear_cap: bool = False


async def _member(db: AsyncSession, org: Organization, teacher_id: int) -> OrganizationMember:
    member = await plans.membership(db, teacher_id)
    if not member or member.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Bu öğretmen kurumunda değil.")
    return member


@router.put("/members/{teacher_id}")
async def update_member(teacher_id: int, body: MemberIn, ctx=Depends(_org_admin), db: AsyncSession = Depends(get_db)):
    org, _me = ctx
    member = await _member(db, org, teacher_id)
    if body.role is not None:
        if body.role not in ROLES:
            raise HTTPException(status_code=400, detail="Geçersiz rol.")
        if member.role == "admin" and body.role != "admin" and await _admin_count(db, org.id) <= 1:
            raise HTTPException(status_code=409, detail="Kurumda en az bir yönetici kalmalı.")
        member.role = body.role
    if body.clear_cap:
        member.ai_cap_credits = None
    elif body.ai_cap_credits is not None:
        member.ai_cap_credits = body.ai_cap_credits
    await db.commit()
    return {"teacher_id": teacher_id, "role": member.role, "ai_cap_credits": member.ai_cap_credits}


@router.delete("/members/{teacher_id}")
async def remove_member(teacher_id: int, copy_to: Optional[int] = None, ctx=Depends(_org_admin),
                        db: AsyncSession = Depends(get_db)):
    """Öğretmeni kurumdan çıkarır. Kursları öğretmende kalır; copy_to verilirse kursların
    içerik kopyası (öğrencisiz) o kurum öğretmenine açılır."""
    org, me = ctx
    if teacher_id == me.teacher_id:
        raise HTTPException(status_code=400, detail="Kendini çıkaramazsın; kurumdan ayrılmak için 'Kurumdan ayrıl'ı kullan.")
    member = await _member(db, org, teacher_id)
    if member.role == "admin" and await _admin_count(db, org.id) <= 1:
        raise HTTPException(status_code=409, detail="Kurumda en az bir yönetici kalmalı.")
    copied = 0
    if copy_to is not None:
        await _member(db, org, copy_to)
        if copy_to == teacher_id:
            raise HTTPException(status_code=400, detail="Kopyalar başka bir öğretmene verilmeli.")
        from routers.courses import clone_course
        teacher = await db.get(Teacher, teacher_id)
        for src in (await db.execute(select(Course).where(Course.teacher_id == teacher_id))).scalars().all():
            await clone_course(db, src, copy_to, f"{src.title} ({_name(teacher)} kursundan)"[:200])
            copied += 1
    await db.delete(member)
    await db.commit()
    return {"removed": True, "courses_copied": copied}
