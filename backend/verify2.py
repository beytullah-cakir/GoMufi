import asyncio, httpx
from core.image_search import resolve_image_url

async def check_loads(client, url):
    try:
        r = await client.get(url, follow_redirects=True, timeout=6.0)
        return r.status_code, r.headers.get("content-type"), len(r.content)
    except Exception as e:
        return "ERR", str(e), 0

async def main():
    cases = [
        ("Python Temel Veri Tipleri", True, "Python Programlama"),
        ("Python Kurulumu", True, "Python Programlama"),
        ("Değişkenler ve Veri Tipleri", True, "Python Programlama"),
        ("Değişken Tanımlama Örneği", True, "Python Programlama"),
    ]
    async with httpx.AsyncClient(headers={"User-Agent": "GoMufi-verify/1.0"}) as client:
        for q, fb, ctx in cases:
            url = await resolve_image_url(q, is_fallback=fb, context=ctx)
            status = await check_loads(client, url)
            print(f"{q!r} -> {url}\n   load-check: {status}\n")

asyncio.run(main())
