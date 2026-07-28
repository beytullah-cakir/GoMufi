"""Yüklenen kaynak PDF'in maliyetteki payının ayrıştırılması.

Kaynak metin prompt'un İÇİNDE gider; maliyeti zaten `cost_usd`'ye dahildir.
Bu hesap onu görünür kılar, toplama EKLEMEZ — testlerin çoğu tam olarak bunu
korumak için var.
"""
from core.ai_economics import compute_source_material_breakdown

KUR = 40.0


def satir(action="generate_lesson_slides", cost=0.010, chars=0, tokens=0, s_cost=0.0):
    return {"action": action, "cost_usd": cost, "source_chars": chars,
            "source_tokens": tokens, "source_cost_usd": s_cost}


def test_kaynaksiz_kayitlar_sifir_uretir():
    r = compute_source_material_breakdown([satir(), satir()], lessons_generated=2, usd_to_try=KUR)
    assert r["calls_with_source"] == 0
    assert r["total_source_cost"]["usd"] == 0.0
    assert r["share_of_total_pct"] == 0.0
    assert r["by_action"] == []


def test_bos_log_cokmez():
    r = compute_source_material_breakdown([], lessons_generated=0, usd_to_try=KUR)
    assert r["calls_total"] == 0
    assert r["share_of_total_pct"] == 0.0
    assert r["source_cost_per_lesson"]["tl"] == 0.0


def test_pay_toplam_maliyetin_yuzdesidir():
    """Kaynak maliyeti toplamın İÇİNDEDİR; pay 100'ü geçemez."""
    rows = [satir(cost=0.100, chars=30000, tokens=9000, s_cost=0.020)]
    r = compute_source_material_breakdown(rows, lessons_generated=1, usd_to_try=KUR)
    assert r["share_of_total_pct"] == 20.0
    assert r["total_source_cost"]["usd"] == 0.02


def test_kaynak_maliyeti_toplama_eklenmez():
    """Regresyon koruması: ayrıştırma, çift sayıma dönüşmemeli."""
    rows = [satir(cost=0.050, chars=10000, tokens=3000, s_cost=0.010)]
    r = compute_source_material_breakdown(rows, lessons_generated=1, usd_to_try=KUR)
    assert r["total_source_cost"]["usd"] <= rows[0]["cost_usd"]


def test_tl_cevrimi_kuru_kullanir():
    rows = [satir(cost=0.100, chars=1000, tokens=300, s_cost=0.025)]
    r = compute_source_material_breakdown(rows, lessons_generated=1, usd_to_try=KUR)
    assert r["total_source_cost"]["tl"] == 1.0


def test_ders_basi_maliyet_amortize_edilir():
    rows = [satir(cost=0.10, chars=1000, tokens=300, s_cost=0.02) for _ in range(4)]
    r = compute_source_material_breakdown(rows, lessons_generated=4, usd_to_try=KUR)
    assert r["source_cost_per_lesson"]["usd"] == 0.02


def test_dersi_olmayan_hesapta_bolme_hatasi_olmaz():
    rows = [satir(chars=500, tokens=150, s_cost=0.001)]
    r = compute_source_material_breakdown(rows, lessons_generated=0, usd_to_try=KUR)
    assert r["source_cost_per_lesson"]["usd"] == 0.0


def test_action_bazinda_gruplanir_ve_maliyete_gore_siralanir():
    rows = [
        satir("suggest_raw_topics", cost=0.01, chars=5000, tokens=1500, s_cost=0.001),
        satir("generate_lesson_slides", cost=0.05, chars=30000, tokens=9000, s_cost=0.020),
        satir("generate_lesson_slides", cost=0.05, chars=30000, tokens=9000, s_cost=0.020),
    ]
    r = compute_source_material_breakdown(rows, lessons_generated=2, usd_to_try=KUR)
    assert [x["action"] for x in r["by_action"]] == ["generate_lesson_slides", "suggest_raw_topics"]
    ilk = r["by_action"][0]
    assert ilk["calls"] == 2
    assert ilk["source_chars"] == 60000
    assert ilk["avg_chars_per_call"] == 30000
    assert ilk["label"] == "Ders slaytları"


def test_bilinmeyen_action_ham_adiyla_gosterilir():
    rows = [satir("yeni_islem", chars=100, tokens=30, s_cost=0.001)]
    r = compute_source_material_breakdown(rows, lessons_generated=1, usd_to_try=KUR)
    assert r["by_action"][0]["label"] == "yeni_islem"


def test_karisik_log_yalniz_kaynaklilari_sayar():
    rows = [satir(cost=0.02), satir(cost=0.03, chars=8000, tokens=2400, s_cost=0.005), satir(cost=0.02)]
    r = compute_source_material_breakdown(rows, lessons_generated=3, usd_to_try=KUR)
    assert r["calls_with_source"] == 1
    assert r["calls_total"] == 3
    assert r["avg_source_chars_per_call"] == 8000


def test_eski_kayitlarda_eksik_alanlar_cokertmez():
    """Kolonlar eklenmeden önceki satırlarda alanlar hiç bulunmayabilir."""
    rows = [{"action": "generate_lesson_slides", "cost_usd": 0.02}]
    r = compute_source_material_breakdown(rows, lessons_generated=1, usd_to_try=KUR)
    assert r["calls_with_source"] == 0
    assert r["share_of_total_pct"] == 0.0


def test_none_degerler_sifir_sayilir():
    rows = [{"action": "x", "cost_usd": None, "source_chars": None,
             "source_tokens": None, "source_cost_usd": None}]
    r = compute_source_material_breakdown(rows, lessons_generated=1, usd_to_try=KUR)
    assert r["calls_with_source"] == 0
