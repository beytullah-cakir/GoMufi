"""
Öğretmenin gördüğünü harekete çevirdiği yerler.

Öğrenme analizi "kim nerede takıldı" sorusunu cevaplıyor; bu tablolar
öğretmenin o cevapla ne yaptığını tutuyor:

  help_requests               — öğrencinin "yardım istiyorum" düğmesi (canlı ders)
  teacher_nudges              — öğretmenin takılan öğrenciye gönderdiği ipucu/mesaj
  teacher_actions             — YZ önerisine "yaptım" denmesi + o anki durum (önce/sonra)
  teacher_notes               — öğrenci profiline öğretmenin özel notu
  provenance_reviews          — kod kökeni işaretine öğretmenin kararı ("ben söyledim")
  homework_submission_versions — yeniden teslimde eski sürüm ve notu kaybolmasın
  rubric_templates            — öğretmenin bir kez tanımlayıp tekrar kullandığı puanlama anahtarları
  course_settings             — kursa özel ayarlar (not defteri ağırlıkları)
  parent_reports              — veliye giden, öğretmenin onayladığı dönem raporu
  recording_consents          — velinin yazım kaydı (tuş düzeyinde kayıt) kararı
"""
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text,
    UniqueConstraint, func,
)

from connect_db import Base


class HelpRequest(Base):
    __tablename__ = "help_requests"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    task_key = Column(String(120), nullable=False)
    note = Column(String(300), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    # Öğretmen ipucu/mesaj gönderdiğinde dolar; istek yine açık kalır.
    responded_at = Column(DateTime, nullable=True)
    # Öğretmen "ilgilendim" dediğinde ya da öğrenci "çözdüm" dediğinde.
    resolved_at = Column(DateTime, nullable=True)
    # "teacher" | "student" | "solved"
    resolved_by = Column(String(10), nullable=True)

    __table_args__ = (
        Index("ix_help_requests_open", "course_id", "resolved_at"),
    )


class TeacherNudge(Base):
    __tablename__ = "teacher_nudges"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    task_key = Column(String(120), nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    seen_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_teacher_nudges_student", "course_id", "student_id", "seen_at"),
    )


class TeacherAction(Base):
    """Öğretmenin yaptığı bir müdahale ve o anki durumun fotoğrafı.

    "Döngüleri tekrar anlattım" dendiğinde sınıfın o kavramdaki durumu
    `baseline`a yazılır; sonra sayfa güncel durumu bununla karşılaştırır.
    """

    __tablename__ = "teacher_actions"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    # reteach | practice_task | talk | check_code | other
    kind = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    note = Column(Text, nullable=True)
    concept_id = Column(String(80), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    baseline = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class TeacherNote(Base):
    __tablename__ = "teacher_notes"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_teacher_notes_student", "course_id", "student_id"),
    )


class ProvenanceReview(Base):
    """Kod kökeni işaretine öğretmenin kararı.

    accepted — "yapıştırmasını ben söyledim" / "konuştum, kendisi yazmış":
               işaret listelerden düşer, kazanım hesabı düzeltilmez (o ayrı).
    concern  — öğretmen işareti doğruladı; not olarak kalır.
    """

    __tablename__ = "provenance_reviews"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    task_key = Column(String(120), nullable=False)
    verdict = Column(String(10), nullable=False)
    note = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", "task_key", name="uq_provenance_review"),
    )


class HomeworkSubmissionVersion(Base):
    """Bir teslimin önceki hâli.

    Kurs + düğüm + öğrenciye bağlı (teslim satırına değil): öğrenci teslimini
    silse bile öğretmen daha önce verdiği notu ve gelişimi görmeye devam eder.
    """

    __tablename__ = "homework_submission_versions"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(String(100), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=True)
    file_data = Column(Text, nullable=True)
    file_mime = Column(String(100), nullable=True)
    student_note = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    grade = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    graded_source = Column(String(20), nullable=True)
    rubric_scores = Column(JSON, nullable=True)
    # "resubmitted" | "withdrawn" (öğrenci teslimini sildi)
    reason = Column(String(20), nullable=False, default="resubmitted")
    archived_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_homework_versions_owner", "course_id", "node_id", "student_id"),
    )


class RubricTemplate(Base):
    __tablename__ = "rubric_templates"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    # [{id, title, description, levels: [{label, points, description}]}]
    criteria = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class CourseSettings(Base):
    __tablename__ = "course_settings"

    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True)
    settings = Column(JSON, default=dict)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ParentReport(Base):
    __tablename__ = "parent_reports"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    # {summary, learned[], focus[], homework, teacher_note}
    content = Column(JSON, default=dict)
    # Taslağın dayandığı sayılar — veli sayfasında da aynı sayılar gösterilir.
    facts = Column(JSON, default=dict)
    # "draft" | "sent"
    status = Column(String(10), nullable=False, default="draft")
    ai_generated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    sent_at = Column(DateTime, nullable=True)
    parent_seen_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_parent_reports_student", "student_id", "status"),
    )


class RecordingConsent(Base):
    """Velinin yazım kaydı kararı.

    Yazım kaydı: görev dosyasındaki her yazma/silme/yapıştırma. Veli
    kapatırsa sunucu bu öğrencinin yazım kaydını SAKLAMAZ. Kontrol anındaki
    kod görüntüsü (öğretmenin yardım edebilmesi için) bundan ayrıdır.
    """

    __tablename__ = "recording_consents"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    # "granted" | "denied"
    status = Column(String(10), nullable=False)
    parent_id = Column(Integer, ForeignKey("parents.id", ondelete="SET NULL"), nullable=True)
    text_version = Column(String(20), nullable=False)
    decided_at = Column(DateTime, server_default=func.now(), nullable=False)
