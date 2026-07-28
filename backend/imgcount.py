import asyncio, json
from sqlalchemy import text
from connect_db import SessionLocal
from core import ai_pricing
from core.ai_economics import parse_module_count

async def main():
    async with SessionLocal() as db:
        rows = (await db.execute(text("SELECT id, title, notes FROM courses WHERE notes IS NOT NULL"))).fetchall()
        per_lesson_imgs = []
        for cid, title, notes in rows:
            n = notes if isinstance(notes, (list, dict)) else json.loads(notes or "[]")
            if not isinstance(n, list): continue
            total_imgs = 0
            for deck in n:
                for s in (deck.get("slides") or []):
                    for el in (s.get("elements") or []):
                        if el.get("type") == "image":
                            total_imgs += 1
            if n:
                print(f"course {cid} {title!r}: {len(n)} modul-deck, {total_imgs} gorsel")
                per_lesson_imgs.append((len(n), total_imgs))

        logs = (await db.execute(text(
            "SELECT cost_usd, details FROM ai_usage_logs WHERE action='generate_lesson_slides'"))).fetchall()
        costs = [float(c) for c, d in logs]
        mods = [parse_module_count(d) for c, d in logs]
        print("\nders uretim cagrisi:", len(costs))
        if costs:
            avg = sum(costs)/len(costs)
            print(f"ort ders maliyeti: ${avg:.6f} = TL {avg*ai_pricing.USD_TO_TRY:.4f}")
        print("modul sayilari:", mods)
        print("kur USD_TO_TRY =", ai_pricing.USD_TO_TRY)

asyncio.run(main())
