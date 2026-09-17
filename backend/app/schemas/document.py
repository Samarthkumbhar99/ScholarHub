import uuid
from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DocumentTypeEnum(str, Enum):
    """Controlled document types matching the ScholarHub frontend specifications."""
    AADHAAR = "aadhaar"
    PASSPORT = "passport"
    PAN = "pan"
    INCOME_CERTIFICATE = "income_certificate"
    CASTE_CERTIFICATE = "caste_certificate"
    MARKSHEET = "marksheet"
    BONAFIDE_CERTIFICATE = "bonafide_certificate"
    BANK_PASSBOOK = "bank_passbook"
    PHOTOGRAPH = "photograph"
    SIGNATURE = "signature"
    SOP = "sop"
    RECOMMENDATION_LETTER = "recommendation_letter"
    OTHER = "other"


class DocumentCategoryEnum(str, Enum):
    """Document categories matching the ScholarHub frontend specifications."""
    IDENTITY = "Identity"
    ACADEMIC = "Academic"
    FINANCIAL = "Financial"
    CATEGORY = "Category"
    BANKING = "Banking"
    PERSONAL = "Personal"
    APPLICATION = "Application"
    OTHER = "Other"


class DocumentResponse(BaseModel):
    """Metadata response schema for a student document."""
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    category: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_url: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    expiry_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    """Paginated list of student documents."""
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentDeleteResponse(BaseModel):
    """Response confirming document deletion."""
    message: str = "Document deleted successfully"
    document_id: uuid.UUID
