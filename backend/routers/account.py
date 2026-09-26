"""
Kullanıcının kendi hesabı üzerindeki KVKK hakları:

  GET  /account/export   verilerimi indir (JSON)
  GET  /account/summary  silmeden önce ne silineceğini göster (öğretmenin kursları)
  POST /account/delete   hesabımı ve verilerimi sil

Silme geri alınamaz; parolalı hesaplarda parola, tüm hesaplarda onay metni istenir.
"""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user_info
from connect_db import get_db
from core import accounts
from core.config import settings
from core.security import verify_password

router = APIRouter(prefix="/account", tags=["account"])

CONFIRM_TEXT = "HESABIMI SİL"


def _norm(text: str) -> str:
    """Türkçe I/İ farkını yok sayarak karşılaştır ("hesabımı sil" de kabul)."""
    return " ".join((text or "").replace("İ", "I").replace("ı", "i").upper().split())


def _who(user_info: dict):
    role = user_info.get("role")
    role = "teacher" if role == "instructor" else role
    if role == "admin":
        raise HTTPException(status_code=400, detail="Yönetici hesabı ortam ayarlarından yönetilir; buradan silinemez.")
    if role not in accounts.MODELS:
        raise HTTPException(status_code=403, detail="Geçersiz hesap türü.")
    return role, int(user_info["sub"])


@router.get("/export")
async def export_my_data(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    role, user_id = _who(user_info)
    data = await accounts.export(db, role, user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı.")
    name = f"gomufi-verilerim-{datetime.utcnow().strftime('%Y%m%d')}.json"
    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"},
    )


@router.get("/summary")
async def deletion_summary(user_info: dict = Depends(get_current_user_info), db: AsyncSession = Depends(get_db)):
    role, user_id = _who(user_info)
    account = await db.get(accounts.MODELS[role], user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı.")
    secret = getattr(account, "password", None) or getattr(account, "hashed_password", None)
    return {
        "role": role,
        "needs_password": bool(secret),
        "confirm_text": CONFIRM_TEXT,
        "courses": await accounts.owned_courses(db, user_id) if role == "teacher" else [],
    }


class DeleteIn(BaseModel):
    confirm: str = Field(max_length=50)
    password: Optional[str] = Field(default=None, max_length=200)


@router.post("/delete")
async def delete_my_account(
    body: DeleteIn,
    response: Response,
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    role, user_id = _who(user_info)
    if _norm(body.confirm) != _norm(CONFIRM_TEXT):
        raise HTTPException(status_code=400, detail=f'Onaylamak için "{CONFIRM_TEXT}" yaz.')
    account = await db.get(accounts.MODELS[role], user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı.")
    secret = getattr(account, "password", None) or getattr(account, "hashed_password", None)
    if secret and not verify_password(body.password or "", secret):
        raise HTTPException(status_code=403, detail="Parola hatalı.")
    result = await accounts.delete_account(db, role, user_id)
    response.delete_cookie(key="access_token", path="/", secure=settings.IS_PRODUCTION, httponly=True,
                           samesite="none" if settings.IS_PRODUCTION else "lax")
    return result
