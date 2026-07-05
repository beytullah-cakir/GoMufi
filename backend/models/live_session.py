from sqlalchemy import Column, Integer, String, ForeignKey, Time, DateTime, func
from sqlalchemy.orm import relationship
from connect_db import Base

class LiveSession(Base):
    __tablename__ = "live_sessions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    day_of_week = Column(String(20)) # Pazartesi, Salı...
    start_time = Column(Time)
    duration_minutes = Column(Integer, default=40)
    type = Column(String(20), default='live') # live, reserved
    status = Column(String(20), default='upcoming') # upcoming, completed, live
    created_at = Column(DateTime, server_default=func.now())

    course = relationship("Course", back_populates="live_sessions")
