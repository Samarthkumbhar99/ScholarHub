import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    """Notification item schema with all metadata."""
    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    is_read: bool
    scholarship_id: Optional[uuid.UUID] = None
    application_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """Paginated list of notifications for the authenticated student."""
    items: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    """Count of unread notifications for badge indicators."""
    unread_count: int


class MarkAllReadResponse(BaseModel):
    """Response returned when batch-marking notifications as read."""
    message: str = "All notifications marked as read."
    updated_count: int


class NotificationDeleteResponse(BaseModel):
    """Response returned when a notification is deleted."""
    message: str = "Notification deleted successfully."
    notification_id: uuid.UUID


class NotificationCreateRequest(BaseModel):
    """Request schema for creating a notification."""
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    scholarship_id: Optional[uuid.UUID] = None
    application_id: Optional[uuid.UUID] = None
