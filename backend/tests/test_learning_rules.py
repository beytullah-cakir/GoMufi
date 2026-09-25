"""
Öğrenme analitiğinin kuralları: kavram eşleme, hakimiyet, takılma tespiti.

Öğretmen "neden zorlanıyor diyor?" diye sorduğunda cevabın doğru olması
gerekiyor; bu kurallar sayfadaki her kırmızı hücrenin gerekçesi.
"""
from datetime import datetime, timedelta

from learning_analytics import (
    Evidence, apply_event_to_progress, evidences_for_event, is_stuck, is_stuck_now,
    mastery_status, root_causes, task_stats, update_mastery,
)
from learning_concepts import construct_concept, error_concept, parse_error

NOW = datetime(2026, 9, 25, 12, 0, 0)


# --- hata türü ve yapı -> kavram ------------------------------------------------

def _trace(code_line, error):
    return f'Traceback (most recent call last):\n  File "main.py", line 3\n    {code_line}\n{error}'


def test_hata_izinden_tur_satir_ve_kod():
    kind, line, message, code = parse_error(_trace("print(y)", "NameError: name 'y' is not defined"))
    assert (kind, line, code) == ("NameError", 3, "print(y)")
    assert "not defined" in message


def test_hata_turunden_kavram():
    cases = {
        "NameError: name 'x' is not defined": "degisken_atama",
        'TypeError: can only concatenate str (not "int") to str': "tip_donusumu",
        "ValueError: invalid literal for int() with base 10: 'on'": "tip_donusumu",
        "IndexError: list index out of range": "liste_indeksleme",
        "IndexError: string index out of range": "string_indeksleme",
        "KeyError: 'ad'": "sozluk_kullanimi",
        "ZeroDivisionError: division by zero": "aritmetik_operatorler",
        "EOFError: EOF when reading a line": "kullanicidan_girdi",
    }
    for error, concept in cases.items():
        assert error_concept(_trace("x", error))[2] == concept, error


def test_sozdizimi_hatasinda_satirin_anahtar_kelimesi():
    """"invalid syntax" bir şey söylemez; hatanın olduğu `for` satırı söyler."""
    trace = _trace("for i in range(5)", "SyntaxError: expected ':'")
    assert error_concept(trace)[2] == "for_dongusu"


def test_zaman_asimi_sonsuz_donguye_isaret():
    assert error_concept("Kod 10 saniyede bitmedi.")[0:3:2] == ("Timeout", "while_dongusu")


def test_sozlukte_olmayan_kavram_kullanilmaz():
    trace = _trace("x", "KeyError: 'a'")
    assert error_concept(trace, known=["for_dongusu"])[2] is None
    assert construct_concept("for", known=["while_dongusu"]) is None
    assert construct_concept("for") == "for_dongusu"


# --- olaydan kanıt ----------------------------------------------------------------

NODE = ["for_dongusu", "range_kullanimi"]


def test_ilk_denemede_cozum_modul_kavramlarina_basari():
    ev = evidences_for_event({"type": "check", "outcome": "pass", "attempt": 1}, NODE, "for_dongusu")
    by = {e.concept_id: e for e in ev}
    assert by["for_dongusu"].value == 1.0 and by["for_dongusu"].weight == 1.0
    assert by["range_kullanimi"].weight == 0.5


def test_yapistirilmis_cozum_zayif_kanit():
    """Dışarıdan yapıştırılmış çözüm "kavramı biliyor" sayılmaz."""
    ev = evidences_for_event({"type": "check", "outcome": "pass", "attempt": 1},
                             NODE, "for_dongusu", own_share=0.1)
    assert max(e.weight for e in ev) <= 0.2


def test_dusen_yapi_olcutu_kendi_kavramina_yazilir():
    event = {"type": "check", "outcome": "fail", "attempt": 1, "checks": [
        {"kind": "code", "value": "def", "status": "fail", "label": "Kodda def kullanıldı"},
    ]}
    ev = evidences_for_event(event, NODE, "for_dongusu")
    assert [(e.concept_id, e.value) for e in ev] == [("fonksiyon_tanimlama", 0.0)]


def test_hata_kavrami_birincile_tercih_edilir():
    event = {"type": "check", "outcome": "error", "attempt": 1, "error_concept": "tip_donusumu"}
    ev = evidences_for_event(event, NODE, "for_dongusu")
    assert [e.concept_id for e in ev] == ["tip_donusumu"]


def test_tekrarlayan_hatalar_azalarak_sayilir():
    first = evidences_for_event({"type": "check", "outcome": "error", "attempt": 1}, NODE, "for_dongusu")
    fifth = evidences_for_event({"type": "check", "outcome": "error", "attempt": 5}, NODE, "for_dongusu")
    assert fifth[0].weight < first[0].weight / 4


def test_koc_puan_degistirmez_yanilgi_yazar():
    ev = evidences_for_event({"type": "coach", "concept_id": "range_kullanimi",
                              "misconception": "range(5)'in 5'i de ürettiğini sanıyor"}, NODE, "for_dongusu")
    assert ev[0].weight == 0 and ev[0].misconception


