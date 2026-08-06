"""Tarayıcı ile öğrencinin makinesindeki VS Code eklentisi arasındaki eşleşme.

AKIŞ
  1. Eklenti açılışta yerel bir HTTP sunucusu başlatır (yalnız 127.0.0.1) ve
     rastgele bir token üretir.
  2. Eklenti buraya `POST /devices/pair {port, token}` der.
  3. Tarayıcıdaki site `GET /devices/local-runner` ile port ve token'ı alır.
  4. Site doğrudan `http://127.0.0.1:<port>/run` adresine token'la istek atar.

NEDEN SUNUCU ARACILIĞIYLA: token'ın tarayıcıya güvenli ulaşmasının başka yolu yok.
Eklenti token'ı ekrana yazsa öğrenci elle kopyalardı; burada iki taraf da AYNI
kullanıcı olarak kimlik doğruladığı için eşleşme sessizce ve güvenli kurulur.
Token yalnızca o kullanıcının kendi oturumuna verilir.

Kayıtlar Redis'te TTL ile tutulur: VS Code kapandığında eşleşme kendiliğinden
düşer, aksi halde site çalışmayan bir porta istek atmaya devam ederdi.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import redis.asyncio as redis

from auth.dependencies import get_current_user_info
from core.config import settings

router = APIRouter()

# VS Code açık kaldığı sürece eklenti düzenli olarak tazeler.
PAIR_TTL_SECONDS = 120

_client: redis.Redis | None = None


async def _redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _client


def _key(user: dict) -> str:
    # Rol de anahtara girer: aynı makinede öğrenci ve öğretmen hesabı ayrı çalışsın.
    return f"gomufi:runner:{user.get('role', 'unknown')}:{user['sub']}"


class PairRequest(BaseModel):
    port: int = Field(ge=1024, le=65535)
    token: str = Field(min_length=16, max_length=200)


class LocalRunner(BaseModel):
    port: int
    token: str


@router.post("/devices/pair")
async def pair_device(payload: PairRequest, user=Depends(get_current_user_info)):
    """Eklenti yerel çalıştırıcısını duyurur (ve TTL'i tazeler)."""
    r = await _redis()
    await r.hset(_key(user), mapping={"port": payload.port, "token": payload.token})
    await r.expire(_key(user), PAIR_TTL_SECONDS)
    return {"success": True, "ttl": PAIR_TTL_SECONDS}


@router.delete("/devices/pair")
async def unpair_device(user=Depends(get_current_user_info)):
    """Eklenti kapanırken eşleşmeyi bırakır."""
    await (await _redis()).delete(_key(user))
    return {"success": True}


@router.get("/devices/local-runner", response_model=LocalRunner)
async def get_local_runner(user=Depends(get_current_user_info)):
    """Site, kullanıcının kendi makinesindeki çalıştırıcının adresini sorar.

    Anahtar kullanıcının kimliğinden türetildiği için bir kullanıcı başkasının
    çalıştırıcısını ISTEYEMEZ — istek gövdesinde hedef kullanıcı alanı yok.
    """
    data = await (await _redis()).hgetall(_key(user))
    if not data:
        raise HTTPException(status_code=404, detail="Bu hesap için açık bir VS Code bağlantısı yok.")
    return LocalRunner(port=int(data["port"]), token=data["token"])
