import math
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.notification import (
    MarkAllReadResponse,
    NotificationCreateRequest,
    NotificationDeleteResponse,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List student notifications",
    description="Retrieves a paginated list of notifications for the authenticated student, sorted newest first.",
)
async def list_notifications(
    filter: Optional[str] = Query(None, description="Filter tab: 'all' or 'unread'"),
    is_read: Optional[bool] = Query(None, description="Filter by read status (boolean)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    """List notifications belonging exclusively to the current student."""
    # Determine read filter: prioritize filter tab if provided
    read_filter: Optional[bool] = None
    if filter:
        clean_filter = filter.strip().lower()
        if clean_filter == "unread":
            read_filter = False
        elif clean_filter == "all":
            read_filter = None
    elif is_read is not None:
        read_filter = is_read

    items, total, unread_count = await notification_service.list_notifications(
        db=db,
        user_id=current_user.id,
        is_read=read_filter,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notifications count",
    description="Returns the total number of unread notifications for the student.",
)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnreadCountResponse:
    """Retrieve unread notification count for badge rendering."""
    count = await notification_service.get_unread_count(
        db=db,
        user_id=current_user.id,
    )
    return UnreadCountResponse(unread_count=count)


@router.patch(
    "/read-all",
    response_model=MarkAllReadResponse,
    summary="Mark all notifications as read",
    description="Marks all unread notifications for the current student as read.",
)
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MarkAllReadResponse:
    """Mark all unread notifications as read."""
    updated = await notification_service.mark_all_as_read(
        db=db,
        user_id=current_user.id,
    )
    return MarkAllReadResponse(
        message="All notifications marked as read.",
        updated_count=updated,
    )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Get notification detail",
    description="Retrieves a single notification verifying student ownership.",
)
async def get_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Retrieve single notification item."""
    notif = await notification_service.get_notification_by_id(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )
    return NotificationResponse.model_validate(notif)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark single notification as read",
    description="Marks a specific notification as read.",
)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Mark a specific notification as read."""
    notif = await notification_service.mark_as_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )
    return NotificationResponse.model_validate(notif)


@router.delete(
    "/{notification_id}",
    response_model=NotificationDeleteResponse,
    summary="Delete notification",
    description="Permanently deletes a notification owned by the student.",
)
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationDeleteResponse:
    """Delete a student notification."""
    deleted_id = await notification_service.delete_notification(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )
    return NotificationDeleteResponse(
        message="Notification deleted successfully.",
        notification_id=deleted_id,
    )


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create student notification",
    description="Creates a new in-app notification for the authenticated student.",
)
async def create_notification(
    request: NotificationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Creates a notification record for the authenticated user."""
    notif = await notification_service.create_notification(
        db=db,
        user_id=current_user.id,
        type=request.type,
        title=request.title,
        message=request.message,
        scholarship_id=request.scholarship_id,
        application_id=request.application_id,
    )
    return NotificationResponse.model_validate(notif)
