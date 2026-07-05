"""
Ders builder router — resim yükleme ve ders JSON yönetimi.
Supabase Storage kullanılıyorsa SUPABASE_KEY .env'de tanımlı olmalıdır.
"""
import os
import json
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from typing import List

router = APIRouter(prefix="/builder", tags=["lesson-builder"])

# Local JSON path
JSON_PATH = "lesson.json"


@router.post("/upload-image")
async def upload_image(request: Request, file: UploadFile = File(...)):
    try:
        # Dosya formatı kontrolü
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/bmp"]
        if file.content_type not in allowed_types:
            ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
            if ext not in ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"]:
                raise HTTPException(
                    status_code=400,
                    detail="Sadece resim formatları (JPEG, PNG, WEBP, GIF, SVG, BMP) desteklenir."
                )

        # Benzersiz dosya adı oluştur
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        file_name = f"{uuid.uuid4()}.{file_ext}"

        # Yerel sunucuya yükle
        static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads")
        os.makedirs(static_dir, exist_ok=True)
        local_file_path = os.path.join(static_dir, file_name)

        contents = await file.read()
        with open(local_file_path, "wb") as f:
            f.write(contents)

        base_url = str(request.base_url).rstrip("/")
        public_url = f"{base_url}/static/uploads/{file_name}"

        # JSON dosyasını güncelle
        lesson_data = []
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                try:
                    lesson_data = json.load(f)
                except json.JSONDecodeError:
                    lesson_data = []

        new_element = {
            "id": str(uuid.uuid4()),
            "type": "image",
            "x": 100,
            "y": 100,
            "width": 300,
            "height": 200,
            "rotation": 0,
            "content": "",
            "src": public_url
        }

        if lesson_data:
            if "elements" in lesson_data[0]:
                lesson_data[0]["elements"].append(new_element)
        else:
            lesson_data.append({
                "id": 1,
                "elements": [new_element],
                "connections": []
            })

        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(lesson_data, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "imageUrl": public_url,
            "element": new_element
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
