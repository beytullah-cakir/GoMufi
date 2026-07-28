import asyncio, json, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import text
from connect_db import SessionLocal
from routers.ai import _effective_max_chars

NEEDLES = ["kodunuzdan metin", "Temel Veri Tipleri: Metin", "important note"]

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text("SELECT id, notes FROM courses WHERE notes IS NOT NULL ORDER BY id DESC"))).fetchall()
        found = 0
        for cid, notes in rows:
            n = notes if isinstance(notes, list) else json.loads(notes or "[]")
            for deck in n:
                for s in (deck.get("slides") or []):
                    els = s.get("elements") or []
                    for e in els:
                        c = str(e.get("content",""))
                        if not any(x in c for x in NEEDLES): continue
                        st = e.get("style") or {}
                        eff = _effective_max_chars(e)
                        print(f"kurs {cid} / {deck.get('noteTitle')!r} [{e.get('type')}] "
                              f"w={e.get('width')} fs={st.get('fontSize')} maxChars={e.get('maxChars')} "
                              f"etkin={eff} uzunluk={len(c)}")
                        print(f"   {c!r}")
                        print()
                        found += 1
                        if found > 8: return
asyncio.run(main())
