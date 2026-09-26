"""
Platformun işletme tabloları (canlıya çıkış hazırlığı):

  stored_files          — yüklenen dosyalar. Eskiden sunucunun diskine yazılıyordu;
                          Render'ın diski kalıcı olmadığı için her deploy'da siliniyordu.
                          Ödev dosyaları gibi veritabanında tutulur (ek servis, yurt dışı
                          depolama sağlayıcısı gerekmez — KVKK açısından veri tek yerde).
  slide_templates       — yöneticinin kaydettiği slayt şablonları (eskiden JSON dosyasıydı)
  login_attempts        — giriş denemeleri; kaba kuvvet şifre denemesine karşı sınır
  account_suspensions   — yöneticinin askıya aldığı hesaplar (giriş ve istekler reddedilir)
  admin_actions         — yönetici işlem kaydı: kim, ne zaman, neyi değiştirdi
"""
from sqlalchemy import JSON, Boolean, Column, DateTime, Index, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from connect_db import Base


class StoredFile(Base):
    __tablename__ = "stored_files"

    id = Column(String(36), primary_key=True)          # uuid4
    # "image" = ders görseli (herkese açık) · "chat" = mesaj eki (yalnızca konuşmanın tarafları)
    kind = Column(String(10), nullable=False)
    owner_role = Column(String(10), nullable=False)
    owner_id = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    extension = Column(String(10), nullable=False)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_stored_files_owner", "owner_role", "owner_id"),)


class SlideTemplate(Base):
    __tablename__ = "slide_templates"

    id = Column(String(36), primary_key=True)         # uuid4 (istemci bu kimlikle günceller/siler)
    category = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    elements = Column(JSON, nullable=False, default=list)
    background = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    ip = Column(String(64), nullable=False)
    success = Column(Boolean, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_login_attempts_email", "email", "created_at"),
        Index("ix_login_attempts_ip", "ip", "created_at"),
    )


class AccountSuspension(Base):
    __tablename__ = "account_suspensions"

    id = Column(Integer, primary_key=True)
    role = Column(String(10), nullable=False)          # student | teacher | parent
    user_id = Column(Integer, nullable=False)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("role", "user_id", name="uq_account_suspension"),)


class AdminAction(Base):
    __tablename__ = "admin_actions"

    id = Column(Integer, primary_key=True)
    action = Column(String(60), nullable=False)        # ör. "user.delete", "user.suspend"
    target = Column(String(120), nullable=True)        # ör. "student:12", "course:5"
    summary = Column(String(500), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_admin_actions_created", "created_at"),)


class SessionReset(Base):
    """Bu andan ÖNCE verilmiş token'lar geçersiz (şifre değişti, oturumlar kapatıldı).

    JWT'ler sunucuda tutulmuyor; tek tek iptal edilemiyorlar. Bunun yerine
    kullanıcı başına bir "şu andan önceki token'ları kabul etme" işareti.
    """
    __tablename__ = "session_resets"

    role = Column(String(10), primary_key=True)
    user_id = Column(Integer, primary_key=True)
    after = Column(DateTime, nullable=False)
