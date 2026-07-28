import asyncio, httpx, json
from core import image_search as img

async def main():
    async with httpx.AsyncClient(timeout=img._TIMEOUT, headers={"User-Agent": img._UA}) as client:
        r = await client.get("https://api.openverse.org/v1/images/", params={"q": "python setup", "page_size": 3})
        results = r.json().get("results") or []
        for res in results:
            print("title:", res.get("title"))
            print("  thumbnail:", res.get("thumbnail"))
            print("  url:", res.get("url"))
        # fetch actual thumbnail to check it resolves
        if results:
            thumb = results[0].get("thumbnail")
            r2 = await client.get(thumb, follow_redirects=True)
            print("thumb status:", r2.status_code, "content-type:", r2.headers.get("content-type"), "len:", len(r2.content))

asyncio.run(main())
