"""Öğrenci etkinlik günleri (günlük seri ve günlük görevler)

Revision ID: f4a8c2e6b173
Revises: e2f6b9d4a031
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = 'f4a8c2e6b173'
down_revision = 'e2f6b9d4a031'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if 'student_activity_days' not in set(sa.inspect(op.get_bind()).get_table_names()):
        op.create_table(
            'student_activity_days',
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('day', sa.Date(), primary_key=True),
            sa.Column('modules', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('perfect', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('xp', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('homework', sa.Integer(), nullable=False, server_default='0'),
        )


def downgrade() -> None:
    op.drop_table('student_activity_days')
