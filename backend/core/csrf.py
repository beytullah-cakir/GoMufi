"""
CSRF koruması: çerezle kimliği doğrulanan değiştirici isteklerde köken kontrolü.

Oturum çerezi canlıda SameSite=None (frontend ve API farklı alan adlarında). Bu
yüzden tarayıcı, başka bir sitenin gönderdiği form/istekte de çerezi ekler;
gövdesiz POST uçları (ör. /auth/logout, yardım isteğini kapat) o siteden
tetiklenebilirdi. Tarayıcılar çapraz köken isteklerinde Origin başlığını her zaman
gönderir: izinli kökenlerden gelmeyen çerezli POST/PUT/PATCH/DELETE reddedilir.

Bearer token'lı istekler (VS Code eklentisi) ve Origin/Referer taşımayan
tarayıcı dışı istemciler etkilenmez — onlar çerezi zaten otomatik göndermez.
"""
import json
import re
from typing import Iterable, Optional
from urllib.parse import urlsplit

UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


def _origin_of(url: str) -> Optional[str]:
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}"


class CSRFMiddleware:
    def __init__(self, app, allowed_origins: Iterable[str], allowed_regex: Optional[str] = None):
        self.app = app
        self.allowed = {o.rstrip("/") for o in allowed_origins if o}
        self.regex = re.compile(allowed_regex) if allowed_regex else None

    def _allowed(self, origin: str) -> bool:
        return origin in self.allowed or bool(self.regex and self.regex.fullmatch(origin))

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in UNSAFE:
            return await self.app(scope, receive, send)
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        if "access_token=" not in headers.get("cookie", ""):
            return await self.app(scope, receive, send)
        origin = headers.get("origin")
        if not origin or origin == "null":
            referer = headers.get("referer")
            origin = _origin_of(referer) if referer else (None if origin is None else "null")
        if origin is None or self._allowed(origin):
            return await self.app(scope, receive, send)

        body = json.dumps({"detail": "İstek izin verilmeyen bir siteden geldi (CSRF koruması)."}).encode()
        await send({"type": "http.response.start", "status": 403,
                    "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
