"""
Slayt görseli çözümleme — sorgu kurma mantığı (ağ erişimi gerektirmez).

Regresyon bağlamı: eski akış loremflickr'a yalnızca URL kuruyordu ve eşleşme
bulunmayınca rastgele foto (pratikte hep kedi) dönüyordu. Buradaki testler
yeni akışın iki ölçülmüş tuzağa karşı korunmasını sağlar:
  1) çok dar sorgular arama servislerinde 0 sonuç veriyor → kademeli kısaltma
  2) tek genel kelime absürt eşleşiyor ('loops' → Froot Loops) → kurs bağlamı
"""
from core import image_search as img


def test_turkce_baslik_ingilizceye_cevrilir():
    known, unknown = img._keywords("Hücre Bölünmesi")
    assert known == ["cell", "division"]
    assert unknown == []


def test_cevrilemeyen_turkce_kelime_ayrilir():
    """Sözlükte olmayan Türkçe kelime aramayı saptırır; ayrı kovaya düşmeli."""
    known, unknown = img._keywords("Osmanlıcılık Akımları")
    assert "akimlari" in unknown
    assert "akimlari" not in known


def test_fallback_cevrilemeyen_kelimeyi_kullanmaz():
    """
    Türkçe modül başlığından gelen aramada çevrilemeyen kelime KULLANILMAMALI —
    ölçüldü: 'cell bolunmesi' Wikipedia'da alakasız bir biyografiye eşleşiyordu.
    """
    variants = img._variants(["cell"], ["bolunmesi"], ["biology"], is_fallback=True)
    assert all("bolunmesi" not in v for v in variants)
    assert variants[0] == "cell biology"


def test_fallback_kurs_baglamini_one_alir():
    """'loops' tek başına Froot Loops mısır gevreğine eşleşiyordu."""
    variants = img._variants(["loops"], [], ["python", "programming"], is_fallback=True)
    assert variants[0] == "loops python programming"
    assert "loops" in variants  # bağlamlı arama boş dönerse geniş sorgu denenir


def test_ai_sorgusu_kademeli_kisaltilir():
    """4+ kelimelik dar sorgular 0 sonuç veriyor; kısaltılmış varyant üretilmeli."""
    words = ["cell", "division", "biology", "microscope"]
    variants = img._variants(words, [], ["biology"], is_fallback=False)
    assert variants[0] == "cell division biology microscope"
    assert "cell division" in variants
    assert len(variants) <= 3  # istek sayısı sınırlı


def test_bos_sorgu_placeholder_uretir():
    known, unknown = img._keywords("")
    assert not img._variants(known, unknown, [], is_fallback=False)
    assert "placehold.co" in img._placeholder("")


def test_placeholder_asla_rastgele_foto_degil():
    """Son çare, konu yazan nötr bir görsel olmalı — rastgele foto servisi DEĞİL."""
    url = img._placeholder("Fotosentez")
    assert "loremflickr" not in url
    assert "Fotosentez" in url or "Fotosentez".replace("ı", "i") in url


def test_ders_alan_adlari_sozlukte():
    """Kurs bağlamı da sözlükten geçer; çevrilmeyen alan adı aramayı saptırıyordu."""
    known, _ = img._keywords("Python Programlama")
    assert known == ["python", "programming"]
