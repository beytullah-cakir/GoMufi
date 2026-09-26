"""
Kurumlar (okul, dershane, kurs merkezi) ve paketler.

  organizations         — kurum
  organization_members  — kurumdaki öğretmenler; bir öğretmen en fazla bir kurumda.
                          role: "admin" (kurum yöneticisi: müdür, BT koordinatörü) | "teacher"
                          ai_cap_credits: yöneticinin koyabileceği aylık YZ kredisi sınırı
  organization_invites  — e-postayla öğretmen daveti (bağlantıdaki belirtecin yalnızca özeti saklanır)
  subscriptions         — paket: öğretmene ya da kuruma ait (owner_type), süreli.
                          Ödeme entegrasyonu yok; pilot ve kurum paketleri yönetici panelinden verilir.
"""
from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from connect_db import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    kind = Column(String(20), nullable=False, default="okul")      # okul | dershane | kurs
    city = Column(String(80), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False, default="teacher")
    ai_cap_credits = Column(Integer, nullable=True)
    joined_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", name="uq_org_member_teacher"),
        Index("ix_org_members_org", "organization_id"),
    )


class OrganizationInvite(Base):
    __tablename__ = "organization_invites"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False, default="teacher")
    token_hash = Column(String(64), nullable=False, unique=True)
    invited_by = Column(Integer, nullable=True)                    # öğretmen kimliği; GoMufi yöneticisi ise boş
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    __table_args__ = (Index("ix_org_invites_email", "email"),)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    owner_type = Column(String(20), nullable=False)                # "teacher" | "organization"
    owner_id = Column(Integer, nullable=False)
    plan = Column(String(20), nullable=False)                      # core/plans.py: pro | kurum
    starts_at = Column(DateTime, server_default=func.now(), nullable=False)
    ends_at = Column(DateTime, nullable=True)                      # boşsa süresiz
    pool_credits = Column(Integer, nullable=True)                  # kurum: aylık kredi havuzu (boşsa öğretmen başına)
    note = Column(String(300), nullable=True)                      # ör. "Pilot — Eylül 2026"
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_subscriptions_owner", "owner_type", "owner_id"),)
