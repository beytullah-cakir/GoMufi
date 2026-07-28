import asyncio
from core.image_search import resolve_image_url, _keywords

async def main():
    print(_keywords("Geliştirme Ortamı Kurulumu"))
    print(_keywords("kurulumu"))
    for q, fb, ctx in [
        ("Geliştirme Ortamı Kurulumu", True, "Python Programlama"),
        ("kurulumu", True, "Python Programlama"),
        ("Python Nedir", True, "Python Programlama"),
        ("Hücre Bölünmesi", True, "Biyoloji"),
        ("Döngüler", True, "Python Programlama"),
    ]:
        url = await resolve_image_url(q, is_fallback=fb, context=ctx)
        print(f"{q!r} -> {url}")

asyncio.run(main())
