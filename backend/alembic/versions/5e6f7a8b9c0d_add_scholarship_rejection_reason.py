"""Add scholarship rejection_reason column for administrator moderation

Revision ID: 5e6f7a8b9c0d
Revises: 4d5e6f7a8b9c
Create Date: 2026-10-13 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5e6f7a8b9c0d"
down_revision: Union[str, None] = "4d5e6f7a8b9c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add rejection_reason column to scholarships table
    op.add_column("scholarships", sa.Column("rejection_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    # Drop rejection_reason column
    op.drop_column("scholarships", "rejection_reason")
