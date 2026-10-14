import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminActionResponse,
    AdminCollectionJobListItem,
    AdminCollectionJobListResponse,
    AdminDashboardStatsResponse,
    AdminProviderListItem,
    AdminRequirementCreate,
    AdminRequirementUpdate,
    AdminSchedulerInfo,
    AdminSchedulerTriggerResponse,
    AdminScholarshipCreate,
    AdminScholarshipRejectPayload,
    AdminScholarshipUpdate,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserRoleUpdate,
)
from app.schemas.scholarship import (
    ScholarshipListResponse,
    ScholarshipRequirementResponse,
    ScholarshipResponse,
)
from app.services.admin_service import AdminService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_admin)],
    responses={
        401: {"description": "Missing, expired, or invalid authorization token"},
        403: {"description": "Access forbidden: Admin privileges required"},
    },
)


# ==============================================================================
# 1. DASHBOARD STATISTICS
# ==============================================================================
@router.get(
    "/dashboard/stats",
    response_model=AdminDashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system-wide administrative metrics overview",
    responses={
        200: {"description": "Dashboard statistics retrieved successfully"},
    },
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminDashboardStatsResponse:
    """Retrieve high-level discovery, student activity, and operational counts for admin overview."""
    return await AdminService.get_dashboard_stats(db)


# ==============================================================================
# 2. SCHOLARSHIP MANAGEMENT
# ==============================================================================
@router.post(
    "/scholarships",
    response_model=ScholarshipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new scholarship entry",
    responses={
        201: {"description": "Scholarship created successfully"},
        422: {"description": "Validation error in payload"},
    },
)
async def create_scholarship(
    payload: AdminScholarshipCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipResponse:
    """Create a new scholarship listing in the catalog."""
    scholarship = await AdminService.create_scholarship(db, payload)
    return ScholarshipResponse.model_validate(scholarship)


@router.get(
    "/scholarships",
    response_model=ScholarshipListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all scholarships for administration",
    responses={
        200: {"description": "Scholarships listed successfully"},
    },
)
async def list_scholarships(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or provider"),
    review_status: Optional[str] = Query(None, description="Filter by review status (PENDING_REVIEW, VERIFIED, REJECTED, LEGACY)"),
    source_id: Optional[UUID] = Query(None, description="Filter by source ID"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipListResponse:
    """Retrieve paginated scholarships for administrative monitoring and editing."""
    return await AdminService.list_scholarships(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        review_status=review_status,
        source_id=source_id,
    )


@router.get(
    "/moderation/pending",
    response_model=ScholarshipListResponse,
    status_code=status.HTTP_200_OK,
    summary="List pending scholarships requiring editorial review",
    responses={
        200: {"description": "Pending scholarships listed successfully"},
    },
)
async def get_pending_scholarships(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or provider"),
    source_id: Optional[UUID] = Query(None, description="Filter by source ID"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipListResponse:
    """Convenience endpoint to retrieve all scholarships currently awaiting moderation."""
    return await AdminService.list_scholarships(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        review_status="PENDING_REVIEW",
        source_id=source_id,
    )


@router.get(
    "/scholarships/{scholarship_id}",
    response_model=ScholarshipResponse,
    status_code=status.HTTP_200_OK,
    summary="Get scholarship details by ID",
    responses={
        200: {"description": "Scholarship retrieved successfully"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def get_scholarship(
    scholarship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipResponse:
    """Retrieve detailed scholarship information."""
    scholarship = await AdminService.get_scholarship_by_id(db, scholarship_id)
    return ScholarshipResponse.model_validate(scholarship)


@router.post(
    "/scholarships/{scholarship_id}/approve",
    response_model=ScholarshipResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve a scholarship for publication",
    responses={
        200: {"description": "Scholarship approved and published"},
        404: {"description": "Scholarship not found"},
    },
)
async def approve_scholarship(
    scholarship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipResponse:
    """Approve a discovered or pending scholarship, making it visible to students according to the publication policy."""
    scholarship = await AdminService.approve_scholarship(db, scholarship_id)
    return ScholarshipResponse.model_validate(scholarship)


@router.post(
    "/scholarships/{scholarship_id}/reject",
    response_model=ScholarshipResponse,
    status_code=status.HTTP_200_OK,
    summary="Reject a scholarship with reason",
    responses={
        200: {"description": "Scholarship rejected and hidden"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Rejection reason missing or empty"},
    },
)
async def reject_scholarship(
    scholarship_id: UUID,
    payload: AdminScholarshipRejectPayload,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipResponse:
    """Reject a scholarship, recording reason and ensuring it remains hidden from public searches."""
    scholarship = await AdminService.reject_scholarship(
        db, scholarship_id, payload.rejection_reason
    )
    return ScholarshipResponse.model_validate(scholarship)


@router.put(
    "/scholarships/{scholarship_id}",
    response_model=ScholarshipResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing scholarship",
    responses={
        200: {"description": "Scholarship updated successfully"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Validation error or invalid UUID"},
    },
)
async def update_scholarship(
    scholarship_id: UUID,
    payload: AdminScholarshipUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipResponse:
    """Update scholarship attributes in the catalog."""
    scholarship = await AdminService.update_scholarship(db, scholarship_id, payload)
    return ScholarshipResponse.model_validate(scholarship)


@router.delete(
    "/scholarships/{scholarship_id}",
    response_model=AdminActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a scholarship",
    responses={
        200: {"description": "Scholarship deleted successfully"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def delete_scholarship(
    scholarship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminActionResponse:
    """Delete a scholarship and all associated dependent records."""
    await AdminService.delete_scholarship(db, scholarship_id)
    return AdminActionResponse(
        detail="Scholarship deleted successfully",
        id=scholarship_id,
    )


# ==============================================================================
# 3. SCHOLARSHIP REQUIREMENTS MANAGEMENT
# ==============================================================================
@router.post(
    "/scholarships/{scholarship_id}/requirements",
    response_model=ScholarshipRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a requirement for a scholarship",
    responses={
        201: {"description": "Requirement created successfully"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Validation error or invalid UUID"},
    },
)
async def create_requirement(
    scholarship_id: UUID,
    payload: AdminRequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipRequirementResponse:
    """Add a document/qualification requirement to a scholarship."""
    req = await AdminService.create_requirement(db, scholarship_id, payload)
    return ScholarshipRequirementResponse.model_validate(req)


@router.get(
    "/scholarships/{scholarship_id}/requirements",
    response_model=list[ScholarshipRequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="List all requirements for a scholarship",
    responses={
        200: {"description": "Requirements listed successfully"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def get_scholarship_requirements(
    scholarship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[ScholarshipRequirementResponse]:
    """Retrieve all document/qualification requirements defined for a scholarship."""
    requirements = await AdminService.get_requirements_by_scholarship(db, scholarship_id)
    return [ScholarshipRequirementResponse.model_validate(r) for r in requirements]


@router.put(
    "/requirements/{requirement_id}",
    response_model=ScholarshipRequirementResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a scholarship requirement",
    responses={
        200: {"description": "Requirement updated successfully"},
        404: {"description": "Requirement not found"},
        422: {"description": "Validation error or invalid UUID"},
    },
)
async def update_requirement(
    requirement_id: UUID,
    payload: AdminRequirementUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> ScholarshipRequirementResponse:
    """Update an existing scholarship requirement."""
    req = await AdminService.update_requirement(db, requirement_id, payload)
    return ScholarshipRequirementResponse.model_validate(req)


@router.delete(
    "/requirements/{requirement_id}",
    response_model=AdminActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a scholarship requirement",
    responses={
        200: {"description": "Requirement deleted successfully"},
        404: {"description": "Requirement not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def delete_requirement(
    requirement_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminActionResponse:
    """Delete a scholarship requirement."""
    await AdminService.delete_requirement(db, requirement_id)
    return AdminActionResponse(
        detail="Scholarship requirement deleted successfully",
        id=requirement_id,
    )


# ==============================================================================
# 4. USER DIRECTORY & INSPECTION
# ==============================================================================
@router.get(
    "/users",
    response_model=AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List registered users",
    responses={
        200: {"description": "Users directory listed successfully"},
    },
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminUserListResponse:
    """List registered users with pagination and optional search filter."""
    return await AdminService.list_users(
        db=db, page=page, page_size=page_size, search=search
    )


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user details by ID",
    responses={
        200: {"description": "User details retrieved successfully"},
        404: {"description": "User not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def get_user_detail(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminUserDetailResponse:
    """Retrieve detailed user account and profile information without sensitive credentials."""
    return await AdminService.get_user_by_id(db, user_id)


@router.patch(
    "/users/{user_id}/role",
    response_model=AdminUserDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user authorization role",
    responses={
        200: {"description": "User role updated successfully"},
        404: {"description": "User not found"},
    },
)
async def update_user_role(
    user_id: UUID,
    payload: AdminUserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminUserDetailResponse:
    """Safely update user role between STUDENT, PROVIDER, or ADMIN."""
    return await AdminService.update_user_role(db, user_id, payload.role)


@router.get(
    "/providers",
    response_model=list[AdminProviderListItem],
    status_code=status.HTTP_200_OK,
    summary="List all registered scholarship providers",
)
async def list_providers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[AdminProviderListItem]:
    """Retrieve list of registered scholarship provider organizations."""
    return await AdminService.list_providers(db=db, page=page, page_size=page_size)


@router.patch(
    "/providers/{provider_id}/approve",
    response_model=AdminProviderListItem,
    status_code=status.HTTP_200_OK,
    summary="Approve or revoke a provider organization",
)
async def approve_provider(
    provider_id: UUID,
    approved: bool = Query(True, description="Approval status flag"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminProviderListItem:
    """Approve or reject a provider organization application."""
    return await AdminService.approve_provider(db, provider_id, approved)


# ==============================================================================
# 5. COLLECTION JOBS AUDIT
# ==============================================================================
@router.get(
    "/collection-jobs",
    response_model=AdminCollectionJobListResponse,
    status_code=status.HTTP_200_OK,
    summary="List automated collection job executions and metrics",
    responses={
        200: {"description": "Collection job audit logs retrieved successfully"},
    },
)
async def list_collection_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    source_id: Optional[UUID] = Query(None, description="Filter by source ID"),
    source_slug: Optional[str] = Query(None, description="Filter by source slug (e.g. nsp)"),
    status: Optional[str] = Query(None, description="Filter by job status (RUNNING, SUCCESS, PARTIAL_SUCCESS, FAILED)"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminCollectionJobListResponse:
    """Retrieve historical collection job audit records with counts of discovered, created, updated, duplicates, and errors."""
    return await AdminService.list_collection_jobs(
        db=db,
        page=page,
        page_size=page_size,
        source_id=source_id,
        source_slug=source_slug,
        job_status=status,
    )


@router.get(
    "/collection-jobs/{job_id}",
    response_model=AdminCollectionJobListItem,
    status_code=status.HTTP_200_OK,
    summary="Get collection job detail by ID",
    responses={
        200: {"description": "Collection job retrieved successfully"},
        404: {"description": "Collection job not found"},
    },
)
async def get_collection_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminCollectionJobListItem:
    """Retrieve individual collection job details and metrics."""
    job = await AdminService.get_collection_job_by_id(db, job_id)
    return AdminCollectionJobListItem.model_validate(job)


# ==============================================================================
# 6. SCHEDULER OBSERVABILITY & CONTROL
# ==============================================================================
@router.get(
    "/scheduler",
    response_model=AdminSchedulerInfo,
    status_code=status.HTTP_200_OK,
    summary="Get scholarship discovery scheduler status and telemetry",
    responses={
        200: {"description": "Scheduler telemetry retrieved successfully"},
    },
)
async def get_scheduler_status(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AdminSchedulerInfo:
    """Retrieve operational status, next scheduled run, interval, and latest run telemetry."""
    stats = await AdminService.get_dashboard_stats(db)
    if stats.scheduler_info:
        return stats.scheduler_info
    from app.services.discovery.scheduler import get_discovery_scheduler
    return AdminSchedulerInfo(**get_discovery_scheduler().get_status())


@router.post(
    "/scheduler/trigger",
    response_model=AdminSchedulerTriggerResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger immediate scholarship discovery collection run",
    responses={
        200: {"description": "Discovery collection job executed or skipped safely due to active lock"},
    },
)
async def trigger_scheduled_collection(
    source: Optional[str] = Query("nsp", description="Source slug to collect (default: nsp)"),
    current_admin: User = Depends(get_current_admin),
) -> AdminSchedulerTriggerResponse:
    """Trigger an on-demand collection run, respecting the distributed advisory lock."""
    from app.services.discovery.scheduler import get_discovery_scheduler
    scheduler = get_discovery_scheduler()
    job = await scheduler.trigger_now(source_slug=source)

    if job is None:
        return AdminSchedulerTriggerResponse(
            detail=f"Collection for source '{source}' was skipped because an active job or advisory lock is already in progress.",
            status="SKIPPED_LOCKED",
        )

    return AdminSchedulerTriggerResponse(
        detail=f"Collection job for source '{source}' completed with status {job.status}.",
        status=job.status,
        job_id=job.id,
        records_discovered=job.records_discovered,
        records_created=job.records_created,
        records_updated=job.records_updated,
        records_duplicates_skipped=job.records_duplicates_skipped,
        records_rejected=job.records_rejected,
        error_summary=job.error_summary,
    )


