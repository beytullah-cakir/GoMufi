import asyncio, json, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import text
from connect_db import SessionLocal

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text("SELECT id, title, notes, curriculum FROM courses WHERE notes IS NOT NULL"))).fetchall()
        for cid, title, notes, cur in rows:
            n = notes if isinstance(notes, list) else json.loads(notes or "[]")
            c = cur if isinstance(cur, list) else json.loads(cur or "[]")
            lessons = sum(1 for node in c if isinstance(node, dict) and node.get("lessonTopic"))
            decks_with_slides = [d for d in n if (d.get("slides") or [])]
            imgs = sum(1 for d in decks_with_slides for s in d["slides"] for e in (s.get("elements") or []) if e.get("type")=="image")
            slides = sum(len(d["slides"]) for d in decks_with_slides)
            print(f"{title!r}: {lessons} ders, {len(decks_with_slides)} dolu modul, {slides} slayt, {imgs} gorsel")
            if lessons: print(f"   -> ders basina {imgs/lessons:.1f} gorsel")
asyncio.run(main())
