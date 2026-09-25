"""Öğretmen iş akışı: mesajlaşma, canlı ders yardımı, ödev sürümleri, puanlama anahtarları, veli raporu

Revision ID: d7f2a9c4e813
Revises: c3e9a7d1f205
Create Date: 2026-09-25

Uygulama açılışta eksik tabloları zaten oluşturuyor; tablo ya da sütun varsa atlanır.
"""
from alembic import op
import sqlalchemy as sa


revision = 'd7f2a9c4e813'
down_revision = 'c3e9a7d1f205'
branch_labels = None
depends_on = None


def _id():
    return sa.Column('id', sa.Integer(), primary_key=True)


def _fk(name, table, ondelete='CASCADE', nullable=False):
    return sa.Column(name, sa.Integer(), sa.ForeignKey(f'{table}.id', ondelete=ondelete), nullable=nullable)


def _now(name='created_at', nullable=False):
    return sa.Column(name, sa.DateTime(), server_default=sa.func.now(), nullable=nullable)


TABLES = {
    'conversations': lambda: [
        _id(), _fk('teacher_id', 'teachers'),
        sa.Column('member_role', sa.String(10), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        _fk('student_id', 'students', nullable=True),
        _fk('course_id', 'courses', ondelete='SET NULL', nullable=True),
        sa.Column('topic', sa.String(200)),
        _now(), _now('last_message_at'),
        sa.Column('last_preview', sa.String(200)),
        sa.Column('teacher_unread', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('member_unread', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('teacher_archived', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('member_archived', sa.Boolean(), nullable=False, server_default=sa.false()),
    ],
    'messages': lambda: [
        _id(), _fk('conversation_id', 'conversations'),
        sa.Column('sender_role', sa.String(10), nullable=False),
        sa.Column('sender_id', sa.Integer()),
        sa.Column('body', sa.Text(), nullable=False, server_default=''),
        sa.Column('kind', sa.String(10), nullable=False, server_default='text'),
        sa.Column('file_url', sa.String(500)),
        sa.Column('file_name', sa.String(255)),
        _now(),
    ],
    'help_requests': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('student_id', 'students'),
        sa.Column('task_key', sa.String(120), nullable=False),
        sa.Column('note', sa.String(300)),
        _now(),
        sa.Column('responded_at', sa.DateTime()),
        sa.Column('resolved_at', sa.DateTime()),
        sa.Column('resolved_by', sa.String(10)),
    ],
    'teacher_nudges': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('student_id', 'students'), _fk('teacher_id', 'teachers'),
        sa.Column('task_key', sa.String(120)),
        sa.Column('text', sa.Text(), nullable=False),
        _now(),
        sa.Column('seen_at', sa.DateTime()),
    ],
    'teacher_actions': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('teacher_id', 'teachers'),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('note', sa.Text()),
        sa.Column('concept_id', sa.String(80)),
        _fk('student_id', 'students', nullable=True),
        sa.Column('baseline', sa.JSON()),
        _now(),
    ],
    'teacher_notes': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('student_id', 'students'), _fk('teacher_id', 'teachers'),
        sa.Column('text', sa.Text(), nullable=False),
        _now(),
    ],
    'provenance_reviews': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('student_id', 'students'),
        sa.Column('task_key', sa.String(120), nullable=False),
        sa.Column('verdict', sa.String(10), nullable=False),
        sa.Column('note', sa.Text()),
        _fk('teacher_id', 'teachers'),
        _now(),
        sa.UniqueConstraint('course_id', 'student_id', 'task_key', name='uq_provenance_review'),
    ],
    'homework_submission_versions': lambda: [
        _id(), _fk('course_id', 'courses'),
        sa.Column('node_id', sa.String(100), nullable=False),
        _fk('student_id', 'students'),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(255)),
        sa.Column('file_data', sa.Text()),
        sa.Column('file_mime', sa.String(100)),
        sa.Column('student_note', sa.Text()),
        sa.Column('submitted_at', sa.DateTime()),
        sa.Column('grade', sa.Integer()),
        sa.Column('feedback', sa.Text()),
        sa.Column('graded_at', sa.DateTime()),
        sa.Column('graded_source', sa.String(20)),
        sa.Column('rubric_scores', sa.JSON()),
        sa.Column('reason', sa.String(20), nullable=False, server_default='resubmitted'),
        _now('archived_at'),
    ],
    'rubric_templates': lambda: [
        _id(), _fk('teacher_id', 'teachers'),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('criteria', sa.JSON()),
        _now(),
    ],
    'course_settings': lambda: [
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('settings', sa.JSON()),
        _now('updated_at', nullable=True),
    ],
    'parent_reports': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('student_id', 'students'), _fk('teacher_id', 'teachers'),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('content', sa.JSON()),
        sa.Column('facts', sa.JSON()),
        sa.Column('status', sa.String(10), nullable=False, server_default='draft'),
        sa.Column('ai_generated', sa.Boolean(), nullable=False, server_default=sa.false()),
        _now(), _now('updated_at', nullable=True),
        sa.Column('sent_at', sa.DateTime()),
        sa.Column('parent_seen_at', sa.DateTime()),
    ],
    'recording_consents': lambda: [
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('status', sa.String(10), nullable=False),
        _fk('parent_id', 'parents', ondelete='SET NULL', nullable=True),
        sa.Column('text_version', sa.String(20), nullable=False),
        _now('decided_at'),
    ],
}

INDEXES = [
    ('ix_conversations_teacher', 'conversations', ['teacher_id', 'last_message_at']),
    ('ix_conversations_member', 'conversations', ['member_role', 'member_id', 'last_message_at']),
    ('ix_messages_conversation', 'messages', ['conversation_id', 'id']),
    ('ix_help_requests_open', 'help_requests', ['course_id', 'resolved_at']),
    ('ix_teacher_nudges_student', 'teacher_nudges', ['course_id', 'student_id', 'seen_at']),
    ('ix_teacher_notes_student', 'teacher_notes', ['course_id', 'student_id']),
    ('ix_homework_versions_owner', 'homework_submission_versions', ['course_id', 'node_id', 'student_id']),
    ('ix_parent_reports_student', 'parent_reports', ['student_id', 'status']),
]


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = set(inspector.get_table_names())
    for name, columns in TABLES.items():
        if name not in existing:
            op.create_table(name, *columns())
            for index, table, cols in INDEXES:
                if table == name:
                    op.create_index(index, table, cols)
    columns = {c['name'] for c in inspector.get_columns('homework_submissions')}
    if 'rubric_scores' not in columns:
        op.add_column('homework_submissions', sa.Column('rubric_scores', sa.JSON(), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = set(inspector.get_table_names())
    for name in reversed(list(TABLES)):
        if name in existing:
            op.drop_table(name)
    columns = {c['name'] for c in inspector.get_columns('homework_submissions')}
    if 'rubric_scores' in columns:
        op.drop_column('homework_submissions', 'rubric_scores')
