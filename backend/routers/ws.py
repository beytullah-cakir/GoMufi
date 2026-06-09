from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.ws_manager import manager
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["Real-time"])

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """Kullanıcının WebSocket bağlantısını sağlar ve yönetir."""
    await manager.connect(user_id, websocket)
    try:
        while True:
            # İstemciden gelen mesajları dinle
            data = await websocket.receive_text()
            
            try:
                # Gelen veriyi JSON olarak parse et
                message_data = json.loads(data)
                
                # İstemciden gelen "ping" mesajına "pong" ile cevap ver (bağlantı testi için)
                if message_data.get("type") == "ping":
                    await manager.send_personal_message(user_id, {"type": "pong"})
                else:
                    # Gelen diğer mesajları Redis üzerinden tüm sisteme yayınla (ihtiyaca göre)
                    message_data["sender_id"] = user_id
                    await manager.publish(message_data)
                    
            except json.JSONDecodeError:
                logger.warning(f"{user_id} adlı kullanıcıdan geçersiz JSON formatı geldi.")
                
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
