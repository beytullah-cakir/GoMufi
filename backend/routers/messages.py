"""
Mesajlaşma uçları: öğretmen ↔ öğrenci ve öğretmen ↔ veli.

  GET  /messages/contacts                      — yazılabilecek kişiler (role göre)
  GET  /messages/conversations                 — yazışmalarım (?archived=true)
  POST /messages/conversations                 — yeni yazışma + ilk mesaj
  GET  /messages/conversations/{id}            — mesajlar (okundu işaretlenir)
  POST /messages/conversations/{id}/messages   — mesaj gönder
  POST /messages/conversations/{id}/archive    — arşivle / arşivden çıkar
  GET  /messages/unread                        — okunmamış sayısı

Kurallar:
  * Mesaj önce veritabanına yazılır; karşı taraf çevrimdışıysa sonra görür.
  * Bildirim yalnızca karşı tarafa gider (target_user) — herkese yayın yok.
  * Kim kime yazabilir sunucuda doğrulanır: öğrenci yalnızca kayıtlı olduğu
    kursun öğretmenine, veli yalnızca çocuğunun öğretmenine, öğretmen yalnızca
    kendi kursundaki öğrenciye ve onun velisine.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user_info
from connect_db import get_db
from core.config import settings
from models.course import Course
from models.enrollment import Enrollment
from models.messaging import Conversation, Message
from models.parent import Parent
from models.student import Student
from models.teacher import Teacher

router = APIRouter(prefix="/messages", tags=["messages"])

MAX_BODY = 4000
MAX_TOPIC = 200
PAGE_SIZE = 200
# Yalnızca kendi yükleme ucumuzun (/builder/upload-chat-file) döndürdüğü adresler.
_UPLOAD_URL = re.compile(r"^https?://[^\s\"'<>]+/static/uploads/[A-Za-z0-9._-]+$")


# --- kimlik ---------------------------------------------------------------------

async def _actor(db: AsyncSession, user_info: dict) -> Tuple[str, int]:
    """(rol, kimlik): teacher | student | parent. Yönetici, öğretmen kaydıyla yazar."""
    role = user_info.get("role")
    if role in ("teacher", "instructor"):
        return "teacher", int(user_info["sub"])
    if role in ("student", "parent"):
        return role, int(user_info["sub"])
    if role == "admin":
        teacher = (await db.execute(
            select(Teacher).where(func.lower(Teacher.email) == settings.ADMIN_EMAIL.lower())
        )).scalar_one_or_none()
        if teacher:
            return "teacher", teacher.id
    raise HTTPException(status_code=403, detail="Bu hesapla mesajlaşılamaz.")


def ws_keys(role: str, user_id: int) -> List[str]:
    """Bir kullanıcının WebSocket kanal anahtarları (bkz. routers/ws.py)."""
    if role == "teacher":
        return [f"teacher:{user_id}", f"instructor:{user_id}"]
    return [f"{role}:{user_id}"]


async def _publish(role: str, user_id: int, payload: Dict[str, Any]) -> None:
    try:
        from core.ws_manager import manager
        for key in ws_keys(role, user_id):
            await manager.publish({**payload, "target_user": key})
    except Exception:  # noqa: BLE001 — bildirim gitmezse mesaj yine veritabanında
        pass


def _is_online(role: str, user_id: int) -> bool:
    try:
        from core.ws_manager import manager
        return any(key in manager.active_connections for key in ws_keys(role, user_id))
    except Exception:  # noqa: BLE001
        return False


def _name(first: Optional[str], last: Optional[str], fallback: str) -> str:
    return f"{first or ''} {last or ''}".strip() or fallback


# --- yetki ----------------------------------------------------------------------

async def _enrolled(db: AsyncSession, student_id: int, course_id: int) -> bool:
    return (await db.execute(
        select(Enrollment.id).where(Enrollment.student_id == student_id, Enrollment.course_id == course_id)
    )).first() is not None


async def _course(db: AsyncSession, course_id: Optional[int]) -> Course:
    if not course_id:
        raise HTTPException(status_code=400, detail="Kurs seçilmeli.")
    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    return course


async def _conversation_for(db: AsyncSession, conv_id: int, actor: Tuple[str, int]) -> Conversation:
    conv = (await db.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one_or_none()
    role, uid = actor
    allowed = conv is not None and (
        (role == "teacher" and conv.teacher_id == uid)
        or (role == conv.member_role and conv.member_id == uid)
    )
    if not allowed:
        # Var olmayanla yetkisizi ayırt ettirme: başkasının yazışma kimliği sızmasın.
        raise HTTPException(status_code=404, detail="Yazışma bulunamadı.")
    return conv


# --- özet -----------------------------------------------------------------------

async def _summaries(db: AsyncSession, convs: List[Conversation], actor: Tuple[str, int]) -> List[Dict[str, Any]]:
    role, _ = actor
    teacher_ids = {c.teacher_id for c in convs}
    student_ids = {c.member_id for c in convs if c.member_role == "student"} | {c.student_id for c in convs if c.student_id}
    parent_ids = {c.member_id for c in convs if c.member_role == "parent"}
    course_ids = {c.course_id for c in convs if c.course_id}

    teachers = {tid: _name(f, l, "Öğretmen") for tid, f, l in (await db.execute(
        select(Teacher.id, Teacher.first_name, Teacher.last_name).where(Teacher.id.in_(list(teacher_ids) or [-1]))
    )).all()}
    students = {sid: _name(f, l, f"Öğrenci #{sid}") for sid, f, l in (await db.execute(
        select(Student.id, Student.first_name, Student.last_name).where(Student.id.in_(list(student_ids) or [-1]))
    )).all()}
    parents = {pid: _name(f, l, "Veli") for pid, f, l in (await db.execute(
        select(Parent.id, Parent.first_name, Parent.last_name).where(Parent.id.in_(list(parent_ids) or [-1]))
    )).all()}
    courses = {cid: title for cid, title in (await db.execute(
        select(Course.id, Course.title).where(Course.id.in_(list(course_ids) or [-1]))
    )).all()}

    out = []
    for c in convs:
        if role == "teacher":
            if c.member_role == "parent":
                child = students.get(c.student_id or -1)
                counterpart = {"role": "parent", "id": c.member_id,
                               "name": f"{parents.get(c.member_id, 'Veli')} ({child} velisi)" if child else parents.get(c.member_id, "Veli")}
            else:
                counterpart = {"role": "student", "id": c.member_id, "name": students.get(c.member_id, "Öğrenci")}
            unread, archived = c.teacher_unread, c.teacher_archived
        else:
            counterpart = {"role": "teacher", "id": c.teacher_id, "name": teachers.get(c.teacher_id, "Öğretmen")}
            unread, archived = c.member_unread, c.member_archived
        out.append({
            "id": c.id,
            "topic": c.topic or "Genel",
            "course_id": c.course_id,
            "course_title": courses.get(c.course_id or -1),
            "student_id": c.student_id,
            "student_name": students.get(c.student_id or -1),
            "counterpart": {**counterpart, "online": _is_online(counterpart["role"], counterpart["id"])},
            "last_preview": c.last_preview,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "unread": unread,
            "archived": archived,
        })
    return out


def _message_out(m: Message) -> Dict[str, Any]:
    return {
        "id": m.id, "conversation_id": m.conversation_id,
        "sender_role": m.sender_role, "sender_id": m.sender_id,
        "body": m.body, "kind": m.kind, "file_url": m.file_url, "file_name": m.file_name,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# --- uçlar ----------------------------------------------------------------------

@router.get("/contacts")
async def contacts(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    """Yeni yazışmada seçilebilecek kişiler."""
    role, uid = await _actor(db, user_info)
    if role == "student":
        rows = (await db.execute(
            select(Course.id, Course.title, Teacher.id, Teacher.first_name, Teacher.last_name)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .join(Teacher, Teacher.id == Course.teacher_id)
            .where(Enrollment.student_id == uid)
        )).all()
        return {"contacts": [{
            "role": "teacher", "id": tid, "name": _name(f, l, "Öğretmen"),
            "course_id": cid, "course_title": title,
        } for cid, title, tid, f, l in rows]}

    if role == "parent":
        rows = (await db.execute(
            select(Course.id, Course.title, Teacher.id, Teacher.first_name, Teacher.last_name,
                   Student.id, Student.first_name, Student.last_name)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .join(Student, Student.id == Enrollment.student_id)
            .join(Teacher, Teacher.id == Course.teacher_id)
            .where(Student.parent_id == uid)
        )).all()
        return {"contacts": [{
            "role": "teacher", "id": tid, "name": _name(tf, tl, "Öğretmen"),
            "course_id": cid, "course_title": title,
            "student_id": sid, "student_name": _name(sf, sl, "Öğrenci"),
        } for cid, title, tid, tf, tl, sid, sf, sl in rows]}

    rows = (await db.execute(
        select(Course.id, Course.title, Student.id, Student.first_name, Student.last_name, Student.parent_id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .join(Student, Student.id == Enrollment.student_id)
        .where(Course.teacher_id == uid)
    )).all()
    parent_ids = {pid for *_, pid in rows if pid}
    parents = {pid: _name(f, l, "Veli") for pid, f, l in (await db.execute(
        select(Parent.id, Parent.first_name, Parent.last_name).where(Parent.id.in_(list(parent_ids) or [-1]))
    )).all()}
    out = []
    for cid, title, sid, f, l, pid in rows:
        name = _name(f, l, f"Öğrenci #{sid}")
        out.append({"role": "student", "id": sid, "name": name, "course_id": cid, "course_title": title,
                    "student_id": sid, "student_name": name})
        if pid in parents:
            out.append({"role": "parent", "id": pid, "name": f"{parents[pid]} ({name} velisi)",
                        "course_id": cid, "course_title": title, "student_id": sid, "student_name": name})
    return {"contacts": out}


@router.get("/conversations")
async def list_conversations(
    archived: bool = False,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    actor = await _actor(db, user_info)
    role, uid = actor
    if role == "teacher":
        query = select(Conversation).where(Conversation.teacher_id == uid, Conversation.teacher_archived.is_(archived))
    else:
        query = select(Conversation).where(
            Conversation.member_role == role, Conversation.member_id == uid,
            Conversation.member_archived.is_(archived),
        )
    convs = (await db.execute(query.order_by(Conversation.last_message_at.desc()).limit(300))).scalars().all()
    return {"conversations": await _summaries(db, list(convs), actor)}


@router.get("/unread")
async def unread_count(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    role, uid = await _actor(db, user_info)
    if role == "teacher":
        query = select(func.coalesce(func.sum(Conversation.teacher_unread), 0)).where(
            Conversation.teacher_id == uid, Conversation.teacher_archived.is_(False))
    else:
        query = select(func.coalesce(func.sum(Conversation.member_unread), 0)).where(
            Conversation.member_role == role, Conversation.member_id == uid, Conversation.member_archived.is_(False))
    return {"count": int((await db.execute(query)).scalar_one() or 0)}


class MessageIn(BaseModel):
    body: str = Field("", max_length=MAX_BODY)
    kind: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = Field(None, max_length=255)


class ConversationIn(MessageIn):
    course_id: Optional[int] = None
    topic: str = Field("", max_length=MAX_TOPIC)
    # Öğretmen yazıyorsa: öğrenci (ve velisine yazıyorsa veli). Veli yazıyorsa: çocuğu.
    student_id: Optional[int] = None
    parent_id: Optional[int] = None
    # Aynı kişiyle aynı kursta açık bir yazışma varsa ona ekle (öğrenci listesinden "mesaj gönder").
    reuse: bool = False


def _clean(msg: MessageIn) -> Dict[str, Any]:
    kind = msg.kind if msg.kind in ("text", "image", "file") else "text"
    body = (msg.body or "").strip()
    file_url = (msg.file_url or "").strip() or None
    if kind != "text":
        if not file_url or not _UPLOAD_URL.match(file_url):
            raise HTTPException(status_code=400, detail="Geçersiz dosya adresi.")
    else:
        file_url = None
        if not body:
            raise HTTPException(status_code=400, detail="Boş mesaj gönderilemez.")
    return {"body": body, "kind": kind, "file_url": file_url,
            "file_name": (msg.file_name or "").strip()[:255] or None if kind != "text" else None}


def _preview(clean: Dict[str, Any]) -> str:
    if clean["kind"] == "image":
        return "📷 Görsel"
    if clean["kind"] == "file":
        return f"📁 {clean['file_name'] or 'Dosya'}"
    return clean["body"][:200]


async def _append(db: AsyncSession, conv: Conversation, actor: Tuple[str, int], clean: Dict[str, Any]) -> Message:
    role, uid = actor
    msg = Message(conversation_id=conv.id, sender_role=role, sender_id=uid, **clean)
    db.add(msg)
    conv.last_message_at = datetime.utcnow()
    conv.last_preview = _preview(clean)
    if role == "teacher":
        conv.member_unread = (conv.member_unread or 0) + 1
        conv.member_archived = False
    else:
        conv.teacher_unread = (conv.teacher_unread or 0) + 1
        conv.teacher_archived = False
    await db.flush()
    return msg


async def _notify(db: AsyncSession, conv: Conversation, sender: Tuple[str, int], msg: Message) -> None:
    """Karşı tarafa (yalnızca ona) yeni mesaj bildirimi; yazışma özeti onun gözünden."""
    receiver = ("teacher", conv.teacher_id) if sender[0] != "teacher" else (conv.member_role, conv.member_id)
    summary = (await _summaries(db, [conv], receiver))[0]
    await _publish(receiver[0], receiver[1], {
        "type": "message_new", "conversationId": conv.id,
        "message": _message_out(msg), "conversation": summary,
    })


@router.post("/conversations")
async def create_conversation(
    body: ConversationIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    actor = await _actor(db, user_info)
    role, uid = actor
    clean = _clean(body)
    course = await _course(db, body.course_id)

    if role == "student":
        if not await _enrolled(db, uid, course.id):
            raise HTTPException(status_code=403, detail="Bu kursa kayıtlı değilsin.")
        teacher_id, member, student_id = course.teacher_id, ("student", uid), uid
    elif role == "parent":
        child = (await db.execute(
            select(Student).where(Student.id == (body.student_id or -1), Student.parent_id == uid)
        )).scalar_one_or_none()
        if not child or not await _enrolled(db, child.id, course.id):
            raise HTTPException(status_code=403, detail="Çocuğunuz bu kursa kayıtlı değil.")
        teacher_id, member, student_id = course.teacher_id, ("parent", uid), child.id
    else:
        if course.teacher_id != uid:
            raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
        student = (await db.execute(
            select(Student).where(Student.id == (body.student_id or -1))
        )).scalar_one_or_none()
        if not student or not await _enrolled(db, student.id, course.id):
            raise HTTPException(status_code=403, detail="Öğrenci bu kursa kayıtlı değil.")
        if body.parent_id:
            if student.parent_id != body.parent_id:
                raise HTTPException(status_code=403, detail="Bu veli öğrenciye bağlı değil.")
            member = ("parent", body.parent_id)
        else:
            member = ("student", student.id)
        teacher_id, student_id = uid, student.id

    conv = None
    if body.reuse:
        conv = (await db.execute(
            select(Conversation).where(
                Conversation.teacher_id == teacher_id, Conversation.member_role == member[0],
                Conversation.member_id == member[1], Conversation.course_id == course.id,
            ).order_by(Conversation.last_message_at.desc()).limit(1)
        )).scalar_one_or_none()
    if conv is None:
        conv = Conversation(
            teacher_id=teacher_id, member_role=member[0], member_id=member[1],
            student_id=student_id, course_id=course.id,
            topic=(body.topic or "").strip()[:MAX_TOPIC] or None,
            teacher_unread=0, member_unread=0, teacher_archived=False, member_archived=False,
        )
        db.add(conv)
        await db.flush()
    msg = await _append(db, conv, actor, clean)
    await db.commit()
    await _notify(db, conv, actor, msg)
    return {"conversation": (await _summaries(db, [conv], actor))[0], "message": _message_out(msg)}


@router.get("/conversations/{conv_id}")
async def read_conversation(
    conv_id: int,
    before_id: Optional[int] = None,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    actor = await _actor(db, user_info)
    conv = await _conversation_for(db, conv_id, actor)
    query = select(Message).where(Message.conversation_id == conv.id)
    if before_id:
        query = query.where(Message.id < before_id)
    rows = (await db.execute(query.order_by(Message.id.desc()).limit(PAGE_SIZE))).scalars().all()
    if not before_id:
        if actor[0] == "teacher":
            conv.teacher_unread = 0
        else:
            conv.member_unread = 0
        await db.commit()
    return {
        "conversation": (await _summaries(db, [conv], actor))[0],
        "messages": [_message_out(m) for m in reversed(rows)],
        "has_more": len(rows) == PAGE_SIZE,
    }


@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: int,
    body: MessageIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    actor = await _actor(db, user_info)
    conv = await _conversation_for(db, conv_id, actor)
    msg = await _append(db, conv, actor, _clean(body))
    await db.commit()
    await _notify(db, conv, actor, msg)
    return {"message": _message_out(msg)}


class ArchiveIn(BaseModel):
    archived: bool = True


@router.post("/conversations/{conv_id}/archive")
async def archive_conversation(
    conv_id: int,
    body: ArchiveIn,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    actor = await _actor(db, user_info)
    conv = await _conversation_for(db, conv_id, actor)
    if actor[0] == "teacher":
        conv.teacher_archived = body.archived
    else:
        conv.member_archived = body.archived
    await db.commit()
    return {"ok": True, "archived": body.archived}
