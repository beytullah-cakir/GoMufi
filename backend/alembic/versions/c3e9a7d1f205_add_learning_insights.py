"""YZ yorumu önbelleği (sınıf ve öğrenci özetleri)

Revision ID: c3e9a7d1f205
Revises: b5d8e2f4a619
Create Date: 2026-09-25

Uygulama açılışta eksik tabloları zaten oluşturuyor; tablo varsa atlanır.
"""
from alembic import op
import sqlalchemy as sa


revision = 'c3e9a7d1f205'
down_revision = 'b5d8e2f4a619'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if 'learning_insights' in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        'learning_insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('digest_hash', sa.String(length=64), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id', 'student_id', name='uq_learning_insight'),
    )


def downgrade() -> None:
    if 'learning_insights' in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table('learning_insights')
