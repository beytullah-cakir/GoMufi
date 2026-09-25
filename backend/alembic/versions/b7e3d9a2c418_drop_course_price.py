"""Kurs fiyatı kaldırıldı: kurs satışı (pazar yeri) yok, öğrenci kursa katılım koduyla girer

Revision ID: b7e3d9a2c418
Revises: a4c8e2f61d07
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = 'b7e3d9a2c418'
down_revision = 'a4c8e2f61d07'
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('courses')}
    if 'price' in columns:
        op.drop_column('courses', 'price')


def downgrade() -> None:
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('courses')}
    if 'price' not in columns:
        op.add_column('courses', sa.Column('price', sa.Integer(), nullable=True, server_default='0'))
