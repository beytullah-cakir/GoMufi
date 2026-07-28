import asyncio, httpx, json
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
        print(q, "status", r.status_code)
        print(json.dumps(r.json(), ensure_ascii=False)[:1500])

async def main():
    await dump("gelistirme workspace kurulumu")
    await dump("kurulumu")
    await dump("turtle")

asyncio.run(main())
