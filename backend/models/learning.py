"""
Öğrenme analitiği tabloları: öğrencinin NEREDE ve NEDEN zorlandığının kaydı.

Katmanlar:
  learning_events   — ham kayıt; yalnızca eklenir, değiştirilmez
  task_progress     — öğrenci × görev özeti (sayfalar ham kaydı taramasın diye)
  concept_mastery   — öğrenci × kavram hakimiyeti (kazanım haritası)
  code_edit_chunks  — yazım kaydı: eklentinin/tarayıcının gönderdiği düzenlemeler
  code_provenance   — dosyanın güncel metni ve her parçasının kaynağı

Tüm tablolar kurs ve öğrenci silinince birlikte silinir (CASCADE): öğrenci
verisi, sahibi gittiğinde ortada kalmamalı.
"""
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text,
    UniqueConstraint, func,
)

from connect_db import Base


class LearningEvent(Base):
    __tablename__ = "learning_events"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    # Müfredat düğümü (yol haritasındaki modül) — kavramlar buradan gelir.
    node_id = Column(String(100), nullable=True)
    # "challenge:<slayt>", "connect:<slayt>", "produce:<slayt>", ödev slayt id'si, "quiz:<soru>"
    task_key = Column(String(120), nullable=True)
    # UYGULA / BİRLEŞTİR / ÜRET / QUIZ / ÖDEV / MODÜL
    stage = Column(String(20), nullable=True)
    # check / solved / submitted / hint_opened / coach / quiz_answer /
    # homework_review / homework_graded / module_completed
    event_type = Column(String(30), nullable=False)
    # pass / fail / error / ran / offline
    outcome = Column(String(20), nullable=True)
    attempt = Column(Integer, nullable=True)
    error_type = Column(String(80), nullable=True)
    error_line = Column(Integer, nullable=True)
    concept_ids = Column(JSON, default=list)
    # Olay türüne göre: düşen ölçütler, koçun mesajı ve yanılgı etiketi,
    # quiz cevabı, ödev puanı ve zayıflıkları.
    details = Column(JSON, default=dict)
    # Denemedeki kod (en fazla 8 KB). Saklama süresi dolunca boşaltılır.
    code_snapshot = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    # vscode-panel / lab / browser / server
    client = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_learning_events_course_student", "course_id", "student_id"),
        Index("ix_learning_events_course_task", "course_id", "task_key"),
        Index("ix_learning_events_created", "created_at"),
    )


class TaskProgress(Base):
    __tablename__ = "task_progress"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    task_key = Column(String(120), nullable=False)
    node_id = Column(String(100), nullable=True)
    stage = Column(String(20), nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    first_seen_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)
    solved_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    first_try_pass = Column(Boolean, nullable=True)
    last_outcome = Column(String(20), nullable=True)
    # Son düşen ölçütün etiketi ("Kodda for kullanıldı") ve üst üste kaç kez düştüğü.
    last_failure = Column(String(300), nullable=True)
    same_failure_streak = Column(Integer, default=0, nullable=False)
    last_error_type = Column(String(80), nullable=True)
    hints_opened = Column(Integer, default=0, nullable=False)
    coach_messages = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", "task_key", name="uq_task_progress"),
        Index("ix_task_progress_course_task", "course_id", "task_key"),
    )


class ConceptMastery(Base):
    __tablename__ = "concept_mastery"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    concept_id = Column(String(80), nullable=False)
    # 0..1 — yakın tarihli kanıt daha ağır basar (bkz. learning_analytics.update_mastery)
    score = Column(Float, default=0.5, nullable=False)
    # Kanıtların toplam ağırlığı: "veri az" ile "zorlanıyor"u ayırır.
    evidence_weight = Column(Float, default=0.0, nullable=False)
    successes = Column(Integer, default=0, nullable=False)
    failures = Column(Integer, default=0, nullable=False)
    last_evidence_at = Column(DateTime, nullable=True)
    # Koçun ya da ödev değerlendirmesinin son tespit ettiği yanılgı.
    last_misconception = Column(String(200), nullable=True)

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", "concept_id", name="uq_concept_mastery"),
    )


class LearningInsight(Base):
    """YZ yorumunun önbelleği: sınıf özeti ya da tek öğrencinin özeti.

    İstek üzerine üretilir; aynı veriyle ikinci kez istendiğinde model yeniden
    çağrılmaz (`digest_hash`). Veri değiştiyse sayfa "güncel değil" der,
    öğretmen isterse yeniler.
    """

    __tablename__ = "learning_insights"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    # 0 = sınıf özeti
    student_id = Column(Integer, nullable=False, default=0)
    digest_hash = Column(String(64), nullable=False)
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", name="uq_learning_insight"),
    )


class CodeEditChunk(Base):
    """Yazım kaydının bir paketi. Eklenti ~15 saniyede bir, kontrolde ve kapanışta gönderir."""

    __tablename__ = "code_edit_chunks"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    task_key = Column(String(120), nullable=False)
    file_name = Column(String(80), nullable=False)
    session_id = Column(String(40), nullable=False)
    seq = Column(Integer, nullable=False)
    # vscode / browser
    client = Column(String(20), nullable=False)
    # İstemci saatiyle paketin ilk düzenlemesi (epoch ms). Sıralama için.
    started_at_ms = Column(Float, nullable=False)
    # Oturumun ilk paketinde dosyanın o anki tam metni: arada editör dışında
    # bir değişiklik olduysa sunucu bunu buradan anlıyor.
    base_text = Column(Text, nullable=True)
    ops = Column(JSON, default=list)
    ext_version = Column(String(20), nullable=True)
    ai_extensions = Column(JSON, default=list)
    received_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_code_edit_chunks_task", "course_id", "student_id", "task_key"),
        UniqueConstraint(
            "course_id", "student_id", "task_key", "file_name", "session_id", "seq",
            name="uq_code_edit_chunk",
        ),
    )


class CodeProvenance(Base):
    """Bir görev dosyasının güncel metni ve her parçasının nereden geldiği."""

    __tablename__ = "code_provenance"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    task_key = Column(String(120), nullable=False)
    file_name = Column(String(80), nullable=False)
    text = Column(Text, default="", nullable=False)
    # [[kaynak, uzunluk], ...] — metinle hizalı, bitişik aynı kaynaklar birleşik.
    segments = Column(JSON, default=list)
    # Etkinlik sayaçları (son metinden bağımsız): yazılan, silinen, yapıştırılan…
    totals = Column(JSON, default=dict)
    # Geri al / yinele eşlemesi için son silinen parçalar.
    recent_deletes = Column(JSON, default=list)
    # Son 60 saniyede yazılan karakterler — yazma hızı tepe değeri için.
    recent_typed = Column(JSON, default=list)
    ai_extensions = Column(JSON, default=list)
    last_op_ms = Column(Float, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "course_id", "student_id", "task_key", "file_name", name="uq_code_provenance",
        ),
    )
