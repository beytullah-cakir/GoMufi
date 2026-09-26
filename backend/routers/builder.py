"""
Ders builder router — dosya yükleme ve slayt şablonları.

Yüklemeler ve şablonlar veritabanında (core/storage.py). Eskiden sunucunun diskine
yazılıyordu; Render'ın diski kalıcı olmadığı için her deploy'da siliniyordu.
"""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_teacher_id, get_current_user
from connect_db import get_db
from core import storage
from models.platform import SlideTemplate

router = APIRouter(prefix="/builder", tags=["lesson-builder"])

# Yüklenen dosyalar API alan adından sunulduğu için çalıştırılabilir/işlenebilir
# uzantılara (html, svg, php...) izin verilmez — aksi halde saklı XSS riski doğar.
ALLOWED_UPLOAD_EXTENSIONS = {
    "png", "jpg", "jpeg", "webp", "gif", "bmp",
    "pdf", "txt", "md", "csv", "json",
    "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip",
}
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "bmp"}


def safe_extension(filename: str, allowed: set, fallback: str) -> str:
    """Kullanıcı dosya adından güvenli bir uzantı çıkarır; izinli değilse hata verir."""
    ext = filename.rsplit(".", 1)[-1].lower() if filename and "." in filename else ""
    if not ext:
        return fallback
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"'.{ext}' uzantılı dosyalar desteklenmiyor.",
        )
    return ext


async def _read_upload(file: UploadFile, limit: int = storage.MAX_FILE_BYTES) -> bytes:
    contents = await file.read(limit + 1)
    if len(contents) > limit:
        raise HTTPException(status_code=400, detail="Dosya boyutu 5MB sınırını aşamaz.")
    if not contents:
        raise HTTPException(status_code=400, detail="Dosya boş.")
    return contents


def _owner(user: dict) -> tuple:
    return str(user.get("role") or "student"), int(user.get("user_id") or 0)


@router.post("/upload-chat-file")
async def upload_chat_file(
    request: Request,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mesaj eki. Veritabanında saklanır; yalnızca konuşmanın tarafları açabilir (bkz. routers/files.py)."""
    file_ext = safe_extension(file.filename, ALLOWED_UPLOAD_EXTENSIONS, "dat")
    contents = await _read_upload(file)
    role, owner_id = _owner(user)
    row = await storage.save_file(db, data=contents, extension=file_ext, filename=file.filename, kind="chat",
                                  owner_role=role, owner_id=owner_id)
    return {"success": True, "filename": file.filename, "url": storage.file_url(str(request.base_url), row),
            "size": len(contents)}


@router.post("/upload-image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    """Ders görseli. SVG kasıtlı olarak dışarıda: içine script gömülebildiği için saklı XSS riski taşır."""
    file_ext = safe_extension(file.filename, ALLOWED_IMAGE_EXTENSIONS, "png")
    contents = await _read_upload(file)
    row = await storage.save_file(db, data=contents, extension=file_ext, filename=file.filename, kind="image",
                                  owner_role="teacher", owner_id=teacher_id)
    url = storage.file_url(str(request.base_url), row)
    element = {
        "id": str(uuid.uuid4()), "type": "image", "x": 100, "y": 100, "width": 300, "height": 200,
        "rotation": 0, "content": "", "src": url,
    }
    return {"success": True, "imageUrl": url, "element": element}


# --- slayt şablonları (veritabanında; eskiden sunucu diskindeki JSON dosyasıydı) ------

def _require_admin(user: dict, verb: str) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Yalnızca yöneticiler şablon {verb}.")


def _with_max_chars(elements: list) -> list:
    """Metin kutularına sığacak yaklaşık karakter sayısı (YZ üretimi bu sınıra uyar)."""
    for el in elements:
        if not isinstance(el, dict):
            continue
        el_type = el.get("type")
        if el_type in ["text", "sticky", "challenge"]:
            width = el.get("width") or 300
            height = el.get("height") or 150
            font_size = (el.get("style") or {}).get("fontSize") or 18
            max_chars = int((width * height) / (0.75 * (font_size ** 2)))
            if el_type == "text" and font_size >= 32:
                max_chars = max(30, min(120, max_chars))
            else:
                max_chars = max(50, min(1000, max_chars))
            el["maxChars"] = max_chars
    return elements


@router.get("/templates")
async def get_templates(db: AsyncSession = Depends(get_db)):
    return await storage.load_templates(db)


@router.post("/templates")
async def save_template(request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _require_admin(user, "kaydedebilir")
    body = await request.json()
    category = body.get("category")
    title = body.get("title")
    if not category or not title:
        raise HTTPException(status_code=400, detail="Kategori ve Başlık zorunludur.")
    await storage.load_templates(db)          # ilk kayıttan önce eski şablonlar taşınsın
    row = SlideTemplate(
        id=str(uuid.uuid4()), category=str(category).upper()[:100], title=str(title)[:200],
        description=body.get("description"), elements=_with_max_chars(body.get("elements") or []),
        background=body.get("background", "default"),
    )
    db.add(row)
    await db.commit()
    return {"success": True, "template": storage.template_dict(row)}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _require_admin(user, "silebilir")
    row = await db.get(SlideTemplate, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı.")
    await db.delete(row)
    await db.commit()
    return {"success": True, "message": "Şablon başarıyla silindi."}


@router.put("/templates/{template_id}")
async def update_template(template_id: str, request: Request, user=Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    _require_admin(user, "güncelleyebilir")
    row = await db.get(SlideTemplate, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı.")
    body = await request.json()
    if body.get("title") is not None:
        row.title = str(body["title"])[:200]
    if body.get("description") is not None:
        row.description = body["description"]
    if body.get("category") is not None:
        row.category = str(body["category"]).upper()[:100]
    if body.get("elements") is not None:
        row.elements = _with_max_chars(body["elements"])
    if body.get("background") is not None:
        row.background = body["background"]
    await db.commit()
    return {"success": True, "message": "Şablon başarıyla güncellendi."}
