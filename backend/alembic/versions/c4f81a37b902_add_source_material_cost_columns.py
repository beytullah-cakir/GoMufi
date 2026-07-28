"""add source material cost columns to ai_usage_logs

Öğretmenin yüklediği kaynak PDF'in maliyeti prompt token'ları içinde eriyordu.
Bu üç kolon onu AYRIŞTIRIR (üstüne eklemez): kaç karakter kaynak gitti, bunun
kaç prompt token'ına denk düştüğü ve girdi tarifesinden maliyeti.

Revision ID: c4f81a37b902
Revises: 7d3465875786
Create Date: 2026-07-28 01:10:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'c4f81a37b902'
down_revision = '7d3465875786'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS source_chars INTEGER DEFAULT 0")
    op.execute("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS source_tokens INTEGER DEFAULT 0")
    op.execute("ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS source_cost_usd DOUBLE PRECISION DEFAULT 0.0")


def downgrade() -> None:
    op.execute("ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS source_cost_usd")
    op.execute("ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS source_tokens")
    op.execute("ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS source_chars")
