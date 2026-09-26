"""
İzinli site kökenleri — CORS, CSRF ve WebSocket aynı listeyi kullanır.

Canlıda yalnızca GoMufi alan adları; yerel geliştirmede ayrıca localhost ve
yerel ağ adresleri (telefonla test için).
"""
import os
import re
from typing import List, Optional

from core.config import settings

_BASE = [
    "https://www.gomufi.com",
    "https://gomufi.com",
    "https://go-mufi.vercel.app",
]
_DEV = ["http://localhost:5173", "http://127.0.0.1:5173", "http://0.0.0.0:5173"]
_DEV_REGEX = r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?"


def allowed_origins() -> List[str]:
    out = list(_BASE)
    if not settings.IS_PRODUCTION:
        out += _DEV
    for extra in (settings.FRONTEND_URL, os.getenv("RENDER_EXTERNAL_URL"), settings.BACKEND_URL):
        extra = (extra or "").rstrip("/")
        if extra and extra not in out:
            out.append(extra)
    return out


def dev_origin_regex() -> Optional[str]:
    """Canlıda None: çerezli istekleri yerel ağdaki herhangi bir sayfaya açmak gereksiz risk."""
    return None if settings.IS_PRODUCTION else _DEV_REGEX


def is_allowed(origin: str) -> bool:
    origin = (origin or "").rstrip("/")
    if origin in allowed_origins():
        return True
    regex = dev_origin_regex()
    return bool(regex and re.fullmatch(regex, origin))
