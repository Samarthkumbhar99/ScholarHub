import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.profile import AcademicProfile, FinancialPreference, StudentProfile
from app.models.user import User
from app.schemas.profile import (
    AcademicProfileResponse,
    AcademicProfileUpdate,
    CombinedProfileResponse,
    FinancialPreferenceResponse,
    FinancialPreferenceUpdate,
    StudentProfileResponse,
    StudentProfileUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile Management"])


# ==============================================================================
# COMBINED PROFILE
# ==============================================================================
@router.get(
    "/me",
    response_model=CombinedProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get combined student profile",
    responses={
        200: {"description": "Unified profile state retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def get_combined_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CombinedProfileResponse:
    """Retrieve all profile sections (personal, academic, preferences) for the authenticated user.

    Returns null for any section that has not yet been initialized.
    """
    profile_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    academic_stmt = select(AcademicProfile).where(AcademicProfile.user_id == current_user.id)
    fin_stmt = select(FinancialPreference).where(FinancialPreference.user_id == current_user.id)

    profile_res = await db.execute(profile_stmt)
    academic_res = await db.execute(academic_stmt)
    fin_res = await db.execute(fin_stmt)

    personal = profile_res.scalar_one_or_none()
    academic = academic_res.scalar_one_or_none()
    preferences = fin_res.scalar_one_or_none()

    return CombinedProfileResponse(
        personal=personal,
        academic=academic,
        preferences=preferences,
    )


# ==============================================================================
# PERSONAL / STUDENT PROFILE
# ==============================================================================
@router.get(
    "",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated student's personal profile",
    responses={
        200: {"description": "Personal profile retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Personal profile has not been created yet"},
    },
)
async def get_personal_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfile:
    """Retrieve personal and contact details for the authenticated user."""
    stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    return profile


@router.put(
    "",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or update student's personal profile",
    responses={
        200: {"description": "Personal profile created or updated successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in profile payload"},
    },
)
async def upsert_personal_profile(
    payload: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfile:
    """Idempotently create or update the authenticated user's personal profile."""
    stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    update_data = payload.model_dump(exclude_unset=True)

    if profile is None:
        # Enforce required first_name and last_name on initial creation
        first_name = update_data.get("first_name")
        last_name = update_data.get("last_name")
        if not first_name or not last_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="first_name and last_name are required to initialize a student profile",
            )

        profile = StudentProfile(
            user_id=current_user.id,
            **update_data,
        )
        db.add(profile)
    else:
        for field, value in update_data.items():
            setattr(profile, field, value)

    try:
        await db.commit()
        await db.refresh(profile)
    except Exception as exc:
        await db.rollback()
        logger.error(f"Failed to upsert student profile for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the profile",
        )

    return profile


# ==============================================================================
# ACADEMIC PROFILE
# ==============================================================================
@router.get(
    "/academic",
    response_model=AcademicProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated student's academic profile",
    responses={
        200: {"description": "Academic profile retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Academic profile has not been created yet"},
    },
)
async def get_academic_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AcademicProfile:
    """Retrieve academic history and performance details for the authenticated user."""
    stmt = select(AcademicProfile).where(AcademicProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    academic = result.scalar_one_or_none()

    if academic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic profile not found",
        )

    return academic


@router.put(
    "/academic",
    response_model=AcademicProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or update student's academic profile",
    responses={
        200: {"description": "Academic profile created or updated successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in academic payload"},
    },
)
async def upsert_academic_profile(
    payload: AcademicProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AcademicProfile:
    """Idempotently create or update the authenticated user's academic profile."""
    stmt = select(AcademicProfile).where(AcademicProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    academic = result.scalar_one_or_none()

    update_data = payload.model_dump(exclude_unset=True)

    if academic is None:
        academic = AcademicProfile(
            user_id=current_user.id,
            **update_data,
        )
        db.add(academic)
    else:
        for field, value in update_data.items():
            setattr(academic, field, value)

    try:
        await db.commit()
        await db.refresh(academic)
    except Exception as exc:
        await db.rollback()
        logger.error(f"Failed to upsert academic profile for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the academic profile",
        )

    return academic


# ==============================================================================
# FINANCIAL PREFERENCES
# ==============================================================================
@router.get(
    "/preferences",
    response_model=FinancialPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated student's financial and study preferences",
    responses={
        200: {"description": "Financial preferences retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Financial preferences have not been created yet"},
    },
)
async def get_financial_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FinancialPreference:
    """Retrieve financial category and study preferences for the authenticated user."""
    stmt = select(FinancialPreference).where(FinancialPreference.user_id == current_user.id)
    result = await db.execute(stmt)
    preferences = result.scalar_one_or_none()

    if preferences is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial preferences not found",
        )

    return preferences


@router.put(
    "/preferences",
    response_model=FinancialPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or update student's financial and study preferences",
    responses={
        200: {"description": "Financial preferences created or updated successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in preference payload"},
    },
)
async def upsert_financial_preferences(
    payload: FinancialPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FinancialPreference:
    """Idempotently create or update the authenticated user's financial preferences."""
    stmt = select(FinancialPreference).where(FinancialPreference.user_id == current_user.id)
    result = await db.execute(stmt)
    preferences = result.scalar_one_or_none()

    update_data = payload.model_dump(exclude_unset=True)

    if preferences is None:
        preferences = FinancialPreference(
            user_id=current_user.id,
            **update_data,
        )
        db.add(preferences)
    else:
        for field, value in update_data.items():
            setattr(preferences, field, value)

    try:
        await db.commit()
        await db.refresh(preferences)
    except Exception as exc:
        await db.rollback()
        logger.error(f"Failed to upsert financial preferences for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving preferences",
        )

    return preferences
