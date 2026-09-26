"""
Otomatik e-postalar — uygulama açıkken çalışır (bkz. main_fastapi.lifespan).

  Canlı ders:      dersin başlamasına 10 dakika kala şubedeki öğrencilere bir kez
                   e-posta (dakikada bir bakılır; zil bildirimi istemcide, bkz.
                   /student/upcoming-live).

  Ödev hatırlatma: son teslim tarihine 24 saatten az kalan ve henüz teslim
                   etmemiş öğrenciye bir kez e-posta.
  Teslim özeti:    öğretmene, kursuna son özetten beri gelen yeni ödev teslimleri —
                   her teslimde ayrı e-posta yerine en fazla günde bir tane.

Her gönderim notification_log'a yazılır; aynı hatırlatma iki kez gitmez, sunucu
yeniden başlasa da özet sıklığı korunur.
"""
import asyncio
import logging
from collections import Counter
from datetime import datetime, timedelta
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

import learning_store
from core import mailer
from core.config import settings
from models.course import Course
from models.enrollment import Enrollment
from models.homework_submission import HomeworkSubmission
from models.school import NotificationLog
from models.student import Student
from models.teacher import Teacher

logger = logging.getLogger(__name__)

REMIND_BEFORE = timedelta(hours=24)
LIVE_REMIND_BEFORE = timedelta(minutes=10)
LIVE_INTERVAL_SECONDS = 60
DIGEST_EVERY = timedelta(hours=24)
INTERVAL_SECONDS = 3600


async def _claim(db: AsyncSession, kind: str, key: str) -> bool:
    """Bildirimi ilk kez gönderecek olan True alır (aynı anda iki sunucu olsa bile)."""
    result = await db.execute(
        insert(NotificationLog).values(kind=kind, key=key, sent_at=datetime.utcnow())
        .on_conflict_do_nothing(constraint="uq_notification_once").returning(NotificationLog.id)
    )
    return result.first() is not None


def _fmt_due(due: datetime) -> str:
    from zoneinfo import ZoneInfo
    local = due.replace(tzinfo=ZoneInfo("UTC")).astimezone(ZoneInfo("Europe/Istanbul"))
    return local.strftime("%d.%m.%Y %H:%M")


async def homework_reminders(db: AsyncSession, now: datetime) -> int:
    sent = 0
    link = f"{settings.FRONTEND_URL.rstrip('/')}/auth"
    for course in (await db.execute(select(Course))).scalars().all():
        ctx = await learning_store.course_context(db, course.id)
        due_soon = [s for s in (ctx.slides.values() if ctx else [])
                    if s.get("type") == "homework" and s.get("due") and now < s["due"] <= now + REMIND_BEFORE]
        if not due_soon:
            continue
        students = (await db.execute(
            select(Student).join(Enrollment, Enrollment.student_id == Student.id).where(Enrollment.course_id == course.id)
        )).scalars().all()
        submitted = {(str(node), sid) for node, sid in (await db.execute(
            select(HomeworkSubmission.node_id, HomeworkSubmission.student_id).where(HomeworkSubmission.course_id == course.id)
        )).all()}
        for slide in due_soon:
            for student in students:
                if (slide["id"], student.id) in submitted or not student.email:
                    continue
                if not await _claim(db, "homework_due", f"{course.id}:{slide['id']}:{student.id}"):
                    continue
                await db.commit()
                name = (student.first_name or "").strip() or "Merhaba"
                text, html_body = mailer.render(
                    f"Ödev hatırlatması: {slide['title']}",
                    [f"{name}, {course.title} kursundaki “{slide['title']}” ödevinin son teslim zamanı "
                     f"{_fmt_due(slide['due'])}.",
                     "Henüz teslim etmedin; son dakikaya bırakma!"],
                    ("Ödeve git", link),
                )
                if await mailer.send_email(student.email, f"Ödev hatırlatması: {slide['title']}", text, html_body):
                    sent += 1
    return sent


