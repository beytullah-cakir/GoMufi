"""Kaynak PDF bloğu prompt'a gercekten giriyor mu, nerede duruyor?

Gemini cagrisini yakalar, prompt'u diske yazar ve blogun konumunu raporlar.
"""
import asyncio, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from google import genai

import routers.ai as ai
from connect_db import SessionLocal

KAYNAK = (
    "GOMUFI PYTHON KAYNAK NOTU - BOLUM 7\n"
    "Bu bolumde mufi_gizli_toplam fonksiyonunu ogrenecegiz.\n"
    "Ornek: mufi_gizli_toplam(4271) cagrisi 8542 dondurur.\n"
    "Fonksiyon girdisini ZORLU_KATSAYI (2) ile carpar.\n"
)

yakalanan = {}


class SahteModels:
    def generate_content(self, **kw):
        yakalanan["prompt"] = kw.get("contents")
        raise RuntimeError("DUR: prompt yakalandi")


class SahteClient:
    def __init__(self, *a, **k):
        self.models = SahteModels()


async def main():
    ai.genai.Client = SahteClient  # type: ignore[attr-defined]

    req = ai.GenerateLessonSlidesRequest(
        topic="Python Programlama", difficulty="Başlangıç", audience="Lise",
        lesson_number=7, lesson_title="Fonksiyonlar",
        lesson_objective="Öğrenci kaynaktaki fonksiyonu kullanır.",
        modules=[{"type": "UNDERSTAND", "topic": "Kaynaktaki fonksiyon"}],
        pdf_content=KAYNAK,
    )
    async with SessionLocal() as db:
        try:
            await ai.generate_lesson_slides_api(req, teacher_id=1, db=db)
        except Exception:
            pass

    p = yakalanan.get("prompt")
    if not p:
        print("!! prompt yakalanamadi")
        return

    with open("/tmp/prompt_dump.txt", "w", encoding="utf-8") as f:
        f.write(p)

    print(f"prompt uzunlugu: {len(p)} karakter")
    for isaret in ("HIGHEST AUTHORITY", "BEGIN SOURCE MATERIAL", "mufi_gizli_toplam",
                   "Requirements:", "Expected JSON Structure", "Lesson to populate"):
        i = p.find(isaret)
        yuzde = f"%{100 * i // len(p)}" if i >= 0 else "-"
        print(f"  {isaret:<24} konum={i:>6} ({yuzde})")

    genai.Client  # sessiz linter

asyncio.run(main())
