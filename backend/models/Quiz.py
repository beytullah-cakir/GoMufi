from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.sql import func
from connect_db import Base # Projenizdeki ana Base sınıfı

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(50))
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "topic": self.topic,
            "difficulty": self.difficulty,  
            "quiz": {
                "soru": self.question_text,
                "secenekler": self.options,
                "cevap": self.correct_answer
            },
            "tarih": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None
        }

