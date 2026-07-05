"""add_course_enrollment_code

Revision ID: a1c3e9f4b7d2
Revises: b2a0f0402f97
Create Date: 2026-07-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1c3e9f4b7d2'
down_revision = 'b2a0f0402f97'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('courses', sa.Column('enrollment_code', sa.String(length=12), nullable=True))
    op.create_index(op.f('ix_courses_enrollment_code'), 'courses', ['enrollment_code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_courses_enrollment_code'), table_name='courses')
    op.drop_column('courses', 'enrollment_code')
