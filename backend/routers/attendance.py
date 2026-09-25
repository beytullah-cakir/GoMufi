"""
Yoklama: öğretmen ders günü için her öğrenciyi var / yok / geç / izinli işaretler.

  GET /attendance/courses/{id}?date=YYYY-MM-DD&class_id=   öğretmen: o günün listesi
  PUT /attendance/courses/{id}  {date, records: [{student_id, status, note}]}
  GET /attendance/courses/{id}/summary?class_id=&since=&until=   öğretmen: devam özeti
  GET /attendance/me                                       öğrenci: kendi kayıtları
  GET /attendance/children/{student_id}                    veli: çocuğunun kayıtları

Canlı ders görüşmesi GoMufi'nin dışında (Zoom, Meet, sınıf) olduğu için yoklama
otomatik alınamıyor; öğretmen işaretler. Durumu boş gönderilen öğrencinin o günkü
kaydı silinir (yanlışlıkla işaretlemeyi geri almak için).
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_teacher_id, get_current_user_info
from connect_db import get_db
from models.course import Course
from models.enrollment import Enrollment
from models.school import ATTENDANCE_STATUSES, AttendanceRecord
from models.student import Student

router = APIRouter(prefix="/attendance", tags=["attendance"])

ISTANBUL = ZoneInfo("Europe/Istanbul")
STATUS_LABELS = {"present": "Var", "absent": "Yok", "late": "Geç", "excused": "İzinli"}
MAX_NOTE = 200


class AttendanceItem(BaseModel):
    student_id: int
    status: Optional[str] = None
    note: Optional[str] = Field(None, max_length=MAX_NOTE)


class AttendanceSave(BaseModel):
    date: date
    class_id: Optional[str] = None
    records: List[AttendanceItem]


def today_tr() -> date:
    return datetime.now(ISTANBUL).date()


def _name(s: Student) -> str:
    return f"{s.first_name or ''} {s.last_name or ''}".strip() or s.nickname or s.email or f"Öğrenci {s.id}"


def class_of(course: Course) -> Dict[int, Dict[str, str]]:
    """öğrenci id → {id, name} (öğrenci en fazla bir şubede olur)."""
    out: Dict[int, Dict[str, str]] = {}
    for cls in course.classes or []:
        for sid in cls.get("student_ids") or []:
            try:
                out[int(sid)] = {"id": str(cls.get("id")), "name": cls.get("name") or "Şube"}
            except (TypeError, ValueError):
                continue
    return out


async def own_course(db: AsyncSession, course_id: int, teacher_id: int) -> Course:
    course = (await db.execute(
        select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return course


async def roster(db: AsyncSession, course: Course, class_id: Optional[str]) -> List[Dict[str, Any]]:
    classes = class_of(course)
    students = (await db.execute(
        select(Student).join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.course_id == course.id)
    )).scalars().all()
    rows = []
    for s in students:
        cls = classes.get(s.id)
        if class_id and (not cls or cls["id"] != class_id):
            continue
        rows.append({"id": s.id, "name": _name(s),
                     "class_id": cls["id"] if cls else None, "class_name": cls["name"] if cls else None})
    rows.sort(key=lambda r: (r["class_name"] or "", r["name"].lower()))
    return rows


def rate(counts: Dict[str, int]) -> Optional[float]:
    """Devam oranı: (var + geç) / (izinli hariç alınan yoklama). İzinli devamsızlıktan sayılmaz."""
    counted = counts["present"] + counts["late"] + counts["absent"]
    return round(100 * (counts["present"] + counts["late"]) / counted, 1) if counted else None


def summarize(records: List[AttendanceRecord]) -> Dict[str, Any]:
    counts = {s: 0 for s in ATTENDANCE_STATUSES}
    for r in records:
        counts[r.status] = counts.get(r.status, 0) + 1
    return {**counts, "total": len(records), "rate": rate(counts)}


def record_out(r: AttendanceRecord) -> Dict[str, Any]:
    return {"date": r.lesson_date.isoformat(), "status": r.status, "label": STATUS_LABELS.get(r.status, r.status),
            "note": r.note}


@router.get("/courses/{course_id}")
async def day_sheet(
    course_id: int,
    date: Optional[date] = None,
    class_id: Optional[str] = None,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    course = await own_course(db, course_id, teacher_id)
    day = date or today_tr()
    students = await roster(db, course, class_id)
    existing = {r.student_id: r for r in (await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.course_id == course_id, AttendanceRecord.lesson_date == day)
    )).scalars().all()}
    for s in students:
        rec = existing.get(s["id"])
        s["status"] = rec.status if rec else None
        s["note"] = rec.note if rec else None
    return {
        "date": day.isoformat(),
        "class_id": class_id,
        "classes": [{"id": str(c.get("id")), "name": c.get("name") or "Şube"} for c in course.classes or []],
        "taken": any(s["status"] for s in students),
        "students": students,
    }


@router.put("/courses/{course_id}")
async def save_day(
    course_id: int,
    body: AttendanceSave,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    course = await own_course(db, course_id, teacher_id)
    if body.date > today_tr():
        raise HTTPException(status_code=400, detail="İleri bir tarih için yoklama alınamaz.")
    enrolled = {s["id"]: s for s in await roster(db, course, None)}
    saved = cleared = 0
    for item in body.records:
        student = enrolled.get(item.student_id)
        if not student:
            raise HTTPException(status_code=400, detail="Listede bu kursa kayıtlı olmayan bir öğrenci var.")
        if not item.status:
            result = await db.execute(delete(AttendanceRecord).where(
                AttendanceRecord.course_id == course_id, AttendanceRecord.lesson_date == body.date,
                AttendanceRecord.student_id == item.student_id))
            cleared += result.rowcount or 0
            continue
        if item.status not in ATTENDANCE_STATUSES:
            raise HTTPException(status_code=400, detail=f"Geçersiz yoklama durumu: {item.status}")
        note = (item.note or "").strip() or None
        values = {"course_id": course_id, "student_id": item.student_id, "teacher_id": teacher_id,
                  "class_id": student["class_id"], "lesson_date": body.date, "status": item.status, "note": note}
        await db.execute(
            insert(AttendanceRecord).values(**values).on_conflict_do_update(
                constraint="uq_attendance_day",
                set_={"status": item.status, "note": note, "teacher_id": teacher_id,
                      "class_id": student["class_id"], "updated_at": datetime.utcnow()},
            )
        )
        saved += 1
    await db.commit()
    return {"saved": saved, "cleared": cleared, "date": body.date.isoformat()}


@router.get("/courses/{course_id}/summary")
async def course_summary(
    course_id: int,
    class_id: Optional[str] = None,
    since: Optional[date] = None,
    until: Optional[date] = None,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    course = await own_course(db, course_id, teacher_id)
    students = await roster(db, course, class_id)
    q = select(AttendanceRecord).where(AttendanceRecord.course_id == course_id)
    if since:
        q = q.where(AttendanceRecord.lesson_date >= since)
    if until:
        q = q.where(AttendanceRecord.lesson_date <= until)
    by_student: Dict[int, List[AttendanceRecord]] = {}
    for r in (await db.execute(q)).scalars().all():
        by_student.setdefault(r.student_id, []).append(r)

    ids = {s["id"] for s in students}
    days = sorted({r.lesson_date for sid, rs in by_student.items() if sid in ids for r in rs})
    out = []
    for s in students:
        recs = by_student.get(s["id"], [])
        out.append({**s, **summarize(recs),
                    "by_date": {r.lesson_date.isoformat(): r.status for r in recs}})
    return {"days": [d.isoformat() for d in days], "students": out}


async def _student_view(db: AsyncSession, student_id: int) -> Dict[str, Any]:
    courses = (await db.execute(
        select(Course).join(Enrollment, Enrollment.course_id == Course.id).where(Enrollment.student_id == student_id)
    )).scalars().all()
    records = (await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.student_id == student_id)
        .order_by(AttendanceRecord.lesson_date.desc())
    )).scalars().all()
    by_course: Dict[int, List[AttendanceRecord]] = {}
    for r in records:
        by_course.setdefault(r.course_id, []).append(r)
    return {"courses": [
        {"course_id": c.id, "title": c.title, **summarize(by_course.get(c.id, [])),
         "recent": [record_out(r) for r in by_course.get(c.id, []) if r.status != "present"][:10]}
        for c in courses
    ]}


@router.get("/me")
async def my_attendance(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    if user_info.get("role") != "student":
        raise HTTPException(status_code=403, detail="Bu sayfa öğrencilere özeldir.")
    return await _student_view(db, int(user_info["sub"]))


@router.get("/children/{student_id}")
async def child_attendance(
    student_id: int,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    if user_info.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Bu sayfa velilere özeldir.")
    child = (await db.execute(
        select(Student.id).where(Student.id == student_id, Student.parent_id == int(user_info["sub"]))
    )).first()
    if not child:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı.")
    return await _student_view(db, student_id)
