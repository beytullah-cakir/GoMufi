import json
import google.generativeai as genai
import re

# API Key
MY_API_KEY = "AIzaSyB9lh3skpk5o6jKsDn-EBW-SpB1tXNxf1g"
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
