"""Phase 2 Automatic Scholarship Discovery - Official NSP Connector Tests.

Test Suite Coverage:
1. Idempotent source registration & seeding (multiple invocations produce no duplicates)
2. NSP HTML parsing with realistic fixtures (normalization, dates, external IDs, fingerprints)
3. Malformed and missing fields parsing (graceful fallbacks, invalid header skipping)
4. Network failure, retries, and timeout handling (bounded retries, sanitized error messages)
5. End-to-end collection lifecycle via orchestrator (job counters and status)
6. Publication safeguards: newly discovered items are ALWAYS is_verified=False and review_status=PENDING_REVIEW
7. Deduplication across repeated runs (identical runs increment duplicates_skipped, not created)
8. Safe update semantics (updates deadline/description, recalculates fingerprint, never overwrites admin approval)
9. Partial failure handling (partial status when invalid items encountered)
10. Total failure handling (network error records FAILED status and sanitized summary)
11. Inactive and unregistered source error handling
12. Dry-run execution (verifies zero database mutation)
13. Public API privacy regression test (unapproved discovered records hidden from public search)
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch
import uuid
import pytest
import httpx
from httpx import AsyncClient
from sqlalchemy import delete, select, update

from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
    ScholarshipSourceType,
)
from app.models.scholarship import Scholarship, ScholarshipReviewStatus
from app.services.discovery.base import BaseConnector, DiscoveredScholarship
from app.services.discovery.nsp_connector import NSPConnector, slugify
from app.services.discovery.orchestrator import DiscoveryOrchestrator, sanitize_error_message
from app.services.discovery.registry import get_source_by_slug, seed_official_sources
from tests.conftest import TestAsyncSessionLocal


async def create_student_user(async_client: AsyncClient, prefix: str = "std_p2") -> tuple[dict, dict[str, str]]:
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

# Realistic HTML fixture modeled after NSP All-Scholarships page
SAMPLE_NSP_HTML = """
<!doctype html>
<html>
<head><title>NSP Portal</title></head>
<body>
    <button class="accordion-button" data-bs-target="#col1">Students</button>
    <div id="col1"><p>Non-ministry section</p></div>

    <button class="accordion-button" data-bs-target="#collapseMHA">Ministry of Home Affairs</button>
    <div id="collapseMHA">
        <div class="row mb-4 border-1 border-bottom">
            <div class="col-md-10">
                <h6>Prime Minister'S Scholarship Scheme For Central Armed Police Forces And Assam Rifles (Merit Based Scheme)</h6><br>
                <span class="badge">Scheme Open from : 01-06-2026</span>
                <span class="badge">Student Application Open till : 31-10-2026</span>
                <div>
                    <a href="https://scholarships.gov.in/public/schemeGuidelines/warb/PMSS_Guidelines_1197_3001-2023-24.pdf">Specifications</a>
                    <a href="https://scholarships.gov.in/public/FAQ/FAQonPMSSS.pdf">FAQ</a>
                </div>
            </div>
        </div>
        <div class="row mb-4 border-1 border-bottom">
            <div class="col-md-10">
                <h6>Prime Minister'S Scholarship Scheme For Wards Of States/UTs Police Personnel Martyred During Terror Attacks</h6><br>
                <span class="badge">Scheme Open from : 01-06-2026</span>
                <span class="badge">Student Application Open till : 15-11-2026</span>
                <div>
                    <a href="/public/schemeGuidelines/warb/PMSS_Martyred_Guidelines.pdf">Specifications</a>
                </div>
            </div>
        </div>
    </div>

    <button class="accordion-button" data-bs-target="#collapseAICTE">All India Council For Technical Education</button>
    <div id="collapseAICTE">
        <div class="row mb-4 border-1 border-bottom">
            <div class="col-md-10">
                <h6>AICTE - Pragati Scholarship Scheme For Girl Students (Technical Degree)</h6><br>
                <span class="badge">Scheme Open from : 01-06-2026</span>
                <span class="badge">Student Application Open till : 31-10-2026</span>
                <div>
                    <a href="https://scholarships.gov.in/public/schemeGuidelines/AICTE/AICTE_2010_G.pdf">Guidelines</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

