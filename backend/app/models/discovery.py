import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.scholarship import Scholarship


class ScholarshipSourceType(str, enum.Enum):
    """Supported ingestion connector types for scholarship sources."""

    API = "API"
    RSS = "RSS"
    HTML_PARSING = "HTML_PARSING"
    SITEMAP = "SITEMAP"


class CollectionJobStatus(str, enum.Enum):
    """Controlled execution status for automated scholarship collection jobs."""

    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class ScholarshipSource(Base):
    """Registry entry for an authorized official scholarship provider or portal."""

    __tablename__ = "scholarship_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    base_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        default=ScholarshipSourceType.HTML_PARSING.value,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )
    last_attempted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_successful_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 1:N Relationships
    scholarships: Mapped[list["Scholarship"]] = relationship(
        "Scholarship",
        back_populates="source",
    )
    jobs: Mapped[list["ScholarshipCollectionJob"]] = relationship(
        "ScholarshipCollectionJob",
        back_populates="source",
    )


class ScholarshipCollectionJob(Base):
    """Audit log and metrics tracker for automated scholarship discovery executions."""

    __tablename__ = "scholarship_collection_jobs"
    __table_args__ = (
        CheckConstraint(
            "records_discovered >= 0",
            name="chk_job_records_discovered_non_negative",
        ),
        CheckConstraint(
            "records_created >= 0",
            name="chk_job_records_created_non_negative",
        ),
        CheckConstraint(
            "records_updated >= 0",
            name="chk_job_records_updated_non_negative",
        ),
        CheckConstraint(
            "records_duplicates_skipped >= 0",
            name="chk_job_duplicates_skipped_non_negative",
        ),
        CheckConstraint(
            "records_rejected >= 0",
            name="chk_job_records_rejected_non_negative",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scholarship_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default=CollectionJobStatus.RUNNING.value,
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    records_discovered: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_created: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_updated: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_duplicates_skipped: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_rejected: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    error_summary: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    source: Mapped[Optional["ScholarshipSource"]] = relationship(
        "ScholarshipSource",
        back_populates="jobs",
    )

    @property
    def source_name(self) -> Optional[str]:
        if "source" in self.__dict__ and self.source:
            return self.source.name
        return None

