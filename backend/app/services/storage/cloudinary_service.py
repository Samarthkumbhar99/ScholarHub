import logging
import re
from typing import Any, Dict, Optional

import cloudinary
import cloudinary.uploader
from cloudinary import CloudinaryImage

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Base exception for storage-related operations."""
    pass


class StorageConfigurationError(StorageError):
    """Raised when storage provider is not properly configured with credentials."""
    pass


class StorageUploadError(StorageError):
    """Raised when an error occurs during file upload."""
    pass


class StorageDeleteError(StorageError):
    """Raised when an error occurs during file deletion."""
    pass


class CloudinaryStorageService:
    """Service abstraction for Cloudinary file storage operations."""

    def __init__(self) -> None:
        self._is_configured = False
        self._configure()

    def _configure(self) -> None:
        """Configure Cloudinary SDK if credentials exist."""
        if (
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_SECRET
        ):
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            self._is_configured = True
            logger.info("Cloudinary storage service configured successfully.")
        else:
            self._is_configured = False
            logger.warning("Cloudinary credentials are not set. Live storage will fail unless mocked.")

    @property
    def is_configured(self) -> bool:
        return self._is_configured

    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        folder: Optional[str] = None,
        resource_type: str = "auto",
    ) -> Dict[str, Any]:
        """
        Uploads a file to Cloudinary.

        Returns a dictionary containing:
        - secure_url: The HTTPS URL to access the uploaded asset
        - public_id: The unique Cloudinary identifier
        - bytes: Uploaded file size
        - format: File format/extension
        - resource_type: "image", "raw", etc.
        """
        if not self.is_configured:
            raise StorageConfigurationError(
                "Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME, API_KEY, or API_SECRET."
            )

        target_folder = folder or settings.CLOUDINARY_FOLDER

        try:
            # Upload with auto detection, unique filename generation
            result = cloudinary.uploader.upload(
                file_bytes,
                folder=target_folder,
                resource_type=resource_type,
                use_filename=True,
                unique_filename=True,
                overwrite=False,
            )

            return {
                "secure_url": result.get("secure_url"),
                "public_id": result.get("public_id"),
                "bytes": result.get("bytes", len(file_bytes)),
                "format": result.get("format", ""),
                "resource_type": result.get("resource_type", "auto"),
            }
        except Exception as exc:
            logger.error("Cloudinary upload failed: %s", str(exc), exc_info=False)
            raise StorageUploadError(f"Failed to upload document to storage provider: {str(exc)}") from exc

    def delete_file(
        self,
        public_id_or_url: str,
        resource_type: str = "auto",
    ) -> bool:
        """
        Deletes a file from Cloudinary by its public ID or secure URL.
        """
        if not self.is_configured:
            raise StorageConfigurationError("Cloudinary is not configured.")

        public_id = self.extract_public_id_from_url(public_id_or_url) or public_id_or_url

        try:
            # Try auto/image resource type first
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type if resource_type != "auto" else "image",
                invalidate=True,
            )
            
            # If not found as image, attempt raw deletion (e.g. for PDFs)
            if result.get("result") not in ("ok", "not found") and resource_type == "auto":
                result = cloudinary.uploader.destroy(
                    public_id,
                    resource_type="raw",
                    invalidate=True,
                )

            return result.get("result") in ("ok", "not found")
        except Exception as exc:
            logger.error("Cloudinary delete failed for %s: %s", public_id, str(exc), exc_info=False)
            raise StorageDeleteError(f"Failed to delete document from storage: {str(exc)}") from exc

    @staticmethod
    def extract_public_id_from_url(url: str) -> Optional[str]:
        """
        Extracts Cloudinary public ID from a standard Cloudinary URL.
        Example URL: https://res.cloudinary.com/demo/image/upload/v1612345678/scholarhub/student_documents/abc.pdf
        Public ID: scholarhub/student_documents/abc
        """
        if not url or "res.cloudinary.com" not in url:
            return None

        # Matches /upload/(v\d+/)?(path/to/asset_name)(.ext)?
        pattern = r"/upload/(?:v\d+/)?([^\.\?\#]+)"
        match = re.search(pattern, url)
        if match:
            return match.group(1)
        return None


cloudinary_storage_service = CloudinaryStorageService()
