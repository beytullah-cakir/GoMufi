from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship
from connect_db import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    department = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    password = Column(String)

    courses = relationship("Course", back_populates="teacher")
