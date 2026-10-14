import math
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


# ==============================================================================
# 1. ADMIN SCHOLARSHIP SCHEMAS
# ==============================================================================
class AdminScholarshipCreate(BaseModel):
    """Payload for creating a new scholarship record by an administrator."""

    name: str = Field(..., min_length=1, max_length=255, description="Scholarship program name")
    provider: str = Field(..., min_length=1, max_length=255, description="Sponsoring agency or organization")
    description: str = Field(..., min_length=1, description="Detailed program description")
    amount: Decimal = Field(..., ge=0, description="Grant or award amount in standard monetary units")
    currency: Optional[str] = Field("INR", min_length=3, max_length=3, description="ISO currency code")
    deadline: date = Field(..., description="Application closing date")
    eligibility: Optional[str] = Field(None, description="Detailed eligibility criteria")
    benefits: Optional[list[str]] = Field(None, description="List of itemized benefits or allowances")
    selection_process: Optional[list[str]] = Field(None, description="List of evaluation and interview stages")
    official_website: Optional[str] = Field(None, max_length=500, description="Official portal or verification URL")
    source_url: Optional[str] = Field(None, max_length=1000, description="Source circular or notice URL")
    is_verified: Optional[bool] = Field(True, description="Whether this admin entry is published as verified")
    review_status: Optional[str] = Field("VERIFIED", description="Review state: VERIFIED, PENDING_REVIEW, REJECTED")


class AdminScholarshipUpdate(BaseModel):
    """Payload for updating an existing scholarship record."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated scholarship name")
    provider: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated provider")
    description: Optional[str] = Field(None, min_length=1, description="Updated description")
    amount: Optional[Decimal] = Field(None, ge=0, description="Updated award amount")
    currency: Optional[str] = Field(None, min_length=3, max_length=3, description="Updated ISO currency code")
    deadline: Optional[date] = Field(None, description="Updated closing date")
    eligibility: Optional[str] = Field(None, description="Updated eligibility")
    benefits: Optional[list[str]] = Field(None, description="Updated benefits")
    selection_process: Optional[list[str]] = Field(None, description="Updated selection process")
    official_website: Optional[str] = Field(None, max_length=500, description="Updated official website")
    source_url: Optional[str] = Field(None, max_length=1000, description="Updated source notice URL")
    is_verified: Optional[bool] = Field(None, description="Updated verification status")
    review_status: Optional[str] = Field(None, description="Updated review status")
    rejection_reason: Optional[str] = Field(None, description="Updated rejection reason or notes")


class AdminScholarshipRejectPayload(BaseModel):
    """Payload for rejecting a scholarship listing with a mandatory reason."""

    rejection_reason: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Mandatory rationale for rejecting the scholarship listing",
    )



# ==============================================================================
# 2. ADMIN SCHOLARSHIP REQUIREMENT SCHEMAS
# ==============================================================================
class AdminRequirementCreate(BaseModel):
    """Payload for creating a document/qualification requirement for a scholarship."""

    name: str = Field(..., min_length=1, max_length=255, description="Requirement name (e.g. Income Certificate)")
    document_type: str = Field(..., min_length=1, max_length=50, description="Canonical document type tag")
    required: bool = Field(True, description="Whether this requirement is strictly mandatory")


class AdminRequirementUpdate(BaseModel):
    """Payload for modifying a scholarship requirement."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated requirement name")
    document_type: Optional[str] = Field(None, min_length=1, max_length=50, description="Updated document type tag")
    required: Optional[bool] = Field(None, description="Updated mandatory flag")


# ==============================================================================
# 3. ADMIN USER MANAGEMENT SCHEMAS
# ==============================================================================
class AdminUserProfileInfo(BaseModel):
    """Safe personal profile summary of a student."""

    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    mobile: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None


class AdminUserAcademicInfo(BaseModel):
    """Safe academic profile summary of a student."""

    model_config = ConfigDict(from_attributes=True)

    course: Optional[str] = None
    branch: Optional[str] = None
    current_year: Optional[str] = None
    university: Optional[str] = None
    college: Optional[str] = None
    cgpa: Optional[Decimal] = None
    previous_percentage: Optional[Decimal] = None


class AdminUserFinancialInfo(BaseModel):
    """Safe financial preference summary of a student."""

    model_config = ConfigDict(from_attributes=True)

    reservation_category: Optional[str] = None
    special_categories: Optional[list[str]] = None
    family_income: Optional[Decimal] = None
    study_preference: Optional[str] = None


class AdminUserListItem(BaseModel):
    """High-level user record for administrative directory list."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: UserRole
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminUserListResponse(BaseModel):
    """Paginated user directory response."""

    items: list[AdminUserListItem]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1)
    total_pages: int = Field(..., ge=0)

    @classmethod
    def create(
        cls,
        items: list[AdminUserListItem],
        total: int,
        page: int,
        page_size: int,
    ) -> "AdminUserListResponse":
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


class AdminUserDetailResponse(BaseModel):
    """Detailed user inspection schema without passwords or secrets."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: UserRole
    created_at: datetime
    updated_at: datetime
    profile: Optional[AdminUserProfileInfo] = None
    academic: Optional[AdminUserAcademicInfo] = None
    financial: Optional[AdminUserFinancialInfo] = None
    applications_count: int = 0
    documents_count: int = 0
    saved_scholarships_count: int = 0


