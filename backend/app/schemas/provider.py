import math
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.scholarship import ScholarshipReviewStatus


class ProviderProfileUpdate(BaseModel):
    """Payload for updating provider organization details."""

    organization_name: Optional[str] = Field(None, min_length=2, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=150)
    website: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None)


class ProviderApplyRequest(BaseModel):
    """Payload for authenticated student applying for provider access."""

    organization_name: str = Field(..., min_length=2, max_length=255, description="Organization name")
    contact_person: Optional[str] = Field(None, max_length=150)
    website: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None)


class ProviderScholarshipCreate(BaseModel):
    """Payload for a provider submitting a new scholarship for review."""

    name: str = Field(..., min_length=3, max_length=255, description="Scholarship title")
    description: str = Field(..., min_length=10, description="Comprehensive details and guidelines")
    amount: Decimal = Field(..., gt=0, description="Total award amount")
    currency: str = Field("INR", max_length=3, description="Currency code (e.g. INR)")
    deadline: date = Field(..., description="Application closing date")
    eligibility: Optional[str] = Field(None, description="Candidate eligibility criteria")
    benefits: Optional[list[str]] = Field(default_factory=list, description="Coverage and award inclusions")
    selection_process: Optional[list[str]] = Field(default_factory=list, description="Evaluation stages")
    official_website: Optional[str] = Field(None, max_length=500, description="Official portal link")


class ProviderScholarshipUpdate(BaseModel):
    """Payload for a provider updating their submitted scholarship."""

    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    deadline: Optional[date] = Field(None)
    eligibility: Optional[str] = Field(None)
    benefits: Optional[list[str]] = Field(None)
    selection_process: Optional[list[str]] = Field(None)
    official_website: Optional[str] = Field(None, max_length=500)


class ProviderScholarshipListItem(BaseModel):
    """Provider-view item representation showing moderation status and rejection feedback."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    provider: str
    amount: Decimal
    currency: str
    deadline: date
    description: str
    eligibility: Optional[str] = None
    benefits: Optional[list[str]] = None
    selection_process: Optional[list[str]] = None
    official_website: Optional[str] = None
    review_status: str = Field(..., description="PENDING_REVIEW, VERIFIED, or REJECTED")
    is_verified: bool = Field(False, description="Public verification status (only Admin can set True)")
    rejection_reason: Optional[str] = Field(None, description="Administrator feedback if rejected")
    created_at: datetime
    updated_at: datetime


class ProviderScholarshipListResponse(BaseModel):
    """Paginated list of provider-owned scholarship submissions."""

    items: list[ProviderScholarshipListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(
        cls,
        items: list[ProviderScholarshipListItem],
        total: int,
        page: int,
        page_size: int,
    ) -> "ProviderScholarshipListResponse":
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
