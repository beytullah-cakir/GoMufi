"""
Quiz service — Google Gemini AI ile soru üretimi.
Yeni google.genai SDK kullanıyor (google.generativeai deprecated).
"""
import json
import re
from google import genai
from google.genai import types
from core.config import settings


def generate_quiz_question(topic: str, difficulty: str = "Orta", question_type: str = "multiple-choice"):
    """Verilen konuda AI destekli quiz sorusu üretir. Senkron — asyncio.to_thread ile çağrılmalı."""
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)

        type_hint = "4 şıklı (secenekler: [A, B, C, D])" if question_type == "multiple-choice" else "Doğru/Yanlış"

        prompt = f"""
Sen bir eğitmensin. Konu: '{topic}', Zorluk: '{difficulty}', Tip: '{question_type}'.
Lütfen şu JSON formatında bir soru üret:
{{
    "soru": "Soru metni buraya",
    "secenekler": ["Seçenek 1", "Seçenek 2", ...],
    "cevap": "Doğru seçenek veya metin",
    "aciklama": "Çözüm açıklaması"
}}
Kurallar:
1. Sadece JSON döndür.
2. Cevap {type_hint} formatında olsun.
3. Türkçe dilinde olsun.
4. Eğer soru veya seçenekler kod içeriyorsa, kodu mutlaka markdown kod bloğu (```dil ... ```) içine al.
"""

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        raw_text = response.text.strip()

        # JSON'ı temizle (Markdown ```json ... ``` varsa ayıkla)
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        clean_json = json_match.group(0) if json_match else raw_text

        quiz_data = json.loads(clean_json)
        return {"success": True, "quiz": quiz_data}

    except Exception as e:
        print(f"ERROR: Quiz servis hatası → {str(e)}")
        return {"success": False, "error": str(e)}
