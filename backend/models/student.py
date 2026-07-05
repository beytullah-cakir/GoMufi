import uuid
from sqlalchemy import Column, DateTime, Integer, String, func, ForeignKey
from sqlalchemy.orm import relationship
from connect_db import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    nickname = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    grade_level = Column(String)
    education_level = Column(String)
    password = Column(String)
    student_code = Column(String, unique=True, index=True, default=lambda: f"ST-{str(uuid.uuid4())[:6].upper()}")
    parent_id = Column(Integer, ForeignKey("parents.id"), nullable=True)
    
    # Gamification fields
    gems = Column(Integer, default=0)
    hearts = Column(Integer, default=5)
    streak = Column(Integer, default=0)
    xp = Column(Integer, default=0) # Adding XP too as it's common

    parent = relationship("Parent", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")
    courses = relationship("Course", secondary="enrollments", back_populates="students", overlaps="enrollments")
