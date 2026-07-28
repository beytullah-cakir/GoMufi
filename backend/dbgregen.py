import asyncio, json, logging, re
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import text
from connect_db import SessionLocal

BANNED = re.compile(r"kurulum|indir|IDE|PATH|terminal|komut satır|editör seç|ortam hazır|yükle", re.I)

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text(
            "SELECT id, title, curriculum FROM courses WHERE curriculum IS NOT NULL ORDER BY id DESC LIMIT 3"))).fetchall()
        for cid, title, cur in rows:
            c = cur if isinstance(cur, list) else json.loads(cur or "[]")
            titles = [n.get("title","") for n in c if isinstance(n, dict) and n.get("title")]
            lessons = [n.get("lessonTopic") for n in c if isinstance(n, dict) and n.get("lessonTopic")]
            hits = [t for t in titles if BANNED.search(t)]
            print(f"--- kurs {cid}: {title!r} ({len(titles)} modul) ---")
            print("  ilk 8 modul:", titles[:8])
            print("  dersler:", lessons[:4])
            print("  KURULUM/IDE gecen modul:", hits or "YOK ✓")
            print()
asyncio.run(main())
