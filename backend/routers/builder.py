from fastapi import APIRouter, UploadFile, File, HTTPException
from supabase import create_client, Client
import os
import json
import uuid
from typing import List

router = APIRouter(prefix="/builder", tags=["lesson-builder"])

# Supabase Ayarları
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://irjbpzhgoryppxyccgvk.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") # Anon veya Service Role Key
BUCKET_NAME = "lesson-images"

# Supabase Client (Eğer KEY varsa başlat)
supabase: Client = None
if SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

JSON_PATH = "lesson.json"

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase KEY bulunamadı. Lütfen .env dosyasını güncelleyin.")

    try:
        # 1. Dosya kontrolü
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Sadece JPEG, PNG ve WEBP formatları desteklenir.")

        # 2. Benzersiz dosya adı oluştur
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = f"uploads/{file_name}"

        # 3. Dosyayı oku ve Supabase'e yükle
        contents = await file.read()
        
        # Supabase Storage Upload
        response = supabase.storage.from_(BUCKET_NAME).upload(
            file_path,
            contents,
            {"content-type": file.content_type}
        )

        # 4. Public URL'i al
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)

        # 5. JSON dosyasını güncelle
        lesson_data = []
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                try:
                    lesson_data = json.load(f)
                except json.JSONDecodeError:
                    lesson_data = []

        # Yeni element oluştur
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

        # Varsayılan olarak ilk slayta ekle
        if lesson_data:
            # Slayt yapısına göre uygun yere ekle (User spesifikasyonu: "doğru sayfanın elements dizisine")
            # Şimdilik örnekteki gibi ilk slayta ekliyoruz
            if "elements" in lesson_data[0]:
                lesson_data[0]["elements"].append(new_element)
        else:
            lesson_data.append({
                "id": 1,
                "elements": [new_element],
                "connections": []
            })

        # Dosyayı kaydet
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
