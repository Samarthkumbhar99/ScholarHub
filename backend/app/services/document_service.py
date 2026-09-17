import logging
import os
import re
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import StudentDocument
from app.models.user import User
from app.schemas.document import DocumentCategoryEnum, DocumentTypeEnum
from app.services.storage.cloudinary_service import (
    CloudinaryStorageService,
    StorageError,
    cloudinary_storage_service,
)

logger = logging.getLogger(__name__)


class DocumentService:
    """Service layer handling document validation, storage orchestration, and database operations."""

    def __init__(self, storage_service: Optional[CloudinaryStorageService] = None) -> None:
        self.storage = storage_service or cloudinary_storage_service

    async def validate_file(self, file: UploadFile) -> bytes:
        """
        Validates uploaded file for:
        - Non-empty content
        - Allowed MIME types
        - Allowed file extensions
        - Maximum file size (10 MB)
        """
        filename = file.filename or "unknown_file"
        _, ext = os.path.splitext(filename)
        ext = ext.lower()

        if ext not in settings.ALLOWED_DOCUMENT_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_DOCUMENT_EXTENSIONS)}",
            )

        content_type = file.content_type
        if content_type and content_type.lower() not in settings.ALLOWED_DOCUMENT_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported MIME type '{content_type}'. Allowed types: {', '.join(settings.ALLOWED_DOCUMENT_MIME_TYPES)}",
            )

        # Read file contents safely
        file_bytes = await file.read()
        await file.seek(0)

        if not file_bytes or len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty. Please upload a valid document.",
            )

        if len(file_bytes) > settings.MAX_DOCUMENT_SIZE_BYTES:
            max_mb = settings.MAX_DOCUMENT_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds the maximum limit of {max_mb} MB.",
            )

        return file_bytes

    def sanitize_filename(self, filename: Optional[str]) -> str:
        """Sanitizes filename removing unsafe characters."""
        if not filename:
            return "document"
        clean_name = os.path.basename(filename)
        clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", clean_name)
        return clean_name[:250]

    async def upload_or_replace_document(
        self,
        db: AsyncSession,
        user: User,
        file: UploadFile,
        doc_type: str,
        category: str,
        expiry_date: Optional[date] = None,
    ) -> StudentDocument:
        """
        Validates, uploads to Cloudinary, and persists or replaces StudentDocument in PostgreSQL.
        Guarantees cleanup on database transaction failure.
        """
        user_id = user.id

        # Validate file
        file_bytes = await self.validate_file(file)
        sanitized_filename = self.sanitize_filename(file.filename)

        # Check existing document for replacement
        query = select(StudentDocument).where(
            StudentDocument.user_id == user_id,
            StudentDocument.type == doc_type,
        )
        result = await db.execute(query)
        existing_doc = result.scalar_one_or_none()

        old_file_url = existing_doc.file_url if existing_doc else None

        # Upload to Cloudinary
        try:
            upload_result = self.storage.upload_file(
                file_bytes=file_bytes,
                filename=sanitized_filename,
                folder=settings.CLOUDINARY_FOLDER,
            )
        except StorageError as exc:
            logger.error("Storage upload failed for user %s: %s", user_id, str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Storage service error: {str(exc)}",
            )

        new_file_url = upload_result.get("secure_url")
        new_file_size = upload_result.get("bytes", len(file_bytes))
        now = datetime.now(timezone.utc)

        # Persist to DB
        try:
            if existing_doc:
                existing_doc.category = category
                existing_doc.file_name = sanitized_filename
                existing_doc.file_size = new_file_size
                existing_doc.file_url = new_file_url
                existing_doc.uploaded_at = now
                existing_doc.expiry_date = expiry_date
                existing_doc.updated_at = now
                doc_record = existing_doc
            else:
                doc_record = StudentDocument(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    type=doc_type,
                    category=category,
                    file_name=sanitized_filename,
                    file_size=new_file_size,
                    file_url=new_file_url,
                    uploaded_at=now,
                    expiry_date=expiry_date,
                    created_at=now,
                    updated_at=now,
                )
                db.add(doc_record)

            await db.commit()
            await db.refresh(doc_record)

            # If replacement succeeded and old file existed, attempt to remove old Cloudinary asset
            if old_file_url and old_file_url != new_file_url:
                try:
                    self.storage.delete_file(old_file_url)
                except Exception as del_err:
                    logger.warning("Could not delete old Cloudinary asset %s: %s", old_file_url, str(del_err))

            return doc_record

        except Exception as db_exc:
            await db.rollback()
            logger.error(
                "Database error while saving document metadata for user %s. Triggering Cloudinary cleanup: %s",
                user_id,
                str(db_exc),
            )
            # Rollback storage: remove the newly uploaded asset from Cloudinary
            if new_file_url:
                try:
                    self.storage.delete_file(new_file_url)
                    logger.info("Successfully cleaned up orphaned Cloudinary asset %s after DB error.", new_file_url)
                except Exception as cleanup_err:
                    logger.error("Failed to clean up orphaned Cloudinary asset %s: %s", new_file_url, str(cleanup_err))

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred while saving document metadata. Upload was rolled back.",
            )

    async def list_user_documents(
        self,
        db: AsyncSession,
        user: User,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[StudentDocument], int]:
        """Lists documents belonging exclusively to the current user."""
        query = select(StudentDocument).where(StudentDocument.user_id == user.id)
        count_query = select(func.count(StudentDocument.id)).where(StudentDocument.user_id == user.id)

        if category:
            query = query.where(StudentDocument.category == category)
            count_query = count_query.where(StudentDocument.category == category)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(StudentDocument.created_at.desc()).offset(offset).limit(page_size)

        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def get_document_by_id(
        self,
        db: AsyncSession,
        user: User,
        document_id: uuid.UUID,
    ) -> StudentDocument:
        """Retrieves a single document verifying ownership strictly."""
        query = select(StudentDocument).where(
            StudentDocument.id == document_id,
            StudentDocument.user_id == user.id,
        )
        result = await db.execute(query)
        doc = result.scalar_one_or_none()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )

        return doc

    async def delete_document(
        self,
        db: AsyncSession,
        user: User,
        document_id: uuid.UUID,
    ) -> uuid.UUID:
        """Deletes a document from both Cloudinary and PostgreSQL."""
        doc = await self.get_document_by_id(db=db, user=user, document_id=document_id)

        file_url = doc.file_url

        # Attempt to delete from Cloudinary
        if file_url:
            try:
                self.storage.delete_file(file_url)
            except StorageError as storage_err:
                logger.warning(
                    "Cloudinary delete warning for document %s (%s): %s",
                    document_id,
                    file_url,
                    str(storage_err),
                )
                # If storage delete failed due to configuration or network, we still proceed with DB deletion
                # or log controlled warning without crashing if desired.

        await db.delete(doc)
        await db.commit()

        return document_id


document_service = DocumentService()
