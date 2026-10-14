"""ScholarHub Phase 4 Test Suite: Automatic Scheduled Scholarship Collection.

Tests:
1. Scheduler disabled by default in test environments.
2. Configuration validation (interval, timeouts, sources, retries).
3. PostgreSQL distributed advisory lock mutual exclusion.
4. Prevention of duplicate/overlapping collection runs.
5. Multiple concurrent workers/tasks cannot collect the same source simultaneously.
6. Failed collection runs recorded accurately with error summaries.
7. Retry and timeout resilience without crashing the application.
8. Repeated scheduled collection deduplication.
9. Protection of approved and administrator-edited scholarships across repeated runs.
10. Pending discovery records remain hidden from student discovery APIs.
11. Admin scheduler observability and trigger endpoints (authorization and RBAC).
"""

import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
)
from app.models.scholarship import Scholarship, ScholarshipReviewStatus
from app.models.user import User, UserRole
from app.services.discovery.base import BaseConnector, DiscoveredScholarship
from app.services.discovery.lock import PostgresAdvisoryLock, get_source_advisory_lock_key
from app.services.discovery.registry import seed_official_sources
from app.services.discovery.scheduler import DiscoveryScheduler
from tests.conftest import TestAsyncSessionLocal, test_async_engine


# Helper to create authenticated admin/student users in the isolated test schema
async def create_user_with_role(
    async_client: AsyncClient,
    prefix: str,
    role: UserRole = UserRole.STUDENT,
    password: str = "TestPassword123!",
) -> dict:
    """Helper to create an authenticated user with a specific role."""
    unique_email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert reg_res.status_code == 201
    user_id = uuid.UUID(reg_res.json()["id"])

    if role == UserRole.ADMIN:
        async with TestAsyncSessionLocal() as session:
            await session.execute(
                update(User).where(User.id == user_id).values(role=UserRole.ADMIN)
            )
            await session.commit()

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    return {
        "user_id": user_id,
        "email": unique_email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


# Mock Connectors for Controlled Deterministic Testing
class MockControlledConnector(BaseConnector):
    """Deterministic mock connector for testing Phase 4 scheduler workflows."""

    def __init__(self, source: ScholarshipSource, items: Optional[List[DiscoveredScholarship]] = None):
        super().__init__(source)
        self.items = items if items is not None else [
            DiscoveredScholarship(
                name="Phase 4 National Scheduled Merit Scholarship",
                provider="Ministry of Education & Scheduled Schemes",
                description="Deterministic test scholarship for Phase 4 scheduled collection testing.",
                amount=Decimal("35000.00"),
                currency="INR",
                deadline=date(2026, 12, 31),
                eligibility="Indian students in higher education",
                official_website="https://scholarships.gov.in",
                source_url="https://scholarships.gov.in/All-Scholarships#p4-test",
                external_id="nsp_phase4_merit_test_scheme",
            )
        ]

    async def fetch(self) -> str:
        return ""

    def parse(self, raw_content: str) -> List[DiscoveredScholarship]:
        return self.items

    async def collect(self) -> List[DiscoveredScholarship]:
        return self.items


class MockFailingConnector(BaseConnector):
    """Mock connector that simulates network timeouts or failures."""

    def __init__(self, source: ScholarshipSource, error_to_raise: Exception):
        super().__init__(source)
        self.error_to_raise = error_to_raise

    async def fetch(self) -> str:
        raise self.error_to_raise

    def parse(self, raw_content: str) -> List[DiscoveredScholarship]:
        return []

    async def collect(self) -> List[DiscoveredScholarship]:
        raise self.error_to_raise


class MockFlakyConnector(BaseConnector):
    """Mock connector that fails on attempt 1, then succeeds on attempt 2."""

    def __init__(self, source: ScholarshipSource):
        super().__init__(source)
        self.attempts = 0

    async def fetch(self) -> str:
        return ""

    def parse(self, raw_content: str) -> List[DiscoveredScholarship]:
        return []

    async def collect(self) -> List[DiscoveredScholarship]:
        self.attempts += 1
        if self.attempts == 1:
            raise ConnectionError("Simulated transient connection timeout on attempt 1")
        return [
            DiscoveredScholarship(
                name="Phase 4 Flaky Recovered Scholarship",
                provider="Ministry of Resilient Ingestion",
                description="Recovered after bounded retry.",
                amount=Decimal("15000.00"),
                currency="INR",
                deadline=date(2026, 11, 30),
                external_id="nsp_phase4_flaky_recovered",
            )
        ]


# 1. Scheduler disabled by default in test environment
@pytest.mark.anyio
async def test_scheduler_disabled_in_tests():
    """Verify background discovery scheduler is explicitly disabled in the test harness."""
    assert settings.DISCOVERY_SCHEDULE_ENABLED is False

    scheduler = DiscoveryScheduler(
        session_factory=TestAsyncSessionLocal,
        db_engine=test_async_engine,
    )
    assert scheduler.is_enabled is False
    assert scheduler.is_running is False

    # Calling start when disabled must NOT launch background task
    await scheduler.start()
    assert scheduler.is_running is False
    await scheduler.stop()


# 2. Scheduling configuration validation
def test_scheduling_configuration_validation():
    """Verify environment variable parsing, types, and validator for discovery scheduling."""
    # Test defaults
    cfg = Settings()
    assert cfg.DISCOVERY_SCHEDULE_INTERVAL_HOURS == 12
    assert cfg.DISCOVERY_SCHEDULE_TIMEOUT_SECONDS == 300
    assert cfg.DISCOVERY_SCHEDULE_MAX_RETRIES == 2
    assert "nsp" in cfg.DISCOVERY_SCHEDULE_SOURCES

    # Test comma-separated string parsing
    cfg_parsed = Settings(DISCOVERY_SCHEDULE_SOURCES="nsp, mahadbt, ugc")
    assert cfg_parsed.DISCOVERY_SCHEDULE_SOURCES == ["nsp", "mahadbt", "ugc"]

    # Test JSON array string parsing
    cfg_json = Settings(DISCOVERY_SCHEDULE_SOURCES='["NSP", "STATE_PORTAL"]')
    assert cfg_json.DISCOVERY_SCHEDULE_SOURCES == ["nsp", "state_portal"]


# 3. PostgreSQL Advisory Lock Mutual Exclusion
@pytest.mark.anyio
async def test_advisory_lock_mutual_exclusion():
    """Verify that PostgresAdvisoryLock grants exclusive access across concurrent sessions."""
    key = get_source_advisory_lock_key("nsp")
    assert isinstance(key, int)

    lock1 = PostgresAdvisoryLock(test_async_engine, "nsp")
    lock2 = PostgresAdvisoryLock(test_async_engine, "nsp")

    acquired1 = await lock1.acquire()
    assert acquired1 is True
    assert lock1.acquired is True

    # Concurrent attempt on same source MUST fail
    acquired2 = await lock2.acquire()
    assert acquired2 is False
    assert lock2.acquired is False

    # Once lock1 releases, lock2 can acquire
    released1 = await lock1.release()
    assert released1 is True
    assert lock1.acquired is False

    acquired2_retry = await lock2.acquire()
    assert acquired2_retry is True
    assert lock2.acquired is True

    await lock2.release()


# 4. Prevention of duplicate/overlapping collection runs via scheduler
@pytest.mark.anyio
async def test_no_overlapping_runs_via_scheduler():
    """Verify that if an advisory lock is held, a scheduled collection run skips cleanly."""
    scheduler = DiscoveryScheduler(
        session_factory=TestAsyncSessionLocal,
        db_engine=test_async_engine,
    )

    # Pre-acquire the lock on "nsp" externally
    async with PostgresAdvisoryLock(test_async_engine, "nsp") as external_lock:
        assert external_lock.acquired is True

        # Scheduler attempting to collect "nsp" must detect lock and return None safely
        result_job = await scheduler.execute_collection("nsp")
        assert result_job is None


# 5. Multiple concurrent workers/tasks cannot collect the same source simultaneously
@pytest.mark.anyio
async def test_concurrent_workers_advisory_lock_protection():
    """Simulate multiple distributed workers triggering collection concurrently.

    Exactly ONE worker must acquire the lock and execute; all others must skip.
    """
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)

    scheduler1 = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)
    scheduler2 = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)

    connector1 = MockControlledConnector(source)
    connector2 = MockControlledConnector(source)

    # Launch two concurrent tasks attempting to execute on the same source
    res1, res2 = await asyncio.gather(
        scheduler1.execute_collection("nsp", custom_connector=connector1),
        scheduler2.execute_collection("nsp", custom_connector=connector2),
    )

    # Exactly one job must have executed; the other must be None (skipped)
    completed_jobs = [r for r in [res1, res2] if r is not None]
    skipped_jobs = [r for r in [res1, res2] if r is None]

    assert len(completed_jobs) == 1
    assert len(skipped_jobs) == 1
    assert completed_jobs[0].status == CollectionJobStatus.SUCCEEDED.value

    # Cleanup created scholarship
    async with TestAsyncSessionLocal() as cleanup_session:
        await cleanup_session.execute(
            text("DELETE FROM scholarships WHERE external_id = 'nsp_phase4_merit_test_scheme';")
        )
        await cleanup_session.commit()


