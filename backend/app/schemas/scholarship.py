import math
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ScholarshipSortOption(str, Enum):
    """Supported sort options for scholarship listing."""

    DEADLINE_ASC = "deadline_asc"
    DEADLINE_DESC = "deadline_desc"
    AMOUNT_ASC = "amount_asc"
    AMOUNT_DESC = "amount_desc"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"


class ScholarshipRequirementResponse(BaseModel):
    """Schema representing an individual document or qualification requirement."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scholarship_id: UUID
    name: str
    document_type: str
    required: bool


class ScholarshipListItem(BaseModel):
    """Concise representation of a scholarship for list/discovery views."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    provider: str
    description: str
    amount: Decimal = Field(..., description="Award amount in standard monetary units")
    currency: str = Field(default="INR", description="Three-letter ISO currency code")
    deadline: date
    eligibility: Optional[str] = None
    official_website: Optional[str] = None
    is_verified: bool = Field(default=False, description="Verification status flag")
    review_status: str = Field(default="LEGACY", description="Publication review lifecycle state")
    source_id: Optional[UUID] = None
    source_name: Optional[str] = None
    external_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    last_collected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ScholarshipResponse(BaseModel):
    """Detailed representation of a scholarship including full benefits and selection process."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    provider: str
    description: str
    amount: Decimal
    currency: str = Field(default="INR", description="Three-letter ISO currency code")
    deadline: date
    eligibility: Optional[str] = None
    benefits: Optional[list[str]] = None
    selection_process: Optional[list[str]] = None
    official_website: Optional[str] = None
    source_url: Optional[str] = None
    source_id: Optional[UUID] = None
    source_name: Optional[str] = None
    external_id: Optional[str] = None
    fingerprint: Optional[str] = None
    is_verified: bool = Field(default=False, description="Verification status flag")
    review_status: str = Field(default="LEGACY", description="Publication review lifecycle state")
    rejection_reason: Optional[str] = None
    last_collected_at: Optional[datetime] = None
    last_verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime



class ScholarshipListResponse(BaseModel):
    """Paginated response containing scholarship list items and navigation metadata."""

    items: list[ScholarshipListItem]
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total: int = Field(..., ge=0, description="Total matching records count")
    total_pages: int = Field(..., ge=0, description="Total available pages")

    @classmethod
    def create(
        cls,
        items: list[ScholarshipListItem],
        total: int,
        page: int,
        page_size: int,
    ) -> "ScholarshipListResponse":
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return cls(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )


class SavedStatusResponse(BaseModel):
    """Status response indicating whether a scholarship is bookmarked by the current user."""

    scholarship_id: UUID
    saved: bool


class ScholarshipCompareResponse(BaseModel):
    """Comparison matrix response holding detailed schemas for requested scholarships."""

    items: list[ScholarshipResponse]
    count: int = Field(..., ge=0, description="Number of scholarships returned for comparison")