MALFORMED_NSP_HTML = """
<div>
    <button class="accordion-button">Public</button>
    <button class="accordion-button">Department of Higher Education</button>
    <div>
        <h6>by Department of Higher Education</h6>
        <h6>   </h6>
        <h6>Valid Central Scheme with Missing Dates and Links</h6>
        <p>No dates provided in this chunk.</p>
    </div>
</div>
"""


@pytest.mark.anyio
async def test_idempotent_source_registration():
    """Verify seeding the official NSP source is safe and idempotent across multiple runs."""
    async with TestAsyncSessionLocal() as session:
        # First execution: creates source
        src1 = await seed_official_sources(session)
        assert src1.slug == "nsp"
        assert src1.name == "National Scholarship Portal"
        assert src1.source_type == ScholarshipSourceType.HTML_PARSING.value
        assert src1.is_active is True
        assert src1.config["timeout_seconds"] == 20.0
        src1_id = src1.id

        # Second execution: updates/re-uses existing source
        src2 = await seed_official_sources(session)
        assert src2.id == src1_id
        assert src2.slug == "nsp"

        # Direct database query verifies exactly one record exists with slug 'nsp'
        res = await session.execute(
            select(ScholarshipSource).where(ScholarshipSource.slug == "nsp")
        )
        sources = res.scalars().all()
        assert len(sources) == 1


@pytest.mark.anyio
async def test_nsp_connector_parsing_valid_html():
    """Verify NSPConnector extracts all schemes, normalizes fields, and computes stable fingerprints."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        connector = NSPConnector(source)

        discovered = connector.parse(SAMPLE_NSP_HTML)
        assert len(discovered) == 3

        # Item 1 Check
        item1 = discovered[0]
        assert "Central Armed Police Forces" in item1.name
        assert item1.provider == "Ministry of Home Affairs"
        assert item1.deadline == date(2026, 10, 31)
        assert item1.currency == "INR"
        assert item1.amount == Decimal("0.00")
        assert item1.official_website == "https://scholarships.gov.in"
        assert item1.source_url == "https://scholarships.gov.in/public/schemeGuidelines/warb/PMSS_Guidelines_1197_3001-2023-24.pdf"
        assert item1.external_id.startswith("nsp_ministry-of-home-affairs_")
        assert len(item1.fingerprint) == 64
        assert item1.raw_data["open_from"] == "01-06-2026"
        assert item1.raw_data["open_till"] == "31-10-2026"

        # Item 2 Check: Relative URL normalized to absolute
        item2 = discovered[1]
        assert "Martyred" in item2.name
        assert item2.deadline == date(2026, 11, 15)
        assert item2.source_url == "https://scholarships.gov.in/public/schemeGuidelines/warb/PMSS_Martyred_Guidelines.pdf"

        # Item 3 Check: AICTE Pragati
        item3 = discovered[2]
        assert "Pragati Scholarship" in item3.name
        assert item3.provider == "All India Council For Technical Education"
        assert item3.deadline == date(2026, 10, 31)

        # Unique external IDs
        ext_ids = [d.external_id for d in discovered]
        assert len(ext_ids) == len(set(ext_ids))


@pytest.mark.anyio
async def test_nsp_connector_parsing_malformed_html():
    """Verify parser handles empty, malformed HTML, and missing dates gracefully with fallbacks."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        connector = NSPConnector(source)

        # Empty string
        assert connector.parse("") == []
        assert connector.parse("   ") == []

        # Malformed HTML with missing dates
        items = connector.parse(MALFORMED_NSP_HTML)
        assert len(items) == 1
        item = items[0]
        assert item.name == "Valid Central Scheme with Missing Dates and Links"
        assert item.provider == "Department of Higher Education"
        # Fallback deadline to end of current year
        assert item.deadline == date(date.today().year, 12, 31)
        # Fallback source URL to All-Scholarships page
        assert item.source_url == "https://scholarships.gov.in/All-Scholarships"


