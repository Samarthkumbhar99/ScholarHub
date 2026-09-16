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
    from app.models.study_abroad import UniversityScholarship
    from app.models.user import User


class Scholarship(Base):
    """Core Scholarship entity representing financial grants, fellowships, and awards."""

    __tablename__ = "scholarships"

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
