import secrets
from sqlalchemy import Column, DateTime, Integer, String, func, ForeignKey
from sqlalchemy.orm import relationship
from connect_db import Base

# Karışabilecek harfler (0/O, 1/I) yok: veli kodu elle yazıyor.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_student_code() -> str:
    """Veli bağlantı kodu: ST- + 10 karakter (~50 bit).

    Eskiden ST- + 6 onaltılık karakterdi (~16 milyon ihtimal): herkes Google ile
    veli hesabı açıp kodları deneyerek başka bir çocuğa kendini bağlayabilirdi.
    """
    return "ST-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(10))


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
    student_code = Column(String, unique=True, index=True, default=new_student_code)
    parent_id = Column(Integer, ForeignKey("parents.id"), nullable=True)
    
    # Gamification fields
    streak = Column(Integer, default=0)
    xp = Column(Integer, default=0) # Adding XP too as it's common

    parent = relationship("Parent", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")
    courses = relationship("Course", secondary="enrollments", back_populates="students", overlaps="enrollments")
