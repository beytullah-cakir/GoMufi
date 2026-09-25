"""
BİRLEŞTİR ve ÜRET'e özel görev slaytları.

Uygula'nın özel slaytı (`type: "challenge"`) gibi bunlar da tuval elemanı
değil, kendi tipi olan tam slaytlar: `type: "connect"` ve `type: "produce"`.
Ortak alanlar (teslim şekli, dosyalar, ölçütler, testler) Uygula ile aynı
normalleştirmeden geçer; burada aşamaya özel alanlar sınanıyor.
"""
import json

from routers.ai import (
    _build_connect_slide,
    _build_produce_slide,
    _build_special_slide,
    _is_legacy_task_template,
    format_templates_summary,
    normalize_requirement_verdicts,
)
from routers.courses import normalize_slide, task_slide_titles


# --- BİRLEŞTİR ----------------------------------------------------------------

CONNECT = json.dumps({
    "title": "Not Ortalaması",
    "prompt": "Notları bir fonksiyonla ortala.",
    "submissionType": "code",
    "checkMode": "output",
    "criteria": [{"kind": "contains", "value": "Ortalama"}],
    "previousTopics": ["Döngüler", "Listeler", "Döngüler"],
    "currentTopic": "Fonksiyonlar",
    "requiredConstructs": ["for", "def", " ", "for"],
}, ensure_ascii=False)


def test_birlestir_kendi_tipinde_slayt_uretir():
    s = _build_connect_slide(CONNECT)
    assert s["type"] == "connect"
    assert s["elements"] == []
    assert "connectConfig" in s


def test_birlestir_kavram_koprusu_temizlenir():
    cfg = _build_connect_slide(CONNECT)["connectConfig"]
    # Tekrar ve boşluk atılır, sıra korunur.
    assert cfg["previousTopics"] == ["Döngüler", "Listeler"]
    assert cfg["currentTopic"] == "Fonksiyonlar"
    assert cfg["requiredConstructs"] == ["for", "def"]
    assert cfg["stage"] == "BİRLEŞTİR"


def test_birlestir_ortak_alanlari_korur():
    cfg = _build_connect_slide(CONNECT)["connectConfig"]
    assert cfg["title"] == "Not Ortalaması"
    assert cfg["criteria"] == [{"id": "k1", "kind": "contains", "value": "Ortalama"}]
    assert cfg["xp"] == 150


def test_birlestir_tek_konu_metni_listeye_cevrilir():
    """Model eski alışkanlıkla tek `previousTopic` metni verebilir."""
    raw = json.dumps({"previousTopic": "Döngüler, Koşullar"}, ensure_ascii=False)
    cfg = _build_connect_slide(raw)["connectConfig"]
    assert cfg["previousTopics"] == ["Döngüler", "Koşullar"]


def test_birlestir_kod_disi_teslimde_zorunlu_yapi_yok():
    """Metin cevabında aranacak kod yok; ölçüt olarak kalsaydı görev çözülemezdi."""
    raw = json.dumps({"submissionType": "text", "requiredConstructs": ["for"]})
    cfg = _build_connect_slide(raw)["connectConfig"]
    assert cfg["requiredConstructs"] == []
    assert cfg["checkMode"] == "manual"


def test_birlestir_bozuk_json_varsayilana_duser():
    s = _build_connect_slide("{bozuk")
    cfg = s["connectConfig"]
    assert s["type"] == "connect"
    assert cfg["title"] == "Birleştirme Görevi"
    assert cfg["previousTopics"] == []
    assert cfg["requiredConstructs"] == []


# --- ÜRET ---------------------------------------------------------------------

def test_uret_kendi_tipinde_slayt_uretir():
    s = _build_produce_slide(json.dumps({"projectTitle": "Hesap Makinesi"}))
    assert s["type"] == "produce"
    assert s["elements"] == []
    assert s["produceConfig"]["projectTitle"] == "Hesap Makinesi"
    assert s["produceConfig"]["xp"] == 200


def test_uret_gereksinim_yoksa_varsayilan_gelir():
    """Değerlendirilecek bir şey kalmalı; gereksinimsiz proje hiç tamamlanamazdı."""
    cfg = _build_produce_slide("")["produceConfig"]
    assert len(cfg["requirements"]) >= 3


def test_uret_gereksinimler_temizlenir_ve_sinirlanir():
    reqs = [f"Gereksinim {i}" for i in range(10)] + ["", "Gereksinim 1"]
    cfg = _build_produce_slide(json.dumps({"requirements": reqs}))["produceConfig"]
    assert cfg["requirements"] == [f"Gereksinim {i}" for i in range(6)]


def test_uret_beklenen_ciktidan_olcut_turetilmez():
    """Her öğrencinin projesi farklı çıktı verir; tek çıktı şablonu herkesi düşürürdü."""
    raw = json.dumps({"checkMode": "output", "expectedOutput": "Toplam: 42"})
    cfg = _build_produce_slide(raw)["produceConfig"]
    assert cfg["criteria"] == []
    assert cfg["expectedOutput"] == ""


