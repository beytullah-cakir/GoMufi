from sqlalchemy import Column, DateTime, Integer, String, Float, func
from connect_db import Base

class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, nullable=True, index=True)
    course_id = Column(Integer, nullable=True, index=True)
    course_title = Column(String, nullable=True)
    action = Column(String, index=True)
    model_name = Column(String)
    prompt_tokens = Column(Integer, default=0)
    candidates_tokens = Column(Integer, default=0)
    # Gemini "thinking" token'ları — çıktı tarifesinden faturalanır, maliyete dahildir
    thoughts_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    # Öğretmenin yüklediği kaynak PDF'in BU çağrıya giren kısmı.
    # Kaynak metin prompt'un içindedir, yani maliyeti zaten cost_usd'ye dahildir;
    # bu üç alan onu görünür kılmak için AYRIŞTIRIR, üstüne eklemez.
    source_chars = Column(Integer, default=0)
    source_tokens = Column(Integer, default=0)
    source_cost_usd = Column(Float, default=0.0)
    details = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
