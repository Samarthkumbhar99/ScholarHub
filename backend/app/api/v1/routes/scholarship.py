from datetime import date
from decimal import Decimal
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.profile import AcademicProfile, FinancialPreference, StudentProfile
from app.models.scholarship import SavedScholarship, Scholarship, ScholarshipRequirement
from app.models.user import User
from app.schemas.matching import (
    ScholarshipMatchResponse,
    ScholarshipRecommendationResponse,
)
from app.schemas.scholarship import (
    SavedStatusResponse,
    ScholarshipCompareResponse,
    ScholarshipListItem,
    ScholarshipListResponse,
    ScholarshipRequirementResponse,
    ScholarshipResponse,
    ScholarshipSortOption,
)
from app.services.ai.matching_service import ScholarshipMatchingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scholarships", tags=["Scholarship Discovery"])

SORT_FIELD_MAP = {
    ScholarshipSortOption.DEADLINE_ASC: Scholarship.deadline.asc(),
    ScholarshipSortOption.DEADLINE_DESC: Scholarship.deadline.desc(),
    ScholarshipSortOption.AMOUNT_ASC: Scholarship.amount.asc(),
    ScholarshipSortOption.AMOUNT_DESC: Scholarship.amount.desc(),
    ScholarshipSortOption.NAME_ASC: Scholarship.name.asc(),
    ScholarshipSortOption.NAME_DESC: Scholarship.name.desc(),
}


# ==============================================================================
# 1. LIST & FILTER SCHOLARSHIPS
# ==============================================================================
@router.get(
    "",
    response_model=ScholarshipListResponse,
    status_code=status.HTTP_200_OK,
    summary="List and filter scholarships",
    responses={
        200: {"description": "Paginated scholarships list retrieved successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in pagination or query filters"},
    },
)
async def list_scholarships(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page (max 100)"),
    q: Optional[str] = Query(
        default=None,
        max_length=100,
        description="Case-insensitive text search across title, provider, description, and eligibility",
    ),
    provider: Optional[str] = Query(
        default=None,
        max_length=100,
        description="Filter by provider name (case-insensitive substring)",
    ),
    min_amount: Optional[Decimal] = Query(
        default=None,
        ge=0,
        description="Minimum award amount filter",
    ),
    max_amount: Optional[Decimal] = Query(
        default=None,
        ge=0,
        description="Maximum award amount filter",
    ),
    deadline_from: Optional[date] = Query(
        default=None,
        description="Earliest application deadline (inclusive)",
    ),
    deadline_to: Optional[date] = Query(
        default=None,
        description="Latest application deadline (inclusive)",
    ),
    sort_by: ScholarshipSortOption = Query(
        default=ScholarshipSortOption.DEADLINE_ASC,
        description="Sort ordering option",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScholarshipListResponse:
    """Retrieve paginated and filtered scholarships with deterministic sorting."""
    stmt = select(Scholarship)

    # 1. Text Search across relevant textual columns
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Scholarship.name.ilike(search_pattern),
                Scholarship.provider.ilike(search_pattern),
                Scholarship.description.ilike(search_pattern),
                Scholarship.eligibility.ilike(search_pattern),
            )
        )

    # 2. Provider Filter
    if provider and provider.strip():
        stmt = stmt.where(Scholarship.provider.ilike(f"%{provider.strip()}%"))

    # 3. Amount Range Filters
    if min_amount is not None:
        stmt = stmt.where(Scholarship.amount >= min_amount)
    if max_amount is not None:
        stmt = stmt.where(Scholarship.amount <= max_amount)

    # 4. Deadline Range Filters
    if deadline_from is not None:
        stmt = stmt.where(Scholarship.deadline >= deadline_from)
    if deadline_to is not None:
        stmt = stmt.where(Scholarship.deadline <= deadline_to)

    # 5. Efficient Total Count using subquery
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    # 6. Sorting
    order_clause = SORT_FIELD_MAP.get(sort_by, Scholarship.deadline.asc())
    stmt = stmt.order_by(order_clause, Scholarship.id.asc())

    # 7. Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    scholarships = result.scalars().all()

    items = [ScholarshipListItem.model_validate(s) for s in scholarships]

    return ScholarshipListResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==============================================================================
