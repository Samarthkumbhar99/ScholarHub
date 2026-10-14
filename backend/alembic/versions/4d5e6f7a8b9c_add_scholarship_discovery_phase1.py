"""Add scholarship discovery phase 1 models and provenance fields

Revision ID: 4d5e6f7a8b9c
Revises: 2a3b4c5d6e7f
Create Date: 2026-10-13 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "4d5e6f7a8b9c"
down_revision: Union[str, None] = "2a3b4c5d6e7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create scholarship_sources table
    op.create_table(
        "scholarship_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False, server_default="HTML_PARSING"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_attempted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_successful_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_scholarship_sources_name", "scholarship_sources", ["name"], unique=True)
    op.create_index("ix_scholarship_sources_slug", "scholarship_sources", ["slug"], unique=True)
    op.create_index("ix_scholarship_sources_is_active", "scholarship_sources", ["is_active"])

    # 2. Create scholarship_collection_jobs table
    op.create_table(
        "scholarship_collection_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("scholarship_sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(30), nullable=False, server_default="RUNNING"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("records_discovered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_created", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_duplicates_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_rejected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_summary", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("records_discovered >= 0", name="chk_job_records_discovered_non_negative"),
        sa.CheckConstraint("records_created >= 0", name="chk_job_records_created_non_negative"),
        sa.CheckConstraint("records_updated >= 0", name="chk_job_records_updated_non_negative"),
        sa.CheckConstraint("records_duplicates_skipped >= 0", name="chk_job_duplicates_skipped_non_negative"),
        sa.CheckConstraint("records_rejected >= 0", name="chk_job_records_rejected_non_negative"),
    )
    op.create_index("ix_scholarship_collection_jobs_source_id", "scholarship_collection_jobs", ["source_id"])
    op.create_index("ix_scholarship_collection_jobs_status", "scholarship_collection_jobs", ["status"])

    # 3. Add provenance and publication fields to scholarships table
    op.add_column("scholarships", sa.Column("currency", sa.String(3), nullable=False, server_default="INR"))
    op.add_column("scholarships", sa.Column("source_url", sa.String(1000), nullable=True))
    op.add_column("scholarships", sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("scholarships", sa.Column("external_id", sa.String(255), nullable=True))
    op.add_column("scholarships", sa.Column("fingerprint", sa.String(64), nullable=True))
    op.add_column("scholarships", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # Note: Adding review_status with server_default='LEGACY' populates existing rows with 'LEGACY',
    # preserving existing scholarships while keeping is_verified=false.
    op.add_column("scholarships", sa.Column("review_status", sa.String(30), nullable=False, server_default="LEGACY"))

    op.add_column("scholarships", sa.Column("last_collected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("scholarships", sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True))

    # Foreign key, unique constraint, and indexes for scholarships
    op.create_foreign_key(
        "fk_scholarships_source_id",
        "scholarships",
        "scholarship_sources",
        ["source_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_scholarships_source_external_id",
        "scholarships",
        ["source_id", "external_id"],
    )
    op.create_index("ix_scholarships_source_id", "scholarships", ["source_id"])
    op.create_index("ix_scholarships_external_id", "scholarships", ["external_id"])
    op.create_index("ix_scholarships_fingerprint", "scholarships", ["fingerprint"])
    op.create_index("ix_scholarships_is_verified", "scholarships", ["is_verified"])
    op.create_index("ix_scholarships_review_status", "scholarships", ["review_status"])


def downgrade() -> None:
    # 1. Revert scholarships additions
    op.drop_index("ix_scholarships_review_status", table_name="scholarships")
    op.drop_index("ix_scholarships_is_verified", table_name="scholarships")
    op.drop_index("ix_scholarships_fingerprint", table_name="scholarships")
    op.drop_index("ix_scholarships_external_id", table_name="scholarships")
    op.drop_index("ix_scholarships_source_id", table_name="scholarships")
    op.drop_constraint("uq_scholarships_source_external_id", "scholarships", type_="unique")
    op.drop_constraint("fk_scholarships_source_id", "scholarships", type_="foreignkey")
    op.drop_column("scholarships", "last_verified_at")
    op.drop_column("scholarships", "last_collected_at")
    op.drop_column("scholarships", "review_status")
    op.drop_column("scholarships", "is_verified")
    op.drop_column("scholarships", "fingerprint")
    op.drop_column("scholarships", "external_id")
    op.drop_column("scholarships", "source_id")
    op.drop_column("scholarships", "source_url")
    op.drop_column("scholarships", "currency")

    # 2. Drop scholarship_collection_jobs table
    op.drop_index("ix_scholarship_collection_jobs_status", table_name="scholarship_collection_jobs")
    op.drop_index("ix_scholarship_collection_jobs_source_id", table_name="scholarship_collection_jobs")
    op.drop_table("scholarship_collection_jobs")

    # 3. Drop scholarship_sources table
    op.drop_index("ix_scholarship_sources_is_active", table_name="scholarship_sources")
    op.drop_index("ix_scholarship_sources_slug", table_name="scholarship_sources")
    op.drop_index("ix_scholarship_sources_name", table_name="scholarship_sources")
    op.drop_table("scholarship_sources")
