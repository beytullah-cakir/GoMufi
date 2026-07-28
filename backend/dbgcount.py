"""Slayt dagitimi her derste calisiyor mu?

Kural: modulun EN AGIR alt konusu (en cok isimli uyesi olan) en cok slayti almali.
Bu betik farkli branslardan modulleri gercekten uretir ve slayt basliklarini basar.
"""
import asyncio, logging, sys
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from connect_db import SessionLocal
from routers.ai import generate_lesson_slides_api, GenerateLessonSlidesRequest

SENARYOLAR = [
    # (ders konusu, seviye, kitle, ders basligi, ANLA modul konusu, beklenen agir alt konu)
    ("Python Programlamaya Giriş", "Başlangıç", "Lise",
     "print(), Değişken, Veri Tipi", "print(), Değişken, Veri Tipi",
     "Veri Tipi -> str/int/float/bool ayri ayri"),
    ("Biyoloji", "Başlangıç", "Ortaokul",
     "Sindirim Sistemi", "Sindirim sistemi organları ve görevleri",
     "her organ ayri ayri"),
    ("İngilizce Dilbilgisi", "Orta", "Lise",
     "Geniş ve Şimdiki Zaman", "Present Simple ve Present Continuous kullanımı",
     "her zaman ayri ayri"),
]


async def calistir(topic, difficulty, audience, lesson_title, anla_topic, beklenti):
    req = GenerateLessonSlidesRequest(
        topic=topic, difficulty=difficulty, audience=audience,
        lesson_number=1, lesson_title=lesson_title,
        lesson_objective=f"Öğrenci {anla_topic} konusunu kavrar ve uygular.",
        modules=[{"type": "UNDERSTAND", "topic": anla_topic},
                 {"type": "APPLY", "topic": f"{anla_topic} pratiği"}],
    )
    async with SessionLocal() as db:
        res = await generate_lesson_slides_api(req, teacher_id=1, db=db)

    print(f"\n{'='*70}\n{topic} / {anla_topic!r}\n  beklenen: {beklenti}")
    for deck in res.get("notes") or []:
        slides = deck.get("slides") or []
        print(f"  -> {len(slides)} slayt")
        for i, s in enumerate(slides, 1):
            if s.get("type") == "challenge":
                print(f"     {i}. (uygulama görevi) {s.get('challengeConfig', {}).get('title')!r}")
                continue
            baslik = next((str(e.get("content", ""))[:70] for e in (s.get("elements") or [])
                           if e.get("type") == "text"), "")
            print(f"     {i}. {baslik!r}")


async def main():
    sec = sys.argv[1:] or [str(i) for i in range(len(SENARYOLAR))]
    for i in sec:
        await calistir(*SENARYOLAR[int(i)])

asyncio.run(main())
