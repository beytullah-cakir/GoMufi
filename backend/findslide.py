import asyncio, json, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import text
from connect_db import SessionLocal

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text("SELECT id, title, notes FROM courses WHERE notes IS NOT NULL"))).fetchall()
        for cid, title, notes in rows:
            n = notes if isinstance(notes, list) else json.loads(notes or "[]")
            for deck in n:
                for s in (deck.get("slides") or []):
                    title_el = None
                    for e in (s.get("elements") or []):
                        if e.get("type") in ("title","heading","text") and "Python Nedir" in str(e.get("content","")):
                            title_el = e
                    if title_el:
                        for e in (s.get("elements") or []):
                            if e.get("type")=="image":
                                print(f"course={cid} deck={deck.get('noteTitle')} slide={s.get('id')}")
                                print("  image element:", json.dumps(e, ensure_ascii=False)[:500])
asyncio.run(main())
