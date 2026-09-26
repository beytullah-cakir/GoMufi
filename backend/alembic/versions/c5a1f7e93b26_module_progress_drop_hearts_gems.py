"""Modül ilerlemesi sunucuda; can ve elmas kaldırıldı

Revision ID: c5a1f7e93b26
Revises: b7e3d9a2c418
Create Date: 2026-09-26

İlerleme eskiden öğrencinin tarayıcısında tutuluyordu. Can yanlış cevapta azalıp
hiç yenilenmiyordu, elmasın harcanacağı yer yoktu.
"""
from alembic import op
import sqlalchemy as sa


revision = 'c5a1f7e93b26'
down_revision = 'b7e3d9a2c418'
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if 'module_progress' not in set(inspector.get_table_names()):
        op.create_table(
            'module_progress',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
            sa.Column('node_id', sa.String(100), nullable=False),
            sa.Column('stars', sa.Integer(), nullable=False, server_default='3'),
            sa.Column('xp_awarded', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('source', sa.String(10), nullable=False, server_default='self'),
            sa.Column('completed_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('course_id', 'student_id', 'node_id', name='uq_module_progress'),
        )
    columns = {c['name'] for c in inspector.get_columns('students')}
    for name in ('hearts', 'gems'):
        if name in columns:
            op.drop_column('students', name)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {c['name'] for c in inspector.get_columns('students')}
    if 'gems' not in columns:
        op.add_column('students', sa.Column('gems', sa.Integer(), nullable=True))
    if 'hearts' not in columns:
        op.add_column('students', sa.Column('hearts', sa.Integer(), nullable=True))
    if 'module_progress' in set(inspector.get_table_names()):
        op.drop_table('module_progress')
