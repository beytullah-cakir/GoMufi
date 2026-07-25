"""Level eğrisi + lig kademeleri — oyunlaştırma çekirdeği testleri."""
import pytest

from core import gamification as g


def test_level_esikleri_kumulatif_ve_artan():
    # Level 1 = 0 XP; her sonraki eşik bir öncekinden büyük
    assert g.xp_for_level(1) == 0
    assert g.xp_for_level(2) == 100          # BASE
    assert g.xp_for_level(3) == 225          # 100 + 125
    assert g.xp_for_level(4) == 375          # +150
    thresholds = [g.xp_for_level(l) for l in range(1, 20)]
    assert thresholds == sorted(thresholds)
    assert len(set(thresholds)) == len(thresholds)  # hepsi farklı (monoton artan)


@pytest.mark.parametrize("xp,expected_level", [
    (0, 1), (50, 1), (99, 1),
    (100, 2), (224, 2),
    (225, 3), (374, 3),
    (375, 4),
])
def test_level_for_xp(xp, expected_level):
    assert g.level_for_xp(xp) == expected_level


def test_level_for_xp_sinir_ve_negatif():
    assert g.level_for_xp(-100) == 1     # negatif XP → level 1
    assert g.level_for_xp(None) == 1     # None → level 1
    assert g.level_for_xp(10**9) <= g.MAX_LEVEL  # tavan korunur, sonsuz döngü yok


def test_lig_kademeleri_dogru_esleniyor():
    assert g.league_for_level(1)["name"] == "Bronz"
    assert g.league_for_level(4)["name"] == "Bronz"
    assert g.league_for_level(5)["name"] == "Gümüş"
    assert g.league_for_level(10)["name"] == "Altın"
    assert g.league_for_level(20)["name"] == "Platin"
    assert g.league_for_level(35)["name"] == "Elmas"
    assert g.league_for_level(100)["name"] == "Efsane"
    # her lig emoji + renk taşımalı
    lg = g.league_for_level(10)
    assert lg["emoji"] and lg["color"].startswith("#")


def test_level_progress_tam_ozet():
    # XP=150 → level 2 (eşik 100), sonraki eşik 225, span=125, into=50
    p = g.level_progress(150)
    assert p["level"] == 2
    assert p["total_xp"] == 150
    assert p["xp_into_level"] == 50
    assert p["xp_for_next_level"] == 125
    assert p["xp_to_next_level"] == 75
    assert p["progress_pct"] == 40   # 50/125
    assert p["league"]["name"] == "Bronz"


def test_level_progress_tam_esikte_sifir_ilerleme():
    # Tam eşikte (level başı) ilerleme 0 olmalı, negatif değil
    p = g.level_progress(g.xp_for_level(5))
    assert p["level"] == 5
    assert p["xp_into_level"] == 0
    assert p["progress_pct"] == 0
    assert p["league"]["name"] == "Gümüş"


def test_level_progress_sifir_xp():
    p = g.level_progress(0)
    assert p["level"] == 1
    assert p["progress_pct"] == 0
    assert p["league"]["name"] == "Bronz"
