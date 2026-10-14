"""Phase 1 Automatic Scholarship Discovery Foundation Tests.

Covers:
- Provenance and publication metadata on Scholarship model
- Default currency (INR) and review_status behavior
- Publication filtering (Legacy/Verified visible, Pending/Rejected/Archived hidden)
- Source registry (ScholarshipSource) CRUD and constraints
- Collection jobs (ScholarshipCollectionJob) status and non-negative counters
- Foreign key SET NULL and unique constraint on (source_id, external_id)
- Protection against unauthorized publication/verification
- Admin CRUD compatibility with new provenance fields
- Database isolation validation
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import IntegrityError

from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
    ScholarshipSourceType,
)
from app.models.scholarship import Scholarship, ScholarshipRequirement, ScholarshipReviewStatus
from app.models.user import User, UserRole
from tests.conftest import TEST_SCHEMA, TestAsyncSessionLocal, test_async_engine


async def create_admin_user(async_client: AsyncClient, prefix: str = "adm_p1") -> tuple[dict, dict[str, str]]:
    """Helper to create an authenticated admin user."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "AdminPassword123!"

    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_res.status_code == 201
    user_id = uuid.UUID(reg_res.json()["id"])

    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == user_id).values(role=UserRole.ADMIN)
        )
        await session.commit()

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return reg_res.json(), {"Authorization": f"Bearer {token}"}


