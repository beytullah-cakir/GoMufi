"""
Yönetici işlem kaydı: /admin altındaki her BAŞARILI değişiklik (POST/PUT/PATCH/DELETE)
admin_actions tablosuna yazılır — kim ne zaman neyi sildi/değiştirdi sorusunun cevabı.

Uç uç kayıt eklemek yerine tek katman: yeni bir admin ucu eklendiğinde de kendiliğinden
kaydedilir. İstek gövdesi yazılmaz (parola içerebilir); yalnızca işlem ve hedef.
"""
import logging
from typing import Dict, Optional

from connect_db import SessionLocal
from models.platform import AdminAction

logger = logging.getLogger(__name__)

UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}

# Rota şablonu → okunur işlem adı
LABELS: Dict[str, str] = {
    "POST /admin/users": "Kullanıcı oluşturuldu",
    "PUT /admin/users/{role}/{user_id}": "Kullanıcı bilgileri güncellendi",
    "DELETE /admin/users/{role}/{user_id}": "Kullanıcı silindi",
    "POST /admin/users/{role}/{user_id}/suspend": "Hesap askıya alındı",
    "DELETE /admin/users/{role}/{user_id}/suspend": "Hesap yeniden açıldı",
    "POST /admin/users/student/{student_id}/enroll": "Öğrenci kursa kaydedildi",
    "DELETE /admin/users/student/{student_id}/enroll/{course_id}": "Öğrenci kurstan çıkarıldı",
    "POST /admin/courses": "Kurs oluşturuldu",
    "PUT /admin/courses/{course_id}": "Kurs güncellendi",
    "DELETE /admin/courses/{course_id}": "Kurs silindi",
    "POST /admin/quizzes": "Soru eklendi",
    "PUT /admin/quizzes/{quiz_id}": "Soru güncellendi",
    "DELETE /admin/quizzes/{quiz_id}": "Soru silindi",
    "DELETE /admin/security/lock": "Giriş kilidi kaldırıldı",
}


def _target(params: Dict[str, str]) -> Optional[str]:
    if not params:
        return None
    if "role" in params and "user_id" in params:
        return f"{params['role']}:{params['user_id']}"
    return ", ".join(f"{k}:{v}" for k, v in params.items())[:120]


class AdminAuditMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in UNSAFE or not scope["path"].startswith("/admin"):
            return await self.app(scope, receive, send)
        status = {"code": 500}

        async def capture(message):
            if message["type"] == "http.response.start":
                status["code"] = message["status"]
            await send(message)

        await self.app(scope, receive, capture)
        if status["code"] >= 400:
            return
        route = scope.get("route")
        template = getattr(route, "path", scope["path"])
        key = f"{scope['method']} {template}"
        try:
            async with SessionLocal() as db:
                db.add(AdminAction(action=key[:60], target=_target(scope.get("path_params") or {}),
                                   summary=LABELS.get(key, key)[:500]))
                await db.commit()
        except Exception:  # noqa: BLE001 — kayıt yazılamasa da işlem tamamlandı
            logger.exception("Yönetici işlem kaydı yazılamadı: %s", key)
