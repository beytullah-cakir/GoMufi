import asyncio, httpx, json
from core import image_search as img

async def openverse(q):
    async with httpx.AsyncClient(timeout=img._TIMEOUT, headers={"User-Agent": img._UA}) as client:
        r = await client.get("https://api.openverse.org/v1/images/", params={"q": q, "page_size": 3})
        print(q, "->", json.dumps(r.json().get("results", [])[:3], ensure_ascii=False)[:800])

async def main():
    await openverse("gelistirme workspace kurulumu python programming")
    await openverse("gelistirme workspace kurulumu")
    await openverse("workspace kurulumu")
asyncio.run(main())
