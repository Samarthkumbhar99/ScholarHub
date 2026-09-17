from datetime import date, datetime
from decimal import Decimal
import math
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.application import ApplicationStatus


class ApplicationScholarshipInfo(BaseModel):
    """Concise scholarship information embedded within application tracking responses."""

    id: UUID
    name: str
    provider: str
    description: str
    amount: Decimal = Field(..., description="Award amount")
    deadline: date
    eligibility: Optional[str] = None
    benefits: Optional[List[str]] = None
    official_website: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreateRequest(BaseModel):
    """Request payload for starting/creating a new scholarship application."""

    scholarship_id: UUID = Field(..., description="UUID of the target scholarship")
    status: Optional[ApplicationStatus] = Field(
        default=ApplicationStatus.SAVED,
        description="Initial application status (defaults to SAVED)",
    )


class ApplicationStatusUpdateRequest(BaseModel):
    """Request payload for updating the status of an active scholarship application."""

    status: ApplicationStatus = Field(
        ...,
        description="Target lifecycle status (SAVED, PREPARING_DOCUMENTS, APPLIED, UNDER_REVIEW, INTERVIEW, SELECTED, SCHOLARSHIP_RECEIVED)",
    )


class ApplicationResponse(BaseModel):
    """Complete application record representation including embedded scholarship details."""

    id: UUID
    user_id: UUID
    scholarship_id: UUID
    status: ApplicationStatus
    applied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    scholarship: Optional[ApplicationScholarshipInfo] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationListItem(BaseModel):
    """Application representation for directory/listing views with linked scholarship metadata."""

    id: UUID
    user_id: UUID
    scholarship_id: UUID
    status: ApplicationStatus
    applied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    scholarship: ApplicationScholarshipInfo

    model_config = ConfigDict(from_attributes=True)


class ApplicationListResponse(BaseModel):
    """Paginated response containing application items and metadata."""

    items: List[ApplicationListItem]
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total: int = Field(..., ge=0, description="Total matching application records")
    total_pages: int = Field(..., ge=0, description="Total available pages")

    @classmethod
    def create(
        cls,
        items: List[ApplicationListItem],
        total: int,
        page: int,
        page_size: int,
    ) -> "ApplicationListResponse":
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return cls(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )


class ApplicationDeleteResponse(BaseModel):
    """Response after deleting/canceling an application."""

    message: str
    application_id: UUID
