import asyncio, json, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import text
from connect_db import SessionLocal

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text(
            "SELECT id, title, curriculum FROM courses WHERE curriculum IS NOT NULL ORDER BY id DESC LIMIT 2"))).fetchall()
        for cid, title, cur in rows:
            c = cur if isinstance(cur, list) else json.loads(cur or "[]")
            print(f"=== kurs {cid}: {title!r} ===")
            for n in c[:10]:
                if not isinstance(n, dict) or n.get("type") == "live_sessions_config":
                    continue
                print(f"  title={n.get('title')!r}")
                print(f"     theme={n.get('theme')!r} lessonTopic={n.get('lessonTopic')!r}")
                print(f"     aiModuleTopic={n.get('aiModuleTopic')!r}")
                print(f"     aiLessonObjective={str(n.get('aiLessonObjective'))[:120]!r}")
            print()
asyncio.run(main())