def test_uret_acik_olcut_korunur():
    raw = json.dumps({"checkMode": "output",
                      "criteria": [{"kind": "contains", "value": "Hoş geldin"}]},
                     ensure_ascii=False)
    cfg = _build_produce_slide(raw)["produceConfig"]
    assert cfg["criteria"] == [{"id": "k1", "kind": "contains", "value": "Hoş geldin"}]


def test_nesne_olarak_gelen_yapilandirma_da_okunur():
    """Model JSON'u metin yerine nesne olarak verirse slayt varsayılana düşmemeli."""
    cfg = _build_produce_slide({"projectTitle": "Oyun"})["produceConfig"]
    assert cfg["projectTitle"] == "Oyun"


# --- şablon seçimi ve kurulum ---------------------------------------------------

def test_ozel_slayt_kurucusu_sablon_tipine_gore_secer():
    for kind, cfg_key in (("challenge", "challengeConfig"), ("connect", "connectConfig"),
                          ("produce", "produceConfig")):
        s = _build_special_slide({"slideType": kind}, {kind: "{}"})
        assert s["type"] == kind
        assert cfg_key in s


def test_tuval_sablonu_ozel_slayt_degildir():
    assert _build_special_slide({"elements": [{"type": "text"}]}, {"t1": "x"}) is None
    assert _build_special_slide(None, {}) is None


def test_yanlis_anahtarla_gelen_tek_json_kullanilir():
    """Model 'connect' yerine alışkanlıkla 'challenge' anahtarını kullanabilir."""
    raw = json.dumps({"currentTopic": "Fonksiyonlar"})
    s = _build_special_slide({"slideType": "connect"}, {"challenge": raw})
    assert s["connectConfig"]["currentTopic"] == "Fonksiyonlar"


def test_eski_widget_sablonlari_ayiklanir():
    assert _is_legacy_task_template({"elements": [{"type": "connection_task"}]})
    assert _is_legacy_task_template({"elements": [{"type": "production_task"}, {"type": "text"}]})
    assert not _is_legacy_task_template({"slideType": "connect", "elements": []})
    assert not _is_legacy_task_template({"elements": [{"type": "text"}]})


def test_prompt_ozetinde_birlestir_ve_uret_isaretlenir():
    summary = format_templates_summary([
        {"id": "c", "title": "Birleştir", "slideType": "connect", "elements": []},
        {"id": "p", "title": "Üret", "slideType": "produce", "elements": []},
    ])
    assert 'SPECIAL SLIDE (connect)' in summary
    assert 'elementId MUST be "connect"' in summary
    assert 'SPECIAL SLIDE (produce)' in summary
    assert 'elementId MUST be "produce"' in summary


# --- proje değerlendirmesi ----------------------------------------------------

def test_gereksinim_kararlari_listeye_hizalanir():
    parsed = {"results": [
        {"index": 2, "passed": True, "reason": "tamam"},
        {"index": 1, "passed": False, "reason": "eksik"},
        {"index": 2, "passed": False, "reason": "tekrar"},   # tekrar → atılır
        {"index": 9, "passed": True, "reason": "uydurma"},   # aralık dışı → atılır
        {"index": "x", "passed": True, "reason": ""},        # sayı değil → atılır
    ]}
    out = normalize_requirement_verdicts(parsed, 3)
    assert out == [
        {"index": 1, "passed": False, "reason": "eksik"},
        {"index": 2, "passed": True, "reason": "tamam"},
    ]


def test_gereksinim_karari_yalnizca_acik_true_ile_gecer():
    out = normalize_requirement_verdicts({"results": [{"index": 1, "passed": "evet"}]}, 1)
    assert out[0]["passed"] is False


def test_bozuk_karar_bos_liste_doner():
    assert normalize_requirement_verdicts(None, 3) == []
    assert normalize_requirement_verdicts({"results": "yok"}, 3) == []


# --- kurs uçları --------------------------------------------------------------

def test_disa_aktarim_birlestir_ve_uret_ayarlarini_korur():
    """normalize_slide yalnızca bildiği anahtarları kopyalıyor; eksikler düşüyordu."""
    slide = {"id": 1, "type": "connect", "connectConfig": {"title": "B"},
             "produceConfig": {"title": "U"}, "elements": []}
    out = normalize_slide(slide)
    assert out["connectConfig"] == {"title": "B"}
    assert out["produceConfig"] == {"title": "U"}


def test_teslim_listesinde_gorev_basligi_okunur():
    titles = task_slide_titles([
        ("Döngüler", [
            {"id": 11, "type": "challenge", "challengeConfig": {"title": "Sayaç"}},
            {"id": 12, "type": "connect", "connectConfig": {"title": "Ortalama"}},
            {"id": 13, "type": "produce", "produceConfig": {"title": "Proje Görevi", "projectTitle": "Oyun"}},
            {"id": 14, "type": "normal", "elements": []},
            "bozuk",
        ]),
        (None, None),
    ])
    assert titles == {
        "challenge:11": "Döngüler · Uygula: Sayaç",
        "connect:12": "Döngüler · Birleştir: Ortalama",
        "produce:13": "Döngüler · Üret: Oyun",
    }
