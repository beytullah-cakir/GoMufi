"""
Server-side PostHog analytics — no-op eğer POSTHOG_API_KEY tanımlı değilse.

Kullanım:
    from core.analytics import capture_event
    capture_event(distinct_id="42", event="ai_usage", properties={...})

Anahtar yoksa (dev / self-host edilmemiş ortam) sessizce hiçbir şey yapmaz;
uygulama akışını asla bloke etmez veya hata fırlatmaz.
"""
import logging
from typing import Optional, Dict, Any

from core.config import settings

logger = logging.getLogger(__name__)

_client = None
_initialized = False


def _get_client():
    """PostHog istemcisini tembel (lazy) oluşturur; anahtar yoksa None döner."""
    global _client, _initialized
    if _initialized:
        return _client
    _initialized = True
    if not settings.POSTHOG_API_KEY:
        return None
    try:
        from posthog import Posthog
        _client = Posthog(
            project_api_key=settings.POSTHOG_API_KEY,
            host=settings.POSTHOG_HOST,
        )
    except Exception as e:  # kütüphane yoksa veya init hatasında sessiz kal
        logger.warning("PostHog başlatılamadı, analytics devre dışı: %s", e)
        _client = None
    return _client


def capture_event(
    distinct_id: Optional[Any],
    event: str,
    properties: Optional[Dict[str, Any]] = None,
) -> None:
    """Bir olayı PostHog'a gönderir. Hata olursa yutulur — çağıran akışı bloke etmez."""
    client = _get_client()
    if client is None:
        return
    try:
        client.capture(
            distinct_id=str(distinct_id) if distinct_id is not None else "backend",
            event=event,
            properties=properties or {},
        )
    except Exception as e:
        logger.debug("PostHog capture hatası (yok sayıldı): %s", e)
