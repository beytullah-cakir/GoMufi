"""
Yüklenen dosyaların sunumu: GET /files/{uuid}.{uzantı}

  image  ders görseli — herkese açık, uzun süre önbelleklenir (adres tahmin edilemez)
  chat   mesaj eki — yükleyen, yönetici ya da dosyanın paylaşıldığı konuşmanın tarafları
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from connect_db import get_db
from core.security import decode_access_token
from core.storage import INLINE_TYPES
from models.messaging import Conversation, Message
from models.platform import StoredFile

router = APIRouter(tags=["files"])


def _viewer(request: Request):
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization") or ""
    if not token and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
    return decode_access_token(token)


async def _may_open_chat_file(db: AsyncSession, row: StoredFile, payload: dict) -> bool:
    role = payload.get("role")
    if role == "admin":
        return True
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return False
    role = "teacher" if role in ("teacher", "instructor") else role
    if role == row.owner_role and user_id == row.owner_id:
        return True
    party = (Conversation.teacher_id == user_id) if role == "teacher" else \
        ((Conversation.member_role == role) & (Conversation.member_id == user_id))
    found = (await db.execute(
        select(Message.id).join(Conversation, Conversation.id == Message.conversation_id)
        .where(Message.file_url.like(f"%/files/{row.id}.%"), or_(party)).limit(1)
    )).first()
    return found is not None


@router.get("/files/{name}")
async def get_file(name: str, request: Request, db: AsyncSession = Depends(get_db)):
    file_id = name.split(".", 1)[0]
    if len(file_id) != 36:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı.")
    row = await db.get(StoredFile, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı.")
    headers = {"X-Content-Type-Options": "nosniff"}
    if row.kind == "image":
        headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:
        payload = _viewer(request)
        if not payload:
            raise HTTPException(status_code=401, detail="Bu dosyayı açmak için giriş yapmalısın.")
        if not await _may_open_chat_file(db, row, payload):
            raise HTTPException(status_code=403, detail="Bu dosyaya erişim yetkin yok.")
        headers["Cache-Control"] = "private, no-store"
    safe_name = row.filename.replace('"', "").replace("\n", " ").encode("ascii", "ignore").decode() or f"dosya.{row.extension}"
    disposition = "inline" if row.extension in INLINE_TYPES else "attachment"
    headers["Content-Disposition"] = f'{disposition}; filename="{safe_name}"'
    return Response(content=row.data, media_type=row.content_type, headers=headers)
