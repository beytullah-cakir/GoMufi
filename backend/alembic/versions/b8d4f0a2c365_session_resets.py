"""Oturum sıfırlama (şifre değişince eski token'lar geçersiz)

Revision ID: b8d4f0a2c365
Revises: a7c3e9d1f254
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = 'b8d4f0a2c365'
down_revision = 'a7c3e9d1f254'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if 'session_resets' not in set(sa.inspect(op.get_bind()).get_table_names()):
        op.create_table(
            'session_resets',
            sa.Column('role', sa.String(10), primary_key=True),
            sa.Column('user_id', sa.Integer(), primary_key=True),
            sa.Column('after', sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table('session_resets')
