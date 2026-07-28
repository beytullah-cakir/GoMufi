"""Gercek ders notuyla PDF sistemini sinar.

Ogretmenin yukledigi 14 sayfalik Python ders notu. Bu kaynagin AYIRT EDICI
ornekleri var: print(\"\"\"\"\"Ali\"\"\"\"\"), len("Bilgisayar Bilimi")=17, a="Trabzon",
"aheste "*2, pow(11,3,4), round(30.5), ilk_metin/ikinci_metin -> "g s a y a r".
Bunlar genel bilgiden turetilemez; slaytta cikiyorlarsa kaynak GERCEKTEN kullanilmis.

Kullanim:
  python dbgkaynak.py secim     -> yalniz alinti secimi (AI cagrisi yok, bedava)
  python dbgkaynak.py <ders_no> -> o dersi gercekten uretir
"""
import asyncio, logging, sys
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from routers.ai import _select_pdf_excerpt

KAYNAK = open("ornek_ders_kaynak.txt", encoding="utf-8").read()

# (ders basligi, ANLA modul konusu, kaynakta beklenen ayirt edici isaretler)
DERSLER = [
    ("Veri Türleri", "string, integer, float, complex ve bool veri türleri",
     ["İstanbul'un havası", "Merhaba Dünya", "10+2j", "12.6"]),
    ("print() Fonksiyonu", "print() ile ekrana yazdırma ve string birleştirme",
     ['"""""Ali"""""', "Bilgisayar Bilimi Kodlama", 'print(999+ "9")', '"bilgi"+"sayar"']),
    ("Tip Dönüşüm Fonksiyonları", "type(), str(), int(), float() ve len() fonksiyonları",
     ["Bilgisayar Bilimi", "17", "int(28.9)", "len(563)", "Türkiye"]),
    ("Aritmetik Operatörler", "toplama, bölme, tam bölme, üs alma, mod ve yuvarlama",
     ["aheste", "pow(11,3,4)", "8793.748", "144**0.5", "25//6"]),
    ("Değişken Kuralları", "değişken adlandırma kuralları ve atama",
     ["3_kilo_elma", "gelir?", "Trabzon", "keyword.kwlist", "kullanici_adi"]),
    ("For Döngüsü", "for döngüsü ve range() fonksiyonu",
     ["range(21,0,-3)", "4950", "g s a y a r", "tr_harfler", "faktoriyel"]),
]


def secim_testi():
    print(f"KAYNAK: {len(KAYNAK)} karakter\n")
    # Gercek bir kitap gibi davransin diye butceyi dusuruyoruz; aksi halde
    # 20k'lik metin 30k butceye tamamen sigar ve secim hic devreye girmez.
    BUTCE = 4000
    print(f"Alinti butcesi {BUTCE} karaktere dusuruldu (buyuk kitap simulasyonu)\n")
    for baslik, konu, isaretler in DERSLER:
        alinti = _select_pdf_excerpt(KAYNAK, f"{baslik} {konu}", budget=BUTCE)
        bulunan = [m for m in isaretler if m in alinti]
        eksik = [m for m in isaretler if m not in alinti]
        durum = "✓" if len(bulunan) >= len(isaretler) * 0.5 else "✗"
        print(f"{durum} {baslik:<28} alinti={len(alinti):>5} kar. "
              f"isaret {len(bulunan)}/{len(isaretler)}")
        if eksik:
            print(f"     eksik: {eksik}")


async def uretim_testi(idx: int):
    from connect_db import SessionLocal
    from routers.ai import generate_lesson_slides_api, GenerateLessonSlidesRequest

    baslik, konu, isaretler = DERSLER[idx]
    req = GenerateLessonSlidesRequest(
        topic="Python Programlama", difficulty="Başlangıç", audience="Lise",
        lesson_number=idx + 1, lesson_title=baslik,
        lesson_objective=f"Öğrenci {konu} konusunu kaynaktaki örneklerle öğrenir.",
        modules=[{"type": "UNDERSTAND", "topic": konu},
                 {"type": "APPLY", "topic": f"{baslik} uygulaması"}],
        pdf_content=KAYNAK,
    )
    async with SessionLocal() as db:
        res = await generate_lesson_slides_api(req, teacher_id=1, db=db)

    print(f"\n{'='*72}\nDERS: {baslik}\n{'='*72}")
    tum = ""
    for deck in res.get("notes") or []:
        slides = deck.get("slides") or []
        print(f"\n--- {len(slides)} slayt ---")
        for i, s in enumerate(slides, 1):
            if s.get("type") == "challenge":
                cfg = s.get("challengeConfig") or {}
                tum += str(cfg)
                print(f"\n[{i}] UYGULAMA GÖREVİ: {cfg.get('title')}")
                print(f"    {cfg.get('prompt')}")
                print(f"    mod={cfg.get('checkMode')} beklenen={cfg.get('expectedOutput')!r}")
                continue
            parcalar = [str(e.get("content") or "") for e in (s.get("elements") or [])
                        if e.get("type") in ("text", "code", "sticky")]
            tum += "\n".join(parcalar)
            print(f"\n[{i}] " + "\n    ".join(p[:220] for p in parcalar if p))

    print(f"\n--- KAYNAK SADAKATİ ---")
    for m in isaretler:
        print(f"    {m[:34]:<36} {'VAR ✓' if m in tum else 'YOK ✗'}")

    # --- KALİTE DENETİMİ ---
    print(f"\n--- KOD GİRİNTİSİ (ham) ---")
    for deck in res.get("notes") or []:
        for s in deck.get("slides") or []:
            for e in s.get("elements") or []:
                if e.get("type") != "code":
                    continue
                satirlar = str(e.get("content") or "").split("\n")
                girintili = [l for l in satirlar if l.startswith(" ") or l.startswith("\t")]
                bloklu = [l for l in satirlar if l.rstrip().endswith(":")]
                durum = "✓" if (not bloklu or girintili) else "✗ GİRİNTİ YOK"
                print(f"    {durum}  {len(satirlar)} satır, {len(girintili)} girintili, "
                      f"{len(bloklu)} blok açan")
                if bloklu and not girintili:
                    print(f"       {str(e.get('content'))[:120]!r}")

    print(f"\n--- YARIM KALAN METİNLER ---")
    kesik = 0
    for deck in res.get("notes") or []:
        for s in deck.get("slides") or []:
            for e in s.get("elements") or []:
                if e.get("type") not in ("text", "sticky"):
                    continue
                c = str(e.get("content") or "").strip()
                # Başlıklar noktalamasız biter; yalnızca uzun metinleri denetle.
                if len(c) < 40:
                    continue
                if c[-1] not in ".!?:)»\"'`":
                    kesik += 1
                    print(f"    [{e.get('type')}] ...{c[-70:]!r}")
    print(f"    yarım kalan: {kesik}")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "secim"
    if arg == "secim":
        secim_testi()
    else:
        asyncio.run(uretim_testi(int(arg)))