# 2. SAVED SCHOLARSHIPS LIST (STATIC ROUTE)
# ==============================================================================
@router.get(
    "/saved",
    response_model=ScholarshipListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get saved / bookmarked scholarships for authenticated user",
    responses={
        200: {"description": "List of user's saved scholarships retrieved successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in pagination"},
    },
)
async def get_saved_scholarships(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page (max 100)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScholarshipListResponse:
    """Retrieve scholarships bookmarked by the currently authenticated student."""
    stmt = (
        select(Scholarship)
        .join(SavedScholarship, SavedScholarship.scholarship_id == Scholarship.id)
        .where(SavedScholarship.user_id == current_user.id)
    )

    # Count total saved items
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    # Order newest saved first, with scholarship id as deterministic tie-breaker
    stmt = stmt.order_by(SavedScholarship.created_at.desc(), Scholarship.id.asc())
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    res = await db.execute(stmt)
    scholarships = res.scalars().all()

    items = [ScholarshipListItem.model_validate(s) for s in scholarships]

    return ScholarshipListResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==============================================================================
# 3. COMPARE SCHOLARSHIPS (STATIC ROUTE)
# ==============================================================================
@router.get(
    "/compare",
    response_model=ScholarshipCompareResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare 2 to 3 scholarships side-by-side",
    responses={
        200: {"description": "Side-by-side scholarship details retrieved successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Invalid IDs or comparison limit exceeded (max 3)"},
    },
)
async def compare_scholarships(
    ids: str = Query(
        ...,
        description="Comma-separated scholarship UUIDs to compare (e.g. '?ids=uuid1,uuid2' or '?ids=uuid1,uuid2,uuid3')",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScholarshipCompareResponse:
    """Retrieve full details of up to 3 requested scholarships for side-by-side comparison."""
    raw_id_list = [i.strip() for i in ids.split(",") if i.strip()]

    if not raw_id_list:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one scholarship ID is required for comparison",
        )

    parsed_uuids: list[UUID] = []
    for raw_id in raw_id_list:
        try:
            parsed_uuids.append(UUID(raw_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid UUID format in comparison IDs: '{raw_id}'",
            )

    # Deduplicate while preserving order
    unique_uuids: list[UUID] = []
    seen = set()
    for uid in parsed_uuids:
        if uid not in seen:
            seen.add(uid)
            unique_uuids.append(uid)

    # Enforce maximum 3 scholarships comparison limit as defined by frontend UX
    if len(unique_uuids) > 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="You can compare up to 3 scholarships at a time",
        )

    stmt = select(Scholarship).where(Scholarship.id.in_(unique_uuids))
    res = await db.execute(stmt)
    scholarships = res.scalars().all()

    # Map retrieved records to preserve the requested ordering
    sch_map = {s.id: s for s in scholarships}
    ordered_items = [
        ScholarshipResponse.model_validate(sch_map[uid])
        for uid in unique_uuids
        if uid in sch_map
    ]

    return ScholarshipCompareResponse(
        items=ordered_items,
        count=len(ordered_items),
    )


# ==============================================================================
# 4. SCHOLARSHIP RECOMMENDATIONS (STATIC ROUTES)
# ==============================================================================
@router.get(
    "/recommendations",
    response_model=ScholarshipRecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get personalized scholarship recommendations for authenticated student",
    responses={
        200: {"description": "Ranked scholarship recommendations retrieved successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error in pagination or query parameters"},
    },
)
@router.get(
    "/recommended",
    response_model=ScholarshipRecommendationResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def get_scholarship_recommendations(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=10, ge=1, le=50, description="Items per page (max 50)"),
    min_score: Optional[int] = Query(default=None, ge=0, le=100, description="Minimum match score threshold (0-100)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScholarshipRecommendationResponse:
    """Compute and return personalized scholarship recommendations ranked by match score."""
    # 1. Load authenticated student's profile sections
    prof_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    acad_stmt = select(AcademicProfile).where(AcademicProfile.user_id == current_user.id)
    fin_stmt = select(FinancialPreference).where(FinancialPreference.user_id == current_user.id)

    prof_res = await db.execute(prof_stmt)
    acad_res = await db.execute(acad_stmt)
    fin_res = await db.execute(fin_stmt)

    personal = prof_res.scalar_one_or_none()
    academic = acad_res.scalar_one_or_none()
    preferences = fin_res.scalar_one_or_none()

    # 2. Query available scholarships (bounded limit for efficient evaluation)
    sch_stmt = select(Scholarship).order_by(Scholarship.deadline.asc()).limit(100)
    sch_res = await db.execute(sch_stmt)
    scholarships = list(sch_res.scalars().all())

    if not scholarships:
        return ScholarshipRecommendationResponse.create(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
        )

    # 3. Evaluate matching service
    matching_service = ScholarshipMatchingService()
    recommendations = await matching_service.recommend_scholarships(
        scholarships=scholarships,
        personal_profile=personal,
        academic_profile=academic,
        financial_preference=preferences,
    )

    # 4. Optional minimum score filter
    if min_score is not None:
        recommendations = [r for r in recommendations if r.match.match_score >= min_score]

    total = len(recommendations)
    offset = (page - 1) * page_size
    paged_items = recommendations[offset : offset + page_size]

    return ScholarshipRecommendationResponse.create(
        items=paged_items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==============================================================================
# 5. SCHOLARSHIP DETAILS (PARAMETERIZED ROUTE)
# ==============================================================================
@router.get(
    "/{scholarship_id}",
    response_model=ScholarshipResponse,
    status_code=status.HTTP_200_OK,
    summary="Get scholarship details by ID",
    responses={
        200: {"description": "Scholarship details retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def get_scholarship_details(
    scholarship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScholarshipResponse:
    """Retrieve full details of a specific scholarship."""
    stmt = select(Scholarship).where(Scholarship.id == scholarship_id)
    result = await db.execute(stmt)
    scholarship = result.scalar_one_or_none()

    if scholarship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    return ScholarshipResponse.model_validate(scholarship)


# ==============================================================================
# 5. SCHOLARSHIP REQUIREMENTS
# ==============================================================================
@router.get(
    "/{scholarship_id}/requirements",
    response_model=list[ScholarshipRequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="Get scholarship requirements",
    responses={
        200: {"description": "List of scholarship requirements retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def get_scholarship_requirements(
    scholarship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ScholarshipRequirementResponse]:
    """Retrieve all document and eligibility requirements for a given scholarship."""
    sch_stmt = select(Scholarship.id).where(Scholarship.id == scholarship_id)
    sch_result = await db.execute(sch_stmt)
    if sch_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    req_stmt = (
        select(ScholarshipRequirement)
        .where(ScholarshipRequirement.scholarship_id == scholarship_id)
        .order_by(ScholarshipRequirement.required.desc(), ScholarshipRequirement.name.asc())
    )
    req_result = await db.execute(req_stmt)
    requirements = req_result.scalars().all()

    return [ScholarshipRequirementResponse.model_validate(r) for r in requirements]


# ==============================================================================
# 6. SCHOLARSHIP AI MATCHING
# ==============================================================================
@router.get(
    "/{scholarship_id}/match",
    response_model=ScholarshipMatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI-powered match score and explanation for a specific scholarship",
    responses={
        200: {"description": "Match score and detailed criteria assessment generated successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def match_scholarship(
    scholarship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScholarshipMatchResponse:
    """Evaluate compatibility between the authenticated student's profile and a specific scholarship."""
    # 1. Fetch scholarship
    sch_stmt = select(Scholarship).where(Scholarship.id == scholarship_id)
    sch_res = await db.execute(sch_stmt)
    scholarship = sch_res.scalar_one_or_none()

    if scholarship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    # 2. Fetch scholarship requirements
    req_stmt = select(ScholarshipRequirement).where(ScholarshipRequirement.scholarship_id == scholarship_id)
    req_res = await db.execute(req_stmt)
    requirements = list(req_res.scalars().all())

    # 3. Fetch authenticated student's profile sections
    prof_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    acad_stmt = select(AcademicProfile).where(AcademicProfile.user_id == current_user.id)
    fin_stmt = select(FinancialPreference).where(FinancialPreference.user_id == current_user.id)

    prof_res = await db.execute(prof_stmt)
    acad_res = await db.execute(acad_stmt)
    fin_res = await db.execute(fin_stmt)

    personal = prof_res.scalar_one_or_none()
    academic = acad_res.scalar_one_or_none()
    preferences = fin_res.scalar_one_or_none()

    # 4. Invoke AI matching service
    matching_service = ScholarshipMatchingService()
    match_result = await matching_service.evaluate_single_match(
        scholarship=scholarship,
        requirements=requirements,
        personal_profile=personal,
        academic_profile=academic,
        financial_preference=preferences,
    )

    return match_result


# ==============================================================================
# 7. SAVE / BOOKMARK SCHOLARSHIP
# ==============================================================================
@router.post(
    "/{scholarship_id}/save",
    response_model=SavedStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Save / bookmark a scholarship for the authenticated user",
    responses={
        200: {"description": "Scholarship saved successfully or already saved"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def save_scholarship(
    scholarship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedStatusResponse:
    """Bookmark a scholarship for the current user (idempotent)."""
    # 1. Verify scholarship exists
    sch_stmt = select(Scholarship.id).where(Scholarship.id == scholarship_id)
    sch_result = await db.execute(sch_stmt)
    if sch_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    # 2. Check if already saved by this user
    saved_stmt = select(SavedScholarship).where(
        SavedScholarship.user_id == current_user.id,
        SavedScholarship.scholarship_id == scholarship_id,
    )
    saved_res = await db.execute(saved_stmt)
    existing = saved_res.scalar_one_or_none()

    if existing is not None:
        return SavedStatusResponse(scholarship_id=scholarship_id, saved=True)

    # 3. Create save record
    new_saved = SavedScholarship(
        user_id=current_user.id,
        scholarship_id=scholarship_id,
    )
    db.add(new_saved)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Concurrent duplicate save race condition handled safely

    return SavedStatusResponse(scholarship_id=scholarship_id, saved=True)


# ==============================================================================
# 7. UNSAVE / REMOVE BOOKMARK
# ==============================================================================
@router.delete(
    "/{scholarship_id}/save",
    response_model=SavedStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove a saved / bookmarked scholarship for the authenticated user",
    responses={
        200: {"description": "Scholarship unsaved successfully or was not saved"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def unsave_scholarship(
    scholarship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedStatusResponse:
    """Remove a saved scholarship bookmark for the current user (idempotent)."""
    # 1. Verify scholarship exists
    sch_stmt = select(Scholarship.id).where(Scholarship.id == scholarship_id)
    sch_result = await db.execute(sch_stmt)
    if sch_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    # 2. Find and remove user's save record
    saved_stmt = select(SavedScholarship).where(
        SavedScholarship.user_id == current_user.id,
        SavedScholarship.scholarship_id == scholarship_id,
    )
    saved_res = await db.execute(saved_stmt)
    existing = saved_res.scalar_one_or_none()

    if existing is not None:
        await db.delete(existing)
        await db.commit()

    return SavedStatusResponse(scholarship_id=scholarship_id, saved=False)


# ==============================================================================
# 8. CHECK SAVED STATUS
# ==============================================================================
@router.get(
    "/{scholarship_id}/saved",
    response_model=SavedStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check if a scholarship is saved by the authenticated user",
    responses={
        200: {"description": "Save status retrieved successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Scholarship not found"},
        422: {"description": "Invalid UUID format"},
    },
)
async def check_saved_status(
    scholarship_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedStatusResponse:
    """Return whether the current authenticated student has bookmarked the scholarship."""
    # 1. Verify scholarship exists
    sch_stmt = select(Scholarship.id).where(Scholarship.id == scholarship_id)
    sch_result = await db.execute(sch_stmt)
    if sch_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship not found",
        )

    # 2. Check if saved by current user
    saved_stmt = select(SavedScholarship.id).where(
        SavedScholarship.user_id == current_user.id,
        SavedScholarship.scholarship_id == scholarship_id,
    )
    saved_res = await db.execute(saved_stmt)
    is_saved = saved_res.scalar_one_or_none() is not None

    return SavedStatusResponse(scholarship_id=scholarship_id, saved=is_saved)
