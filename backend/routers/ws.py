from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from core.ws_manager import manager
from core.security import decode_access_token
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["Real-time"])

# WebSocket kapatma kodu: politika ihlali (kimlik doğrulanamadı).
# İstemci bu kodu görünce sonsuz reconnect denemesi yapmamalı.
WS_POLICY_VIOLATION = status.WS_1008_POLICY_VIOLATION


def _extract_token(websocket: WebSocket) -> str | None:
    """Token'ı httpOnly cookie'den, yoksa ?token= query parametresinden alır."""
    token = websocket.cookies.get("access_token")
    if not token:
        token = websocket.query_params.get("token")
    return token


async def _authenticated_session(websocket: WebSocket) -> str | None:
    """
    Bağlantıyı doğrular ve kanal anahtarını ("<rol>:<id>") döner.
    Doğrulanamazsa bağlantıyı kapatır ve None döner.
    """
    payload = decode_access_token(_extract_token(websocket))
    if not payload:
        await websocket.close(code=WS_POLICY_VIOLATION, reason="Not authenticated")
        return None
    return f"{payload['role']}:{payload['sub']}"


async def _run_session(websocket: WebSocket, user_id: str):
    """Doğrulanmış bir WebSocket oturumunu yönetir."""
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                logger.warning(f"{user_id} adlı kullanıcıdan geçersiz JSON formatı geldi.")
                continue

            if not isinstance(message_data, dict):
                logger.warning(f"{user_id} adlı kullanıcıdan sözlük olmayan mesaj geldi.")
                continue

            # İstemciden gelen "ping" mesajına "pong" ile cevap ver (bağlantı testi için)
            if message_data.get("type") == "ping":
                await manager.send_personal_message(user_id, {"type": "pong"})
                continue

            # Gönderen kimliği daima sunucu tarafında, doğrulanmış token'dan yazılır —
            # istemcinin gönderdiği sender_id/target_user değerlerine güvenilmez.
            message_data["sender_id"] = user_id
            await manager.publish(message_data)

    except WebSocketDisconnect:
        await manager.disconnect(user_id)


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    """Kullanıcının WebSocket bağlantısını sağlar ve yönetir.

    Kimlik, access_token cookie'sinden (veya ?token= parametresinden) çözülür;
    istemcinin bildirdiği bir kullanıcı ID'sine güvenilmez.
    """
    user_id = await _authenticated_session(websocket)
    if user_id:
        await _run_session(websocket, user_id)


@router.websocket("/{legacy_user_id}")
async def websocket_endpoint_legacy(websocket: WebSocket, legacy_user_id: str):
    """DEPRECATED — eski istemciler için. Yoldaki ID yok sayılır, kimlik token'dan alınır."""
    user_id = await _authenticated_session(websocket)
    if user_id:
        await _run_session(websocket, user_id)
