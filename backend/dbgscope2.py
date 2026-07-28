import asyncio, json, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import text
from connect_db import SessionLocal
from routers.ai import _effective_max_chars

NEEDLES = ["Temel Veri Tipleri: Metin", "Ekrana Metin Yazdırma"]

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text("SELECT id, notes FROM courses WHERE notes IS NOT NULL ORDER BY id DESC"))).fetchall()
        for cid, notes in rows:
            n = notes if isinstance(notes, list) else json.loads(notes or "[]")
            for deck in n:
                for s in (deck.get("slides") or []):
                    els = s.get("elements") or []
                    joined = " ".join(str(e.get("content","")) for e in els)
                    if not any(x in joined for x in NEEDLES): continue
                    print(f"=== kurs {cid} / deck {deck.get('noteTitle')!r} ===")
                    for e in els:
                        if e.get("type") not in ("text","sticky"): continue
                        c = str(e.get("content",""))
                        st = e.get("style") or {}
                        eff = _effective_max_chars(e)
                        print(f"  [{e.get('type'):6s}] w={e.get('width'):.0f} fs={st.get('fontSize')} "
                              f"maxChars={e.get('maxChars')} etkin={eff} uzunluk={len(c)}")
                        print(f"       {c[:200]!r}")
                    print()
                    return
asyncio.run(main())
