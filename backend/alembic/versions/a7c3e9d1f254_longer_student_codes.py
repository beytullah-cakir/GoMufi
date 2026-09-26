"""Veli bağlantı kodları uzatılır (ST- + 10 karakter)

Eski kodlar (ST- + 6 onaltılık) deneme yanılmayla bulunabiliyordu. Kısa
kodlar yenileriyle değiştirilir; bağlı veliler etkilenmez.

Revision ID: a7c3e9d1f254
Revises: f4a8c2e6b173
Create Date: 2026-09-26
"""
import secrets

from alembic import op
import sqlalchemy as sa


revision = 'a7c3e9d1f254'
down_revision = 'f4a8c2e6b173'
branch_labels = None
depends_on = None

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id FROM students WHERE student_code IS NULL OR length(student_code) < 13")).fetchall()
    for (sid,) in rows:
        code = "ST-" + "".join(secrets.choice(ALPHABET) for _ in range(10))
        bind.execute(sa.text("UPDATE students SET student_code = :c WHERE id = :i"), {"c": code, "i": sid})


def downgrade() -> None:
    pass
