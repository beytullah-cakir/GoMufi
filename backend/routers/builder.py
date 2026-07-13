"""
Ders builder router — resim yükleme ve ders JSON yönetimi.
Supabase Storage kullanılıyorsa SUPABASE_KEY .env'de tanımlı olmalıdır.
"""
import os
import json
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends, status
from auth.dependencies import get_current_user
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


TEMPLATES_PATH = "slide_templates.json"


@router.get("/templates")
async def get_templates():
    if not os.path.exists(TEMPLATES_PATH):
        return []
    try:
        with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return []


@router.post("/templates")
async def save_template(request: Request, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yalnızca yöneticiler şablon kaydedebilir."
        )
        
    try:
        body = await request.json()
        category = body.get("category")
        title = body.get("title")
        description = body.get("description")
        elements = body.get("elements", [])
        background = body.get("background", "default")
        
        if not category or not title:
            raise HTTPException(status_code=400, detail="Kategori ve Başlık zorunludur.")
            
        templates = []
        if os.path.exists(TEMPLATES_PATH):
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                try:
                    templates = json.load(f)
                except json.JSONDecodeError:
                    templates = []
                    
        # Dynamically calculate maxChars for text elements
        for el in elements:
            el_type = el.get("type")
            if el_type in ["text", "sticky", "challenge"]:
                width = el.get("width") or 300
                height = el.get("height") or 150
                style = el.get("style") or {}
                font_size = style.get("fontSize") or 18
                
                max_chars = int((width * height) / (0.75 * (font_size ** 2)))
                
                if el_type == "text" and font_size >= 32:
                    max_chars = max(30, min(120, max_chars))
                else:
                    max_chars = max(50, min(1000, max_chars))
                    
                el["maxChars"] = max_chars

        new_template = {
            "id": str(uuid.uuid4()),
            "category": category.upper(),
            "title": title,
            "description": description,
            "elements": elements,
            "background": background
        }
        
        templates.append(new_template)
        
        with open(TEMPLATES_PATH, "w", encoding="utf-8") as f:
            json.dump(templates, f, indent=2, ensure_ascii=False)
            
        return {"success": True, "template": new_template}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yalnızca yöneticiler şablon silebilir."
        )
        
    try:
        if not os.path.exists(TEMPLATES_PATH):
            raise HTTPException(status_code=404, detail="Şablon dosyası bulunamadı.")
            
        with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
            templates = json.load(f)
            
        new_templates = [t for t in templates if t.get("id") != template_id]
        
        if len(new_templates) == len(templates):
            raise HTTPException(status_code=404, detail="Şablon bulunamadı.")
            
        with open(TEMPLATES_PATH, "w", encoding="utf-8") as f:
            json.dump(new_templates, f, indent=2, ensure_ascii=False)
            
        return {"success": True, "message": "Şablon başarıyla silindi."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/templates/{template_id}")
async def update_template(template_id: str, request: Request, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yalnızca yöneticiler şablon güncelleyebilir."
        )
        
    try:
        body = await request.json()
        title = body.get("title")
        description = body.get("description")
        category = body.get("category")
        elements = body.get("elements")
        background = body.get("background")
        
        if not os.path.exists(TEMPLATES_PATH):
            raise HTTPException(status_code=404, detail="Şablon dosyası bulunamadı.")
            
        with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
            templates = json.load(f)
            
        found = False
        for t in templates:
            if t.get("id") == template_id:
                if title is not None:
                    t["title"] = title
                if description is not None:
                    t["description"] = description
                if category is not None:
                    t["category"] = category.upper()
                if elements is not None:
                    t["elements"] = elements
                if background is not None:
                    t["background"] = background
                found = True
                break
                
        if not found:
            raise HTTPException(status_code=404, detail="Şablon bulunamadı.")
            
        with open(TEMPLATES_PATH, "w", encoding="utf-8") as f:
            json.dump(templates, f, indent=2, ensure_ascii=False)
            
        return {"success": True, "message": "Şablon başarıyla güncellendi."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


