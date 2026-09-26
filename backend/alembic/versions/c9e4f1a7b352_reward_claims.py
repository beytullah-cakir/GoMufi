"""Bir kez alınan ödüller (harita sandıkları, günlük tekrar)

Revision ID: c9e4f1a7b352
Revises: b8d4f0a2c365
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = 'c9e4f1a7b352'
down_revision = 'b8d4f0a2c365'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if 'reward_claims' not in set(sa.inspect(op.get_bind()).get_table_names()):
        op.create_table(
            'reward_claims',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
            sa.Column('key', sa.String(120), nullable=False),
            sa.Column('xp', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('claimed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint('student_id', 'key', name='uq_reward_once'),
        )


def downgrade() -> None:
    op.drop_table('reward_claims')
