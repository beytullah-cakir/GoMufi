"""
Hesap verisi: dışa aktarma ve silme (KVKK md. 11 — bilgi edinme ve silinmesini isteme).

Tablolar kişiye bağlı sütuna (student_id / teacher_id / parent_id) göre GENEL olarak
taranır: yeni bir tablo eklendiğinde dışa aktarma kendiliğinden onu da kapsar.
Silmede çoğu tablo veritabanında ON DELETE CASCADE ile temizlenir; cascade olmayan
bağlar burada açıkça ele alınır. Yönetici paneli de aynı silme işlevini kullanır.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from connect_db import Base
from models.course import Course
from models.enrollment import Enrollment
from models.live_session import LiveSession
from models.messaging import Conversation, Message
from models.parent import Parent
from models.platform import AccountSuspension, LoginAttempt, StoredFile
from models.quiz import Quiz
from models.school import PasswordResetToken
from models.student import Student
from models.teacher import Teacher

# Dışa aktarmada yer almayan sütunlar: kimlik bilgisi ve ham dosya içeriği
SECRET_COLUMNS = {"password", "hashed_password", "token_hash", "file_data", "data"}
OWNER_COLUMN = {"student": "student_id", "teacher": "teacher_id", "parent": "parent_id"}
MODELS = {"student": Student, "teacher": Teacher, "parent": Parent}


def _plain(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return None
    return value


def _row(columns, row) -> Dict[str, Any]:
    return {c.name: _plain(row._mapping[c]) for c in columns if c.name not in SECRET_COLUMNS}


async def export(db: AsyncSession, role: str, user_id: int) -> Dict[str, Any]:
    model = MODELS[role]
    account = await db.get(model, user_id)
    if not account:
        return {}
    table = model.__table__
    profile = _row(table.columns, (await db.execute(select(table).where(table.c.id == user_id))).one())
    owner = OWNER_COLUMN[role]
    records: Dict[str, List[Dict[str, Any]]] = {}
    for t in Base.metadata.sorted_tables:
        if t is table or owner not in t.c:
            continue
        cols = [c for c in t.columns if c.name not in SECRET_COLUMNS]
        rows = (await db.execute(select(*cols).where(t.c[owner] == user_id))).all()
        if rows:
            records[t.name] = [{c.name: _plain(r._mapping[c.name]) for c in cols} for r in rows]

    # Konuşmalar: öğrenci/veli "üye" olarak tutulur (member_role + member_id)
    party = (Conversation.teacher_id == user_id) if role == "teacher" else \
        ((Conversation.member_role == role) & (Conversation.member_id == user_id))
    conversations = (await db.execute(select(Conversation).where(party))).scalars().all()
    conv_ids = [c.id for c in conversations]
    messages = (await db.execute(
        select(Message).where(Message.conversation_id.in_(conv_ids or [-1])).order_by(Message.created_at)
    )).scalars().all()
    records["conversations"] = [{
        "id": c.id, "topic": c.topic, "course_id": c.course_id, "created_at": _plain(c.created_at),
        "messages": [{"from": m.sender_role, "body": m.body, "file_name": m.file_name, "at": _plain(m.created_at)}
                     for m in messages if m.conversation_id == c.id],
    } for c in conversations]
    files = (await db.execute(
        select(StoredFile.id, StoredFile.filename, StoredFile.size, StoredFile.created_at)
        .where(StoredFile.owner_role == role, StoredFile.owner_id == user_id)
    )).all()
    records["uploaded_files"] = [{"id": f.id, "filename": f.filename, "size": f.size, "at": _plain(f.created_at)}
                                 for f in files]
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "role": role,
        "profile": profile,
        "records": records,
        "note": "Parolan ve yüklediğin dosyaların içeriği bu dosyada yer almaz; dosyaları uygulamadan indirebilirsin.",
    }


async def _delete_course(db: AsyncSession, course_id: int) -> None:
    # Bu üç tabloda ON DELETE CASCADE yok; diğer kurs verisi veritabanında silinir.
    await db.execute(delete(Quiz).where(Quiz.course_id == course_id))
    await db.execute(delete(LiveSession).where(LiveSession.course_id == course_id))
    await db.execute(delete(Enrollment).where(Enrollment.course_id == course_id))
    await db.execute(delete(Course).where(Course.id == course_id))


async def owned_courses(db: AsyncSession, teacher_id: int) -> List[Dict[str, Any]]:
    rows = (await db.execute(select(Course.id, Course.title).where(Course.teacher_id == teacher_id))).all()
    return [{"id": r.id, "title": r.title} for r in rows]


async def delete_account(db: AsyncSession, role: str, user_id: int, delete_courses: bool = True) -> Dict[str, Any]:
    """Hesabı ve ona bağlı kişisel veriyi siler. Öğretmenin kursları da silinir
    (delete_courses=False ise kursu olan öğretmen silinmez, ValueError)."""
    model = MODELS[role]
    account = await db.get(model, user_id)
    if not account:
        raise LookupError("Hesap bulunamadı.")
    email = (account.email or "").lower()
    removed_courses = 0

    if role == "student":
        await db.execute(delete(Enrollment).where(Enrollment.student_id == user_id))
        # Şube listelerinden çıkar (course.classes JSON)
        for course in (await db.execute(select(Course).where(Course.classes.isnot(None)))).scalars().all():
            changed = False
            classes = []
            for cls in course.classes or []:
                if isinstance(cls, dict) and any(str(s) == str(user_id) for s in cls.get("student_ids") or []):
                    cls = {**cls, "student_ids": [s for s in cls["student_ids"] if str(s) != str(user_id)]}
                    changed = True
                classes.append(cls)
            if changed:
                course.classes = classes
                flag_modified(course, "classes")
    elif role == "teacher":
        courses = await owned_courses(db, user_id)
        if courses and not delete_courses:
            raise ValueError("Bu öğretmene ait kurslar var.")
        for c in courses:
            await _delete_course(db, c["id"])
        removed_courses = len(courses)
        from models.concept import Concept, UnmatchedConcept
        await db.execute(update(Concept).where(Concept.created_by == user_id).values(created_by=None))
        await db.execute(delete(UnmatchedConcept).where(UnmatchedConcept.teacher_id == user_id))
    elif role == "parent":
        await db.execute(update(Student).where(Student.parent_id == user_id).values(parent_id=None))

    if role in ("student", "parent"):
        await db.execute(delete(Conversation).where(
            Conversation.member_role == role, Conversation.member_id == user_id))
    await db.execute(delete(StoredFile).where(StoredFile.owner_role == role, StoredFile.owner_id == user_id))
    await db.execute(delete(PasswordResetToken).where(
        PasswordResetToken.role == role, PasswordResetToken.user_id == user_id))
    await db.execute(delete(AccountSuspension).where(
        AccountSuspension.role == role, AccountSuspension.user_id == user_id))
    if email:
        await db.execute(delete(LoginAttempt).where(or_(LoginAttempt.email == email)))
    await db.execute(delete(model).where(model.id == user_id))
    await db.commit()
    return {"deleted": True, "courses_deleted": removed_courses}