# 6. Failed collection runs recorded accurately
@pytest.mark.anyio
async def test_failed_runs_recorded_accurately():
    """Verify that network outages or connector exceptions are recorded in scholarship_collection_jobs."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)

    scheduler = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)
    failing_connector = MockFailingConnector(
        source,
        RuntimeError("Upstream government portal returned HTTP 503 Service Unavailable"),
    )

    # Temporarily set retries to 0 for immediate failure testing
    original_retries = settings.DISCOVERY_SCHEDULE_MAX_RETRIES
    settings.DISCOVERY_SCHEDULE_MAX_RETRIES = 0
    try:
        job = await scheduler.execute_collection("nsp", custom_connector=failing_connector)
    finally:
        settings.DISCOVERY_SCHEDULE_MAX_RETRIES = original_retries

    assert job is not None
    assert job.status == CollectionJobStatus.FAILED.value
    assert "HTTP 503" in (job.error_summary or "")

    # Telemetry must reflect failure accurately
    status = scheduler.get_status()
    assert status["last_run_status"] == CollectionJobStatus.FAILED.value


# 7. Retry and timeout behavior
@pytest.mark.anyio
async def test_retry_and_timeout_behavior():
    """Verify that transient failures trigger bounded retries and succeed on subsequent attempts."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)

    scheduler = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)
    flaky_connector = MockFlakyConnector(source)

    job = await scheduler.execute_collection("nsp", custom_connector=flaky_connector)

    assert job is not None
    assert job.status == CollectionJobStatus.SUCCEEDED.value
    assert flaky_connector.attempts == 2
    assert job.records_created >= 1

    # Cleanup
    async with TestAsyncSessionLocal() as cleanup_session:
        await cleanup_session.execute(
            text("DELETE FROM scholarships WHERE external_id = 'nsp_phase4_flaky_recovered';")
        )
        await cleanup_session.commit()


