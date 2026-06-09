"""
Ders builder router — resim yükleme ve ders JSON yönetimi.
Supabase Storage kullanılıyorsa SUPABASE_KEY .env'de tanımlı olmalıdır.
"""
import os
import json
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

router = APIRouter(prefix="/builder", tags=["lesson-builder"])

# Supabase Ayarları
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://irjbpzhgoryppxyccgvk.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BUCKET_NAME = "lesson-images"

JSON_PATH = "lesson.json"

def _get_supabase():
    """Supabase client'ı lazy olarak başlat — KEY yoksa None döner."""
    if not SUPABASE_KEY:
        return None
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except ImportError:
        return None


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    supabase = _get_supabase()
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Resim yükleme servisi kullanılamıyor. SUPABASE_KEY .env dosyasında tanımlı değil."
        )

    try:
        # Dosya formatı kontrolü
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(
                status_code=400,
                detail="Sadece JPEG, PNG ve WEBP formatları desteklenir."
            )

        # Benzersiz dosya adı oluştur
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = f"uploads/{file_name}"

        # Dosyayı oku ve Supabase'e yükle
        contents = await file.read()
        supabase.storage.from_(BUCKET_NAME).upload(
            file_path,
            contents,
            {"content-type": file.content_type}
        )

        # Public URL'i al
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)

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