def test_ogretmen_notu_en_guclu_kanit():
    ev = evidences_for_event({"type": "homework_graded", "grade": 40}, NODE, "for_dongusu")
    primary = next(e for e in ev if e.concept_id == "for_dongusu")
    assert primary.value == 0.4 and primary.weight > 1.0


def test_odev_zayifligi_kavramina_yazilir():
    ev = evidences_for_event({"type": "homework_review", "score": 70, "weaknesses": [
        {"conceptId": "range_kullanimi", "misconception": "üst sınırı dahil sanıyor"},
        {"conceptId": "uydurma_kavram"},
    ]}, NODE, "for_dongusu", known=NODE)
    by = {e.concept_id: e for e in ev}
    assert by["range_kullanimi"].value == 0.0
    assert by["range_kullanimi"].misconception == "üst sınırı dahil sanıyor"
    assert "uydurma_kavram" not in by


# --- hakimiyet ----------------------------------------------------------------

def test_hakimiyet_kanitla_ilerler():
    row = {}
    for _ in range(3):
        update_mastery(row, Evidence("for_dongusu", 1.0, 1.0), NOW)
    assert mastery_status(row["score"], row["evidence_weight"]) == "hakim"


def test_tek_kanit_veri_az_sayilir():
    row = update_mastery({}, Evidence("x", 0.0, 0.5), NOW)
    assert mastery_status(row["score"], row["evidence_weight"]) == "veri_az"


def test_tekrarlayan_basarisizlik_zorlaniyor():
    row = {}
    for _ in range(3):
        update_mastery(row, Evidence("x", 0.0, 1.0), NOW)
    assert mastery_status(row["score"], row["evidence_weight"]) == "zorlaniyor"


def test_agirliksiz_kanit_yalnizca_yanilgi_yazar():
    row = update_mastery({"score": 0.8, "evidence_weight": 3.0}, Evidence("x", 0.0, 0.0, "yanlış fikir"), NOW)
    assert row["score"] == 0.8 and row["last_misconception"] == "yanlış fikir"


def test_kok_neden_zayif_onkosul():
    statuses = {"fonksiyon_parametre": "zorlaniyor", "fonksiyon_tanimlama": "gelisiyor", "degisken_atama": "hakim"}
    prereq = {"fonksiyon_parametre": ["fonksiyon_tanimlama"], "fonksiyon_tanimlama": ["degisken_atama"]}
    assert root_causes(statuses, prereq) == [
        {"concept_id": "fonksiyon_parametre", "weak_prerequisites": ["fonksiyon_tanimlama"]}
    ]


# --- görev ilerlemesi ve takılma ------------------------------------------------

def _check(outcome, label=None, error=None):
    event = {"type": "check", "outcome": outcome, "checks": []}
    if label:
        event["checks"] = [{"status": "fail", "label": label}]
    if error:
        event["error_type"] = error
    return event


def test_ayni_olcut_uc_kez_duserse_takildi():
    p = {}
    for i in range(3):
        apply_event_to_progress(p, _check("fail", "Kodda for kullanıldı"), NOW + timedelta(minutes=i))
    assert p["same_failure_streak"] == 3
    assert is_stuck(p)
    assert is_stuck_now(p, NOW + timedelta(minutes=5))
    assert not is_stuck_now(p, NOW + timedelta(hours=2))


def test_farkli_hatalar_seriyi_sifirlar():
    p = {}
    apply_event_to_progress(p, _check("fail", "A"), NOW)
    apply_event_to_progress(p, _check("fail", "B"), NOW)
    assert p["same_failure_streak"] == 1 and not is_stuck(p)


def test_cozulen_gorev_takili_sayilmaz():
    p = {}
    for _ in range(6):
        apply_event_to_progress(p, _check("error", error="NameError"), NOW)
    apply_event_to_progress(p, _check("pass"), NOW)
    assert not is_stuck(p)
    assert p["first_try_pass"] is False


def test_ilk_denemede_cozum_isaretlenir():
    p = apply_event_to_progress({}, _check("pass"), NOW)
    assert p["first_try_pass"] is True and p["solved_at"] == NOW


def test_ogretmen_degerlendirir_gorevi_takili_sayilmaz():
    """'Öğretmen değerlendirir' kipinde çok kez çalıştırmak takılmak değil."""
    p = {}
    for _ in range(6):
        apply_event_to_progress(p, _check("ran"), NOW)
    assert not is_stuck(p)


def test_gorev_istatistikleri():
    rows = [
        {"attempts": 1, "first_seen_at": NOW, "solved_at": NOW + timedelta(minutes=4), "first_try_pass": True},
        {"attempts": 3, "first_seen_at": NOW, "solved_at": NOW + timedelta(minutes=10), "first_try_pass": False},
        {"attempts": 6, "first_seen_at": NOW, "last_activity_at": NOW + timedelta(minutes=2),
         "last_outcome": "fail", "same_failure_streak": 1, "first_try_pass": False},
    ]
    stats = task_stats(rows)
    assert stats["started"] == 3 and stats["solved"] == 2
    assert stats["solve_rate"] == round(2 / 3, 3)
    assert stats["median_attempts"] == 2
    assert stats["median_solve_minutes"] == 7.0
    assert stats["stuck"] == 1