# ==============================================================================
# 4. ADMIN DASHBOARD STATS SCHEMA
# ==============================================================================
class AdminSchedulerInfo(BaseModel):
    """Observability metadata for the recurring automated discovery scheduler."""

    enabled: bool = Field(False, description="Whether background scheduling is enabled")
    is_running: bool = Field(False, description="Whether background loop is running")
    is_executing: bool = Field(False, description="Whether a collection job is currently executing")
    interval_hours: int = Field(12, description="Configured collection interval in hours")
    initial_delay_seconds: int = Field(60, description="Startup delay in seconds")
    timeout_seconds: int = Field(300, description="Collection execution timeout in seconds")
    max_retries: int = Field(2, description="Maximum retries on transient errors")
    configured_sources: list[str] = Field(default_factory=list, description="Active sources configured for scheduling")
    last_run_at: Optional[datetime] = Field(None, description="Timestamp of the most recent collection run")
    next_run_at: Optional[datetime] = Field(None, description="Projected timestamp of next scheduled collection")
    last_run_status: Optional[str] = Field(None, description="Outcome status of the latest run (SUCCEEDED, PARTIAL, FAILED)")
    last_run_source: Optional[str] = Field(None, description="Source slug of the latest collection run")
    last_run_records_discovered: Optional[int] = Field(None, description="Records discovered in the latest run")
    last_run_records_created: Optional[int] = Field(None, description="Records created in the latest run")
    last_run_records_updated: Optional[int] = Field(None, description="Records updated in the latest run")
    last_run_records_duplicates_skipped: Optional[int] = Field(None, description="Duplicates skipped in the latest run")
    last_run_records_rejected: Optional[int] = Field(None, description="Records rejected in the latest run")
    last_run_error_summary: Optional[str] = Field(None, description="Error summary from the latest run, if any")


class AdminUserRoleUpdate(BaseModel):
    """Payload for updating a user's role."""

    role: UserRole = Field(..., description="Target role: STUDENT, PROVIDER, or ADMIN")


class AdminProviderListItem(BaseModel):
    """Item representation for providers in admin directory."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    organization_name: str
    contact_person: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    is_approved: bool = True
    created_at: datetime
    updated_at: datetime
    email: Optional[EmailStr] = None


class AdminDashboardStatsResponse(BaseModel):
    """System-wide summary metrics for the administrative dashboard."""

    total_users: int = Field(..., ge=0, description="Total registered user accounts")
    total_students: int = Field(..., ge=0, description="Total student accounts")
    total_providers: int = Field(default=0, ge=0, description="Total scholarship provider accounts")
    total_scholarships: int = Field(..., ge=0, description="Total scholarship listings")
    active_scholarships: int = Field(..., ge=0, description="Scholarships with deadlines today or later")
    total_applications: int = Field(..., ge=0, description="Total scholarship applications submitted/tracked")
    total_saved_scholarships: int = Field(..., ge=0, description="Total saved bookmarks across all users")
    total_documents: int = Field(..., ge=0, description="Total student uploaded documents")
    unread_notifications: int = Field(..., ge=0, description="Total unread notifications system-wide")
    pending_scholarships: int = Field(default=0, ge=0, description="Scholarships pending editorial moderation")
    verified_scholarships: int = Field(default=0, ge=0, description="Verified published scholarships")
    rejected_scholarships: int = Field(default=0, ge=0, description="Rejected scholarships")
    legacy_scholarships: int = Field(default=0, ge=0, description="Legacy catalog scholarships")
    total_collection_jobs: int = Field(default=0, ge=0, description="Total collection executions")
    scheduler_info: Optional[AdminSchedulerInfo] = Field(default=None, description="Scheduler status and last run observability")


class AdminSchedulerTriggerResponse(BaseModel):
    """Response payload when manually triggering a scheduled discovery run."""

    detail: str
    status: str
    job_id: Optional[UUID] = None
    records_discovered: Optional[int] = None
    records_created: Optional[int] = None
    records_updated: Optional[int] = None
    records_duplicates_skipped: Optional[int] = None
    records_rejected: Optional[int] = None
    error_summary: Optional[str] = None


# ==============================================================================
# 5. ADMIN GENERIC OPERATION RESPONSES
# ==============================================================================
class AdminActionResponse(BaseModel):
    """Generic acknowledgment response for administrative mutations."""

    detail: str
    id: UUID


# ==============================================================================
# 6. ADMIN COLLECTION JOB AUDIT SCHEMAS
# ==============================================================================
class AdminCollectionJobListItem(BaseModel):
    """Collection job audit summary item."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_id: Optional[UUID] = None
    source_name: Optional[str] = None
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    records_discovered: int
    records_created: int
    records_updated: int
    records_duplicates_skipped: int
    records_rejected: int
    error_summary: Optional[str] = None
    created_at: datetime


class AdminCollectionJobListResponse(BaseModel):
    """Paginated collection jobs response."""

    items: list[AdminCollectionJobListItem]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1)
    total_pages: int = Field(..., ge=0)

    @classmethod
    def create(
        cls,
        items: list[AdminCollectionJobListItem],
        total: int,
        page: int,
        page_size: int,
    ) -> "AdminCollectionJobListResponse":
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
