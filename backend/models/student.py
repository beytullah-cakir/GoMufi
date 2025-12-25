from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship
from connect_db import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    nickname = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    grade_level = Column(String)
    education_level = Column(String)
    password = Column(String)

    enrollments = relationship("Enrollment", back_populates="student")
    courses = relationship("Course", secondary="enrollments", back_populates="students", overlaps="enrollments")
