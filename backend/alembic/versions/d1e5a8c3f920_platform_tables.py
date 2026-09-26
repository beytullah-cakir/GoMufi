"""Canlıya çıkış: kalıcı dosya deposu, şablonlar, giriş denemeleri, askıya alma, yönetici kaydı

Revision ID: d1e5a8c3f920
Revises: c5a1f7e93b26
Create Date: 2026-09-26

Yüklenen dosyalar ve slayt şablonları sunucunun diskine yazılıyordu; Render'da
disk kalıcı olmadığı için her deploy'da kayboluyordu.
"""
from alembic import op
import sqlalchemy as sa


revision = 'd1e5a8c3f920'
down_revision = 'c5a1f7e93b26'
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if 'stored_files' not in tables:
        op.create_table(
            'stored_files',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('kind', sa.String(10), nullable=False),
            sa.Column('owner_role', sa.String(10), nullable=False),
            sa.Column('owner_id', sa.Integer(), nullable=False),
            sa.Column('filename', sa.String(255), nullable=False),
            sa.Column('extension', sa.String(10), nullable=False),
            sa.Column('content_type', sa.String(100), nullable=False),
            sa.Column('size', sa.Integer(), nullable=False),
            sa.Column('data', sa.LargeBinary(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_stored_files_owner', 'stored_files', ['owner_role', 'owner_id'])
    if 'slide_templates' not in tables:
        op.create_table(
            'slide_templates',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('category', sa.String(100), nullable=False),
            sa.Column('title', sa.String(200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('elements', sa.JSON(), nullable=False),
            sa.Column('background', sa.String(200), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
    if 'login_attempts' not in tables:
        op.create_table(
            'login_attempts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('ip', sa.String(64), nullable=False),
            sa.Column('success', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_login_attempts_email', 'login_attempts', ['email', 'created_at'])
        op.create_index('ix_login_attempts_ip', 'login_attempts', ['ip', 'created_at'])
    if 'account_suspensions' not in tables:
        op.create_table(
            'account_suspensions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('role', sa.String(10), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('reason', sa.String(500), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('role', 'user_id', name='uq_account_suspension'),
        )
    if 'admin_actions' not in tables:
        op.create_table(
            'admin_actions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('action', sa.String(60), nullable=False),
            sa.Column('target', sa.String(120), nullable=True),
            sa.Column('summary', sa.String(500), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_admin_actions_created', 'admin_actions', ['created_at'])


def downgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    for name in ('admin_actions', 'account_suspensions', 'login_attempts', 'slide_templates', 'stored_files'):
        if name in tables:
            op.drop_table(name)
