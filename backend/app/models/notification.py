import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.scholarship import Scholarship
    from app.models.user import User


class NotificationType(str, enum.Enum):
    """The 6 official notification categories supported in ScholarHub."""

    DEADLINE_REMINDER = "DEADLINE_REMINDER"
    NEW_SCHOLARSHIP = "NEW_SCHOLARSHIP"
    APPLICATION_CONFIRMATION = "APPLICATION_CONFIRMATION"
    MISSING_DOCUMENT = "MISSING_DOCUMENT"
    RESULT = "RESULT"
    INTERVIEW = "INTERVIEW"


class Notification(Base):
    """Student in-app alerts and notifications."""

    __tablename__ = "notifications"

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
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type_enum", native_enum=True),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        nullable=False,
    )
    scholarship_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scholarships.id", ondelete="SET NULL"),
        nullable=True,
    )
    application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="notifications",
    )
    scholarship: Mapped[Optional["Scholarship"]] = relationship(
        "Scholarship",
    )
    application: Mapped[Optional["Application"]] = relationship(
        "Application",
        back_populates="notifications",
    )
