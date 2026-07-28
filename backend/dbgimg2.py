import asyncio, httpx
from core import image_search as img

async def dump(q):
    async with httpx.AsyncClient(timeout=img._TIMEOUT, headers={"User-Agent": img._UA}) as client:
        r = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query", "format": "json", "generator": "search",
                "gsrsearch": q, "gsrlimit": 3,
                "prop": "pageimages", "piprop": "thumbnail",
                "pithumbsize": 800, "pilimit": 3,
            },
        )
        pages = ((r.json().get("query") or {}).get("pages") or {}).values()
        print(f"Q={q!r}")
        for p in sorted(pages, key=lambda p: p.get("index", 99)):
            print("  ", p.get("title"), "->", (p.get("thumbnail") or {}).get("source"))

async def main():
    for q, ctxq, fb in [
        ("Geliştirme Ortamı Kurulumu", "Python Programlama", True),
        ("Python ve VS Code Nasıl Kurulur?", "Python Programlama", True),
    ]:
        known, unknown = img._keywords(q)
        ctx_known, _ = img._keywords(ctxq)
        ctx = ctx_known[:2]
        print("query:", q, "-> known", known, "unknown", unknown, "ctx", ctx)
        variants = img._variants(known, unknown, ctx, is_fallback=fb)
        print("variants", variants)
        for v in variants:
            await dump(v)
        print()

asyncio.run(main())