async def submission_digests(db: AsyncSession, now: datetime) -> int:
    sent = 0
    link = f"{settings.FRONTEND_URL.rstrip('/')}/instructor/homework-submissions"
    rows = (await db.execute(
        select(HomeworkSubmission.course_id, HomeworkSubmission.node_id, HomeworkSubmission.submitted_at)
        .where(HomeworkSubmission.submitted_at >= now - DIGEST_EVERY - timedelta(days=6))
    )).all()
    by_course: Dict[int, List] = {}
    for course_id, node_id, submitted_at in rows:
        by_course.setdefault(course_id, []).append((str(node_id), submitted_at))
    if not by_course:
        return 0

    courses = (await db.execute(select(Course).where(Course.id.in_(list(by_course))))).scalars().all()
    teachers = {t.id: t for t in (await db.execute(
        select(Teacher).where(Teacher.id.in_({c.teacher_id for c in courses}))
    )).scalars().all()}
    for course in courses:
        teacher = teachers.get(course.teacher_id)
        if not teacher or not teacher.email:
            continue
        key = f"{teacher.id}:{course.id}"
        log = (await db.execute(
            select(NotificationLog).where(NotificationLog.kind == "submission_digest", NotificationLog.key == key)
        )).scalar_one_or_none()
        if log and now - log.sent_at < DIGEST_EVERY:
            continue
        since = log.sent_at if log else now - DIGEST_EVERY
        fresh = [node for node, at in by_course[course.id] if at and at > since]
        if not fresh:
            continue
        ctx = await learning_store.course_context(db, course.id)
        titles = Counter((ctx.slides.get(node) or {}).get("title") or "Ödev" if ctx else "Ödev" for node in fresh)
        if log:
            log.sent_at = now
        elif not await _claim(db, "submission_digest", key):
            continue
        await db.commit()
        name = (teacher.first_name or "").strip() or "Merhaba"
        lines = "\n".join(f"• {title}: {count} teslim" for title, count in titles.most_common())
        text, html_body = mailer.render(
            f"{course.title}: {len(fresh)} yeni ödev teslimi",
            [f"{name}, son özetten bu yana {course.title} kursuna {len(fresh)} yeni ödev teslimi geldi.", lines],
            ("Teslimleri incele", link),
        )
        if await mailer.send_email(teacher.email, f"{course.title}: {len(fresh)} yeni ödev teslimi", text, html_body):
            sent += 1
    return sent


async def live_reminders(db: AsyncSession, now: datetime) -> int:
    """Başlamasına en fazla 10 dakika kalan (henüz başlamamış) canlı dersler için e-posta."""
    from core import live_schedule

    sent = 0
    link = f"{settings.FRONTEND_URL.rstrip('/')}/student/my-courses"
    for course in (await db.execute(select(Course))).scalars().all():
        due = []
        for entry in live_schedule.class_schedules(course):
            for slot in entry["slots"]:
                start = live_schedule.next_start(slot, now)
                if start and now < start <= now + LIVE_REMIND_BEFORE:
                    due.append((entry, start))
        if not due:
            continue
        students = (await db.execute(
            select(Student).join(Enrollment, Enrollment.student_id == Student.id).where(Enrollment.course_id == course.id)
        )).scalars().all()
        for entry, start in due:
            for student in students:
                if entry["student_ids"] is not None and student.id not in entry["student_ids"] and len(course.classes or []) > 1:
                    continue
                if not student.email:
                    continue
                if not await _claim(db, "live_soon", f"{course.id}:{entry['class_id']}:{start.isoformat()}:{student.id}"):
                    continue
                await db.commit()
                name = (student.first_name or "").strip() or "Merhaba"
                minutes = max(1, int((start - now).total_seconds() // 60))
                subject = f"{course.title}: canlı ders {minutes} dakika sonra"
                text, html_body = mailer.render(
                    subject,
                    [f"{name}, {course.title} canlı dersin {_fmt_due(start)} saatinde başlıyor.",
                     "Bilgisayarını hazırla, VS Code'u aç ve derse zamanında katıl!"],
                    ("Derse git", link),
                )
                if await mailer.send_email(student.email, subject, text, html_body):
                    sent += 1
    return sent


async def run_once(db: AsyncSession, now: datetime | None = None) -> Dict[str, int]:
    now = now or datetime.utcnow()
    return {"homework_due": await homework_reminders(db, now), "submission_digest": await submission_digests(db, now)}


async def loop() -> None:
    from connect_db import SessionLocal

    await asyncio.sleep(60)
    last_hourly = None
    loop_ = asyncio.get_running_loop()
    while True:
        try:
            async with SessionLocal() as db:
                result = {"live_soon": await live_reminders(db, datetime.utcnow())}
                if last_hourly is None or loop_.time() - last_hourly >= INTERVAL_SECONDS:
                    result.update(await run_once(db))
                    last_hourly = loop_.time()
            if any(result.values()):
                logger.info("Otomatik e-postalar gönderildi: %s", result)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Otomatik e-posta turu başarısız: %s", exc)
        await asyncio.sleep(LIVE_INTERVAL_SECONDS)
