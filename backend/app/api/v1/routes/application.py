from datetime import datetime, timezone
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.scholarship import Scholarship
from app.models.user import User
from app.schemas.application import (
    ApplicationCreateRequest,
    ApplicationDeleteResponse,
    ApplicationListItem,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationStatusUpdateRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["Scholarship Applications"])

ACTIVE_STATUSES = [
    ApplicationStatus.SAVED,
    ApplicationStatus.PREPARING_DOCUMENTS,
    ApplicationStatus.APPLIED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.INTERVIEW,
]

COMPLETED_STATUSES = [
    ApplicationStatus.SELECTED,
    ApplicationStatus.SCHOLARSHIP_RECEIVED,
]


# ==============================================================================
# 1. CREATE APPLICATION
# ==============================================================================
@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or start tracking a scholarship application",
    responses={
        201: {"description": "Application created successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        409: {"description": "Application already exists for this scholarship"},
        422: {"description": "Validation error in request payload"},
    },
)
async def create_application(
    payload: ApplicationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplicationResponse:
    """Create a new scholarship application tracker record for the authenticated student."""
    # 1. Verify target scholarship exists
    sch_stmt = select(Scholarship).where(Scholarship.id == payload.scholarship_id)
    sch_res = await db.execute(sch_stmt)
    scholarship = sch_res.scalar_one_or_none()

    if scholarship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    # 2. Check for duplicate application by the current user
    dup_stmt = select(Application).where(
        Application.user_id == current_user.id,
        Application.scholarship_id == payload.scholarship_id,
    )
    dup_res = await db.execute(dup_stmt)
    existing_app = dup_res.scalar_one_or_none()

    if existing_app is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An application for this scholarship already exists",
        )

    # 3. Determine applied_at timestamp based on initial status
    initial_status = payload.status or ApplicationStatus.SAVED
    applied_at = (
        datetime.now(timezone.utc)
        if initial_status in [
            ApplicationStatus.APPLIED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.INTERVIEW,
            ApplicationStatus.SELECTED,
            ApplicationStatus.SCHOLARSHIP_RECEIVED,
        ]
        else None
    )

    new_app = Application(
        user_id=current_user.id,
        scholarship_id=payload.scholarship_id,
        status=initial_status,
        applied_at=applied_at,
    )

    db.add(new_app)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An application for this scholarship already exists",
        )

    # Re-query with eager scholarship relationship
    stmt = (
        select(Application)
        .options(selectinload(Application.scholarship))
        .where(Application.id == new_app.id)
    )
    res = await db.execute(stmt)
    created = res.scalar_one()

    return ApplicationResponse.model_validate(created)


# ==============================================================================
# 2. LIST APPLICATIONS
# ==============================================================================
@router.get(
    "",
    response_model=ApplicationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List applications for the authenticated student",
    responses={
        200: {"description": "Paginated list of applications retrieved successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in query parameters"},
    },
)
async def list_applications(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page (max 100)"),
    status_filter: Optional[ApplicationStatus] = Query(
        default=None,
        alias="status",
        description="Filter by specific application status",
    ),
    tab: Optional[str] = Query(
        default=None,
        description="Filter tab: 'active' (Stages 1-5), 'completed' (Stages 6-7), or 'all'",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplicationListResponse:
    """Retrieve all scholarship applications belonging exclusively to the authenticated student."""
    stmt = (
        select(Application)
        .options(selectinload(Application.scholarship))
        .where(Application.user_id == current_user.id)
    )

    # Filter by tab
    if tab:
        tab_lower = tab.strip().lower()
        if tab_lower == "active":
            stmt = stmt.where(Application.status.in_(ACTIVE_STATUSES))
        elif tab_lower == "completed":
            stmt = stmt.where(Application.status.in_(COMPLETED_STATUSES))

    # Filter by specific status
    if status_filter is not None:
        stmt = stmt.where(Application.status == status_filter)

    # Count matching records
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    # Deterministic sorting (most recently updated first, tie-broken by ID)
    stmt = stmt.order_by(Application.updated_at.desc(), Application.id.asc())

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    res = await db.execute(stmt)
    applications = res.scalars().all()

    items = [ApplicationListItem.model_validate(app) for app in applications]

    return ApplicationListResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==============================================================================
# 3. GET SINGLE APPLICATION DETAILS
# ==============================================================================
@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single application details by ID",
    responses={
        200: {"description": "Application details retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Application not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def get_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplicationResponse:
    """Retrieve full details of an application owned by the authenticated student."""
    stmt = (
        select(Application)
        .options(selectinload(Application.scholarship))
        .where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    return ApplicationResponse.model_validate(app)


# ==============================================================================
# 4. UPDATE APPLICATION STATUS
# ==============================================================================
@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update application status",
    responses={
        200: {"description": "Application status updated successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Application not found"},
        422: {"description": "Invalid UUID or status value"},
    },
)
async def update_application_status(
    application_id: UUID,
    payload: ApplicationStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplicationResponse:
    """Update the lifecycle status of an application owned by the authenticated student."""
    stmt = (
        select(Application)
        .options(selectinload(Application.scholarship))
        .where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    app.status = payload.status

    # Record first submission timestamp if moving to APPLIED or beyond
    if (
        payload.status
        in [
            ApplicationStatus.APPLIED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.INTERVIEW,
            ApplicationStatus.SELECTED,
            ApplicationStatus.SCHOLARSHIP_RECEIVED,
        ]
        and app.applied_at is None
    ):
        app.applied_at = datetime.now(timezone.utc)

    app.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(app)

    return ApplicationResponse.model_validate(app)


# ==============================================================================
# 5. DELETE / CANCEL APPLICATION
# ==============================================================================
@router.delete(
    "/{application_id}",
    response_model=ApplicationDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete / cancel a scholarship application",
    responses={
        200: {"description": "Application deleted successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Application not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def delete_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplicationDeleteResponse:
    """Delete an application tracker record owned by the authenticated student."""
    stmt = select(Application).where(
        Application.id == application_id,
        Application.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    await db.delete(app)
    await db.commit()

    return ApplicationDeleteResponse(
        message="Application deleted successfully",
        application_id=application_id,
    )
