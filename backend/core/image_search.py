"""
Slayt görselleri — gerçek arama ile çözülür (ÜCRETSİZ, API anahtarı gerektirmez).

SORUN (eski davranış): loremflickr'a yalnızca URL kuruluyordu, hiç arama
yapılmıyordu. Anahtar kelime eşleşmeyince servis rastgele bir foto döndürüyordu
(pratikte hep kedi). Yani görsel, slaytın konusuyla alakasız oluyordu.

ÇÖZÜM: gerçek arama + kademeli daraltma + garantili anlamlı yedek.

Sağlayıcı sırası:
  1. Wikipedia PageImages — eğitim içeriği için en alakalısı. Konu makalesinin
     ana görselini verir; bunlar genelde diyagram/şema olur (mitoz döngüsü,
     fotosentez şeması, Roma askeri kıyafeti...). K-12 için ideal.
  2. Openverse (Creative Commons) — Wikipedia'da karşılık yoksa fotoğraf.
  3. Metinli placeholder — hiçbir şey bulunamazsa. ASLA rastgele/alakasız
     görsel döndürmez; öğretmen builder'da kolayca değiştirebilsin diye
     üstünde aranan konu yazar.

MALİYET: üçü de ücretsiz ve anahtarsız. AI görsel üretimi (Imagen/Gemini
Image) görsel başına ~$0.02-0.04'tür; tipik bir derste birkaç görselle bu,
dersin TÜM metin üretim maliyetinin katbekat üstüne çıkardı — bu yüzden
bilinçli olarak tercih edilmedi.
"""
import re
import urllib.parse
from typing import List, Optional

import httpx

# Wikipedia API politikası: tanımlayıcı bir User-Agent zorunlu.
_UA = "GoMufi/1.0 (K-12 education platform; slide illustration lookup)"

# Tek çağrı için üst sınır — yavaş bir sağlayıcı ders üretimini kilitlemesin.
_TIMEOUT = httpx.Timeout(4.0, connect=3.0)

# Aynı sorgu ders/kurs üretimi boyunca tekrar tekrar gelebilir; süreç içi önbellek.
_cache: dict = {}
_CACHE_MAX = 500

# AI görsel sorgusunu İngilizce üretir. Ama üretmediğinde (is_fallback) elimizde
# Türkçe modül başlığı kalır — bu küçük sözlük en sık geçen terimleri çevirir.
_TR_EN = {
    "giris": "introduction", "nedir": "about", "kurulum": "setup",
    "ortami": "workspace", "tarih": "history", "cografya": "geography",
    "matematik": "mathematics", "fizik": "physics", "kimya": "chemistry",
    "biyoloji": "biology", "operatorler": "operators", "degiskenler": "variables",
    "fonksiyon": "function", "fonksiyonlar": "functions", "dongu": "loop",
    "donguler": "loops", "kosul": "condition", "kosullar": "conditionals",
    "liste": "list", "listeler": "lists", "sozluk": "dictionary",
    "veri": "data", "tipleri": "types", "hucre": "cell", "bolunme": "division",
    "fotosentez": "photosynthesis", "gezegen": "planet", "uzay": "space",
    "kesir": "fraction", "kesirler": "fractions", "geometri": "geometry",
    "cumle": "sentence", "kelime": "word", "dilbilgisi": "grammar",
    # Ders/alan adları — kurs bağlamı da bu sözlükten geçtiği için kritik:
    # çevrilmemiş bir alan adı ("programlama") aramayı saptırıyor.
    "programlama": "programming", "yazilim": "software", "kodlama": "coding",
    "bilgisayar": "computer", "algoritma": "algorithm", "veritabani": "database",
    "ingilizce": "english", "turkce": "turkish", "edebiyat": "literature",
    "muzik": "music", "sanat": "art", "resim": "painting", "beden": "sports",
    "bolunmesi": "division", "bolunme": "division", "tipler": "types",
    "tipleri": "types", "dizi": "array", "diziler": "arrays", "sinif": "class",
    "nesne": "object", "hata": "error", "test": "testing", "proje": "project",
    "gelistirme": "development", "calisma": "study",
    "temel": "basic", "ileri": "advanced", "genel": "general", "ornek": "example",
    "ornekler": "examples", "uygulama": "application", "uygulamalar": "applications",
}

_TR_TABLE = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")

# Anlam taşımayan, aramayı daraltıp sonucu sıfırlayan kelimeler.
_STOPWORDS = {"the", "a", "an", "of", "for", "and", "with", "in", "on", "to", "ile", "ve"}

