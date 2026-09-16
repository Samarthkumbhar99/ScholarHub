import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.scholarship import Scholarship
    from app.models.user import User


class ApplicationStatus(str, enum.Enum):
    """The 7 canonical lifecycle stages of ScholarHub scholarship applications."""

    SAVED = "SAVED"
    PREPARING_DOCUMENTS = "PREPARING_DOCUMENTS"
    APPLIED = "APPLIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    INTERVIEW = "INTERVIEW"
    SELECTED = "SELECTED"
    SCHOLARSHIP_RECEIVED = "SCHOLARSHIP_RECEIVED"


class Application(Base):
    """Student application record tracking lifecycle progression for a scholarship."""

    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("user_id", "scholarship_id", name="uq_application_user_scholarship"),
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
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status_enum", native_enum=True),
        default=ApplicationStatus.SAVED,
        index=True,
        nullable=False,
    )
    applied_at: Mapped[Optional[datetime]] = mapped_column(
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

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="applications",
    )
    scholarship: Mapped["Scholarship"] = relationship(
        "Scholarship",
        back_populates="applications",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="application",
    )
