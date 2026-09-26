"""
Kalıcı dosya deposu ve slayt şablonları — veritabanında (bkz. models/platform.py).

Dosya adresi: {API}/files/{uuid}.{uzantı}
  image  herkese açık (ders slaytlarında <img> ile gösterilir; adres tahmin edilemez)
  chat   yalnızca yükleyen, yönetici ve dosyanın paylaşıldığı konuşmanın tarafları
"""
import json
import os
import uuid
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.platform import SlideTemplate, StoredFile

MAX_FILE_BYTES = 5 * 1024 * 1024

CONTENT_TYPES = {
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp",
    "gif": "image/gif", "bmp": "image/bmp", "pdf": "application/pdf", "txt": "text/plain; charset=utf-8",
    "md": "text/markdown; charset=utf-8", "csv": "text/csv; charset=utf-8", "json": "application/json",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "zip": "application/zip",
}
INLINE_TYPES = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "pdf"}


async def save_file(db: AsyncSession, *, data: bytes, extension: str, filename: str, kind: str,
                    owner_role: str, owner_id: int) -> StoredFile:
    row = StoredFile(
        id=str(uuid.uuid4()), kind=kind, owner_role=owner_role, owner_id=owner_id,
        filename=(filename or f"dosya.{extension}")[:255], extension=extension,
        content_type=CONTENT_TYPES.get(extension, "application/octet-stream"), size=len(data), data=data,
    )
    db.add(row)
    await db.commit()
    return row


def file_url(base_url: str, row: StoredFile) -> str:
    return f"{base_url.rstrip('/')}/files/{row.id}.{row.extension}"


async def usage(db: AsyncSession) -> Dict[str, int]:
    count, total = (await db.execute(select(func.count(StoredFile.id), func.coalesce(func.sum(StoredFile.size), 0)))).one()
    return {"files": int(count or 0), "bytes": int(total or 0)}


# --- slayt şablonları ----------------------------------------------------------------

SEED_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slide_templates.json")


def template_dict(t: SlideTemplate) -> Dict[str, Any]:
    return {"id": t.id, "category": t.category, "title": t.title, "description": t.description,
            "elements": t.elements or [], "background": t.background}


async def load_templates(db: AsyncSession) -> List[Dict[str, Any]]:
    """Şablonlar. Tablo boşsa depodaki slide_templates.json ile bir kez doldurulur."""
    rows = (await db.execute(select(SlideTemplate).order_by(SlideTemplate.created_at, SlideTemplate.id))).scalars().all()
    if not rows and os.path.exists(SEED_PATH):
        try:
            with open(SEED_PATH, "r", encoding="utf-8") as f:
                seed = json.load(f)
        except (OSError, json.JSONDecodeError):
            seed = []
        for item in seed:
            if isinstance(item, dict) and item.get("title"):
                db.add(SlideTemplate(
                    id=str(item.get("id") or uuid.uuid4())[:36], category=str(item.get("category") or "ANLA").upper(),
                    title=str(item["title"])[:200], description=item.get("description"),
                    elements=item.get("elements") or [], background=item.get("background"),
                ))
        await db.commit()
        rows = (await db.execute(select(SlideTemplate).order_by(SlideTemplate.created_at, SlideTemplate.id))).scalars().all()
    return [template_dict(t) for t in rows]
