"""
UYGULA'ya özel "Mini Görev" slaydı.

Tasarım kararı: mini görev artık tuval üstünde sürüklenen bir widget değil,
oyun/quiz slaytları gibi KENDİ TİPİ olan tam bir slayt (`type: "challenge"`).
Widget hâlindeyken 490x289'luk bir kutuya sıkışıyordu; görev metni kesiliyor,
kod editörü ve test sonuçları aynı anda görünmüyordu.

Şablon `slideType: "challenge"` taşır ve tuval elemanı içermez; yapılandırmayı
AI, `elementContents` içinde "challenge" anahtarıyla JSON metni olarak verir.
"""
import json

from routers.ai import _build_challenge_slide, format_templates_summary

VALID = json.dumps({
    "title": "Asal Sayı Bulucu",
    "prompt": "Sayının asal olup olmadığını döndürün.",
    "submissionType": "code",
    "checkMode": "tests",
    "functionName": "asal_mi",
    "hint": "1 asal değildir.",
    "xp": 150,
    "samples": [{"input": "7", "output": "True"}],
    "tests": [
        {"call": "asal_mi(7)", "expected": "True"},
        {"call": "asal_mi(1)", "expected": "False"},
    ],
}, ensure_ascii=False)


def test_ozel_slayt_tipi_uretir():
    """Tuval elemanı DEĞİL, kendi tipi olan bir slayt olmalı."""
    s = _build_challenge_slide(VALID)
    assert s["type"] == "challenge"
    assert s["elements"] == []
    assert "challengeConfig" in s


def test_yapilandirma_alanlari_korunur():
    cfg = _build_challenge_slide(VALID)["challengeConfig"]
    assert cfg["title"] == "Asal Sayı Bulucu"
    assert cfg["functionName"] == "asal_mi"
    assert cfg["xp"] == 150
    assert cfg["samples"] == [{"input": "7", "output": "True"}]


def test_testlere_kimlik_atanir():
    """Frontend sonuçları id ile eşleştiriyor; AI id üretmez."""
    tests = _build_challenge_slide(VALID)["challengeConfig"]["tests"]
    assert [t["id"] for t in tests] == ["t1", "t2"]
    assert tests[0]["call"] == "asal_mi(7)"
    assert tests[0]["expected"] == "True"


def test_baslangic_kodu_fonksiyon_adindan_uretilir():
    cfg = _build_challenge_slide(VALID)["challengeConfig"]
    assert "def asal_mi(" in cfg["starterCode"]


def test_bozuk_json_guvenli_varsayilana_duser():
    """Slayt hiçbir koşulda boş/kırık kalmamalı."""
    s = _build_challenge_slide("{bozuk json")
    cfg = s["challengeConfig"]
    assert s["type"] == "challenge"
    assert cfg["functionName"] == "cozum"
    assert cfg["xp"] == 100
    assert cfg["tests"] == []


# --- teslim tipi ve değerlendirme modu ---------------------------------------

def test_kod_disi_teslimde_otomatik_kontrol_kapanir():
    """Metin/görsel/dosya cevabı Python'da çalıştırılamaz; öğretmen değerlendirir."""
    for st in ("text", "image", "file"):
        raw = json.dumps({"submissionType": st, "checkMode": "tests",
                          "tests": [{"call": "f()", "expected": "1"}]})
        cfg = _build_challenge_slide(raw)["challengeConfig"]
        assert cfg["submissionType"] == st
        assert cfg["checkMode"] == "manual"
        assert cfg["tests"] == []


def test_gecersiz_teslim_tipi_koda_duser():
    raw = json.dumps({"submissionType": "hologram"})
    assert _build_challenge_slide(raw)["challengeConfig"]["submissionType"] == "code"


def test_cikti_modunda_beklenen_cikti_korunur():
    """'Adını print ile yazdır' gibi görevlerde doğru cevap ekran çıktısıdır."""
    raw = json.dumps({"submissionType": "code", "checkMode": "output",
                      "expectedOutput": "Merhaba Dünya!"})
    cfg = _build_challenge_slide(raw)["challengeConfig"]
    assert cfg["checkMode"] == "output"
    assert cfg["expectedOutput"] == "Merhaba Dünya!"
    assert cfg["tests"] == []


def test_gecerli_testi_olmayan_test_modu_manuele_duser():
    """Testsiz 'tests' modu her şeyi sessizce geçmiş göstermemeli."""
    raw = json.dumps({"submissionType": "code", "checkMode": "tests",
                      "tests": [{"call": "", "expected": "True"}]})
    cfg = _build_challenge_slide(raw)["challengeConfig"]
    assert cfg["checkMode"] == "manual"


def test_baslangic_kodu_moda_gore_degisir():
    """Çıktı görevinde boş şablon, fonksiyon görevinde def iskeleti."""
    out_cfg = _build_challenge_slide(json.dumps(
        {"checkMode": "output", "expectedOutput": "x"}))["challengeConfig"]
    assert "def " not in out_cfg["starterCode"]

    test_cfg = _build_challenge_slide(json.dumps(
        {"checkMode": "tests", "functionName": "topla",
         "tests": [{"call": "topla(1)", "expected": "1"}]}))["challengeConfig"]
    assert "def topla(" in test_cfg["starterCode"]


def test_bos_icerik_de_calisir():
    s = _build_challenge_slide("")
    assert s["type"] == "challenge"
    assert s["challengeConfig"]["title"]


def test_gecersiz_xp_sayiya_duser():
    raw = json.dumps({"functionName": "f", "xp": "çok"})
    assert _build_challenge_slide(raw)["challengeConfig"]["xp"] == 100


def test_cagrisiz_test_atilir():
    """`call` boşsa test çalıştırılamaz; sessizce yeşil görünmesindense atılmalı."""
    raw = json.dumps({"checkMode": "tests",
                      "tests": [{"call": "", "expected": "True"},
                                {"call": "f(1)", "expected": "2"}]})
    tests = _build_challenge_slide(raw)["challengeConfig"]["tests"]
    assert len(tests) == 1
    assert tests[0]["call"] == "f(1)"


def test_prompt_ozetinde_ozel_sablon_isaretlenir():
    """AI, bu şablonun tuval değil özel slayt olduğunu görmeli."""
    summary = format_templates_summary([{
        "id": "tpl-1", "title": "Mini Görev (Özel Slayt)",
        "slideType": "challenge", "elements": [],
    }])
    assert "SPECIAL SLIDE (challenge)" in summary
    assert '"challenge"' in summary


def test_normal_sablon_ozetinde_elemanlar_listelenir():
    summary = format_templates_summary([{
        "id": "tpl-2", "title": "Metin Şablonu", "slideType": None,
        "elements": [{"id": "e1", "type": "text", "maxChars": 100,
                      "width": 500, "height": 200,
                      "style": {"fontSize": 28, "fontFamily": "Fredoka"}}],
    }])
    assert "SPECIAL SLIDE" not in summary
    assert "e1 (text" in summary
