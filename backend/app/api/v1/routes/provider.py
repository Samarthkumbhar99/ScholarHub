import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_provider, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import ProviderProfileInfo
from app.schemas.provider import (
    ProviderApplyRequest,
    ProviderProfileUpdate,
    ProviderScholarshipCreate,
    ProviderScholarshipListItem,
    ProviderScholarshipListResponse,
    ProviderScholarshipUpdate,
)
from app.services.provider_service import ProviderService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/provider",
    tags=["Scholarship Provider"],
    responses={
        401: {"description": "Missing, expired, or invalid authorization credentials"},
        403: {"description": "Access forbidden: Provider privileges required"},
    },
)


# ==============================================================================
# 1. PROVIDER APPLICATION (AUTHENTICATED USERS)
# ==============================================================================
@router.post(
    "/apply",
    response_model=ProviderProfileInfo,
    status_code=status.HTTP_200_OK,
    summary="Apply for scholarship provider role",
    responses={
        200: {"description": "User successfully upgraded to Provider role"},
        401: {"description": "Authentication required"},
    },
)
async def apply_for_provider(
    payload: ProviderApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileInfo:
    """Allow an authenticated user to apply for or initialize provider access."""
    profile = await ProviderService.apply_for_provider(
        db=db,
        user=current_user,
        organization_name=payload.organization_name,
        contact_person=payload.contact_person,
        website=payload.website,
        phone=payload.phone,
        description=payload.description,
    )
    return ProviderProfileInfo.model_validate(profile)


# ==============================================================================
# 2. PROVIDER PROFILE MANAGEMENT
# ==============================================================================
@router.get(
    "/profile",
    response_model=ProviderProfileInfo,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated provider organization profile",
)
async def get_provider_profile(
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileInfo:
    """Retrieve organization profile information for the authenticated provider."""
    profile = await ProviderService.get_or_create_profile(db, current_provider)
    return ProviderProfileInfo.model_validate(profile)


@router.put(
    "/profile",
    response_model=ProviderProfileInfo,
    status_code=status.HTTP_200_OK,
    summary="Update provider organization profile",
)
async def update_provider_profile(
    payload: ProviderProfileUpdate,
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileInfo:
    """Update organization contact details and website."""
    return await ProviderService.update_profile(db, current_provider, payload)


# ==============================================================================
# 3. SCHOLARSHIP SUBMISSION & OWNERSHIP MANAGEMENT
# ==============================================================================
@router.post(
    "/scholarships",
    response_model=ProviderScholarshipListItem,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new scholarship listing for publication review",
    responses={
        201: {"description": "Scholarship submitted successfully and queued for review"},
        422: {"description": "Validation error in submission payload"},
    },
)
async def submit_scholarship(
    payload: ProviderScholarshipCreate,
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderScholarshipListItem:
    """Submit a scholarship listing for editorial review.

    CRITICAL SAFEGUARD: Newly submitted records enter PENDING_REVIEW and are unverified.
    Providers cannot approve their own submissions.
    """
    scholarship = await ProviderService.submit_scholarship(
        db=db, provider_user=current_provider, payload=payload
    )
    return ProviderScholarshipListItem.model_validate(scholarship)


@router.get(
    "/scholarships",
    response_model=ProviderScholarshipListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all scholarships submitted by the authenticated provider",
)
async def list_submitted_scholarships(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderScholarshipListResponse:
    """Retrieve paginated list of scholarship submissions owned by the provider, showing review statuses."""
    return await ProviderService.list_submitted_scholarships(
        db=db, provider_user=current_provider, page=page, page_size=page_size
    )


@router.get(
    "/scholarships/{scholarship_id}",
    response_model=ProviderScholarshipListItem,
    status_code=status.HTTP_200_OK,
    summary="Get details of a submitted scholarship",
    responses={
        200: {"description": "Submission details retrieved"},
        403: {"description": "Forbidden: You can only view your own submissions"},
        404: {"description": "Submission not found"},
    },
)
async def get_submitted_scholarship(
    scholarship_id: UUID,
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderScholarshipListItem:
    """Retrieve an individual scholarship submission owned by this provider."""
    scholarship = await ProviderService.get_submitted_scholarship(
        db=db, provider_user=current_provider, scholarship_id=scholarship_id
    )
    return ProviderScholarshipListItem.model_validate(scholarship)


@router.put(
    "/scholarships/{scholarship_id}",
    response_model=ProviderScholarshipListItem,
    status_code=status.HTTP_200_OK,
    summary="Update a submitted scholarship listing",
    responses={
        200: {"description": "Submission updated successfully"},
        403: {"description": "Forbidden: You can only modify your own submissions"},
        404: {"description": "Submission not found"},
    },
)
async def update_submitted_scholarship(
    scholarship_id: UUID,
    payload: ProviderScholarshipUpdate,
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderScholarshipListItem:
    """Update details of a previously submitted scholarship.

    SAFEGUARD: Modifying a scholarship preserves or resets review status to PENDING_REVIEW.
    Providers cannot directly publish or verify their listings.
    """
    scholarship = await ProviderService.update_submitted_scholarship(
        db=db,
        provider_user=current_provider,
        scholarship_id=scholarship_id,
        payload=payload,
    )
    return ProviderScholarshipListItem.model_validate(scholarship)


@router.delete(
    "/scholarships/{scholarship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a submitted scholarship listing",
    responses={
        204: {"description": "Submission deleted successfully"},
        403: {"description": "Forbidden: You can only delete your own submissions"},
        404: {"description": "Submission not found"},
    },
)
async def delete_submitted_scholarship(
    scholarship_id: UUID,
    current_provider: User = Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a scholarship listing owned by this provider."""
    await ProviderService.delete_submitted_scholarship(
        db=db, provider_user=current_provider, scholarship_id=scholarship_id
    )
