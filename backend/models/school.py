"""
Okulun günlük işleri:

  password_reset_tokens — "şifremi unuttum" linki (yalnızca özeti saklanır, tek kullanımlık)
  attendance_records    — öğretmenin aldığı yoklama: ders günü × öğrenci başına tek satır
  announcements         — kursa ya da tek bir şubeye duyuru
  notification_log      — otomatik e-postaların (ödev hatırlatma, teslim özeti) kaydı;
                          aynı bildirim iki kez gönderilmesin diye
  module_progress       — öğrencinin bitirdiği modüller (eskiden tarayıcıda tutuluyordu;
                          cihaz değişince kayboluyor, öğretmen göremiyordu)
"""
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint, func,
)

from connect_db import Base


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    # "student" | "teacher" — veliler Google ile giriyor, şifreleri yok.
    role = Column(String(10), nullable=False)
    user_id = Column(Integer, nullable=False)
    # Linkteki token'ın SHA-256 özeti; veritabanı sızsa bile link üretilemez.
    token_hash = Column(String(64), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_password_reset_owner", "role", "user_id", "created_at"),)


ATTENDANCE_STATUSES = ("present", "absent", "late", "excused")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    # Yoklama alındığı andaki şube (course.classes[].id); öğrenci sonra şube değiştirse de kayıt anlamını korur.
    class_id = Column(String(64), nullable=True)
    lesson_date = Column(Date, nullable=False)
    # present | absent | late | excused (bkz. ATTENDANCE_STATUSES)
    status = Column(String(10), nullable=False)
    note = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "lesson_date", "student_id", name="uq_attendance_day"),
        Index("ix_attendance_student", "student_id", "lesson_date"),
    )


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    # NULL = kursun tüm öğrencileri; dolu = yalnızca o şube.
    class_id = Column(String(64), nullable=True)
    title = Column(String(150), nullable=False)
    body = Column(Text, nullable=False)
    # Öğrencilere ve bağlı velilere e-postayla da gönderildi mi.
    email_sent = Column(Boolean, default=False, nullable=False)
    email_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_announcements_course", "course_id", "created_at"),)


class NotificationLog(Base):
    __tablename__ = "notification_log"

    id = Column(Integer, primary_key=True)
    # "homework_due" | "submission_digest"
    kind = Column(String(40), nullable=False)
    # homework_due: "<kurs>:<ödev slaytı>:<öğrenci>" · submission_digest: "<öğretmen>:<kurs>"
    key = Column(String(200), nullable=False)
    sent_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("kind", "key", name="uq_notification_once"),)


class ModuleProgress(Base):
    __tablename__ = "module_progress"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    # Müfredattaki modülün kimliği (course.curriculum[].id)
    node_id = Column(String(100), nullable=False)
    stars = Column(Integer, default=3, nullable=False)
    # Modül XP'si yalnızca ilk tamamlamada verilir.
    xp_awarded = Column(Integer, default=0, nullable=False)
    # "self" = öğrenci bitirdi · "live" = öğretmen canlı derste işledi
    source = Column(String(10), default="self", nullable=False)
    completed_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("course_id", "student_id", "node_id", name="uq_module_progress"),)


class StudentActivityDay(Base):
    """Öğrencinin bir takvim günündeki (Türkiye saati) etkinliği: günlük seri ve
    günlük görevler buradan hesaplanır. Bkz. core/streak.py"""
    __tablename__ = "student_activity_days"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    day = Column(Date, primary_key=True)
    modules = Column(Integer, default=0, nullable=False)
    perfect = Column(Integer, default=0, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    homework = Column(Integer, default=0, nullable=False)


class RewardClaim(Base):
    """Bir kez alınabilen ödüller: harita sandığı, günlük tekrar XP'si.

    Anahtar ödülün kimliği ("chest:<kurs>:<sıra>", "review:<kurs>:<gün>");
    tekillik kısıtı aynı ödülün iki kez alınmasını veritabanı düzeyinde engeller.
    """
    __tablename__ = "reward_claims"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(120), nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    claimed_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("student_id", "key", name="uq_reward_once"),)