# İyelik/çekim ekleri — sözlükte "kurulum" var ama modül başlığında çoğu zaman
# "kurulumu" (iyelik ekli) geçiyor. Ek olmadan sözlükte bulunamayan kelime hem
# çeviriden hem de Türkçe tespitinden kaçıp arama sorgusuna gürültü olarak
# karışıyordu (ör. "kurulumu" tek başına Wikipedia'da alakasız bir demiryolu
# makalesine eşleşti). Kısa ekleri sırayla deneyip sözlükte tekrar ara.
_POSSESSIVE_SUFFIXES = ("si", "sı", "su", "sü", "i", "ı", "u", "ü")


def _dict_lookup(w: str) -> Optional[str]:
    if w in _TR_EN:
        return _TR_EN[w]
    for suf in _POSSESSIVE_SUFFIXES:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            stem = w[: -len(suf)]
            if stem in _TR_EN:
                return _TR_EN[stem]
    return None


def _keywords(query: str) -> tuple:
    """
    Sorguyu (çevrilebilen, çevrilemeyen) anahtar kelimelere ayırır.

    çevrilebilen : sözlükten İngilizceye çevrilmiş ya da zaten İngilizce olan
    çevrilemeyen : sözlükte olmayan Türkçe kelime — aramada gürültü yaratır
    """
    cleaned = (query or "").translate(_TR_TABLE).lower()
    words = [w for w in re.split(r"[^a-zA-Z0-9]+", cleaned) if w]

    known: List[str] = []
    unknown: List[str] = []
    for w in words:
        translated = _dict_lookup(w)
        if translated:
            known.append(translated)
        elif w in _STOPWORDS:
            continue
        elif w.isalnum():
            (unknown if _looks_turkish(w) else known).append(w)

    return list(dict.fromkeys(known)), list(dict.fromkeys(unknown))


# Türkçeye özgü çekim ekleri — sözlükte bulunmayan bir kelimenin Türkçe mi yoksa
# AI'nin ürettiği İngilizce mi olduğunu ayırt eder. Kaba ama amaca yeter: yanlış
# sınıflandırma en fazla kelime sırasını değiştirir, sonucu bozmaz.
# Not: -dan/-den eki bilinçli olarak DIŞARIDA — İngilizcede de çok yaygın
# (garden, hidden, golden) ve yanlış sınıflandırmaya yol açıyordu.
_TR_HINT = re.compile(
    r"(lari|leri|ligi|lugu|lugi|cilik|ciligi|imiz|iniz|mesi|masi|cik)$"
)


def _looks_turkish(w: str) -> bool:
    return bool(_TR_HINT.search(w))


def _variants(known: List[str], unknown: List[str], ctx: List[str], is_fallback: bool) -> List[str]:
    """
    Denenecek arama ifadeleri (en alakalıdan en genişe, en fazla 3 istek).

    ÖLÇÜLEN İKİ SORUN, İKİ ÇÖZÜM:
    1) 'cell division biology microscope' gibi 4+ kelimelik dar sorgular arama
       servislerinde 0 sonuç veriyor → kademeli olarak kısalt.
    2) 'cell' / 'loops' gibi tek genel kelime Wikipedia'da absürt eşleşiyor
       (ör. 'loops' → Froot Loops mısır gevreği) → kurs bağlamını ekle
       ('loops python programming' → Python (programming language)).
    """
    out: List[str] = []

    def add(parts: List[str]):
        v = " ".join(dict.fromkeys([p for p in parts if p]))
        if v and v not in out:
            out.append(v)

    if is_fallback:
        # Türkçe modül başlığından geldik: çevrilemeyen kelimeleri hiç kullanma
        # (aramayı saptırıp alakasız makaleye götürüyorlar) ve bağlamı öne al.
        if known:
            add(known + ctx)
            add(known)
    else:
        # AI'nin ürettiği betimleyici İngilizce sorgu — olduğu gibi en iyisi.
        full = known + unknown
        add(full)
        if len(full) > 2:
            add(full[:2])
        add(full[:1] + ctx)

    return out[:3]


def _relevant(title: str, must_include: Optional[List[str]]) -> bool:
    """
    Wikipedia'nın tam-metin araması gevşek eşleşmeler de döndürür — sorguyla
    hiç ilgisi olmayan bir makale üst sırada çıkabilir (ölçüldü: "kurulumu"
    tek başına alakasız bir demiryolu makalesine, saptırılmış bir sorgu ise
    Koch kar tanesi/L-sistem fractal görseline eşleşti). must_include
    verildiyse başlık bunlardan en az birini içermeli, yoksa sonuç atlanır —
    yanlış ama "bir şey" göstermektense hiçbir şey göstermemek (sonraki
    sağlayıcıya/placeholder'a düşülür) daha güvenli.
    """
    if not must_include:
        return True
    t = title.lower()
    return any(k in t for k in must_include)


