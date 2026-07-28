from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship
from connect_db import Base


class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(100), nullable=False, index=True)   # ders/slide node ID
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)             # orijinal dosya adı
    file_data = Column(Text, nullable=True)                     # base64 içerik (küçük dosyalar)
    file_mime = Column(String(100), nullable=True)              # MIME type
    student_note = Column(Text, nullable=True)                  # öğrencinin isteğe bağlı notu
    submitted_at = Column(DateTime, server_default=func.now())

    # --- Değerlendirme ---
    # NULL = henüz değerlendirilmedi. Değerlendirme yapıldığında grade + graded_at
    # birlikte dolar; "değerlendirildi mi" sorusunun tek kaynağı graded_at'tir
    # (0 puan geçerli bir nottur, grade'in varlığına bakmak yanıltıcı olur).
    grade = Column(Integer, nullable=True)                      # 0-100
    feedback = Column(Text, nullable=True)                      # öğretmenin yazdığı geri bildirim
    graded_at = Column(DateTime, nullable=True)
    graded_by = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    # "teacher" = hoca kendi yazdı, "ai_assisted" = AI taslağı hoca onayladı.
    # İleride free/paid ayrımında (free'de AI yok) hangi yolun kullanıldığını
    # geriye dönük ayırt edebilmek için tutulur.
    graded_source = Column(String(20), nullable=True)

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    course = relationship("Course", foreign_keys=[course_id])
