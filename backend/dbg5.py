import asyncio, httpx, json
from core import image_search as img

async def wiki(q, must=None):
    async with httpx.AsyncClient(timeout=img._TIMEOUT, headers={"User-Agent": img._UA}) as client:
        r = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action":"query","format":"json","generator":"search","gsrsearch":q,"gsrlimit":3,
                    "prop":"pageimages","piprop":"thumbnail","pithumbsize":800,"pilimit":3})
        pages = ((r.json().get("query") or {}).get("pages") or {}).values()
        for p in sorted(pages, key=lambda p: p.get("index", 99)):
            print("  ", p.get("title"), "relevant=", img._relevant(p.get("title") or "", must), "->", (p.get("thumbnail") or {}).get("source"))

async def openverse(q):
    async with httpx.AsyncClient(timeout=img._TIMEOUT, headers={"User-Agent": img._UA}) as client:
        r = await client.get("https://api.openverse.org/v1/images/", params={"q": q, "page_size": 1})
        print("status", r.status_code)
        print(json.dumps(r.json(), ensure_ascii=False)[:1000])

async def main():
    known, unknown = img._keywords("Python Temel Veri Tipleri")
    ctx_known, _ = img._keywords("Python Programlama")
    ctx = ctx_known[:2]
    print("known", known, "unknown", unknown, "ctx", ctx)
    variants = img._variants(known, unknown, ctx, is_fallback=True)
    print("variants", variants)
    for v in variants:
        sig = [w for w in v.split() if len(w)>=4] or None
        print("variant:", v, "sig:", sig)
        await wiki(v, sig)

    print("\n--- openverse for python installation ---")
    known2, unknown2 = img._keywords("Python Kurulumu")
    ctx2, _ = img._keywords("Python Programlama")
    variants2 = img._variants(known2, unknown2, ctx2[:2], is_fallback=True)
    print("variants2", variants2)
    for v in variants2:
        sig = [w for w in v.split() if len(w)>=4] or None
        await wiki(v, sig)
    for v in variants2[:2]:
        await openverse(v)

asyncio.run(main())
