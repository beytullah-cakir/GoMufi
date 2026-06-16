import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gomufi-dev-secret-key-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    IYZICO_API_KEY: str = os.getenv("IYZICO_API_KEY", "")
    IYZICO_SECRET_KEY: str = os.getenv("IYZICO_SECRET_KEY", "")
    IYZICO_BASE_URL: str = os.getenv("IYZICO_BASE_URL", "https://sandbox-api.iyzipay.com")
    MY_API_KEY: str = os.getenv("MY_API_KEY", "")  # Gemini AI API key

    # Jitsi JWT ayarları
    JITSI_APP_ID: str = os.getenv("JITSI_APP_ID", "gomufi")
    JITSI_APP_SECRET: str = os.getenv("JITSI_APP_SECRET", "")
    JITSI_API_KEY: str = os.getenv("JITSI_API_KEY", "") # JaaS Konsolundaki Key ID
    JITSI_DOMAIN: str = os.getenv("JITSI_DOMAIN", "8x8.vc")  # Jitsi sunucu domain'i

    DATABASE_URL: str = os.getenv("DATABASE_URL")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    @property
    def IS_PRODUCTION(self) -> bool:
        return (
            bool(self.FRONTEND_URL)
            and "localhost" not in self.FRONTEND_URL
            and self.FRONTEND_URL.startswith("https")
        )

settings = Settings()