@pytest.mark.anyio
async def test_nsp_connector_fetch_retry_and_timeout():
    """Verify NSPConnector fetch executes bounded retries and raises informative error on failure."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        # Use fast retry config for test speed
        source.config = {
            "schemes_endpoint": "/All-Scholarships",
            "timeout_seconds": 1.0,
            "max_retries": 2,
            "verify_ssl": True,
        }
        connector = NSPConnector(source)

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.TimeoutException("Read timed out")

            with pytest.raises(RuntimeError) as exc_info:
                await connector.fetch()

            assert "Failed to fetch scholarship data from NSP" in str(exc_info.value)
            assert "TimeoutException" in str(exc_info.value)
            assert mock_get.call_count == 2


class MockConnector(BaseConnector):
    """Test connector allowing programmatic control of discovered items or fetch exceptions."""

    def __init__(self, source: ScholarshipSource, items: list[DiscoveredScholarship] = None, fail: bool = False):
        super().__init__(source)
        self.items = items or []
        self.fail = fail

    async def fetch(self) -> str:
        if self.fail:
            raise httpx.ConnectError("Connection refused by test upstream host")
        return "mock_content"

    def parse(self, raw_content: str) -> list[DiscoveredScholarship]:
        return self.items


async def clean_source_scholarships(session, source_id: uuid.UUID):
    """Clean up scholarships associated with a source for test isolation."""
    await session.execute(
        delete(Scholarship).where(Scholarship.source_id == source_id)
    )
    await session.commit()


@pytest.mark.anyio
async def test_successful_collection_job_lifecycle():
    """Verify orchestrator runs collection, creates job record with non-negative counters, and updates source."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        await clean_source_scholarships(session, source.id)
        connector = NSPConnector(source)
        items = connector.parse(SAMPLE_NSP_HTML)

        mock_conn = MockConnector(source, items=items)
        orchestrator = DiscoveryOrchestrator(session)

        job = await orchestrator.run_collection("nsp", custom_connector=mock_conn)

        assert job.status == CollectionJobStatus.SUCCEEDED.value
        assert job.records_discovered == 3
        assert job.records_created == 3
        assert job.records_updated == 0
        assert job.records_duplicates_skipped == 0
        assert job.records_rejected == 0
        assert job.finished_at is not None
        assert job.error_summary is None

        # Verify source timestamps
        await session.refresh(source)
        assert source.last_attempted_at is not None
        assert source.last_successful_at is not None


@pytest.mark.anyio
async def test_new_records_mandatory_safeguards():
    """Verify newly discovered scholarships are ALWAYS review_status=PENDING_REVIEW and is_verified=False."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        await clean_source_scholarships(session, source.id)
        connector = NSPConnector(source)
        items = connector.parse(SAMPLE_NSP_HTML)

        orchestrator = DiscoveryOrchestrator(session)
        mock_conn = MockConnector(source, items=items)
        job = await orchestrator.run_collection("nsp", custom_connector=mock_conn)
        assert job.records_created == 3

        # Query all records created by this source
        res = await session.execute(
            select(Scholarship).where(Scholarship.source_id == source.id)
        )
        scholarships = res.scalars().all()
        assert len(scholarships) == 3

        for s in scholarships:
            assert s.is_verified is False
            assert s.review_status == ScholarshipReviewStatus.PENDING_REVIEW.value
            assert s.source_id == source.id
            assert s.currency == "INR"
            assert s.external_id is not None
            assert s.fingerprint is not None
            assert len(s.fingerprint) == 64
            assert s.last_collected_at is not None


@pytest.mark.anyio
async def test_deduplication_on_repeated_runs():
    """Verify running collection repeatedly on identical data skips duplicates and avoids insertions."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        await clean_source_scholarships(session, source.id)
        connector = NSPConnector(source)
        items = connector.parse(SAMPLE_NSP_HTML)

        orchestrator = DiscoveryOrchestrator(session)
        mock_conn = MockConnector(source, items=items)

        # First run: creates 3 records
        job1 = await orchestrator.run_collection("nsp", custom_connector=mock_conn)
        assert job1.records_created == 3
        assert job1.records_duplicates_skipped == 0

        # Second run with exact same data: skips 3 duplicates
        job2 = await orchestrator.run_collection("nsp", custom_connector=mock_conn)
        assert job2.status == CollectionJobStatus.SUCCEEDED.value
        assert job2.records_discovered == 3
        assert job2.records_created == 0
        assert job2.records_updated == 0
        assert job2.records_duplicates_skipped == 3
        assert job2.records_rejected == 0

        # Verify DB still has exactly 3 records
        res = await session.execute(
            select(Scholarship).where(Scholarship.source_id == source.id)
        )
        records = res.scalars().all()
        assert len(records) == 3


