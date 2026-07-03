from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from connect_db import Base # Projenizdeki ana Base sınıfı

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    section_id = Column(String(100), nullable=True) # ID or index of the section
    node_id = Column(Integer, nullable=True) # ID of the node in the course curriculum
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(50))
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True) # Bazı tiplerde seçenek olmayabilir
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    question_type = Column(String(50), default="multiple-choice")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "section_id": self.section_id,
            "node_id": self.node_id,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "type": self.question_type,
            "question_text": self.question_text,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "quiz": {
                "soru": self.question_text,
                "secenekler": self.options,
                "cevap": self.correct_answer,
                "aciklama": self.explanation
            },
            "tarih": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None
        }

