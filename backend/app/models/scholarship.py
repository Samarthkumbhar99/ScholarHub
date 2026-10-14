import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.discovery import ScholarshipSource
    from app.models.study_abroad import UniversityScholarship
    from app.models.user import User


class ScholarshipReviewStatus(str, enum.Enum):
    """Controlled publication and editorial review lifecycle state."""

    LEGACY = "LEGACY"
    PENDING_REVIEW = "PENDING_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class Scholarship(Base):
    """Core Scholarship entity representing financial grants, fellowships, and awards."""

    __tablename__ = "scholarships"
    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="uq_scholarships_source_external_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        server_default="INR",
        nullable=False,
    )
    deadline: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )
    eligibility: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    benefits: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String),
        nullable=True,
    )
    selection_process: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String),
        nullable=True,
    )
    official_website: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    # Provenance and Discovery Attributes
    source_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scholarship_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    fingerprint: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )

    # Publication & Verification Status
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
        index=True,
    )
    review_status: Mapped[str] = mapped_column(
        String(30),
        default=ScholarshipReviewStatus.LEGACY.value,
        server_default=ScholarshipReviewStatus.LEGACY.value,
        nullable=False,
        index=True,
    )

    def __init__(self, **kwargs):
        """Initialize Scholarship with safe defaults based on origin.

        Automated records originating from a collection source (source_id is provided)
        default to PENDING_REVIEW and is_verified=False.
        Manual, seeded, and legacy records (source_id is None) default to LEGACY review_status.
        """
        if "review_status" not in kwargs:
            if kwargs.get("source_id") is not None:
                kwargs["review_status"] = ScholarshipReviewStatus.PENDING_REVIEW.value
            else:
                kwargs["review_status"] = ScholarshipReviewStatus.LEGACY.value
        super().__init__(**kwargs)

    # Collection & Verification Timestamps
    last_collected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Rejection Reason (for rejected moderation status)
    rejection_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Provider / Submitter Ownership
    submitted_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    # Relationships
    submitted_by: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="submitted_scholarships",
        foreign_keys=[submitted_by_id],
    )
    source: Mapped[Optional["ScholarshipSource"]] = relationship(
        "ScholarshipSource",
        back_populates="scholarships",
    )
    requirements: Mapped[list["ScholarshipRequirement"]] = relationship(
        "ScholarshipRequirement",
        back_populates="scholarship",
        cascade="all, delete-orphan",
    )
    saved_by_users: Mapped[list["SavedScholarship"]] = relationship(
        "SavedScholarship",
        back_populates="scholarship",
        cascade="all, delete-orphan",
    )
    applications: Mapped[list["Application"]] = relationship(
        "Application",
        back_populates="scholarship",
        cascade="all, delete-orphan",
    )
    universities: Mapped[list["UniversityScholarship"]] = relationship(
        "UniversityScholarship",
        back_populates="scholarship",
        cascade="all, delete-orphan",
    )

    @property
    def source_name(self) -> Optional[str]:
        """Convenience property returning source name if relationship is populated in memory."""
        if "source" in self.__dict__ and self.source:
            return self.source.name
        return None

    @classmethod
    def is_published_condition(cls):
        """Return SQLAlchemy binary expression matching publicly visible scholarships.

        A scholarship is publicly visible if it has been verified (either through automated
        validation or administrative approval) or if it is a pre-existing legacy record.
        Unverified automated drafts (PENDING_REVIEW), rejected records (REJECTED), and
        archived records (ARCHIVED) remain hidden from student public discovery.
        """
        return cls.review_status.in_([
            ScholarshipReviewStatus.VERIFIED.value,
            ScholarshipReviewStatus.LEGACY.value,
        ])


class ScholarshipRequirement(Base):
    """Document and eligibility requirement items defined for a scholarship."""

    __tablename__ = "scholarship_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    scholarship_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scholarships.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    document_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    required: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    scholarship: Mapped["Scholarship"] = relationship(
        "Scholarship",
        back_populates="requirements",
    )


class SavedScholarship(Base):
    """Bookmarked / saved scholarship record for a student."""

    __tablename__ = "saved_scholarships"
    __table_args__ = (
        UniqueConstraint("user_id", "scholarship_id", name="uq_saved_scholarship_user_scholarship"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scholarship_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scholarships.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="saved_scholarships",
    )
    scholarship: Mapped["Scholarship"] = relationship(
        "Scholarship",
        back_populates="saved_by_users",
    )
