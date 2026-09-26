"""
Kullanıcı başına istek sınırı (sabit pencere: dakika + gün).

NEDEN: öğrencinin YZ özellikleri (koç, görev kontrolü, ödev değerlendirme)
bilerek kredi bitince bile durmuyor — ama istek başına sınır da yoktu. Tek bir
öğrenci basit bir döngüyle sınırsız Gemini faturası çıkarabilirdi.

REDIS_URL varsa sayaçlar Redis'te (birden çok sunucu kopyası aynı sayacı
görür); yoksa süreç belleğinde (tek kopya için yeterli, yeniden başlatınca sıfırlanır).
"""
import logging
import threading
import time
from typing import Dict, Optional, Tuple

from fastapi import Depends, HTTPException

from auth.dependencies import get_current_user_info
from core.config import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_memory: Dict[str, Tuple[int, float]] = {}
_redis = None


async def _redis_client():
    global _redis
    if not settings.REDIS_URL:
        return None
    if _redis is None:
        import redis.asyncio as redis
        _redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def _hit(key: str, window: int) -> int:
    """Pencere içindeki istek sayısını bir artırır ve döner."""
    client = await _redis_client()
    if client is not None:
        try:
            count = await client.incr(key)
            if count == 1:
                await client.expire(key, window)
            return int(count)
        except Exception:  # Redis geçici olarak yoksa belleğe düş: sınır kalkmasın
            logger.warning("Hız sınırı: Redis'e ulaşılamadı, bellek sayacı kullanılıyor.")
    now = time.time()
    with _lock:
        count, expires = _memory.get(key, (0, now + window))
        if now >= expires:
            count, expires = 0, now + window
        count += 1
        _memory[key] = (count, expires)
        if len(_memory) > 50_000:  # süresi dolanları temizle
            for k in [k for k, (_, e) in _memory.items() if e <= now]:
                _memory.pop(k, None)
        return count


def reset() -> None:
    """Testler için."""
    with _lock:
        _memory.clear()


async def check(bucket: str, user_key: str, per_minute: int, per_day: Optional[int] = None) -> None:
    minute = int(time.time() // 60)
    if await _hit(f"rl:{bucket}:{user_key}:m:{minute}", 60) > per_minute:
        raise HTTPException(status_code=429, detail="Çok hızlı istek gönderiyorsun. Bir dakika bekleyip tekrar dene.")
    if per_day:
        day = time.strftime("%Y%m%d", time.gmtime())
        if await _hit(f"rl:{bucket}:{user_key}:d:{day}", 86_400) > per_day:
            raise HTTPException(status_code=429, detail="Bugünlük YZ kullanım sınırına ulaştın. Yarın tekrar deneyebilirsin.")


# Öğrenci YZ istekleri: bir derste rahat yeter, döngüyle kötüye kullanımı keser.
STUDENT_AI_PER_MINUTE = 8
STUDENT_AI_PER_DAY = 200


async def student_ai_limit(user_info: dict = Depends(get_current_user_info)) -> None:
    """Öğrencinin YZ uçları için bağımlılık. Öğretmen ve yönetici bu sınıra
    girmez (öğretmen YZ kredisiyle sınırlı, bkz. core/plans.py)."""
    if user_info.get("role") != "student":
        return
    await check("ai-student", str(user_info.get("sub")), STUDENT_AI_PER_MINUTE, STUDENT_AI_PER_DAY)
