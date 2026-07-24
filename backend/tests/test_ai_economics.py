"""AI birim ekonomisi hesaplamaları.

'Ortalama bir modül şu kadar yakıyor', '8 derslik kurs şu kadar' gibi türetilmiş
metriklerin doğruluğu. Tek ders çağrısı tüm modülleri birlikte ürettiği için
modül-tipi maliyetleri TAHMİNİdir (slayt ağırlığına dayalı).
"""
import pytest

from core import ai_economics as econ


def test_parse_module_count():
    d = "Kurs: 'Python' | Ders 3: 'Döngüler' | Modül Sayısı: 7"
    assert econ.parse_module_count(d) == 7
    assert econ.parse_module_count("Modül Sayısı: 12") == 12
    assert econ.parse_module_count("hiç sayı yok") is None
    assert econ.parse_module_count(None) is None


def test_ortalama_ders_ve_modul_maliyeti():
    lessons = [
        {"cost_usd": 0.010, "modules": 5},
        {"cost_usd": 0.014, "modules": 7},
    ]
    r = econ.compute_unit_economics(lessons, course_costs=[], usd_to_try=40.0)

    assert r["lessons_generated"] == 2
    # ort ders = (0.010 + 0.014) / 2 = 0.012
    assert r["avg_cost_per_lesson"]["usd"] == pytest.approx(0.012)
    assert r["avg_cost_per_lesson"]["tl"] == pytest.approx(0.48)
    # ort modül = toplam maliyet / toplam modül = 0.024 / 12 = 0.002
    assert r["avg_cost_per_module"]["usd"] == pytest.approx(0.002)
    assert r["avg_modules_per_lesson"] == 6.0


def test_kurs_ortalamasi_ve_projeksiyon():
    lessons = [{"cost_usd": 0.01, "modules": 7}]
    r = econ.compute_unit_economics(
        lessons, course_costs=[0.08, 0.12], usd_to_try=40.0, projection_lessons=8
    )
    # gerçek kurs ortalaması = (0.08 + 0.12) / 2 = 0.10
    assert r["avg_cost_per_course"]["usd"] == pytest.approx(0.10)
    assert r["courses_measured"] == 2
    # 8 derslik projeksiyon = ort_ders(0.01) × 8 = 0.08
    assert r["projected_course"]["usd"] == pytest.approx(0.08)
    assert r["projection_lessons"] == 8


def test_modul_tipi_tahmini_agirliga_gore():
    lessons = [{"cost_usd": 0.0116, "modules": 7}]  # tipik dizilim ağırlık toplamı 11.6
    r = econ.compute_unit_economics(lessons, course_costs=[], usd_to_try=40.0)
    by_type = {t["type"]: t for t in r["estimated_cost_by_module_type"]}

    # Anla ağırlık 3.0, cost_per_weight = 0.0116/11.6 = 0.001 => Anla = 0.003
    assert by_type["UNDERSTAND"]["est_cost_usd"] == pytest.approx(0.003)
    # Quiz ağırlık 0.6 => 0.0006, Anla'dan ucuz olmalı
    assert by_type["QUIZ"]["est_cost_usd"] == pytest.approx(0.0006)
    assert by_type["UNDERSTAND"]["est_cost_usd"] > by_type["QUIZ"]["est_cost_usd"]
    # Tüm tipler + Türkçe etiket mevcut
    assert by_type["UNDERSTAND"]["label"] == "Anla"
    assert set(by_type) == set(econ.MODULE_TYPE_WEIGHTS)


def test_bos_veri_sifir_dondurur():
    r = econ.compute_unit_economics([], course_costs=[], usd_to_try=40.0)
    assert r["lessons_generated"] == 0
    assert r["avg_cost_per_lesson"]["usd"] == 0.0
    assert r["avg_cost_per_module"]["usd"] == 0.0
    assert r["projected_course"]["usd"] == 0.0
    # tip listesi yine de dönmeli (hepsi 0)
    assert len(r["estimated_cost_by_module_type"]) == len(econ.MODULE_TYPE_WEIGHTS)


