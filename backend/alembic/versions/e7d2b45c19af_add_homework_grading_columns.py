"""add grading columns to homework_submissions

Öğretmen gönderilen ödevi görebiliyordu ama değerlendiremiyordu: AI değerlendirmesi
yalnızca ekranda gösteriliyor, hiçbir yere yazılmıyordu. Bu kolonlar öğretmenin
verdiği notu ve geri bildirimi kalıcı hale getirir; öğrenci de kendi ödevinde görür.

Revision ID: e7d2b45c19af
Revises: c4f81a37b902
Create Date: 2026-07-28 02:20:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'e7d2b45c19af'
down_revision = 'c4f81a37b902'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS grade INTEGER")
    op.execute("ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS feedback TEXT")
    op.execute("ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP")
    op.execute("ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_by INTEGER")
    op.execute("ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_source VARCHAR(20)")


def downgrade() -> None:
    op.execute("ALTER TABLE homework_submissions DROP COLUMN IF EXISTS graded_source")
    op.execute("ALTER TABLE homework_submissions DROP COLUMN IF EXISTS graded_by")
    op.execute("ALTER TABLE homework_submissions DROP COLUMN IF EXISTS graded_at")
    op.execute("ALTER TABLE homework_submissions DROP COLUMN IF EXISTS feedback")
    op.execute("ALTER TABLE homework_submissions DROP COLUMN IF EXISTS grade")
