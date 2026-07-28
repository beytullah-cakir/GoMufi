"""Öğretmenin yüklediği kaynak PDF'in derse doğru bölümünün gitmesi.

Ölçülen hata: `pdf_content[:30000]` kör bir ön kesmeydi. 200 sayfalık bir kitabın
ilk ~12 sayfası HER derse gidiyordu; 6. dersin slaytları kendi bölümünü hiç
görmüyor, model de kaynağı yok sayıp genel bilgisinden üretiyordu.
"""
from routers.ai import (
    _PDF_CHUNK,
    _pdf_keywords,
    _pdf_source_block,
    _select_pdf_excerpt,
)


def kitap_uret() -> str:
    """Her bölümü kendi konusundan bahseden, bütçeyi kat kat aşan sahte kitap."""
    bolumler = {
        "Değişkenler": "Değişken tanımlama ve değişken isimlendirme kuralları. ",
        "Döngüler": "Döngü kurmak: while döngüsü ve for döngüsü karşılaştırması. ",
        "Fonksiyonlar": "Fonksiyon tanımı, fonksiyon çağırma ve parametre aktarımı. ",
        "Sözlükler": "Sözlük veri yapısı, sözlük anahtarı ve sözlük güncelleme. ",
    }
    metin = ""
    for baslik, govde in bolumler.items():
        metin += f"\n=== {baslik} ===\n" + govde * 400
    return metin


# --- seçim ---------------------------------------------------------------------

def test_butceye_sigan_kaynak_aynen_gecer():
    kisa = "Kısa bir ders notu."
    assert _select_pdf_excerpt(kisa, "Döngüler", budget=10000) == kisa


def test_derse_ait_bolum_secilir_ilk_bolum_degil():
    """Asıl hata buydu: 'Sözlükler' dersine kitabın başı gidiyordu."""
    kitap = kitap_uret()
    secilen = _select_pdf_excerpt(kitap, "Sözlükler ve sözlük güncelleme", budget=6000)

    assert "sözlük" in secilen.casefold()
    assert len(secilen) <= 6000
    # Kör ön kesme olsaydı sonuç "Değişkenler" bölümüyle başlardı.
    assert secilen[:200].casefold().count("değişken") == 0


def test_her_ders_kendi_bolumunu_alir():
    kitap = kitap_uret()
    for konu, beklenen in [
        ("Değişkenler", "değişken"),
        ("Döngüler", "döngü"),
        ("Fonksiyonlar", "fonksiyon"),
        ("Sözlükler", "sözlük"),
    ]:
        secilen = _select_pdf_excerpt(kitap, konu, budget=5000).casefold()
        assert beklenen in secilen, f"{konu} dersi kendi bölümünü almadı"


def test_butce_asilmaz():
    kitap = kitap_uret()
    for butce in (2000, 5000, 20000):
        assert len(_select_pdf_excerpt(kitap, "Fonksiyonlar", butce)) <= butce


def test_atlanan_yer_isaretlenir():
    """Model iki uzak parçayı bitişik metin sanmamalı."""
    kitap = kitap_uret()
    secilen = _select_pdf_excerpt(kitap, "Değişkenler Sözlükler", budget=8000)
    assert "[...]" in secilen


def test_kaynak_sirasi_korunur():
    """Parçalar puana göre değil, KİTAPTAKİ sırayla dizilmeli."""
    kitap = kitap_uret()
    secilen = _select_pdf_excerpt(kitap, "Değişkenler Sözlükler", budget=8000)
    assert secilen.casefold().index("değişken") < secilen.casefold().index("sözlük")


def test_ilgisiz_ders_kor_kesmeye_duser():
    """Kaynakta dersle ilgili hiçbir iz yoksa davranış eskisinden kötü olmamalı."""
    kitap = kitap_uret()
    secilen = _select_pdf_excerpt(kitap, "Osmanlı Tarihi Padişahları", budget=4000)
    assert secilen == kitap.strip()[:4000]


def test_bos_kaynak_bos_doner():
    assert _select_pdf_excerpt("", "Döngüler") == ""
    assert _select_pdf_excerpt("   ", "Döngüler") == ""


# --- anahtar kelime çıkarımı ---------------------------------------------------

def test_ayirt_edici_olmayan_kelimeler_elenir():
    """'Ders 5: Döngülere Giriş' -> sadece 'döngülere' ayırt edicidir."""
    keys = _pdf_keywords("Ders 5: Döngülere Giriş konusu")
    assert "döngülere" in keys
    for gurultu in ("ders", "giriş", "konusu"):
        assert gurultu not in keys


def test_kisa_kelimeler_elenir():
    assert _pdf_keywords("bir de ki ya") == set()


# --- prompt bloğu --------------------------------------------------------------

def test_blok_kaynak_sinirlarini_isaretler():
    blok = _pdf_source_block("Kitaptaki özel örnek: mufi_toplam(4271).", "Fonksiyonlar")
    assert "BEGIN SOURCE MATERIAL" in blok
    assert "END SOURCE MATERIAL" in blok
    assert "mufi_toplam(4271)" in blok


def test_blok_kaynagi_model_bilgisinin_ustune_koyar():
    """Tek satırlık eski talimat, büyük harfli diğer kurallar arasında eziliyordu."""
    blok = _pdf_source_block("Bir şeyler.", "Fonksiyonlar")
    assert "HIGHEST AUTHORITY" in blok
    assert "INVALID OUTPUT" in blok


def test_kaynaksizsa_blok_bos():
    assert _pdf_source_block("", "Fonksiyonlar") == ""
    assert _pdf_source_block("   ", "Fonksiyonlar") == ""


def test_parca_boyutu_makul():
    """Parça çok büyükse seçim kabalaşır, çok küçükse cümle ortasından böler."""
    assert 500 <= _PDF_CHUNK <= 4000
