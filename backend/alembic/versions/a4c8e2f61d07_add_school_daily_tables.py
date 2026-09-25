"""Okulun günlük işleri: şifre sıfırlama, yoklama, duyuru, bildirim kaydı, kurs görüşme linki

Revision ID: a4c8e2f61d07
Revises: d7f2a9c4e813
Create Date: 2026-09-26

Uygulama açılışta eksik tabloları zaten oluşturuyor; tablo ya da sütun varsa atlanır.
"""
from alembic import op
import sqlalchemy as sa


revision = 'a4c8e2f61d07'
down_revision = 'd7f2a9c4e813'
branch_labels = None
depends_on = None


def _id():
    return sa.Column('id', sa.Integer(), primary_key=True)


def _fk(name, table, ondelete='CASCADE', nullable=False):
    return sa.Column(name, sa.Integer(), sa.ForeignKey(f'{table}.id', ondelete=ondelete), nullable=nullable)


def _now(name='created_at', nullable=False):
    return sa.Column(name, sa.DateTime(), server_default=sa.func.now(), nullable=nullable)


TABLES = {
    'password_reset_tokens': lambda: [
        _id(),
        sa.Column('role', sa.String(10), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        _now(),
    ],
    'attendance_records': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('student_id', 'students'),
        _fk('teacher_id', 'teachers', ondelete='SET NULL', nullable=True),
        sa.Column('class_id', sa.String(64), nullable=True),
        sa.Column('lesson_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(10), nullable=False),
        sa.Column('note', sa.String(200), nullable=True),
        _now(), _now('updated_at'),
        sa.UniqueConstraint('course_id', 'lesson_date', 'student_id', name='uq_attendance_day'),
    ],
    'announcements': lambda: [
        _id(), _fk('course_id', 'courses'), _fk('teacher_id', 'teachers'),
        sa.Column('class_id', sa.String(64), nullable=True),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('email_sent', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('email_count', sa.Integer(), nullable=False, server_default='0'),
        _now(),
    ],
    'notification_log': lambda: [
        _id(),
        sa.Column('kind', sa.String(40), nullable=False),
        sa.Column('key', sa.String(200), nullable=False),
        _now('sent_at'),
        sa.UniqueConstraint('kind', 'key', name='uq_notification_once'),
    ],
}

INDEXES = [
    ('ix_password_reset_owner', 'password_reset_tokens', ['role', 'user_id', 'created_at']),
    ('ix_attendance_student', 'attendance_records', ['student_id', 'lesson_date']),
    ('ix_announcements_course', 'announcements', ['course_id', 'created_at']),
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
    columns = {c['name'] for c in inspector.get_columns('courses')}
    if 'meeting_url' not in columns:
        op.add_column('courses', sa.Column('meeting_url', sa.String(500), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = set(inspector.get_table_names())
    for name in reversed(list(TABLES)):
        if name in existing:
            op.drop_table(name)
    columns = {c['name'] for c in inspector.get_columns('courses')}
    if 'meeting_url' in columns:
        op.drop_column('courses', 'meeting_url')
