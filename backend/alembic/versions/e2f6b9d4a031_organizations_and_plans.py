"""Kurumlar, kurum üyeleri, davetler ve paketler

Revision ID: e2f6b9d4a031
Revises: d1e5a8c3f920
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = 'e2f6b9d4a031'
down_revision = 'd1e5a8c3f920'
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if 'organizations' not in tables:
        op.create_table(
            'organizations',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('kind', sa.String(20), nullable=False, server_default='okul'),
            sa.Column('city', sa.String(80), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
    if 'organization_members' not in tables:
        op.create_table(
            'organization_members',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role', sa.String(10), nullable=False, server_default='teacher'),
            sa.Column('ai_cap_credits', sa.Integer(), nullable=True),
            sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('teacher_id', name='uq_org_member_teacher'),
        )
        op.create_index('ix_org_members_org', 'organization_members', ['organization_id'])
    if 'organization_invites' not in tables:
        op.create_table(
            'organization_invites',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('role', sa.String(10), nullable=False, server_default='teacher'),
            sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
            sa.Column('invited_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('accepted_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_org_invites_email', 'organization_invites', ['email'])
    if 'subscriptions' not in tables:
        op.create_table(
            'subscriptions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('owner_type', sa.String(20), nullable=False),
            sa.Column('owner_id', sa.Integer(), nullable=False),
            sa.Column('plan', sa.String(20), nullable=False),
            sa.Column('starts_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('ends_at', sa.DateTime(), nullable=True),
            sa.Column('pool_credits', sa.Integer(), nullable=True),
            sa.Column('note', sa.String(300), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_subscriptions_owner', 'subscriptions', ['owner_type', 'owner_id'])


def downgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    for name in ('subscriptions', 'organization_invites', 'organization_members', 'organizations'):
        if name in tables:
            op.drop_table(name)