@pytest.mark.anyio
async def test_safe_updating_of_existing_scholarship():
    """Verify existing scholarship is updated when source data changes, without reverting admin verification."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        await clean_source_scholarships(session, source.id)
        connector = NSPConnector(source)
        items = connector.parse(SAMPLE_NSP_HTML)

        orchestrator = DiscoveryOrchestrator(session)
        mock_conn = MockConnector(source, items=items)
        await orchestrator.run_collection("nsp", custom_connector=mock_conn)

        # Admin approves one of the scholarships
        target_ext_id = items[0].external_id
        res = await session.execute(
            select(Scholarship).where(Scholarship.external_id == target_ext_id)
        )
        scholarship = res.scalar_one()
        scholarship.is_verified = True
        scholarship.review_status = ScholarshipReviewStatus.VERIFIED.value
        await session.commit()

        # Simulate portal extension of the application deadline for item 0
        new_deadline = date(2026, 12, 15)
        updated_item0 = DiscoveredScholarship(
            external_id=items[0].external_id,
            name=items[0].name,
            provider=items[0].provider,
            description=items[0].description,
            amount=items[0].amount,
            currency=items[0].currency,
            deadline=new_deadline,  # Extended deadline!
            source_url=items[0].source_url,
            official_website=items[0].official_website,
        )
        updated_items = [updated_item0, items[1], items[2]]

        # Run collection with updated items
        mock_conn_updated = MockConnector(source, items=updated_items)
        job_update = await orchestrator.run_collection("nsp", custom_connector=mock_conn_updated)

        assert job_update.records_updated == 1
        assert job_update.records_duplicates_skipped == 2
        assert job_update.records_created == 0

        # Query updated scholarship from DB
        res = await session.execute(
            select(Scholarship).where(Scholarship.external_id == target_ext_id)
        )
        refreshed = res.scalar_one()

        # Deadline updated
        assert refreshed.deadline == new_deadline
        # Fingerprint updated
        assert refreshed.fingerprint == updated_item0.fingerprint
        # CRITICAL: Admin verification status preserved!
        assert refreshed.is_verified is True
        assert refreshed.review_status == ScholarshipReviewStatus.VERIFIED.value


@pytest.mark.anyio
async def test_partial_job_status_on_rejected_items():
    """Verify orchestrator marks job as PARTIAL when some items fail validation."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        valid_item = DiscoveredScholarship(
            external_id="nsp_test_valid_scheme",
            name="Valid Test Scheme",
            provider="Ministry of Education",
            description="Valid Description",
            amount=Decimal("50000.00"),
            currency="INR",
            deadline=date(2026, 11, 30),
        )
        # Corrupted item missing mandatory title
        corrupt_item = DiscoveredScholarship(
            external_id="nsp_test_invalid",
            name="",  # Invalid empty name
            provider="Ministry of Education",
            description="Desc",
            amount=Decimal("0.00"),
            currency="INR",
            deadline=date(2026, 11, 30),
        )

        mock_conn = MockConnector(source, items=[valid_item, corrupt_item])
        orchestrator = DiscoveryOrchestrator(session)
        job = await orchestrator.run_collection("nsp", custom_connector=mock_conn)

        assert job.status == CollectionJobStatus.PARTIAL.value
        assert job.records_discovered == 2
        assert job.records_created == 1
        assert job.records_rejected == 1
        assert "rejected" in job.error_summary


