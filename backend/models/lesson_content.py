from sqlalchemy import Column, Integer, String, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from connect_db import Base

class LessonContent(Base):
    __tablename__ = "lesson_contents"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=True) # Note/Lesson title
    slides = Column(JSON, default=[])

    __table_args__ = (
        UniqueConstraint("course_id", "node_id", name="uq_course_node_content"),
    )

    course = relationship("Course", back_populates="lesson_contents")
