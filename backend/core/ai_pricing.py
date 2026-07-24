"""
Gemini kullanım maliyeti — TEK KAYNAK.

Daha önce fiyat oranları hem record_ai_usage içinde hem de /ai/metrics içinde
ayrı ayrı sabit olarak duruyordu ve birbirinden farklıydı; veritabanına yazılan
maliyet ile panelde gösterilen maliyet uyuşmuyordu. Artık her iki taraf da
buradaki tabloyu kullanır ve maliyet HER ZAMAN ilgili kaydın kendi model adına
göre hesaplanır.
"""
import os
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

# 1.000.000 token başına USD: model adı öneki -> (girdi, çıktı)
#
# DİKKAT: Bu değerler Google'ın fiyatlandırma sayfasından güncel tutulmalıdır
# (https://ai.google.dev/pricing). Fiyat değiştiğinde YALNIZCA burası güncellenir.
# En uzun önek eşleşmesi kazanır, böylece "-lite" gibi varyantlar doğru eşleşir.
MODEL_RATES_USD_PER_1M: Dict[str, Tuple[float, float]] = {
    # Güncel nesil (Temmuz 2026 fiyatları)
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.5-flash": (1.50, 9.00),
    "gemini-3.1-flash-lite": (0.25, 1.50),
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-2.5-flash": (0.30, 2.50),
    # Emekli modeller — eski ai_usage_logs kayıtlarının maliyeti doğru
    # hesaplanabilsin diye tabloda tutulur (yeni çağrılarda 404 dönerler)
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-2.0-flash-lite": (0.075, 0.30),
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-1.5-pro": (1.25, 5.00),
    "gemini-1.5-flash": (0.075, 0.30),
}

# Tabloda bulunmayan modeller için varsayılan (bilinmeyen modeli bedava saymaktansa
# temkinli davranıp en yaygın flash tarifesini uygula).
FALLBACK_RATE_USD_PER_1M: Tuple[float, float] = (0.30, 2.50)

# Kur sabit kodlanmamalı; ortam değişkeniyle güncellenebilir.
USD_TO_TRY: float = float(os.getenv("USD_TO_TRY", "38.0"))

_warned_models: set = set()


def rates_for(model_name: str) -> Tuple[float, float]:
    """Model adı için (girdi, çıktı) USD/1M token oranlarını döner."""
    name = (model_name or "").strip().lower()
    # models/gemini-2.5-flash gibi tam yolları da destekle
    name = name.rsplit("/", 1)[-1]

    best: Tuple[float, float] | None = None
    best_len = -1
    for prefix, rate in MODEL_RATES_USD_PER_1M.items():
        if name.startswith(prefix) and len(prefix) > best_len:
            best, best_len = rate, len(prefix)

    if best is None:
        if name and name not in _warned_models:
            _warned_models.add(name)
            logger.warning(
                "Bilinmeyen Gemini modeli %r — varsayılan tarife uygulanıyor. "
                "core/ai_pricing.py içindeki tabloya ekleyin.", name
            )
        return FALLBACK_RATE_USD_PER_1M
    return best


def cost_usd(
    model_name: str,
    prompt_tokens: int,
    candidates_tokens: int,
    thoughts_tokens: int = 0,
) -> float:
    """
    Bir çağrının USD cinsinden maliyetini hesaplar.

    thoughts_tokens: Gemini'nin "thinking" token'ları — Google bunları ÇIKTI
    tarifesinden faturalar. Hesaba katılmazsa gerçek maliyet 20 kata kadar
    düşük raporlanır (ölçülmüş değer).
    """
    rate_in, rate_out = rates_for(model_name)
    billed_output = (candidates_tokens or 0) + (thoughts_tokens or 0)
    return ((prompt_tokens or 0) * rate_in + billed_output * rate_out) / 1_000_000


def to_try(amount_usd: float) -> float:
    """USD tutarını TL'ye çevirir."""
    return amount_usd * USD_TO_TRY
