import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class StudyPreference(str, enum.Enum):
    """Study destination preference options matching canonical registration flow."""

    INDIA = "INDIA"
    ABROAD = "ABROAD"
    BOTH = "BOTH"


class StudentProfile(Base):
    """Student personal and contact profile details."""

    __tablename__ = "student_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    date_of_birth: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )
    gender: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    mobile: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    country: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    state: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    district: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
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

    user: Mapped["User"] = relationship(
        "User",
        back_populates="profile",
    )


class AcademicProfile(Base):
    """Academic background, course enrollment, and performance scores."""

    __tablename__ = "academic_profiles"
    __table_args__ = (
        CheckConstraint("cgpa >= 0.0 AND cgpa <= 10.0", name="chk_academic_cgpa_range"),
        CheckConstraint(
            "previous_percentage >= 0.0 AND previous_percentage <= 100.0",
            name="chk_academic_percentage_range",
        ),
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
        unique=True,
        index=True,
        nullable=False,
    )
    course: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )
    branch: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )
    current_year: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    university: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    college: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    cgpa: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 2),
        nullable=True,
    )
    previous_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
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

    user: Mapped["User"] = relationship(
        "User",
        back_populates="academic_profile",
    )


class FinancialPreference(Base):
    """Socio-economic category and educational study preferences."""

    __tablename__ = "financial_preferences"
    __table_args__ = (
        CheckConstraint("family_income >= 0", name="chk_financial_income_positive"),
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
        unique=True,
        index=True,
        nullable=False,
    )
    reservation_category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    special_categories: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String),
        nullable=True,
    )
    family_income: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )
    study_preference: Mapped[Optional[StudyPreference]] = mapped_column(
        Enum(StudyPreference, name="study_preference_enum", native_enum=True),
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

    user: Mapped["User"] = relationship(
        "User",
        back_populates="financial_preference",
    )
