r"""Ödev yönergesindeki kaçmış satır sonları.

Ölçülen hata: ekranda `...oluşturun.\n\n1. kitaplar adında...` şeklinde ters bölü
ve n harfi GÖRÜNÜYORDU. Model JSON'a satır sonunu çift kaçışla yazınca ayrıştırma
sonrası elde iki ayrı karakter kalıyor.
"""
from routers.ai import _unescape_newlines


def test_kacmis_satir_sonu_gercek_satir_sonuna_cevrilir():
    girdi = "Adım 1.\\n\\n2. Sonraki adım"
    assert _unescape_newlines(girdi) == "Adım 1.\n\n2. Sonraki adım"
    assert "\\n" not in _unescape_newlines(girdi)


def test_gercek_satir_sonu_bozulmaz():
    girdi = "Adım 1.\n\n2. Sonraki adım"
    assert _unescape_newlines(girdi) == girdi


def test_windows_satir_sonu():
    assert _unescape_newlines("a\\r\\nb") == "a\nb"


def test_sekme_de_cevrilir():
    assert _unescape_newlines("a\\tb") == "a\tb"


def test_bos_ve_none_guvenli():
    assert _unescape_newlines("") == ""
    assert _unescape_newlines(None) is None


def test_kacissiz_metne_dokunmaz():
    girdi = "Değişken adları harf veya alt çizgi ile başlamalıdır."
    assert _unescape_newlines(girdi) == girdi


def test_tek_ters_boludan_sonra_farkli_harf_korunur():
    r"""`\d` gibi diziler satır sonu değildir; bozulmamalı."""
    girdi = r"Düzenli ifadede \d bir rakamı temsil eder."
    assert _unescape_newlines(girdi) == girdi