# 8. Repeated collection and deduplication
@pytest.mark.anyio
async def test_repeated_collection_and_deduplication():
    """Verify that repeated runs of the scheduled collector safely skip identical records as duplicates."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)

    scheduler = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)
    test_item = DiscoveredScholarship(
        name="Phase 4 Deduplication Verification Scheme",
        provider="Ministry of Audit & Standards",
        description="Testing duplicate handling in scheduled recurring runs.",
        amount=Decimal("20000.00"),
        currency="INR",
        deadline=date(2026, 12, 15),
        external_id="nsp_phase4_dedup_test",
    )

    connector1 = MockControlledConnector(source, [test_item])
    connector2 = MockControlledConnector(source, [test_item])

    # Run 1: Must create the record
    job1 = await scheduler.execute_collection("nsp", custom_connector=connector1)
    assert job1 is not None
    assert job1.records_created == 1
    assert job1.records_duplicates_skipped == 0

    # Run 2: Same fingerprint must skip as duplicate
    job2 = await scheduler.execute_collection("nsp", custom_connector=connector2)
    assert job2 is not None
    assert job2.records_created == 0
    assert job2.records_duplicates_skipped == 1

    # Cleanup
    async with TestAsyncSessionLocal() as cleanup_session:
        await cleanup_session.execute(
            text("DELETE FROM scholarships WHERE external_id = 'nsp_phase4_dedup_test';")
        )
        await cleanup_session.commit()


# 9. Protection of approved and administrator-edited scholarships
@pytest.mark.anyio
async def test_approved_and_admin_edited_scholarships_protected():
    """Verify scheduled collector never overwrites admin approval status or custom edits."""
    ext_id = f"nsp_p4_prot_{uuid.uuid4().hex[:6]}"

    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        await session.execute(
            text("DELETE FROM scholarships WHERE external_id LIKE 'nsp_p4_prot_%';")
        )
        await session.commit()

    scheduler = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)
    initial_item = DiscoveredScholarship(
        name="Phase 4 Protected Scholarship",
        provider="Government Portal Initial Provider",
        description="Original discovered description.",
        amount=Decimal("10000.00"),
        currency="INR",
        deadline=date(2026, 10, 31),
        external_id=ext_id,
    )

    # 1. Collect initially (enters as PENDING_REVIEW)
    job1 = await scheduler.execute_collection("nsp", custom_connector=MockControlledConnector(source, [initial_item]))
    assert job1.records_created == 1

    # 2. Administrator manually approves and edits the scholarship
    async with TestAsyncSessionLocal() as session:
        stmt = select(Scholarship).where(Scholarship.external_id == ext_id)
        res = await session.execute(stmt)
        sch = res.scalar_one()

        sch.is_verified = True
        sch.review_status = ScholarshipReviewStatus.VERIFIED.value
        sch.description = "ADMINISTRATOR EDITED: Verified official eligibility details."
        await session.commit()

    # 3. Scheduled run runs again with new portal deadline and description
    updated_portal_item = DiscoveredScholarship(
        name="Phase 4 Protected Scholarship",
        provider="Government Portal Initial Provider",
        description="New upstream portal description (should NOT override admin edit if non-empty).",
        amount=Decimal("10000.00"),
        currency="INR",
        deadline=date(2026, 11, 30),  # Upstream deadline extended
        external_id=ext_id,
    )

    job2 = await scheduler.execute_collection(
        "nsp",
        custom_connector=MockControlledConnector(source, [updated_portal_item]),
    )
    assert job2.records_updated == 1

    # 4. Verify admin status and editorial integrity remain completely intact
    async with TestAsyncSessionLocal() as session:
        stmt = select(Scholarship).where(Scholarship.external_id == ext_id)
        res = await session.execute(stmt)
        sch_after = res.scalar_one()

        assert sch_after.is_verified is True
        assert sch_after.review_status == ScholarshipReviewStatus.VERIFIED.value
        assert sch_after.deadline == date(2026, 11, 30)  # Upstream deadline was refreshed safely
        assert "ADMINISTRATOR EDITED" in sch_after.description

        # Cleanup
        await session.delete(sch_after)
        await session.commit()


# 10. Pending records remain hidden from student discovery APIs
@pytest.mark.anyio
async def test_pending_records_hidden_from_student_apis(async_client: AsyncClient):
    """Verify that newly collected scholarships remain strictly hidden from student endpoints."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)

    scheduler = DiscoveryScheduler(session_factory=TestAsyncSessionLocal, db_engine=test_async_engine)
    hidden_item = DiscoveredScholarship(
        name="Phase 4 Pending Discovery Scheme",
        provider="Department of Pending Approval",
        description="Should remain completely hidden from students until reviewed.",
        amount=Decimal("18000.00"),
        currency="INR",
        deadline=date(2026, 12, 31),
        external_id="nsp_phase4_hidden_test",
    )

    await scheduler.execute_collection("nsp", custom_connector=MockControlledConnector(source, [hidden_item]))

    # Retrieve scholarship UUID
    async with TestAsyncSessionLocal() as session:
        stmt = select(Scholarship).where(Scholarship.external_id == "nsp_phase4_hidden_test")
        res = await session.execute(stmt)
        sch = res.scalar_one()
        sch_id = str(sch.id)

    student = await create_user_with_role(async_client, prefix="stud_hide", role=UserRole.STUDENT)

    # 1. Public list search MUST NOT return the pending scholarship
    list_res = await async_client.get(
        "/api/v1/scholarships",
        headers=student["headers"],
        params={"search": "Pending Discovery"},
    )
    assert list_res.status_code == 200
    item_ids = [item["id"] for item in list_res.json()["items"]]
    assert sch_id not in item_ids

    # 2. Public detail lookup MUST return 404 Not Found
    detail_res = await async_client.get(f"/api/v1/scholarships/{sch_id}", headers=student["headers"])
    assert detail_res.status_code == 404

    # Cleanup
    async with TestAsyncSessionLocal() as cleanup_session:
        await cleanup_session.execute(
            text("DELETE FROM scholarships WHERE external_id = 'nsp_phase4_hidden_test';")
        )
        await cleanup_session.commit()


