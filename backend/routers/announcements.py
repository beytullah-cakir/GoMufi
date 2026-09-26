"""
Duyurular: öğretmen kursun tamamına ya da tek bir şubeye duyuru yayınlar.

  POST   /announcements/courses/{id}  {title, body, class_id?, send_email}
  GET    /announcements/courses/{id}          öğretmen: kursun duyuruları
  DELETE /announcements/{id}                  öğretmen: kendi duyurusu
  GET    /announcements/me                    öğrenci: kendi kurs/şubesi · veli: çocuklarınınki

Duyuru öğrenci panelinde görünür, çevrimiçi olanlara anında bildirim gider.
`send_email` seçilirse öğrencilere ve bağlı velilere e-posta da gönderilir.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_teacher_id, get_current_user_info
from connect_db import get_db
from core import mailer
from core.config import settings
from models.course import Course
from models.enrollment import Enrollment
from models.parent import Parent
from models.school import Announcement
from models.student import Student
from models.teacher import Teacher
from routers.attendance import class_of, own_course

router = APIRouter(prefix="/announcements", tags=["announcements"])

# E-postalı duyuru sınırı: öğretmen başına günde; yanlışlıkla toplu e-posta yağmuru olmasın.
MAX_EMAILED_PER_DAY = 10
LIST_LIMIT = 30


class AnnouncementIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    body: str = Field(..., min_length=1, max_length=4000)
    class_id: Optional[str] = None
    send_email: bool = False


def _out(a: Announcement, course: Optional[Course] = None, teacher: Optional[str] = None) -> Dict[str, Any]:
    class_name = None
    if course and a.class_id:
        class_name = next((c.get("name") for c in course.classes or [] if str(c.get("id")) == a.class_id), None)
    return {
        "id": a.id, "course_id": a.course_id, "course_title": course.title if course else None,
        "class_id": a.class_id, "class_name": class_name, "teacher": teacher,
        "title": a.title, "body": a.body, "email_sent": a.email_sent, "email_count": a.email_count,
        "created_at": f"{a.created_at.isoformat()}Z" if a.created_at else None,
    }


async def _audience(db: AsyncSession, course: Course, class_id: Optional[str]) -> List[Student]:
    classes = class_of(course)
    students = (await db.execute(
        select(Student).join(Enrollment, Enrollment.student_id == Student.id).where(Enrollment.course_id == course.id)
    )).scalars().all()
    if class_id:
        students = [s for s in students if classes.get(s.id, {}).get("id") == class_id]
    return students


@router.post("/courses/{course_id}")
async def create_announcement(
    course_id: int,
    body: AnnouncementIn,
    background: BackgroundTasks,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    course = await own_course(db, course_id, teacher_id)
    class_id = (body.class_id or "").strip() or None
    if class_id and not any(str(c.get("id")) == class_id for c in course.classes or []):
        raise HTTPException(status_code=400, detail="Şube bulunamadı.")

    if body.send_email:
        emailed_today = (await db.execute(
            select(func.count(Announcement.id)).where(
                Announcement.teacher_id == teacher_id, Announcement.email_sent.is_(True),
                Announcement.created_at >= datetime.utcnow() - timedelta(days=1),
            )
        )).scalar() or 0
        if emailed_today >= MAX_EMAILED_PER_DAY:
            raise HTTPException(status_code=429, detail=f"Günde en fazla {MAX_EMAILED_PER_DAY} duyuru e-postayla gönderilebilir.")

    students = await _audience(db, course, class_id)
    recipients: List[str] = []
    if body.send_email:
        parent_ids = [s.parent_id for s in students if s.parent_id]
        parents = (await db.execute(select(Parent.email).where(Parent.id.in_(parent_ids or [-1])))).scalars().all()
        recipients = list(dict.fromkeys(e.strip().lower() for e in [s.email for s in students] + list(parents) if e))

    row = Announcement(course_id=course_id, teacher_id=teacher_id, class_id=class_id,
                       title=body.title.strip(), body=body.body.strip(),
                       email_sent=bool(recipients), email_count=len(recipients))
    db.add(row)
    await db.commit()
    await db.refresh(row)

    try:
        from core.ws_manager import manager
        for s in students:
            await manager.publish({"type": "announcement", "announcementId": row.id, "courseId": course_id,
                                   "title": row.title, "target_user": f"student:{s.id}"})
    except Exception:  # noqa: BLE001
        pass

    if recipients:
        teacher = (await db.execute(select(Teacher).where(Teacher.id == teacher_id))).scalar_one_or_none()
        who = f"{teacher.first_name or ''} {teacher.last_name or ''}".strip() if teacher else "Öğretmen"
        text, html_body = mailer.render(
            row.title,
            [f"{course.title} · {who}", row.body],
            ("GoMufi'de aç", f"{settings.FRONTEND_URL.rstrip('/')}/auth"),
        )
        background.add_task(mailer.send_many, recipients, f"Duyuru: {row.title}", text, html_body)
    return {"announcement": _out(row, course), "recipients": len(students)}


@router.get("/courses/{course_id}")
async def course_announcements(
    course_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    course = await own_course(db, course_id, teacher_id)
    rows = (await db.execute(
        select(Announcement).where(Announcement.course_id == course_id)
        .order_by(Announcement.created_at.desc()).limit(LIST_LIMIT)
    )).scalars().all()
    return {"announcements": [_out(a, course) for a in rows]}


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(Announcement).where(Announcement.id == announcement_id, Announcement.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


@router.get("/me")
async def my_announcements(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    role = user_info.get("role")
    if role in ("student", "admin"):  # yönetici: öğrenci paneli önizlemesi
        student_ids = [int(user_info["sub"])]
    elif role == "parent":
        student_ids = list((await db.execute(
            select(Student.id).where(Student.parent_id == int(user_info["sub"]))
        )).scalars().all())
    else:
        raise HTTPException(status_code=403, detail="Duyurular öğrenci ve veli hesaplarında görünür.")

    courses = (await db.execute(
        select(Course, Enrollment.student_id).join(Enrollment, Enrollment.course_id == Course.id)
        .where(Enrollment.student_id.in_(student_ids or [-1]))
    )).all()
    # Her kurs için izleyicinin (ya da çocuklarının) görebileceği şubeler; None = kurs geneli
    visible: Dict[int, set] = {}
    by_id: Dict[int, Course] = {}
    for course, sid in courses:
        by_id[course.id] = course
        cls = class_of(course).get(sid)
        visible.setdefault(course.id, {None}).add(cls["id"] if cls else None)
    if not by_id:
        return {"announcements": []}

    rows = (await db.execute(
        select(Announcement).where(Announcement.course_id.in_(list(by_id)))
        .order_by(Announcement.created_at.desc()).limit(LIST_LIMIT * 3)
    )).scalars().all()
    rows = [a for a in rows if a.class_id in visible.get(a.course_id, set())][:LIST_LIMIT]
    teachers = {tid: f"{f or ''} {l or ''}".strip() for tid, f, l in (await db.execute(
        select(Teacher.id, Teacher.first_name, Teacher.last_name).where(Teacher.id.in_({a.teacher_id for a in rows} or {-1}))
    )).all()}
    return {"announcements": [_out(a, by_id.get(a.course_id), teachers.get(a.teacher_id)) for a in rows]}