def test_modul_sayisi_yoksa_tipik_dizilime_boler():
    lessons = [{"cost_usd": 0.014, "modules": None}]
    r = econ.compute_unit_economics(lessons, course_costs=[], usd_to_try=40.0)
    # modül sayısı yok => ort_ders / tipik dizilim uzunluğu (7)
    assert r["avg_cost_per_module"]["usd"] == pytest.approx(0.014 / 7)


# ── İşlem kategorisi kırılımı ─────────────────────────────────────────────

def _op_rows():
    return [
        {"action": "generate_lesson_slides", "model": "gemini-2.5-flash", "cost_usd": 0.020, "created_at": None},
        {"action": "generate_lesson_slides", "model": "gemini-2.5-flash", "cost_usd": 0.020, "created_at": None},
        {"action": "generate_roadmap_structure", "model": "gemini-2.5-flash", "cost_usd": 0.008, "created_at": None},
        {"action": "suggest_lesson_title", "model": "gemini-3.1-flash-lite", "cost_usd": 0.0002, "created_at": None},
        {"action": "generate_quiz", "model": "gemini-2.5-flash", "cost_usd": 0.001, "created_at": None},
        {"action": "bilinmeyen_islem", "model": "x", "cost_usd": 0.003, "created_at": None},
    ]


def test_operation_breakdown_kategoriler_ve_sira():
    r = econ.compute_operation_breakdown(_op_rows(), lessons_generated=2, usd_to_try=40.0, lessons_per_month=20)
    ops = [row["operation"] for row in r["rows"]]
    assert ops == [
        "Müfredat/yol haritası", "Ders planı", "Slayt/içerik üretimi",
        "Quiz/soru üretimi", "Görsel üretimi", "Diğer AI işlemi",
    ]


def test_operation_breakdown_slayt_maliyeti():
    r = econ.compute_operation_breakdown(_op_rows(), lessons_generated=2, usd_to_try=40.0, lessons_per_month=20)
    by = {row["operation"]: row for row in r["rows"]}

    slayt = by["Slayt/içerik üretimi"]
    # 2 çağrı, her biri 0.020 => birim 0.020, ders başı 0.040/2 = 0.020
    assert slayt["unit_cost_usd"] == pytest.approx(0.020)
    assert slayt["usage_per_lesson"] == pytest.approx(1.0)   # 2 çağrı / 2 ders
    assert slayt["cost_per_lesson_usd"] == pytest.approx(0.020)
    assert slayt["cost_per_lesson_tl"] == pytest.approx(0.80)
    # aylık: ders başı × 20
    assert slayt["cost_per_month_tl"] == pytest.approx(16.0)
    assert slayt["model"] == "gemini-2.5-flash"


def test_operation_breakdown_gorsel_ucretsiz():
    r = econ.compute_operation_breakdown(_op_rows(), lessons_generated=2, usd_to_try=40.0, lessons_per_month=20)
    gorsel = next(row for row in r["rows"] if row["operation"] == "Görsel üretimi")
    assert gorsel["unit_cost_tl"] == 0.0
    assert gorsel["cost_per_month_tl"] == 0.0
    assert "ücretsiz" in gorsel["source"].lower()


def test_operation_breakdown_bilinmeyen_action_digere_dusr():
    r = econ.compute_operation_breakdown(_op_rows(), lessons_generated=2, usd_to_try=40.0, lessons_per_month=20)
    diger = next(row for row in r["rows"] if row["operation"] == "Diğer AI işlemi")
    # bilinmeyen_islem (0.003) burada toplanmalı
    assert diger["samples"] == 1
    assert diger["unit_cost_usd"] == pytest.approx(0.003)


def test_operation_breakdown_sifir_ders_bolme_hatasi_yok():
    r = econ.compute_operation_breakdown(_op_rows(), lessons_generated=0, usd_to_try=40.0, lessons_per_month=20)
    for row in r["rows"]:
        assert row["cost_per_lesson_tl"] == 0.0
        assert row["cost_per_month_tl"] == 0.0
