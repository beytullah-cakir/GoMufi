"""PDF kaynak yukleme ozelligi ucdan uca calisiyor mu?

Ayirt edici isaretler iceren bir PDF uretir (genel bilgiden ASLA turetilemeyecek
fonksiyon adi / sabit), pypdf ile metni cikarir, sonra o metni gercek slayt
uretimine `pdf_content` olarak verir ve isaretlerin slaytlara gecip gecmedigine bakar.
"""
import asyncio, io, logging, sys
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

SATIRLAR = [
    "GOMUFI PYTHON KAYNAK NOTU - BOLUM 7",
    "",
    "Bu bolumde mufi_gizli_toplam fonksiyonunu ogrenecegiz.",
    "",
    "Ornek 1: mufi_gizli_toplam(4271) cagrisi 8542 dondurur.",
    "Fonksiyon her zaman girdisini ZORLU_KATSAYI ile carpar.",
    "ZORLU_KATSAYI sabiti 2 degerine esittir.",
    "",
    "Ornek 2:",
    "    def mufi_gizli_toplam(sayi):",
    "        ZORLU_KATSAYI = 2",
    "        return sayi * ZORLU_KATSAYI",
    "",
    "Ogrenciler bu fonksiyonu KIRMIZI_DEFTER adli dosyaya yazmalidir.",
    "Kitaptaki tum ornekler 4271 sayisi uzerinden anlatilir.",
]

ISARETLER = ["mufi_gizli_toplam", "ZORLU_KATSAYI", "4271", "KIRMIZI_DEFTER", "8542"]


def pdf_uret() -> bytes:
    """Sikistirilmamis, tek sayfalik gecerli bir PDF kurar (xref ofsetleri dahil)."""
    metin = "BT /F1 11 Tf 40 750 Td 14 TL\n"
    for satir in SATIRLAR:
        kacisli = satir.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
        metin += f"({kacisli}) Tj T*\n"
    metin += "ET"
    akis = metin.encode("latin-1")

    nesneler = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(akis)).encode() + b" >>\nstream\n" + akis + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    ofsetler = []
    for i, govde in enumerate(nesneler, start=1):
        ofsetler.append(len(out))
        out += f"{i} 0 obj\n".encode() + govde + b"\nendobj\n"

    xref_at = len(out)
    out += f"xref\n0 {len(nesneler) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in ofsetler:
        out += f"{off:010d} 00000 n \n".encode()
    out += (f"trailer\n<< /Size {len(nesneler) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_at}\n%%EOF\n").encode()
    return bytes(out)


def metin_cikar(pdf_bytes: bytes) -> str:
    """routers/ai.py:1166-1174 ile AYNI mantik."""
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(pdf_bytes))
    cikan = ""
    for page in reader.pages:
        t = page.extract_text()
        if t:
            cikan += t + "\n"
    return cikan


async def main():
    pdf_bytes = pdf_uret()
    print(f"--- 1. ADIM: PDF uretildi ({len(pdf_bytes)} bayt)")

    metin = metin_cikar(pdf_bytes)
    print(f"--- 2. ADIM: pypdf {len(metin)} karakter cikardi")
    print(repr(metin[:300]))
    eksik = [m for m in ISARETLER if m not in metin]
    print(f"    cikarilan metinde EKSIK isaretler: {eksik or 'YOK ✓'}")
    if eksik:
        print("    !! Cikarim asamasi bozuk, slayt uretimine gecmeye gerek yok.")
        return

    if "--only-extract" in sys.argv:
        return

    from connect_db import SessionLocal
    from routers.ai import generate_lesson_slides_api, GenerateLessonSlidesRequest

    req = GenerateLessonSlidesRequest(
        topic="Python Programlama",
        difficulty="Başlangıç",
        audience="Lise",
        lesson_number=7,
        lesson_title="Fonksiyonlar",
        lesson_objective="Öğrenci kaynak kitaptaki fonksiyonu tanır ve kullanır.",
        modules=[{"type": "UNDERSTAND", "topic": "Kaynaktaki fonksiyon ve sabiti"},
                 {"type": "APPLY", "topic": "Fonksiyonu uygula"}],
        pdf_content=metin,
    )
    async with SessionLocal() as db:
        res = await generate_lesson_slides_api(req, teacher_id=1, db=db)

    tum_metin = ""
    for deck in res.get("notes") or []:
        for s in deck.get("slides") or []:
            for e in s.get("elements") or []:
                tum_metin += str(e.get("content") or "") + "\n"
            cfg = s.get("challengeConfig")
            if cfg:
                tum_metin += str(cfg) + "\n"

    print(f"\n--- 3. ADIM: uretilen slayt metni {len(tum_metin)} karakter")
    for m in ISARETLER:
        print(f"    {m:<20} {'VAR ✓' if m in tum_metin else 'YOK ✗'}")
    print("\n--- uretilen icerik ---")
    print(tum_metin[:1500])

asyncio.run(main())
