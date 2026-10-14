import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


class NotificationService:
    """Service layer managing student notifications and alerts."""

    async def create_notification(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        message: str,
        scholarship_id: Optional[uuid.UUID] = None,
        application_id: Optional[uuid.UUID] = None,
    ) -> Notification:
        """
        Creates and persists a new in-app notification for a student.
        """
        now = datetime.now(timezone.utc)
        notif = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            type=type,
            title=title.strip(),
            message=message.strip(),
            is_read=False,
            scholarship_id=scholarship_id,
            application_id=application_id,
            created_at=now,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        logger.info("Notification %s created for user %s (type=%s)", notif.id, user_id, type.value)
        return notif

    async def list_notifications(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        is_read: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Notification], int, int]:
        """
        Retrieves paginated notifications for the authenticated student,
        calculating both total matching items and total unread count.
        """
        # Base query scoped strictly to authenticated student
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)

        if is_read is not None:
            query = query.where(Notification.is_read == is_read)
            count_query = count_query.where(Notification.is_read == is_read)

        # Unread count query (always across all user notifications)
        unread_query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )

        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        unread_res = await db.execute(unread_query)
        unread_count = unread_res.scalar_one()

        # Apply sorting (newest first) and pagination
        offset = (page - 1) * page_size
        query = query.order_by(Notification.created_at.desc()).offset(offset).limit(page_size)

        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total, unread_count

    async def get_notification_by_id(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> Notification:
        """
        Retrieves a single notification verifying strict user ownership.
        Returns 404 if not found or if owned by another user.
        """
        query = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        result = await db.execute(query)
        notif = result.scalar_one_or_none()

        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )

        return notif

    async def mark_as_read(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> Notification:
        """
        Marks a specific notification as read. Idempotent operation.
        """
        notif = await self.get_notification_by_id(
            db=db,
            user_id=user_id,
            notification_id=notification_id,
        )

        if not notif.is_read:
            notif.is_read = True
            await db.commit()
            await db.refresh(notif)
            logger.info("Notification %s marked as read for user %s", notification_id, user_id)

        return notif

    async def mark_all_as_read(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        """
        Marks all unread notifications for the student as read.
        """
        # Count unread first
        count_query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        count_res = await db.execute(count_query)
        unread_count = count_res.scalar_one()

        if unread_count > 0:
            stmt = (
                update(Notification)
                .where(
                    Notification.user_id == user_id,
                    Notification.is_read == False,
                )
                .values(is_read=True)
            )
            await db.execute(stmt)
            await db.commit()
            logger.info("Marked %d notifications as read for user %s", unread_count, user_id)

        return unread_count

    async def get_unread_count(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        """
        Returns the number of unread notifications for the user.
        """
        query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        res = await db.execute(query)
        return res.scalar_one()

    async def delete_notification(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> uuid.UUID:
        """
        Permanently deletes a student notification with strict ownership enforcement.
        """
        notif = await self.get_notification_by_id(
            db=db,
            user_id=user_id,
            notification_id=notification_id,
        )

        await db.delete(notif)
        await db.commit()
        logger.info("Notification %s deleted for user %s", notification_id, user_id)
        return notification_id


notification_service = NotificationService()
