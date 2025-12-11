from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from connect_db import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    title = Column(String)
    description = Column(Text)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
