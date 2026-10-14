import logging
import uuid
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.profile import ProviderProfile
from app.models.scholarship import Scholarship, ScholarshipReviewStatus
from app.models.user import User, UserRole
from app.schemas.auth import ProviderProfileInfo
from app.schemas.provider import (
    ProviderProfileUpdate,
    ProviderScholarshipCreate,
    ProviderScholarshipListItem,
    ProviderScholarshipListResponse,
    ProviderScholarshipUpdate,
)

logger = logging.getLogger(__name__)


class ProviderService:
    """Service encapsulating scholarship provider operations, submissions, and ownership enforcement."""

    @staticmethod
    async def get_or_create_profile(db: AsyncSession, user: User) -> ProviderProfile:
        """Fetch or initialize provider profile for authenticated provider."""
        stmt = select(ProviderProfile).where(ProviderProfile.user_id == user.id)
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = ProviderProfile(
                user_id=user.id,
                organization_name=f"Provider ({user.email.split('@')[0]})",
                is_approved=True,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

        return profile

    @staticmethod
    async def update_profile(
        db: AsyncSession, user: User, payload: ProviderProfileUpdate
    ) -> ProviderProfileInfo:
        """Update provider organization details."""
        profile = await ProviderService.get_or_create_profile(db, user)

        if payload.organization_name is not None:
            profile.organization_name = payload.organization_name
        if payload.contact_person is not None:
            profile.contact_person = payload.contact_person
        if payload.website is not None:
            profile.website = payload.website
        if payload.phone is not None:
            profile.phone = payload.phone
        if payload.description is not None:
            profile.description = payload.description

        await db.commit()
        await db.refresh(profile)
        return ProviderProfileInfo.model_validate(profile)

    @staticmethod
    async def apply_for_provider(
        db: AsyncSession,
        user: User,
        organization_name: str,
        contact_person: Optional[str] = None,
        website: Optional[str] = None,
        phone: Optional[str] = None,
        description: Optional[str] = None,
    ) -> ProviderProfile:
        """Upgrade an authenticated user to PROVIDER role and create provider profile."""
        user.role = UserRole.PROVIDER

        stmt = select(ProviderProfile).where(ProviderProfile.user_id == user.id)
        res = await db.execute(stmt)
        profile = res.scalar_one_or_none()

        if profile is None:
            profile = ProviderProfile(
                user_id=user.id,
                organization_name=organization_name,
                contact_person=contact_person,
                website=website,
                phone=phone,
                description=description,
                is_approved=True,
            )
            db.add(profile)
        else:
            profile.organization_name = organization_name
            profile.contact_person = contact_person
            profile.website = website
            profile.phone = phone
            profile.description = description

        await db.commit()
        await db.refresh(profile)
        await db.refresh(user)
        return profile

    @staticmethod
    async def submit_scholarship(
        db: AsyncSession, provider_user: User, payload: ProviderScholarshipCreate
    ) -> Scholarship:
        """Submit a new scholarship on behalf of an organization.

        SAFEGUARD: All provider-submitted records strictly enter PENDING_REVIEW and are unverified.
        Providers cannot approve or publish their own submissions.
        """
        profile = await ProviderService.get_or_create_profile(db, provider_user)
        provider_name = profile.organization_name or "Verified Provider"

        scholarship = Scholarship(
            name=payload.name,
            provider=provider_name,
            description=payload.description,
            amount=payload.amount,
            currency=payload.currency,
            deadline=payload.deadline,
            eligibility=payload.eligibility,
            benefits=payload.benefits,
            selection_process=payload.selection_process,
            official_website=payload.official_website,
            submitted_by_id=provider_user.id,
            is_verified=False,  # CRITICAL: strictly unverified until Admin review
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,  # CRITICAL: strictly PENDING_REVIEW
        )

        db.add(scholarship)
        await db.commit()
        await db.refresh(scholarship)
        logger.info(
            f"Provider {provider_user.id} submitted new scholarship {scholarship.id} ('{scholarship.name}') for editorial review"
        )
        return scholarship

    @staticmethod
    async def list_submitted_scholarships(
        db: AsyncSession, provider_user: User, page: int = 1, page_size: int = 20
    ) -> ProviderScholarshipListResponse:
        """Retrieve paginated list of scholarships submitted by the authenticated provider."""
        base_stmt = select(Scholarship).where(Scholarship.submitted_by_id == provider_user.id)

        # Count total
        count_stmt = select(func.count(Scholarship.id)).where(
            Scholarship.submitted_by_id == provider_user.id
        )
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Paginate
        offset = (page - 1) * page_size
        items_stmt = (
            base_stmt.order_by(Scholarship.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        items_res = await db.execute(items_stmt)
        scholarships = items_res.scalars().all()

        items = [ProviderScholarshipListItem.model_validate(s) for s in scholarships]
        return ProviderScholarshipListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get_submitted_scholarship(
        db: AsyncSession, provider_user: User, scholarship_id: UUID
    ) -> Scholarship:
        """Retrieve a specific scholarship submitted by this provider, with strict ownership check."""
        stmt = select(Scholarship).where(Scholarship.id == scholarship_id)
        result = await db.execute(stmt)
        scholarship = result.scalar_one_or_none()

        if scholarship is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scholarship submission not found",
            )

        # Ownership protection: Providers can ONLY access their own submissions
        if scholarship.submitted_by_id != provider_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only view your own scholarship submissions",
            )

        return scholarship

    @staticmethod
    async def update_submitted_scholarship(
        db: AsyncSession,
        provider_user: User,
        scholarship_id: UUID,
        payload: ProviderScholarshipUpdate,
    ) -> Scholarship:
        """Update a submitted scholarship with strict ownership check and review safeguards.

        SAFEGUARD: Providers can NEVER approve their own submissions or set is_verified=True.
        Any edits to rejected submissions reset status to PENDING_REVIEW for re-moderation.
        """
        scholarship = await ProviderService.get_submitted_scholarship(
            db, provider_user, scholarship_id
        )

        if payload.name is not None:
            scholarship.name = payload.name
        if payload.description is not None:
            scholarship.description = payload.description
        if payload.amount is not None:
            scholarship.amount = payload.amount
        if payload.currency is not None:
            scholarship.currency = payload.currency
        if payload.deadline is not None:
            scholarship.deadline = payload.deadline
        if payload.eligibility is not None:
            scholarship.eligibility = payload.eligibility
        if payload.benefits is not None:
            scholarship.benefits = payload.benefits
        if payload.selection_process is not None:
            scholarship.selection_process = payload.selection_process
        if payload.official_website is not None:
            scholarship.official_website = payload.official_website

        # If scholarship was previously rejected, re-queue for review upon provider edit
        if scholarship.review_status == ScholarshipReviewStatus.REJECTED.value:
            scholarship.review_status = ScholarshipReviewStatus.PENDING_REVIEW.value
            scholarship.rejection_reason = None
            scholarship.is_verified = False

        # SAFEGUARD: Strictly maintain unverified status unless approved by admin
        if scholarship.review_status != ScholarshipReviewStatus.VERIFIED.value:
            scholarship.is_verified = False

        await db.commit()
        await db.refresh(scholarship)
        logger.info(
            f"Provider {provider_user.id} updated scholarship submission {scholarship.id} ('{scholarship.name}')"
        )
        return scholarship

    @staticmethod
    async def delete_submitted_scholarship(
        db: AsyncSession, provider_user: User, scholarship_id: UUID
    ) -> None:
        """Delete a scholarship submission with strict ownership check."""
        scholarship = await ProviderService.get_submitted_scholarship(
            db, provider_user, scholarship_id
        )
        await db.delete(scholarship)
        await db.commit()
        logger.info(
            f"Provider {provider_user.id} deleted scholarship submission {scholarship_id}"
        )
