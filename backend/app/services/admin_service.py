import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application
from app.models.discovery import ScholarshipCollectionJob, ScholarshipSource
from app.models.document import StudentDocument
from app.models.notification import Notification
from app.models.profile import AcademicProfile, FinancialPreference, ProviderProfile, StudentProfile
from app.models.scholarship import SavedScholarship, Scholarship, ScholarshipRequirement, ScholarshipReviewStatus
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminCollectionJobListItem,
    AdminCollectionJobListResponse,
    AdminDashboardStatsResponse,
    AdminProviderListItem,
    AdminRequirementCreate,
    AdminRequirementUpdate,
    AdminSchedulerInfo,
    AdminScholarshipCreate,
    AdminScholarshipRejectPayload,
    AdminScholarshipUpdate,
    AdminUserAcademicInfo,
    AdminUserDetailResponse,
    AdminUserFinancialInfo,
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserProfileInfo,
)
from app.schemas.scholarship import (
    ScholarshipListItem,
    ScholarshipListResponse,
    ScholarshipRequirementResponse,
    ScholarshipResponse,
)

logger = logging.getLogger(__name__)


class AdminService:
    """Service layer handling administrative domain operations and metrics aggregation."""

    # ==========================================================================
    # 1. DASHBOARD METRICS
    # ==========================================================================
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> AdminDashboardStatsResponse:
        """Aggregate system-wide statistics using high-performance SQL count queries."""
        today = date.today()

        total_users_res = await db.execute(select(func.count(User.id)))
        total_users = total_users_res.scalar() or 0

        total_students_res = await db.execute(
            select(func.count(User.id)).where(User.role == UserRole.STUDENT)
        )
        total_students = total_students_res.scalar() or 0

        total_providers_res = await db.execute(
            select(func.count(User.id)).where(User.role == UserRole.PROVIDER)
        )
        total_providers = total_providers_res.scalar() or 0

        total_sch_res = await db.execute(select(func.count(Scholarship.id)))
        total_scholarships = total_sch_res.scalar() or 0

        active_sch_res = await db.execute(
            select(func.count(Scholarship.id)).where(Scholarship.deadline >= today)
        )
        active_scholarships = active_sch_res.scalar() or 0

        total_apps_res = await db.execute(select(func.count(Application.id)))
        total_applications = total_apps_res.scalar() or 0

        total_saved_res = await db.execute(select(func.count(SavedScholarship.id)))
        total_saved_scholarships = total_saved_res.scalar() or 0

        total_docs_res = await db.execute(select(func.count(StudentDocument.id)))
        total_documents = total_docs_res.scalar() or 0

        unread_notifs_res = await db.execute(
            select(func.count(Notification.id)).where(Notification.is_read.is_(False))
        )
        unread_notifications = unread_notifs_res.scalar() or 0

        pending_res = await db.execute(
            select(func.count(Scholarship.id)).where(
                Scholarship.review_status == ScholarshipReviewStatus.PENDING_REVIEW.value
            )
        )
        pending_scholarships = pending_res.scalar() or 0

        verified_res = await db.execute(
            select(func.count(Scholarship.id)).where(
                Scholarship.review_status == ScholarshipReviewStatus.VERIFIED.value
            )
        )
        verified_scholarships = verified_res.scalar() or 0

        rejected_res = await db.execute(
            select(func.count(Scholarship.id)).where(
                Scholarship.review_status == ScholarshipReviewStatus.REJECTED.value
            )
        )
        rejected_scholarships = rejected_res.scalar() or 0

        legacy_res = await db.execute(
            select(func.count(Scholarship.id)).where(
                Scholarship.review_status == ScholarshipReviewStatus.LEGACY.value
            )
        )
        legacy_scholarships = legacy_res.scalar() or 0

        jobs_res = await db.execute(select(func.count(ScholarshipCollectionJob.id)))
        total_collection_jobs = jobs_res.scalar() or 0

        # Query latest collection job for scheduler observability
        latest_job_res = await db.execute(
            select(ScholarshipCollectionJob)
            .options(selectinload(ScholarshipCollectionJob.source))
            .order_by(ScholarshipCollectionJob.started_at.desc())
            .limit(1)
        )
        latest_job = latest_job_res.scalar_one_or_none()

        from app.services.discovery.scheduler import get_discovery_scheduler
        scheduler = get_discovery_scheduler()
        sched_status = scheduler.get_status()

        scheduler_info = AdminSchedulerInfo(
            enabled=sched_status["enabled"],
            is_running=sched_status["is_running"],
            is_executing=sched_status["is_executing"],
            interval_hours=sched_status["interval_hours"],
            initial_delay_seconds=sched_status["initial_delay_seconds"],
            timeout_seconds=sched_status["timeout_seconds"],
            max_retries=sched_status["max_retries"],
            configured_sources=sched_status["configured_sources"],
            last_run_at=latest_job.started_at if latest_job else sched_status["last_run_at"],
            next_run_at=sched_status["next_run_at"],
            last_run_status=latest_job.status if latest_job else sched_status["last_run_status"],
            last_run_source=sched_status["last_run_source"] or (latest_job.source_name if latest_job else None),
            last_run_records_discovered=latest_job.records_discovered if latest_job else None,
            last_run_records_created=latest_job.records_created if latest_job else None,
            last_run_records_updated=latest_job.records_updated if latest_job else None,
            last_run_records_duplicates_skipped=latest_job.records_duplicates_skipped if latest_job else None,
            last_run_records_rejected=latest_job.records_rejected if latest_job else None,
            last_run_error_summary=latest_job.error_summary if latest_job else None,
        )

        return AdminDashboardStatsResponse(
            total_users=total_users,
            total_students=total_students,
            total_providers=total_providers,
            total_scholarships=total_scholarships,
            active_scholarships=active_scholarships,
            total_applications=total_applications,
            total_saved_scholarships=total_saved_scholarships,
            total_documents=total_documents,
            unread_notifications=unread_notifications,
            pending_scholarships=pending_scholarships,
            verified_scholarships=verified_scholarships,
            rejected_scholarships=rejected_scholarships,
            legacy_scholarships=legacy_scholarships,
            total_collection_jobs=total_collection_jobs,
            scheduler_info=scheduler_info,
        )

    # ==========================================================================
    # 2. USER MANAGEMENT
    # ==========================================================================
    @staticmethod
    async def list_users(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> AdminUserListResponse:
        """List user directory with pagination and optional search filter."""
        stmt = select(User).outerjoin(User.profile)

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    User.email.ilike(term),
                    StudentProfile.first_name.ilike(term),
                    StudentProfile.last_name.ilike(term),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        stmt = (
            stmt.options(selectinload(User.profile))
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        res = await db.execute(stmt)
        users = res.scalars().all()

        items = []
        for u in users:
            full_name = None
            if u.profile:
                full_name = f"{u.profile.first_name} {u.profile.last_name}".strip()
            items.append(
                AdminUserListItem(
                    id=u.id,
                    email=u.email,
                    role=u.role,
                    full_name=full_name,
                    created_at=u.created_at,
                    updated_at=u.updated_at,
                )
            )

        return AdminUserListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> AdminUserDetailResponse:
        """Retrieve detailed user inspection data with safe profile details."""
        stmt = (
            select(User)
            .options(
                selectinload(User.profile),
                selectinload(User.academic_profile),
                selectinload(User.financial_preference),
            )
            .where(User.id == user_id)
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Count related domain entities
        apps_res = await db.execute(
            select(func.count(Application.id)).where(Application.user_id == user_id)
        )
        apps_count = apps_res.scalar() or 0

        docs_res = await db.execute(
            select(func.count(StudentDocument.id)).where(StudentDocument.user_id == user_id)
        )
        docs_count = docs_res.scalar() or 0

        saved_res = await db.execute(
            select(func.count(SavedScholarship.id)).where(SavedScholarship.user_id == user_id)
        )
        saved_count = saved_res.scalar() or 0

        profile_info = (
            AdminUserProfileInfo.model_validate(user.profile) if user.profile else None
        )
        academic_info = (
            AdminUserAcademicInfo.model_validate(user.academic_profile)
            if user.academic_profile
            else None
        )
        financial_info = None
        if user.financial_preference:
            financial_info = AdminUserFinancialInfo(
                reservation_category=user.financial_preference.reservation_category,
                special_categories=user.financial_preference.special_categories,
                family_income=user.financial_preference.family_income,
                study_preference=(
                    user.financial_preference.study_preference.value
                    if user.financial_preference.study_preference
                    else None
                ),
            )

        return AdminUserDetailResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            updated_at=user.updated_at,
            profile=profile_info,
            academic=academic_info,
            financial=financial_info,
            applications_count=apps_count,
            documents_count=docs_count,
            saved_scholarships_count=saved_count,
        )

    @staticmethod
    async def update_user_role(
        db: AsyncSession, user_id: UUID, new_role: UserRole
    ) -> AdminUserDetailResponse:
        """Update an existing user's role and ensure role-specific profiles exist."""
        stmt = (
            select(User)
            .options(
                selectinload(User.profile),
                selectinload(User.academic_profile),
                selectinload(User.financial_preference),
                selectinload(User.provider_profile),
            )
            .where(User.id == user_id)
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user.role = new_role
        if new_role == UserRole.PROVIDER and not user.provider_profile:
            prof = ProviderProfile(
                user_id=user.id,
                organization_name=f"Provider ({user.email.split('@')[0]})",
                is_approved=True,
            )
            db.add(prof)

        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        return await AdminService.get_user_by_id(db, user_id)

    @staticmethod
    async def list_providers(
        db: AsyncSession, page: int = 1, page_size: int = 20
    ) -> list[AdminProviderListItem]:
        """List all registered scholarship providers."""
        stmt = (
            select(ProviderProfile, User.email)
            .join(User, ProviderProfile.user_id == User.id)
            .order_by(ProviderProfile.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db.execute(stmt)
        rows = res.all()

        items = []
        for prof, email in rows:
            item = AdminProviderListItem.model_validate(prof)
            item.email = email
            items.append(item)
        return items

    @staticmethod
    async def approve_provider(
        db: AsyncSession, provider_id: UUID, is_approved: bool
    ) -> AdminProviderListItem:
        """Approve or reject a scholarship provider profile."""
        stmt = select(ProviderProfile, User.email).join(
            User, ProviderProfile.user_id == User.id
        ).where(ProviderProfile.id == provider_id)
        res = await db.execute(stmt)
        row = res.first()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider profile not found",
            )

        prof, email = row
        prof.is_approved = is_approved
        prof.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(prof)

        item = AdminProviderListItem.model_validate(prof)
        item.email = email
        return item

    # ==========================================================================
    # 3. SCHOLARSHIP MANAGEMENT
    # ==========================================================================
    @staticmethod
    async def create_scholarship(
        db: AsyncSession, payload: AdminScholarshipCreate
    ) -> Scholarship:
        """Create a new scholarship catalog entry."""
        scholarship = Scholarship(
            name=payload.name.strip(),
            provider=payload.provider.strip(),
            description=payload.description.strip(),
            amount=payload.amount,
            currency=payload.currency.strip() if payload.currency else "INR",
            deadline=payload.deadline,
            eligibility=payload.eligibility.strip() if payload.eligibility else None,
            benefits=payload.benefits,
            selection_process=payload.selection_process,
            official_website=payload.official_website.strip() if payload.official_website else None,
            source_url=payload.source_url.strip() if payload.source_url else None,
            is_verified=payload.is_verified if payload.is_verified is not None else True,
            review_status=payload.review_status if payload.review_status else "VERIFIED",
        )
        db.add(scholarship)
        await db.commit()
        await db.refresh(scholarship)
        return scholarship

    @staticmethod
    async def list_scholarships(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        review_status: Optional[str] = None,
        source_id: Optional[UUID] = None,
    ) -> ScholarshipListResponse:
        """List scholarships for administration with search and status/source filters."""
        stmt = select(Scholarship)

        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Scholarship.name.ilike(term),
                    Scholarship.provider.ilike(term),
                )
            )

        if review_status and review_status.strip():
            stmt = stmt.where(Scholarship.review_status == review_status.strip().upper())

        if source_id:
            stmt = stmt.where(Scholarship.source_id == source_id)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        stmt = (
            stmt.options(selectinload(Scholarship.source))
            .order_by(Scholarship.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        res = await db.execute(stmt)
        scholarships = res.scalars().all()

        items = [ScholarshipListItem.model_validate(s) for s in scholarships]
        return ScholarshipListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get_scholarship_by_id(
        db: AsyncSession, scholarship_id: UUID
    ) -> Scholarship:
        """Retrieve scholarship detail by primary key with source eagerly loaded."""
        stmt = (
            select(Scholarship)
            .options(
                selectinload(Scholarship.source),
            )
            .where(Scholarship.id == scholarship_id)
        )
        res = await db.execute(stmt)
        scholarship = res.scalar_one_or_none()

        if scholarship is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scholarship not found",
            )
        return scholarship

    @staticmethod
    async def approve_scholarship(
        db: AsyncSession, scholarship_id: UUID
    ) -> Scholarship:
        """
        Approve a scholarship for publication.
        Enforces moderation rules:
        - review_status becomes 'VERIFIED'
        - is_verified becomes True
        - rejection_reason cleared
        - last_verified_at set to current UTC time
        - source provenance preserved
        - safe/idempotent if already approved.
        """
        scholarship = await AdminService.get_scholarship_by_id(db, scholarship_id)

        now = datetime.now(timezone.utc)
        scholarship.review_status = ScholarshipReviewStatus.VERIFIED.value
        scholarship.is_verified = True
        scholarship.rejection_reason = None
        scholarship.last_verified_at = now
        scholarship.updated_at = now

        await db.commit()
        return await AdminService.get_scholarship_by_id(db, scholarship_id)

    @staticmethod
    async def reject_scholarship(
        db: AsyncSession, scholarship_id: UUID, rejection_reason: str
    ) -> Scholarship:
        """
        Reject a scholarship with required rejection reason.
        Enforces moderation rules:
        - review_status becomes 'REJECTED'
        - is_verified becomes False
        - rejection_reason recorded
        - remains hidden from student/public discovery
        - source provenance preserved
        - safe if already rejected (updates reason).
        """
        if not rejection_reason or not rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Rejection reason is required and cannot be empty.",
            )

        scholarship = await AdminService.get_scholarship_by_id(db, scholarship_id)

        now = datetime.now(timezone.utc)
        scholarship.review_status = ScholarshipReviewStatus.REJECTED.value
        scholarship.is_verified = False
        scholarship.rejection_reason = rejection_reason.strip()
        scholarship.updated_at = now

        await db.commit()
        return await AdminService.get_scholarship_by_id(db, scholarship_id)

    @staticmethod
    async def update_scholarship(
        db: AsyncSession, scholarship_id: UUID, payload: AdminScholarshipUpdate
    ) -> Scholarship:
        """Update existing scholarship attributes before or after approval."""
        scholarship = await AdminService.get_scholarship_by_id(db, scholarship_id)

        if payload.amount is not None and payload.amount < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Amount cannot be negative.",
            )
        if payload.name is not None and not payload.name.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Scholarship name cannot be empty.",
            )
        if payload.provider is not None and not payload.provider.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Provider cannot be empty.",
            )

        update_data = payload.model_dump(exclude_unset=True)

        protected_provenance = {"source_id", "external_id", "fingerprint", "source_url"}
        for field, value in update_data.items():
            if field in protected_provenance and value is None:
                continue
            if isinstance(value, str):
                value = value.strip()
            setattr(scholarship, field, value)

        if "review_status" in update_data:
            st = str(scholarship.review_status).upper()
            if st == ScholarshipReviewStatus.VERIFIED.value:
                scholarship.is_verified = True
                scholarship.rejection_reason = None
                scholarship.last_verified_at = datetime.now(timezone.utc)
            elif st == ScholarshipReviewStatus.REJECTED.value:
                scholarship.is_verified = False
                if not scholarship.rejection_reason:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Rejection reason is required when status is REJECTED.",
                    )
            elif st == ScholarshipReviewStatus.PENDING_REVIEW.value:
                scholarship.is_verified = False

        scholarship.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return await AdminService.get_scholarship_by_id(db, scholarship_id)

    @staticmethod
    async def delete_scholarship(
        db: AsyncSession, scholarship_id: UUID
    ) -> None:
        """Delete a scholarship and all associated cascade records."""
        scholarship = await AdminService.get_scholarship_by_id(db, scholarship_id)
        await db.delete(scholarship)
        await db.commit()

    # ==========================================================================
    # 3.5. COLLECTION JOBS AUDIT
    # ==========================================================================
    @staticmethod
    async def list_collection_jobs(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        source_id: Optional[UUID] = None,
        source_slug: Optional[str] = None,
        job_status: Optional[str] = None,
    ) -> AdminCollectionJobListResponse:
        """List discovery collection executions with metrics and audit details."""
        stmt = select(ScholarshipCollectionJob).outerjoin(
            ScholarshipCollectionJob.source
        )

        if source_id:
            stmt = stmt.where(ScholarshipCollectionJob.source_id == source_id)
        if source_slug and source_slug.strip():
            stmt = stmt.where(ScholarshipSource.slug == source_slug.strip().lower())
        if job_status and job_status.strip():
            stmt = stmt.where(ScholarshipCollectionJob.status == job_status.strip().upper())

        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        stmt = (
            stmt.options(selectinload(ScholarshipCollectionJob.source))
            .order_by(ScholarshipCollectionJob.started_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        res = await db.execute(stmt)
        jobs = res.scalars().all()

        items = [AdminCollectionJobListItem.model_validate(j) for j in jobs]
        return AdminCollectionJobListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get_collection_job_by_id(
        db: AsyncSession, job_id: UUID
    ) -> ScholarshipCollectionJob:
        """Retrieve collection job detail by primary key."""
        stmt = (
            select(ScholarshipCollectionJob)
            .options(selectinload(ScholarshipCollectionJob.source))
            .where(ScholarshipCollectionJob.id == job_id)
        )
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()

        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection job not found",
            )
        return job

    # ==========================================================================
    # 4. SCHOLARSHIP REQUIREMENTS MANAGEMENT
    # ==========================================================================
    @staticmethod
    async def create_requirement(
        db: AsyncSession, scholarship_id: UUID, payload: AdminRequirementCreate
    ) -> ScholarshipRequirement:
        """Create a new requirement associated with a scholarship."""
        # Ensure parent scholarship exists
        await AdminService.get_scholarship_by_id(db, scholarship_id)

        req = ScholarshipRequirement(
            scholarship_id=scholarship_id,
            name=payload.name.strip(),
            document_type=payload.document_type.strip(),
            required=payload.required,
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def get_requirements_by_scholarship(
        db: AsyncSession, scholarship_id: UUID
    ) -> list[ScholarshipRequirement]:
        """Fetch all requirements configured for a specific scholarship."""
        # Ensure parent scholarship exists
        await AdminService.get_scholarship_by_id(db, scholarship_id)

        stmt = (
            select(ScholarshipRequirement)
            .where(ScholarshipRequirement.scholarship_id == scholarship_id)
            .order_by(ScholarshipRequirement.name.asc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def update_requirement(
        db: AsyncSession, requirement_id: UUID, payload: AdminRequirementUpdate
    ) -> ScholarshipRequirement:
        """Modify an existing scholarship requirement."""
        stmt = select(ScholarshipRequirement).where(
            ScholarshipRequirement.id == requirement_id
        )
        res = await db.execute(stmt)
        req = res.scalar_one_or_none()

        if req is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scholarship requirement not found",
            )

        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(req, field, value)

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def delete_requirement(
        db: AsyncSession, requirement_id: UUID
    ) -> None:
        """Delete a scholarship requirement."""
        stmt = select(ScholarshipRequirement).where(
            ScholarshipRequirement.id == requirement_id
        )
        res = await db.execute(stmt)
        req = res.scalar_one_or_none()

        if req is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scholarship requirement not found",
            )

        await db.delete(req)
        await db.commit()