# 11. Admin scheduler observability and trigger endpoints
@pytest.mark.anyio
async def test_admin_scheduler_endpoints_and_observability(async_client: AsyncClient):
    """Verify admin-only scheduler telemetry and on-demand trigger endpoints with RBAC enforcement."""
    # 1. Student access MUST be rejected with HTTP 403 Forbidden
    student = await create_user_with_role(async_client, prefix="stud_sched", role=UserRole.STUDENT)

    sched_forbidden = await async_client.get("/api/v1/admin/scheduler", headers=student["headers"])
    assert sched_forbidden.status_code == 403

    trigger_forbidden = await async_client.post("/api/v1/admin/scheduler/trigger", headers=student["headers"])
    assert trigger_forbidden.status_code == 403

    # 2. Admin access MUST succeed
    admin = await create_user_with_role(async_client, prefix="admin_sched", role=UserRole.ADMIN)

    # GET /admin/scheduler returns status telemetry
    sched_res = await async_client.get("/api/v1/admin/scheduler", headers=admin["headers"])
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert "enabled" in sched_data
    assert "interval_hours" in sched_data
    assert "configured_sources" in sched_data
    assert "timeout_seconds" in sched_data

    # GET /admin/dashboard/stats includes scheduler_info
    stats_res = await async_client.get("/api/v1/admin/dashboard/stats", headers=admin["headers"])
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert "scheduler_info" in stats_data
    assert stats_data["scheduler_info"]["interval_hours"] == 12

    # POST /admin/scheduler/trigger succeeds or skips cleanly if locked
    trigger_res = await async_client.post(
        "/api/v1/admin/scheduler/trigger",
        headers=admin["headers"],
        params={"source": "nsp"},
    )
    assert trigger_res.status_code == 200
    trigger_data = trigger_res.json()
    assert trigger_data["status"] in ("SUCCEEDED", "PARTIAL", "FAILED", "SKIPPED_LOCKED")
