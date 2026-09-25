"""Kavram sözlüğü tabloları (dil bazlı) + eşleşmeyen kavram logu

Revision ID: f3a1c7d90b45
Revises: e7d2b45c19af
Create Date: 2026-09-11

Sözlük DİLE aittir: (language, concept_id) tekil. Kurs sayısı arttıkça satır
sayısı artmaz — bir dil bir kez yazılır, bütün kurslarında kullanılır.
"""
from alembic import op
import sqlalchemy as sa


revision = 'f3a1c7d90b45'
down_revision = 'e7d2b45c19af'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Uygulama açılışta eksik tabloları create_all ile kuruyor; tablo varsa
    # atlanır, yoksa bu migration zinciri durdurur ve sonrakiler hiç çalışmaz.
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if 'concepts' not in existing:
        _create_concepts()
    if 'unmatched_concepts' not in existing:
        _create_unmatched()


def _create_concepts() -> None:
    op.create_table(
        'concepts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('language', sa.String(length=40), nullable=False),
        sa.Column('concept_id', sa.String(length=80), nullable=False),
        sa.Column('label', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('prerequisites', sa.JSON(), nullable=True),
        sa.Column('source', sa.String(length=20), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['teachers.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('language', 'concept_id', name='uq_concept_language_id'),
    )
    op.create_index(op.f('ix_concepts_language'), 'concepts', ['language'], unique=False)


def _create_unmatched() -> None:
    op.create_table(
        'unmatched_concepts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('language', sa.String(length=40), nullable=False),
        sa.Column('raw_label', sa.String(length=200), nullable=False),
        sa.Column('topic_title', sa.String(length=300), nullable=True),
        sa.Column('course_topic', sa.String(length=300), nullable=True),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.Column('hit_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('language', 'raw_label', name='uq_unmatched_language_label'),
    )
    op.create_index(
        op.f('ix_unmatched_concepts_language'), 'unmatched_concepts', ['language'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_unmatched_concepts_language'), table_name='unmatched_concepts')
    op.drop_table('unmatched_concepts')
    op.drop_index(op.f('ix_concepts_language'), table_name='concepts')
    op.drop_table('concepts')