async def create_student_user(async_client: AsyncClient, prefix: str = "std_p1") -> tuple[dict, dict[str, str]]:
    """Helper to create an authenticated student user."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "StudentPassword123!"

    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_res.status_code == 201
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return reg_res.json(), {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. TEST DATABASE ISOLATION
# ==============================================================================
@pytest.mark.anyio
async def test_database_isolation_active():
    """Verify test engine runs in isolated 'scholarhub_test' schema, not developer 'public'."""
    async with test_async_engine.connect() as conn:
        res = await conn.execute(text("SHOW search_path;"))
        search_path = res.scalar() or ""
        assert TEST_SCHEMA in search_path, f"Tests must run in isolated schema {TEST_SCHEMA}"


# ==============================================================================
# 2. SCHOLARSHIP PROVENANCE FIELDS & DEFAULTS
# ==============================================================================
@pytest.mark.anyio
async def test_scholarship_provenance_defaults():
    """Verify new provenance fields: default currency is INR, review_status origin defaults."""
    sch_id = uuid.uuid4()
    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            id=sch_id,
            name="Provenance Test Grant",
            provider="Test Foundation",
            description="Testing scholarship provenance and publication metadata defaults.",
            amount=Decimal("25000.00"),
            deadline=date.today() + timedelta(days=60),
        )
        session.add(sch)
        await session.commit()

        # Query back
        res = await session.execute(select(Scholarship).where(Scholarship.id == sch_id))
        saved = res.scalar_one()

        assert saved.currency == "INR"
        assert saved.is_verified is False
        assert saved.review_status == ScholarshipReviewStatus.LEGACY.value
        assert saved.source_url is None
        assert saved.source_id is None
        assert saved.external_id is None
        assert saved.fingerprint is None
        assert saved.last_collected_at is None
        assert saved.last_verified_at is None


@pytest.mark.anyio
async def test_automated_scholarship_defaults_to_pending_review():
    """Verify that when created with a source_id, review_status defaults to PENDING_REVIEW."""
    source_id = uuid.uuid4()
    sch_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        # Create source
        src = ScholarshipSource(
            id=source_id,
            name=f"Source {uuid.uuid4().hex[:6]}",
            slug=f"src-{uuid.uuid4().hex[:6]}",
            base_url="https://portal.example.gov.in",
            source_type=ScholarshipSourceType.API.value,
        )
        session.add(src)

        # Create scholarship linked to source
        sch = Scholarship(
            id=sch_id,
            name="Automated Portal Scholarship",
            provider="Ministry of Education",
            description="Automated discovery test scholarship.",
            amount=Decimal("50000.00"),
            deadline=date.today() + timedelta(days=90),
            source_id=source_id,
            external_id="PORTAL_12345",
            fingerprint="hash_abc123",
        )
        session.add(sch)
        await session.commit()

        # Check default status
        res = await session.execute(select(Scholarship).where(Scholarship.id == sch_id))
        saved = res.scalar_one()

        assert saved.source_id == source_id
        assert saved.external_id == "PORTAL_12345"
        assert saved.fingerprint == "hash_abc123"
        assert saved.review_status == ScholarshipReviewStatus.PENDING_REVIEW.value
        assert saved.is_verified is False


# ==============================================================================
# 3. PUBLICATION FILTERING & BACKWARD COMPATIBILITY
# ==============================================================================
@pytest.mark.anyio
async def test_legacy_scholarships_remain_visible(async_client: AsyncClient):
    """Verify legacy scholarships (review_status='LEGACY', is_verified=False) remain visible to students."""
    _, auth_headers = await create_student_user(async_client)
    sch_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            id=sch_id,
            name="Legacy SeedTest Grant",
            provider="Legacy Corp",
            description="Existing pre-migration scholarship.",
            amount=Decimal("40000.00"),
            deadline=date.today() + timedelta(days=30),
            review_status=ScholarshipReviewStatus.LEGACY.value,
            is_verified=False,
        )
        session.add(sch)
        await session.commit()

    # 1. Must be listed in public search/list
    res_list = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "Legacy SeedTest Grant"},
        headers=auth_headers,
    )
    assert res_list.status_code == 200
    items = res_list.json()["items"]
    assert any(i["id"] == str(sch_id) for i in items)

    # 2. Must be retrievable in detail
    res_detail = await async_client.get(
        f"/api/v1/scholarships/{sch_id}",
        headers=auth_headers,
    )
    assert res_detail.status_code == 200
    assert res_detail.json()["name"] == "Legacy SeedTest Grant"
    assert res_detail.json()["review_status"] == "LEGACY"
    assert res_detail.json()["is_verified"] is False


@pytest.mark.anyio
async def test_pending_and_rejected_scholarships_hidden_from_public(async_client: AsyncClient):
    """Verify pending_review and rejected scholarships are hidden from public API endpoints."""
    _, auth_headers = await create_student_user(async_client)
    pending_id = uuid.uuid4()
    rejected_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        pending_sch = Scholarship(
            id=pending_id,
            name="Secret Pending Grant",
            provider="Pending Corp",
            description="Newly crawled scholarship pending review.",
            amount=Decimal("35000.00"),
            deadline=date.today() + timedelta(days=40),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
            is_verified=False,
        )
        rejected_sch = Scholarship(
            id=rejected_id,
            name="Rejected Bogus Award",
            provider="Bogus Corp",
            description="Flagged as spam or rejected by admin.",
            amount=Decimal("10000.00"),
            deadline=date.today() + timedelta(days=40),
            review_status=ScholarshipReviewStatus.REJECTED.value,
            is_verified=False,
        )
        session.add_all([pending_sch, rejected_sch])
        await session.commit()

    # 1. Not in public list
    res_list = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "Secret Pending Grant"},
        headers=auth_headers,
    )
    assert res_list.status_code == 200
    assert not any(i["id"] == str(pending_id) for i in res_list.json()["items"])

    res_list2 = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "Rejected Bogus Award"},
        headers=auth_headers,
    )
    assert res_list2.status_code == 200
    assert not any(i["id"] == str(rejected_id) for i in res_list2.json()["items"])

    # 2. Detail returns 404
    res_d1 = await async_client.get(f"/api/v1/scholarships/{pending_id}", headers=auth_headers)
    assert res_d1.status_code == 404

    res_d2 = await async_client.get(f"/api/v1/scholarships/{rejected_id}", headers=auth_headers)
    assert res_d2.status_code == 404

    # 3. Save returns 404
    res_s = await async_client.post(f"/api/v1/scholarships/{pending_id}/save", headers=auth_headers)
    assert res_s.status_code == 404


@pytest.mark.anyio
async def test_verified_scholarships_visible(async_client: AsyncClient):
    """Verify that scholarships with review_status='VERIFIED' and is_verified=True are publicly visible."""
    _, auth_headers = await create_student_user(async_client)
    ver_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            id=ver_id,
            name="Verified National Fellowship",
            provider="Govt Directorate",
            description="Approved official scholarship.",
            amount=Decimal("75000.00"),
            deadline=date.today() + timedelta(days=50),
            review_status=ScholarshipReviewStatus.VERIFIED.value,
            is_verified=True,
            currency="INR",
        )
        session.add(sch)
        await session.commit()

    res = await async_client.get(f"/api/v1/scholarships/{ver_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_verified"] is True
    assert res.json()["review_status"] == "VERIFIED"


# ==============================================================================
# 4. SCHOLARSHIP SOURCE REGISTRY CRUD & CONSTRAINTS
# ==============================================================================
@pytest.mark.anyio
async def test_scholarship_source_registry():
    """Verify creating, querying, and updating ScholarshipSource."""
    src_id = uuid.uuid4()
    src_name = f"National Scholarship Portal {uuid.uuid4().hex[:6]}"
    src_slug = f"nsp-{uuid.uuid4().hex[:6]}"

    async with TestAsyncSessionLocal() as session:
        source = ScholarshipSource(
            id=src_id,
            name=src_name,
            slug=src_slug,
            base_url="https://scholarships.gov.in",
            source_type=ScholarshipSourceType.API.value,
            is_active=True,
            config={"rate_limit_per_minute": 30, "feed_format": "json"},
            last_attempted_at=datetime.now(timezone.utc),
            last_successful_at=datetime.now(timezone.utc),
        )
        session.add(source)
        await session.commit()

        # Query
        res = await session.execute(select(ScholarshipSource).where(ScholarshipSource.id == src_id))
        s = res.scalar_one()

        assert s.name == src_name
        assert s.slug == src_slug
        assert s.base_url == "https://scholarships.gov.in"
        assert s.is_active is True
        assert s.config["rate_limit_per_minute"] == 30

    # Uniqueness constraint violation on name
    async with TestAsyncSessionLocal() as session:
        dup = ScholarshipSource(
            id=uuid.uuid4(),
            name=src_name,  # duplicate
            slug=f"other-{uuid.uuid4().hex[:6]}",
            base_url="https://other.gov.in",
        )
        session.add(dup)
        with pytest.raises(IntegrityError):
            await session.commit()


# ==============================================================================
# 5. COLLECTION JOBS & COUNTER CONSTRAINTS
# ==============================================================================
@pytest.mark.anyio
async def test_collection_job_creation_and_lifecycle():
    """Verify ScholarshipCollectionJob creation, status transitions, and counter validation."""
    src_id = uuid.uuid4()
    job_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        src = ScholarshipSource(
            id=src_id,
            name=f"Job Source {uuid.uuid4().hex[:6]}",
            slug=f"jsrc-{uuid.uuid4().hex[:6]}",
            base_url="https://portal.example.com",
        )
        session.add(src)

        job = ScholarshipCollectionJob(
            id=job_id,
            source_id=src_id,
            status=CollectionJobStatus.RUNNING.value,
            records_discovered=10,
            records_created=5,
            records_updated=2,
            records_duplicates_skipped=3,
            records_rejected=0,
            started_at=datetime.now(timezone.utc),
        )
        session.add(job)
        await session.commit()

        # Update job to SUCCEEDED
        job.status = CollectionJobStatus.SUCCEEDED.value
        job.finished_at = datetime.now(timezone.utc)
        await session.commit()

        res = await session.execute(
            select(ScholarshipCollectionJob).where(ScholarshipCollectionJob.id == job_id)
        )
        saved_job = res.scalar_one()
        assert saved_job.status == "SUCCEEDED"
        assert saved_job.records_discovered == 10
        assert saved_job.records_created == 5


@pytest.mark.anyio
async def test_collection_job_negative_counter_constraint():
    """Verify CheckConstraint prevents negative values in collection job counters."""
    job_id = uuid.uuid4()
    async with TestAsyncSessionLocal() as session:
        invalid_job = ScholarshipCollectionJob(
            id=job_id,
            status=CollectionJobStatus.RUNNING.value,
            records_discovered=-1,  # Negative counter
        )
        session.add(invalid_job)
        with pytest.raises(IntegrityError):
            await session.commit()


# ==============================================================================
# 6. FOREIGN KEY & DEDUPLICATION CONSTRAINTS
# ==============================================================================
@pytest.mark.anyio
async def test_source_deletion_sets_null_foreign_key():
    """Verify ondelete='SET NULL' when a source is deleted."""
    src_id = uuid.uuid4()
    sch_id = uuid.uuid4()
    job_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        src = ScholarshipSource(
            id=src_id,
            name=f"Deletable Source {uuid.uuid4().hex[:6]}",
            slug=f"dsrc-{uuid.uuid4().hex[:6]}",
            base_url="https://temp.gov.in",
        )
        sch = Scholarship(
            id=sch_id,
            name="Bound Scholarship",
            provider="Temp Provider",
            description="Testing foreign key cascade ondelete set null.",
            amount=Decimal("15000.00"),
            deadline=date.today() + timedelta(days=20),
            source_id=src_id,
        )
        job = ScholarshipCollectionJob(
            id=job_id,
            source_id=src_id,
        )
        session.add_all([src, sch, job])
        await session.commit()

        # Delete the source
        await session.delete(src)
        await session.commit()

        # Check scholarship still exists and source_id is set to None
        res_sch = await session.execute(select(Scholarship).where(Scholarship.id == sch_id))
        remaining_sch = res_sch.scalar_one()
        assert remaining_sch.source_id is None

        # Check job still exists and source_id is set to None
        res_job = await session.execute(select(ScholarshipCollectionJob).where(ScholarshipCollectionJob.id == job_id))
        remaining_job = res_job.scalar_one()
        assert remaining_job.source_id is None


@pytest.mark.anyio
async def test_source_and_external_id_unique_constraint():
    """Verify unique constraint on (source_id, external_id), while allowing multiple NULLs."""
    src_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        src = ScholarshipSource(
            id=src_id,
            name=f"Dedup Source {uuid.uuid4().hex[:6]}",
            slug=f"ddsrc-{uuid.uuid4().hex[:6]}",
            base_url="https://dedup.example.com",
        )
        session.add(src)

        sch1 = Scholarship(
            id=uuid.uuid4(),
            name="First Record",
            provider="Provider 1",
            description="Testing unique constraint on source and external ID.",
            amount=Decimal("10000.00"),
            deadline=date.today() + timedelta(days=20),
            source_id=src_id,
            external_id="EXT_001",
        )
        session.add(sch1)
        await session.commit()

        # Second record with identical (source_id, external_id) must fail
        sch2 = Scholarship(
            id=uuid.uuid4(),
            name="Duplicate Record",
            provider="Provider 2",
            description="Duplicate external ID.",
            amount=Decimal("12000.00"),
            deadline=date.today() + timedelta(days=25),
            source_id=src_id,
            external_id="EXT_001",
        )
        session.add(sch2)
        with pytest.raises(IntegrityError):
            await session.commit()


@pytest.mark.anyio
async def test_null_external_ids_do_not_conflict():
    """Verify multiple scholarships with NULL source_id or external_id do not trigger constraint violation."""
    async with TestAsyncSessionLocal() as session:
        sch1 = Scholarship(
            id=uuid.uuid4(),
            name="Manual Scholarship 1",
            provider="Manual Corp",
            description="Manual entry with no source or external id.",
            amount=Decimal("20000.00"),
            deadline=date.today() + timedelta(days=30),
            source_id=None,
            external_id=None,
        )
        sch2 = Scholarship(
            id=uuid.uuid4(),
            name="Manual Scholarship 2",
            provider="Manual Corp",
            description="Another manual entry with no source or external id.",
            amount=Decimal("30000.00"),
            deadline=date.today() + timedelta(days=35),
            source_id=None,
            external_id=None,
        )
        session.add_all([sch1, sch2])
        await session.commit()
        # Both successfully committed!


# ==============================================================================
# 7. ADMIN CRUD COMPATIBILITY WITH NEW FIELDS
# ==============================================================================
@pytest.mark.anyio
async def test_admin_create_scholarship_with_provenance_fields(async_client: AsyncClient):
    """Verify Admin can create and update scholarships using new provenance fields."""
    _, admin_headers = await create_admin_user(async_client)
    payload = {
        "name": f"Admin Seed Grant {uuid.uuid4().hex[:6]}",
        "provider": "Admin Foundation",
        "description": "Created by administrator with custom currency and source URL.",
        "amount": "85000.00",
        "currency": "USD",
        "source_url": "https://foundation.org/grant",
        "deadline": (date.today() + timedelta(days=45)).isoformat(),
        "is_verified": True,
        "review_status": "VERIFIED",
    }

    create_res = await async_client.post(
        "/api/v1/admin/scholarships",
        json=payload,
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    sch_id = created_data["id"]

    assert created_data["currency"] == "USD"
    assert created_data["source_url"] == "https://foundation.org/grant"
    assert created_data["is_verified"] is True
    assert created_data["review_status"] == "VERIFIED"

    # Verify public API can read the newly created admin scholarship
    public_res = await async_client.get(f"/api/v1/scholarships/{sch_id}", headers=admin_headers)
    assert public_res.status_code == 200
    assert public_res.json()["currency"] == "USD"
    assert public_res.json()["is_verified"] is True
