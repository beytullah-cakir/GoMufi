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

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    course = relationship("Course", foreign_keys=[course_id])
