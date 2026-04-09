import json
import google.generativeai as genai

#aynı şekilde key i buraya da aldım.
MY_API_KEY = "AIzaSyB9lh3skpk5o6jKsDn-EBW-SpB1tXNxf1g"

genai.configure(api_key=MY_API_KEY)

def generate_quiz_question(topic: str, difficulty: str = "Orta"):
    print(f"Quiz Üretiliyor: Konu={topic}, Zorluk={difficulty}")

    try:
        model = genai.GenerativeModel("gemini-flash-latest")

        user_prompt = (
            f"Konu: '{topic}'. Zorluk: {difficulty}. "
            "Lise seviyesinde, 4 şıklı (A,B,C,D), tek doğru cevaplı bir test sorusu hazırla."
        )

        generation_config = {
            "temperature": 1,
            "max_output_tokens": 1024,
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "object",
                "properties": {
                    "soru": {"type": "string"},
                    "secenekler": {"type": "array", "items": {"type": "string"}},
                    "cevap": {"type": "string"}
                },
                "required": ["soru", "secenekler", "cevap"]
            }
        }

        full_prompt = (
            "Sen bir öğretmensin. Aşağıdaki isteğe uygun soruyu üret ve "
            "SADECE JSON formatında çıktı ver.\n\n" + user_prompt
        )

        response = model.generate_content(
            full_prompt,
            generation_config=generation_config
        )

        raw_json = response.candidates[0].content.parts[0].text

        quiz_data = json.loads(raw_json)
        return {"success": True, "quiz": quiz_data}

    except Exception as e:
        return {"success": False, "error": f"Quiz servis hatası: {str(e)}"}
