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

    # Metrik projeksiyonu: bir öğretmenin ayda ürettiği varsayılan ders sayısı.
    # "Öğretmen aylık maliyet" kolonu bu varsayımla hesaplanır (ölçüm değil, projeksiyon).
    LESSONS_PER_TEACHER_MONTH: int = int(os.getenv("LESSONS_PER_TEACHER_MONTH", "20"))

    # Ödev değerlendirmesi (GEMINI_MODEL ile) için düşünme (thinking) token bütçesi.
    # Thinking token'ları ÇIKTI tarifesinden faturalanır ve kapatılmazsa küçük bir
    # cevap için binlerce token harcanabilir (ölçüm: 25 token'lık cevaba 763 thinking).
    #  -1 = sınırsız (dinamik), 0 = kapalı, >0 = üst sınır.
    GEMINI_THINKING_BUDGET: int = int(os.getenv("GEMINI_THINKING_BUDGET", "1024"))

    # E-posta (şifre sıfırlama, veli raporu, duyuru, ödev hatırlatma).
    # RESEND_API_KEY varsa Resend, yoksa SMTP_HOST varsa SMTP kullanılır; ikisi de
    # yoksa e-posta gönderilmez, yalnızca loga yazılır (lokal geliştirme).
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "GoMufi <bildirim@gomufi.com>")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    # PostHog server-side analytics (opsiyonel). Anahtar yoksa no-op çalışır.
    # KVKK: host varsayılanı EU (veri AB'de tutulur).
    POSTHOG_API_KEY: str = os.getenv("POSTHOG_API_KEY", "")
    POSTHOG_HOST: str = os.getenv("POSTHOG_HOST", "https://eu.i.posthog.com")

    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # Redis opsiyonel — Render.com'da kullanılmıyorsa None bırakılabilir.
    # Eğer REDIS_URL tanımlı değilse WebSocket manager local fallback kullanır.
    REDIS_URL: str | None = os.getenv("REDIS_URL", None)

    # Render.com RENDER_EXTERNAL_URL'yi otomatik inject eder.
    # Manuel BACKEND_URL yoksa bunu kullan; ikisi de yoksa localhost.
    BACKEND_URL: str = (
        os.getenv("RENDER_EXTERNAL_URL")
        or os.getenv("BACKEND_URL", "http://localhost:8000")
    )

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

        if self.IS_PRODUCTION and not (self.RESEND_API_KEY or self.SMTP_HOST):
            logger.warning("RESEND_API_KEY/SMTP_HOST tanımlı değil — e-posta gönderilmeyecek (şifre sıfırlama çalışmaz).")


settings = Settings()
settings.validate()
