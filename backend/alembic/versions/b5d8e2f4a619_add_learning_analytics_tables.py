"""Öğrenme analitiği tabloları: olaylar, görev özeti, kavram hakimiyeti, yazım kaydı

Revision ID: b5d8e2f4a619
Revises: f3a1c7d90b45
Create Date: 2026-09-25

Uygulama açılışta `Base.metadata.create_all` ile eksik tabloları zaten
oluşturuyor; bu migration onu alembic geçmişine de işler. Tablo varsa
atlanır — iki yol birbirini bozmasın.
"""
from alembic import op
import sqlalchemy as sa


revision = 'b5d8e2f4a619'
down_revision = 'f3a1c7d90b45'
branch_labels = None
depends_on = None


def _exists(name: str) -> bool:
    return name in sa.inspect(op.get_bind()).get_table_names()


def _owner_columns():
    return [
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
    ]


def upgrade() -> None:
    if not _exists('learning_events'):
        op.create_table(
            'learning_events',
            *_owner_columns(),
            sa.Column('node_id', sa.String(length=100), nullable=True),
            sa.Column('task_key', sa.String(length=120), nullable=True),
            sa.Column('stage', sa.String(length=20), nullable=True),
            sa.Column('event_type', sa.String(length=30), nullable=False),
            sa.Column('outcome', sa.String(length=20), nullable=True),
            sa.Column('attempt', sa.Integer(), nullable=True),
            sa.Column('error_type', sa.String(length=80), nullable=True),
            sa.Column('error_line', sa.Integer(), nullable=True),
            sa.Column('concept_ids', sa.JSON(), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('code_snapshot', sa.Text(), nullable=True),
            sa.Column('duration_ms', sa.Integer(), nullable=True),
            sa.Column('client', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_learning_events_course_student', 'learning_events', ['course_id', 'student_id'])
        op.create_index('ix_learning_events_course_task', 'learning_events', ['course_id', 'task_key'])
        op.create_index('ix_learning_events_created', 'learning_events', ['created_at'])

    if not _exists('task_progress'):
        op.create_table(
            'task_progress',
            *_owner_columns(),
            sa.Column('task_key', sa.String(length=120), nullable=False),
            sa.Column('node_id', sa.String(length=100), nullable=True),
            sa.Column('stage', sa.String(length=20), nullable=True),
            sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('first_seen_at', sa.DateTime(), nullable=True),
            sa.Column('last_activity_at', sa.DateTime(), nullable=True),
            sa.Column('solved_at', sa.DateTime(), nullable=True),
            sa.Column('submitted_at', sa.DateTime(), nullable=True),
            sa.Column('first_try_pass', sa.Boolean(), nullable=True),
            sa.Column('last_outcome', sa.String(length=20), nullable=True),
            sa.Column('last_failure', sa.String(length=300), nullable=True),
            sa.Column('same_failure_streak', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('last_error_type', sa.String(length=80), nullable=True),
            sa.Column('hints_opened', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('coach_messages', sa.Integer(), nullable=False, server_default='0'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('course_id', 'student_id', 'task_key', name='uq_task_progress'),
        )
        op.create_index('ix_task_progress_course_task', 'task_progress', ['course_id', 'task_key'])

    if not _exists('concept_mastery'):
        op.create_table(
            'concept_mastery',
            *_owner_columns(),
            sa.Column('concept_id', sa.String(length=80), nullable=False),
            sa.Column('score', sa.Float(), nullable=False, server_default='0.5'),
            sa.Column('evidence_weight', sa.Float(), nullable=False, server_default='0'),
            sa.Column('successes', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('failures', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('last_evidence_at', sa.DateTime(), nullable=True),
            sa.Column('last_misconception', sa.String(length=200), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('course_id', 'student_id', 'concept_id', name='uq_concept_mastery'),
        )

    if not _exists('code_edit_chunks'):
        op.create_table(
            'code_edit_chunks',
            *_owner_columns(),
            sa.Column('task_key', sa.String(length=120), nullable=False),
            sa.Column('file_name', sa.String(length=80), nullable=False),
            sa.Column('session_id', sa.String(length=40), nullable=False),
            sa.Column('seq', sa.Integer(), nullable=False),
            sa.Column('client', sa.String(length=20), nullable=False),
            sa.Column('started_at_ms', sa.Float(), nullable=False),
            sa.Column('base_text', sa.Text(), nullable=True),
            sa.Column('ops', sa.JSON(), nullable=True),
            sa.Column('ext_version', sa.String(length=20), nullable=True),
            sa.Column('ai_extensions', sa.JSON(), nullable=True),
            sa.Column('received_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint(
                'course_id', 'student_id', 'task_key', 'file_name', 'session_id', 'seq',
                name='uq_code_edit_chunk',
            ),
        )
        op.create_index('ix_code_edit_chunks_task', 'code_edit_chunks', ['course_id', 'student_id', 'task_key'])

    if not _exists('code_provenance'):
        op.create_table(
            'code_provenance',
            *_owner_columns(),
            sa.Column('task_key', sa.String(length=120), nullable=False),
            sa.Column('file_name', sa.String(length=80), nullable=False),
            sa.Column('text', sa.Text(), nullable=False, server_default=''),
            sa.Column('segments', sa.JSON(), nullable=True),
            sa.Column('totals', sa.JSON(), nullable=True),
            sa.Column('recent_deletes', sa.JSON(), nullable=True),
            sa.Column('recent_typed', sa.JSON(), nullable=True),
            sa.Column('ai_extensions', sa.JSON(), nullable=True),
            sa.Column('last_op_ms', sa.Float(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('course_id', 'student_id', 'task_key', 'file_name', name='uq_code_provenance'),
        )


def downgrade() -> None:
    for table in ('code_provenance', 'code_edit_chunks', 'concept_mastery', 'task_progress', 'learning_events'):
        if _exists(table):
            op.drop_table(table)
