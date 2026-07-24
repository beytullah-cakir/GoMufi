"""AI maliyet hesabının tek kaynaktan gelmesi.

Regresyon: fiyat oranları hem record_ai_usage hem /ai/metrics içinde ayrı ayrı
sabitti ve birbirinden farklıydı; veritabanına yazılan maliyet ile panelde
gösterilen rakam tutmuyordu. Ayrıca model değişse de tarife sabit kalıyordu.
"""
import inspect

import pytest

from core import ai_pricing


@pytest.mark.parametrize("model,expected", [
    # Güncel nesil (Temmuz 2026)
    ("gemini-3.1-flash-lite", (0.25, 1.50)),      # varsayılan GEMINI_MODEL_LITE
    ("gemini-3.5-flash-lite", (0.30, 2.50)),      # daha uzun önek kazanmalı
    ("gemini-3.5-flash", (1.50, 9.00)),
    ("gemini-2.5-flash", (0.30, 2.50)),
    ("gemini-2.5-pro", (1.25, 10.00)),
    # Emekli modeller — eski log kayıtları için tabloda kalmalı
    ("gemini-2.5-flash-lite", (0.10, 0.40)),
    ("gemini-2.0-flash", (0.10, 0.40)),
    ("gemini-2.0-flash-lite", (0.075, 0.30)),
    # Ad normalizasyonu
    ("models/gemini-2.5-flash", (0.30, 2.50)),    # tam yol
    ("GEMINI-2.5-FLASH", (0.30, 2.50)),           # büyük harf
    ("gemini-2.5-flash-preview-09-2025", (0.30, 2.50)),  # varyant son eki
])
def test_model_tarife_eslesmesi(model, expected):
    assert ai_pricing.rates_for(model) == expected


@pytest.mark.parametrize("model", ["gemini-9.9-turbo", "", None, "bilinmeyen"])
def test_bilinmeyen_model_varsayilana_duser(model):
    assert ai_pricing.rates_for(model) == ai_pricing.FALLBACK_RATE_USD_PER_1M


def test_maliyet_hesabi():
    # 1M girdi + 1M çıktı, gemini-2.5-flash => 0.30 + 2.50
    assert ai_pricing.cost_usd("gemini-2.5-flash", 1_000_000, 1_000_000) == pytest.approx(2.80)


def test_thinking_tokenlari_cikti_tarifesinden_faturalanir():
    """
    Regresyon: thinking token'ları maliyete dahil edilmiyordu — ölçümde gerçek
    maliyetin %96'sının panelde görünmediği tespit edildi (763 thinking token,
    25 token'lık cevap için).
    """
    base = ai_pricing.cost_usd("gemini-2.5-flash", 1000, 100)
    with_thoughts = ai_pricing.cost_usd("gemini-2.5-flash", 1000, 100, thoughts_tokens=900)
    # 900 thinking token, çıktı tarifesinden ($2.50/1M) eklenmiş olmalı
    assert with_thoughts - base == pytest.approx(900 * 2.50 / 1_000_000)
    # Geriye dönük uyumluluk: thoughts verilmezse 0 kabul edilir
    assert ai_pricing.cost_usd("gemini-2.5-flash", 1000, 100, 0) == base


def test_farkli_model_farkli_maliyet():
    """Asıl hata buydu: model değişse de aynı tarife uygulanıyordu."""
    pahali = ai_pricing.cost_usd("gemini-2.5-flash", 1_000_000, 1_000_000)
    ucuz = ai_pricing.cost_usd("gemini-2.0-flash", 1_000_000, 1_000_000)
    assert ucuz == pytest.approx(0.50)
    assert ucuz != pahali


@pytest.mark.parametrize("p,c", [(0, 0), (None, None)])
def test_sifir_ve_none_token(p, c):
    assert ai_pricing.cost_usd("gemini-2.5-flash", p, c) == 0.0


def test_kur_cevrimi():
    assert ai_pricing.to_try(2.0) == pytest.approx(2.0 * ai_pricing.USD_TO_TRY)


def test_ai_router_tek_kaynagi_kullanir():
    """ai.py içinde ikinci bir tarife tablosu kalmamalı."""
    import routers.ai as ai

    src = inspect.getsource(ai)
    assert src.count("ai_pricing.cost_usd") >= 3
    for sabit in ("0.30 / 1_000_000", "0.10 / 1_000_000", "2.50 / 1_000_000", "38.0"):
        assert sabit not in src, f"ai.py içinde sabit tarife kalmış: {sabit}"
