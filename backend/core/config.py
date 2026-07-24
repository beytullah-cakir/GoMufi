import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Geçmişte kaynak kodda varsayılan olarak bulunmuş, artık kabul edilmeyen değerler.
_REJECTED_SECRETS = {"gomufi-dev-secret-key-change-in-prod", "secret", "changeme"}
_REJECTED_ADMIN_PASSWORDS = {"admin123", "admin", "123456", "password"}


class Settings:
    # SECRET_KEY zorunludur — varsayılanı YOKTUR. Tahmin edilebilir bir anahtar,
    # herkesin istediği rolde JWT üretebilmesi demektir.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"

    # Admin girişi yalnızca bu iki değişken tanımlıysa açılır (bkz. ADMIN_LOGIN_ENABLED).
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    IYZICO_API_KEY: str = os.getenv("IYZICO_API_KEY", "")
    IYZICO_SECRET_KEY: str = os.getenv("IYZICO_SECRET_KEY", "")
    IYZICO_BASE_URL: str = os.getenv("IYZICO_BASE_URL", "https://sandbox-api.iyzipay.com")
    MY_API_KEY: str = os.getenv("MY_API_KEY", "")  # Gemini AI API key
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Basit/mekanik görevler (başlık önerisi, konu listesi, dağıtım) için ucuz model.
    # Kaliteyi etkileyen slayt içeriği üretimi DAİMA GEMINI_MODEL ile yapılır.
    # Aynı modeli kullanmak isterseniz GEMINI_MODEL_LITE=gemini-2.5-flash yapın.
    # NOT: gemini-2.5-flash-lite ve 2.0-flash-lite Google tarafından yeni kullanıcılara
    # KAPATILDI (404 döner, Temmuz 2026). 3.1-flash-lite bu anahtarla çağrılabilen
    # en ucuz model ($0.25/$1.50 per 1M).
    GEMINI_MODEL_LITE: str = os.getenv("GEMINI_MODEL_LITE", "gemini-3.1-flash-lite")

    # Slayt içeriği ve kurs iskeleti üretimi için model.
    # DENEYİM (Temmuz 2026): 3.1-flash-lite %67 ucuzdu ama üretimde ANLA modüllerine
    # TEK slayt yazdığı görüldü (2.5-flash 2-4 slayt yazar) — anlatım derinliği
    # kabul edilemez şekilde düştü ve varsayılana geri dönüldü. Ucuz mod isteyen
    # bilinçli olarak GEMINI_MODEL_CONTENT=gemini-3.1-flash-lite yapabilir.
    GEMINI_MODEL_CONTENT: str = os.getenv("GEMINI_MODEL_CONTENT", "gemini-2.5-flash")

    # İçerik üretimi çağrılarının thinking bütçesi. 2.5-flash için sınırlı bütçe
    # kalite/maliyet dengesini kurar; lite modele geçilirse 0 yapılmalı
    # (ölçüm: lite'a bütçe verilince 829 gereksiz thinking token harcıyor).
    GEMINI_THINKING_BUDGET_CONTENT: int = int(os.getenv("GEMINI_THINKING_BUDGET_CONTENT", "1024"))

    # Ödev değerlendirmesi (GEMINI_MODEL ile) için düşünme (thinking) token bütçesi.
    # Thinking token'ları ÇIKTI tarifesinden faturalanır ve kapatılmazsa küçük bir
    # cevap için binlerce token harcanabilir (ölçüm: 25 token'lık cevaba 763 thinking).
    #  -1 = sınırsız (dinamik), 0 = kapalı, >0 = üst sınır.
    GEMINI_THINKING_BUDGET: int = int(os.getenv("GEMINI_THINKING_BUDGET", "1024"))

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

    @property
    def ADMIN_LOGIN_ENABLED(self) -> bool:
        """
        E-posta+şifre ile admin girişi yalnızca her iki değişken de tanımlıyken çalışır.
        Tanımlı değilse bu giriş yolu tamamen kapalıdır (varsayılan hesaba düşülmez).
        """
        return bool(self.ADMIN_EMAIL and self.ADMIN_PASSWORD)

    def validate(self) -> None:
        """Uygulama açılmadan önce güvenlik açısından kritik ayarları doğrular."""
        if not self.SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY ortam değişkeni ayarlanmamış. "
                "Rastgele bir değer üretin: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        if self.SECRET_KEY in _REJECTED_SECRETS:
            raise RuntimeError(
                "SECRET_KEY herkese açık kaynak kodda geçmiş bir varsayılan değere eşit. "
                "Lütfen yeni ve rastgele bir anahtar üretin."
            )
        if len(self.SECRET_KEY) < 32:
            raise RuntimeError("SECRET_KEY en az 32 karakter olmalıdır.")

        if self.ADMIN_LOGIN_ENABLED and self.ADMIN_PASSWORD.lower() in _REJECTED_ADMIN_PASSWORDS:
            # Yerelde geliştirmeyi durdurmamak için uyarı; production'da açılışı engeller.
            message = (
                "ADMIN_PASSWORD yaygın/varsayılan bir parolaya eşit "
                "('admin123' gibi). Lütfen güçlü bir parola belirleyin."
            )
            if self.IS_PRODUCTION:
                raise RuntimeError(message)
            logger.warning("GÜVENLİK UYARISI: %s", message)

        if not self.ADMIN_LOGIN_ENABLED:
            logger.warning(
                "ADMIN_EMAIL/ADMIN_PASSWORD tanımlı değil — e-posta ile admin girişi devre dışı."
            )

        if self.IS_PRODUCTION and not self.JITSI_APP_SECRET:
            logger.warning("JITSI_APP_SECRET tanımlı değil — canlı ders token üretimi çalışmayacak.")


settings = Settings()
settings.validate()
