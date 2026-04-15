import json
import google.generativeai as genai
import re
import os
from dotenv import load_dotenv

# .env dosyasındaki değişkenleri yükle
load_dotenv()

# API Key'i ortam değişkeninden al
MY_API_KEY = os.getenv("MY_API_KEY")

genai.configure(api_key=MY_API_KEY)

def generate_quiz_question(topic: str, difficulty: str = "Orta", question_type: str = "multiple-choice"):
    print(f"DEBUG: Quiz Üretimi Başladı -> Konu: {topic}, Tip: {question_type}")

    try:
        # En uyumlu model ismini kullanalım
        model = genai.GenerativeModel("gemini-3-flash-preview")

        # Prompt oluşturma
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

        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        
        # JSON'ı temizle (Markdown ```json ... ``` varsa ayıkla)
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            clean_json = json_match.group(0)
        else:
            clean_json = raw_text

        print(f"DEBUG: AI Raw Response -> {clean_json}")

        quiz_data = json.loads(clean_json)
        return {"success": True, "quiz": quiz_data}

    except Exception as e:
        print(f"ERROR: Quiz servis hatası -> {str(e)}")
        return {"success": False, "error": str(e)}
