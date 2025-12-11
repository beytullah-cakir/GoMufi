from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    grade = Column(String)
    school = Column(String)
