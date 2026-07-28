"""Ders başlığı birden fazla kavram sayınca kaç ANLA->UYGULA çifti açılıyor?

Şikayet: "print(), Değişken, Veri Tipi" dersi tek ANLA modülüne sıkışmıştı.
Kural gereği üç kavram = üç çift olmalı.
"""
import asyncio, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from connect_db import SessionLocal
from routers.ai import generate_roadmap_structure_api, GenerateRoadmapRequest

REQ = GenerateRoadmapRequest(
    topic="Python Programlamaya Giriş",
    difficulty="Başlangıç",
    lessons_count=3,
    audience="Lise",
)


async def main():
    async with SessionLocal() as db:
        res = await generate_roadmap_structure_api(REQ, teacher_id=1, db=db)

    print("YANIT ANAHTARLARI:", list(res.keys()))
    body = res
    for key in ("data", "roadmap", "structure", "result"):
        if isinstance(res.get(key), dict):
            body = res[key]
            print(f"  -> '{key}' altinda:", list(body.keys()))
            break

    for les in body.get("lessons", []):
        mods = les.get("modules") or []
        anla = sum(1 for m in mods if m.get("type") == "UNDERSTAND")
        print(f"\nDers {les.get('lessonNumber')}: {les.get('title')!r}  -> {anla} ANLA / {len(mods)} modül")
        for m in mods:
            print(f"   {m.get('type'):<10} {m.get('topic')!r}")

asyncio.run(main())
