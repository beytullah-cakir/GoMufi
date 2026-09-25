"""
Mesajlaşma: öğretmen ile öğrenci (ya da veli) arasındaki yazışmalar.

Eskiden sohbetler yalnızca tarayıcıda (localStorage) duruyor ve WebSocket
üzerinden bağlı HERKESE yayınlanıyordu: öğretmen çevrimdışıyken gelen soru
kayboluyor, bir öğrencinin sorusu diğer öğrencilerin tarayıcısına ulaşıyordu.
Artık mesaj önce buraya yazılır, sonra yalnızca karşı tarafa bildirilir.

Bir yazışmanın iki tarafı var: kursun öğretmeni ve bir "üye" (öğrenci ya da
veli). Üye rolü ile kimliği ayrı tutuluyor çünkü öğrenci, veli ve öğretmen
kimlikleri ayrı tablolardan geliyor ve çakışabiliyor.
"""
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, func,
)

from connect_db import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    # "student" | "parent"
    member_role = Column(String(10), nullable=False)
    member_id = Column(Integer, nullable=False)
    # Yazışmanın konusu olan öğrenci: öğrenci yazışmasında üyenin kendisi,
    # veli yazışmasında çocuğu.
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    topic = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    last_message_at = Column(DateTime, server_default=func.now(), nullable=False)
    last_preview = Column(String(200), nullable=True)
    teacher_unread = Column(Integer, default=0, nullable=False)
    member_unread = Column(Integer, default=0, nullable=False)
    teacher_archived = Column(Boolean, default=False, nullable=False)
    member_archived = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("ix_conversations_teacher", "teacher_id", "last_message_at"),
        Index("ix_conversations_member", "member_role", "member_id", "last_message_at"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    # "teacher" | "student" | "parent" | "system"
    sender_role = Column(String(10), nullable=False)
    sender_id = Column(Integer, nullable=True)
    body = Column(Text, nullable=False, default="")
    # "text" | "image" | "file"
    kind = Column(String(10), nullable=False, default="text")
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_messages_conversation", "conversation_id", "id"),
    )
