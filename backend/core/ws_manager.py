import json
import asyncio
import logging
from typing import Dict, List, Any
from fastapi import WebSocket
import redis.asyncio as redis
from .config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # socket_id (or user_id) -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        self.redis: redis.Redis | None = None
        self.pubsub: redis.client.PubSub | None = None
        self.channel_name = "gomufi_realtime"

    async def initialize_redis(self):
        """Uygulama başlarken Redis bağlantısını kurar."""
        try:
            self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.pubsub = self.redis.pubsub()
            await self.pubsub.subscribe(self.channel_name)
            
            # Pub/Sub dinleyicisini arka planda başlat
            asyncio.create_task(self._listen_to_redis())
            logger.info("Redis Pub/Sub bağlantısı başarıyla kuruldu.")
        except Exception as e:
            logger.error(f"Redis bağlantı hatası: {e}")

    async def close_redis(self):
        """Uygulama kapanırken Redis bağlantısını sonlandırır."""
        if self.pubsub:
            await self.pubsub.unsubscribe(self.channel_name)
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()
            logger.info("Redis bağlantısı kapatıldı.")

    async def _listen_to_redis(self):
        """Redis kanalına gelen mesajları dinler ve aktif WebSocket istemcilerine iletir."""
        if not self.pubsub:
            return
            
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    try:
                        parsed_data = json.loads(data)
                        target_user = parsed_data.get("target_user")
                        
                        # Eğer belirli bir kullanıcıya gönderilecekse:
                        if target_user:
                            await self.send_personal_message(target_user, parsed_data)
                        else:
                            # Herkese gönderilecekse:
                            await self.broadcast_local(parsed_data)
                    except json.JSONDecodeError:
                        logger.error("Redis'ten gelen mesaj parse edilemedi.")
        except Exception as e:
            logger.error(f"Redis dinleme döngüsünde hata: {e}")
            # Basit bir reconnect mekanizması (opsiyonel)
            await asyncio.sleep(5)
            asyncio.create_task(self._listen_to_redis())

    async def connect(self, user_id: str, websocket: WebSocket):
        """Yeni bir WebSocket bağlantısı kabul eder."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket bağlandı: {user_id}")
        
        # Redis'te kullanıcının online olduğunu işaretle (Örn: Set yapısı)
        if self.redis:
            await self.redis.sadd("online_users", user_id)
            await self.publish({"type": "user_status", "user_id": user_id, "status": "online"})

    async def disconnect(self, user_id: str):
        """WebSocket bağlantısını sonlandırır ve listeden çıkarır."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket koptu: {user_id}")
            
        # Redis'te kullanıcının offline olduğunu işaretle
        if self.redis:
            await self.redis.srem("online_users", user_id)
            await self.publish({"type": "user_status", "user_id": user_id, "status": "offline"})

    async def send_personal_message(self, user_id: str, message: dict):
        """Belirli bir kullanıcıya bu sunucu (instance) üzerinden mesaj gönderir."""
        if user_id in self.active_connections:
            ws = self.active_connections[user_id]
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"{user_id} adlı kullanıcıya mesaj gönderilemedi: {e}")
                await self.disconnect(user_id)

    async def broadcast_local(self, message: dict):
        """Bu sunucuya (instance) bağlı tüm kullanıcılara mesaj gönderir."""
        for user_id, ws in list(self.active_connections.items()):
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(user_id)

    async def publish(self, message: dict):
        """Bir mesajı Redis üzerinden tüm sunuculara (ve dolayısıyla tüm kullanıcılara) yayınlar."""
        if self.redis:
            await self.redis.publish(self.channel_name, json.dumps(message))
        else:
            # Redis yoksa sadece local broadcast yap
            target_user = message.get("target_user")
            if target_user:
                await self.send_personal_message(target_user, message)
            else:
                await self.broadcast_local(message)

manager = ConnectionManager()