@pytest.mark.anyio
async def test_failed_job_on_network_exception():
    """Verify network exception during collection marks job as FAILED and sanitizes errors."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        mock_conn = MockConnector(source, fail=True)
        orchestrator = DiscoveryOrchestrator(session)

        job = await orchestrator.run_collection("nsp", custom_connector=mock_conn)

        assert job.status == CollectionJobStatus.FAILED.value
        assert job.records_discovered == 0
        assert job.records_created == 0
        assert job.records_updated == 0
        assert job.records_duplicates_skipped == 0
        assert job.records_rejected == 0
        assert "Connection refused" in job.error_summary


@pytest.mark.anyio
async def test_invalid_or_inactive_source_handling():
    """Verify attempting to run collection on an invalid or disabled source raises clear exceptions."""
    async with TestAsyncSessionLocal() as session:
        orchestrator = DiscoveryOrchestrator(session)

        # Unregistered source
        with pytest.raises(ValueError, match="is not registered"):
            await orchestrator.run_collection("non_existent_source")

        # Deactivated source
        source = await seed_official_sources(session)
        source.is_active = False
        await session.commit()

        with pytest.raises(ValueError, match="currently disabled/inactive"):
            await orchestrator.run_collection("nsp")

        # Restore source
        source.is_active = True
        await session.commit()


@pytest.mark.anyio
async def test_dry_run_does_not_mutate_database():
    """Verify running collection with dry_run=True does not persist scholarship rows."""
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        source_id = source.id
        await clean_source_scholarships(session, source_id)
        connector = NSPConnector(source)
        items = connector.parse(SAMPLE_NSP_HTML)
        mock_conn = MockConnector(source, items=items)

        orchestrator = DiscoveryOrchestrator(session)
        job = await orchestrator.run_collection("nsp", dry_run=True, custom_connector=mock_conn)

        assert job.records_created == 3

        # Direct database query verifies 0 scholarships were committed
        res = await session.execute(
            select(Scholarship).where(Scholarship.source_id == source_id)
        )
        records = res.scalars().all()
        assert len(records) == 0


@pytest.mark.anyio
async def test_no_regression_to_public_scholarship_api(async_client: AsyncClient):
    """Verify that unverified discovered scholarships (PENDING_REVIEW) are hidden from public API."""
    _, auth_headers = await create_student_user(async_client)
    async with TestAsyncSessionLocal() as session:
        source = await seed_official_sources(session)
        await clean_source_scholarships(session, source.id)
        connector = NSPConnector(source)
        items = connector.parse(SAMPLE_NSP_HTML)
        mock_conn = MockConnector(source, items=items)

        orchestrator = DiscoveryOrchestrator(session)
        await orchestrator.run_collection("nsp", custom_connector=mock_conn)

    # Call public search endpoint
    res = await async_client.get("/api/v1/scholarships", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    # None of the newly collected NSP scholarships should appear in the public list
    public_names = [item["name"] for item in data["items"]]
    for item in items:
        assert item.name not in public_names


def test_sanitize_error_message():
    """Verify password, token, and secret sanitization."""
    msg = "Error connecting to postgresql://user:secretpassword@localhost:5432/db with Bearer eyJhbGciOi.token"
    sanitized = sanitize_error_message(msg)
    assert "secretpassword" not in sanitized
    assert "eyJhbGci" not in sanitized
    assert "***" in sanitized