async def _wikipedia(client: httpx.AsyncClient, q: str, must_include: Optional[List[str]] = None) -> Optional[str]:
    """Konu makalesinin ana görseli. Eğitimde en alakalı sonucu bu verir."""
    try:
        r = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query", "format": "json", "generator": "search",
                "gsrsearch": q, "gsrlimit": 3,
                "prop": "pageimages", "piprop": "thumbnail",
                "pithumbsize": 800, "pilimit": 3,
            },
        )
        r.raise_for_status()
        pages = ((r.json().get("query") or {}).get("pages") or {}).values()
        # Arama sırasına sadık kal (index küçük = daha alakalı)
        for p in sorted(pages, key=lambda p: p.get("index", 99)):
            if not _relevant(p.get("title") or "", must_include):
                continue
            src = (p.get("thumbnail") or {}).get("source")
            if src:
                # URL'yi ASLA elle kurma — Wikimedia yalnızca kendi verdiği
                # thumbnail boyutlarını kabul ediyor (aksi halde HTTP 400).
                return src
    except Exception:
        return None
    return None


async def _openverse(client: httpx.AsyncClient, q: str, must_include: Optional[List[str]] = None) -> Optional[str]:
    """
    Creative Commons fotoğraf havuzu — Wikipedia'da karşılık yoksa.

    Openverse, Flickr gibi küratörsüz kaynaklardan geldiği için Wikipedia'dan
    daha gevşek eşleşiyor (ölçüldü: "python setup" araması alakasız bir LEGO
    Technic fotoğrafına eşleşti) — Wikipedia'daki aynı alaka filtresi burada da
    uygulanır. `url` (kaynağın kendi CDN'i) `thumbnail` (Openverse proxy'si)
    yerine tercih edilir: proxy bazı istemcilerden kırık görsel döndürüyordu.
    """
    try:
        r = await client.get(
            "https://api.openverse.org/v1/images/",
            params={"q": q, "page_size": 3},
        )
        r.raise_for_status()
        for res in r.json().get("results") or []:
            if not _relevant(res.get("title") or "", must_include):
                continue
            url = res.get("url") or res.get("thumbnail")
            if url:
                return url
    except Exception:
        return None
    return None


def _placeholder(query: str) -> str:
    """
    Son çare. Rastgele bir foto yerine, üstünde konu yazan nötr bir görsel:
    öğretmen builder'da neyin eksik olduğunu görür ve tek tıkla değiştirir.
    """
    label = (query or "Görsel").strip()[:40] or "Görsel"
    return (
        "https://placehold.co/640x480/e2e8f0/475569?text="
        + urllib.parse.quote(label)
    )


async def resolve_image_url(query: str, is_fallback: bool = False, context: str = "") -> str:
    """
    Slayt görseli için gerçek bir URL döndürür. Her zaman bir string döner.

    query:       AI'nin ürettiği İngilizce arama ifadesi ya da (üretmediyse)
                 modülün Türkçe başlığı.
    is_fallback: True ise query Türkçe modül başlığından geliyordur.
    context:     Kurs konusu (ör. "Python Programlama"). Genel kelimelerin
                 alakasız makaleye eşleşmesini engeller — bkz. _variants.
    """
    known, unknown = _keywords(query)
    ctx_known, _ = _keywords(context)
    ctx = ctx_known[:2]

    variants = _variants(known, unknown, ctx, is_fallback)
    if not variants:
        return _placeholder(query)

    cache_key = "|".join(variants)
    if cache_key in _cache:
        return _cache[cache_key]

    url: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers={"User-Agent": _UA}) as client:
            for variant in variants:
                # 4+ harfli kelimeler "önemli" sayılır (vs, ve, code gibi kısa/
                # bağlam kelimeleri tek başına alaka kanıtı olamaz).
                sig = [w for w in variant.split() if len(w) >= 4] or None
                url = await _wikipedia(client, variant, must_include=sig)
                if url:
                    break
            if not url:
                # Openverse'i yalnızca en alakalı 1-2 varyantla dene (istek tasarrufu)
                for variant in variants[:2]:
                    sig = [w for w in variant.split() if len(w) >= 4] or None
                    url = await _openverse(client, variant, must_include=sig)
                    if url:
                        break
    except Exception:
        url = None

    final = url or _placeholder(query)

    if len(_cache) < _CACHE_MAX:
        _cache[cache_key] = final
    return final
