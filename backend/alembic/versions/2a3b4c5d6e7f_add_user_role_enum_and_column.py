"""add user role enum and column

Revision ID: 2a3b4c5d6e7f
Revises: 18e2e3a789b8
Create Date: 2026-10-01 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "2a3b4c5d6e7f"
down_revision: Union[str, None] = "18e2e3a789b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = postgresql.ENUM("STUDENT", "ADMIN", name="user_role_enum")


def upgrade() -> None:
    # Create PostgreSQL ENUM type
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # Add 'role' column to 'users' table with default 'STUDENT'
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("STUDENT", "ADMIN", name="user_role_enum"),
            server_default="STUDENT",
            nullable=False,
        ),
    )


def downgrade() -> None:
    # Drop 'role' column from 'users' table
    op.drop_column("users", "role")

    # Drop PostgreSQL ENUM type
    user_role_enum.drop(op.get_bind(), checkfirst=True)
