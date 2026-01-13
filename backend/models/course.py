from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, func, JSON
from sqlalchemy.orm import relationship
from connect_db import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    progress = Column(Integer, default=0)
    price = Column(Integer, default=0) # Fiyat (TL cinsinden tamsayı veya float olabilir)
    learning_outcomes = Column(JSON, default=[])
    requirements = Column(JSON, default=[])
    curriculum = Column(JSON, default=[])


    teacher = relationship("Teacher", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course")
    students = relationship("Student", secondary="enrollments", back_populates="courses", overlaps="enrollments")
