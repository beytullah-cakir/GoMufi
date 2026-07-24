from fastapi import APIRouter
from datetime import datetime
import pytz

router = APIRouter(prefix="/utils", tags=["utils"])

@router.get("/time")
async def get_server_time():
    """
    Returns the current server time in Turkey (Istanbul) timezone.
    Used by frontend to synchronize time and prevent local time cheating.
    """
    tz = pytz.timezone('Europe/Istanbul')
    istanbul_now = datetime.now(tz)
    return {
        "datetime": istanbul_now.isoformat(),
        "timestamp": int(istanbul_now.timestamp() * 1000)
    }


@router.get("/health", tags=["health"])
async def health_check():
    """
    Basit sağlık kontrolü endpoint'i.
    Render.com health check ve keep-alive ping için kullanılır.
    """
    return {"status": "ok"}
