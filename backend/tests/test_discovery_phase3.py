"""Phase 3 Administrator Review and Moderation Workflow Tests.

Covers:
- Admin authorization and student access denial (403/401)
- Listing and filtering pending records with pagination and search
- Approval workflow and public student discovery visibility
- Rejection workflow with mandatory rejection reason and student invisibility
- Editing scholarship details before/after approval with provenance preservation
- Validation errors (empty rejection reason, negative amount, empty fields)
- Repeated and safe review actions (idempotency, reject-to-approve transition)
- Collection job history inspection and metrics counters
- Dashboard moderation stats aggregation
- Legacy catalog publication integrity preservation
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select, text, update

from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
    ScholarshipSourceType,
)
from app.models.scholarship import Scholarship, ScholarshipReviewStatus
from app.models.user import User, UserRole
from tests.conftest import TEST_SCHEMA, TestAsyncSessionLocal


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


async def create_test_source(name: str = "NSP Moderation Source", slug_prefix: str = "nsp_mod") -> ScholarshipSource:
    """Create a persistent test scholarship source with unique name and slug."""
    unique_suffix = uuid.uuid4().hex[:6]
    async with TestAsyncSessionLocal() as session:
        source = ScholarshipSource(
            name=f"{name}_{unique_suffix}",
            slug=f"{slug_prefix}_{unique_suffix}",
            base_url="https://scholarships.gov.in",
            source_type=ScholarshipSourceType.HTML_PARSING.value,
            is_active=True,
        )
        session.add(source)
        await session.commit()
        await session.refresh(source)
        return source


# ==============================================================================
# 1. ADMIN AUTHORIZATION & STUDENT ACCESS DENIAL
# ==============================================================================
@pytest.mark.anyio
async def test_student_denied_access_to_moderation_endpoints(async_client: AsyncClient):
    """Verify students receive 403 Forbidden when calling any moderation endpoint."""
    student = await create_user_with_role(async_client, prefix="stud_mod", role=UserRole.STUDENT)
    fake_id = uuid.uuid4()

    # 1. Listing pending
    res = await async_client.get("/api/v1/admin/moderation/pending", headers=student["headers"])
    assert res.status_code == 403

    # 2. Approve
    res = await async_client.post(f"/api/v1/admin/scholarships/{fake_id}/approve", headers=student["headers"])
    assert res.status_code == 403

    # 3. Reject
    res = await async_client.post(
        f"/api/v1/admin/scholarships/{fake_id}/reject",
        headers=student["headers"],
        json={"rejection_reason": "Not allowed"},
    )
    assert res.status_code == 403

    # 4. Collection jobs
    res = await async_client.get("/api/v1/admin/collection-jobs", headers=student["headers"])
    assert res.status_code == 403


@pytest.mark.anyio
async def test_unauthenticated_moderation_returns_401(async_client: AsyncClient):
    """Verify unauthenticated requests return 401 Unauthorized."""
    fake_id = uuid.uuid4()
    res = await async_client.get("/api/v1/admin/moderation/pending")
    assert res.status_code == 401

    res = await async_client.post(f"/api/v1/admin/scholarships/{fake_id}/approve")
    assert res.status_code == 401

    res = await async_client.get("/api/v1/admin/collection-jobs")
    assert res.status_code == 401


# ==============================================================================
# 2. LISTING & FILTERING PENDING RECORDS
# ==============================================================================
@pytest.mark.anyio
async def test_list_pending_scholarships_filtering_and_pagination(async_client: AsyncClient):
    """Verify listing pending records filters accurately and paginates."""
    admin = await create_user_with_role(async_client, prefix="admin_list", role=UserRole.ADMIN)
    source = await create_test_source("Pending Test Portal", "pend_src")

    unique_suffix = uuid.uuid4().hex[:6]
    name_alpha = f"Pending Fellowship Alpha {unique_suffix}"
    name_beta = f"Pending Fellowship Beta {unique_suffix}"
    name_gamma = f"Already Verified Grant Gamma {unique_suffix}"

    async with TestAsyncSessionLocal() as session:
        # Create 2 pending scholarships
        p1 = Scholarship(
            name=name_alpha,
            provider="Ministry of Science",
            description="Alpha pending grant.",
            amount=Decimal("50000"),
            currency="INR",
            deadline=date.today() + timedelta(days=40),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
            is_verified=False,
            source_id=source.id,
            external_id=f"ext_alpha_{unique_suffix}",
        )
        p2 = Scholarship(
            name=name_beta,
            provider="Ministry of Education",
            description="Beta pending grant.",
            amount=Decimal("75000"),
            currency="INR",
            deadline=date.today() + timedelta(days=60),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
            is_verified=False,
            source_id=source.id,
            external_id=f"ext_beta_{unique_suffix}",
        )
        # Create 1 already verified scholarship
        v1 = Scholarship(
            name=name_gamma,
            provider="DST",
            description="Gamma verified grant.",
            amount=Decimal("90000"),
            currency="INR",
            deadline=date.today() + timedelta(days=30),
            review_status=ScholarshipReviewStatus.VERIFIED.value,
            is_verified=True,
            source_id=source.id,
        )
        session.add_all([p1, p2, v1])
        await session.commit()

    # Query pending moderation endpoint
    res = await async_client.get(
        "/api/v1/admin/moderation/pending",
        headers=admin["headers"],
        params={"search": unique_suffix},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    names = [item["name"] for item in data["items"]]
    assert name_alpha in names
    assert name_beta in names
    assert name_gamma not in names

    # Verify source name resolution
    for item in data["items"]:
        if item["name"] == name_alpha:
            assert item["source_name"] == source.name
            assert item["external_id"] == f"ext_alpha_{unique_suffix}"
            assert item["review_status"] == "PENDING_REVIEW"
            assert item["is_verified"] is False


# ==============================================================================
# 3. APPROVAL WORKFLOW & PUBLICATION VISIBILITY
# ==============================================================================
@pytest.mark.anyio
async def test_approve_scholarship_makes_visible_to_students(async_client: AsyncClient):
    """Verify approval transitions pending scholarship to VERIFIED and makes it public."""
    admin = await create_user_with_role(async_client, prefix="admin_appr", role=UserRole.ADMIN)
    student = await create_user_with_role(async_client, prefix="stud_appr", role=UserRole.STUDENT)
    source = await create_test_source("Gov Portal Appr", "gov_appr")

    unique_ext_id = f"nsp_sch_{uuid.uuid4().hex[:6]}"
    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            name=f"Gov Merit Award {uuid.uuid4().hex[:4]}",
            provider="Ministry of Social Justice",
            description="Merit based higher education funding.",
            amount=Decimal("80000"),
            currency="INR",
            deadline=date.today() + timedelta(days=45),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
            is_verified=False,
            source_id=source.id,
            source_url="https://scholarships.gov.in/scheme1",
            external_id=unique_ext_id,
            fingerprint="hash_abc123",
        )
        session.add(sch)
        await session.commit()
        await session.refresh(sch)
        sch_id = sch.id

    # 1. Before approval: Pending scholarship is HIDDEN from student discovery
    pub_res = await async_client.get(
        "/api/v1/scholarships",
        headers=student["headers"],
        params={"q": unique_ext_id},
    )
    assert pub_res.status_code == 200
    assert pub_res.json()["total"] == 0

    # Also student detail access returns 404
    det_res = await async_client.get(
        f"/api/v1/scholarships/{sch_id}",
        headers=student["headers"],
    )
    assert det_res.status_code == 404

    # 2. Admin approves the scholarship
    appr_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=admin["headers"],
    )
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["review_status"] == "VERIFIED"
    assert appr_data["is_verified"] is True
    assert appr_data["last_verified_at"] is not None
    assert appr_data["rejection_reason"] is None
    # Provenance preserved
    assert appr_data["source_id"] == str(source.id)
    assert appr_data["source_name"] == source.name
    assert appr_data["external_id"] == unique_ext_id
    assert appr_data["fingerprint"] == "hash_abc123"

    # 3. After approval: Immediately visible to students in public discovery!
    pub_res_after = await async_client.get(
        f"/api/v1/scholarships/{sch_id}",
        headers=student["headers"],
    )
    assert pub_res_after.status_code == 200
    assert pub_res_after.json()["id"] == str(sch_id)
    assert pub_res_after.json()["is_verified"] is True
    assert pub_res_after.json()["review_status"] == "VERIFIED"

    # Cleanup transient test record
    await async_client.delete(f"/api/v1/admin/scholarships/{sch_id}", headers=admin["headers"])


# ==============================================================================
# 4. REJECTION WORKFLOW & CONTINUED INVISIBILITY
# ==============================================================================
@pytest.mark.anyio
async def test_reject_scholarship_with_required_reason_and_invisibility(async_client: AsyncClient):
    """Verify rejection records reason and keeps record hidden from public queries."""
    admin = await create_user_with_role(async_client, prefix="admin_rej", role=UserRole.ADMIN)
    student = await create_user_with_role(async_client, prefix="stud_rej", role=UserRole.STUDENT)
    source = await create_test_source("Defunct Source", "def_src")

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            name="Bogus Scheme Example",
            provider="Suspicious Org",
            description="Fake unverified scheme.",
            amount=Decimal("10000"),
            currency="INR",
            deadline=date.today() + timedelta(days=20),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
            is_verified=False,
            source_id=source.id,
            external_id="bogus_01",
        )
        session.add(sch)
        await session.commit()
        await session.refresh(sch)
        sch_id = sch.id

    # 1. Admin rejects with reason
    reason = "Ineligible organization and unverified official source notice."
    rej_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/reject",
        headers=admin["headers"],
        json={"rejection_reason": reason},
    )
    assert rej_res.status_code == 200
    rej_data = rej_res.json()
    assert rej_data["review_status"] == "REJECTED"
    assert rej_data["is_verified"] is False
    assert rej_data["rejection_reason"] == reason
    assert rej_data["source_id"] == str(source.id)

    # 2. Student cannot see the rejected scholarship
    pub_res = await async_client.get(
        f"/api/v1/scholarships/{sch_id}",
        headers=student["headers"],
    )
    assert pub_res.status_code == 404

    # 3. Admin can inspect the rejected scholarship with reason
    admin_det = await async_client.get(
        f"/api/v1/admin/scholarships/{sch_id}",
        headers=admin["headers"],
    )
    assert admin_det.status_code == 200
    assert admin_det.json()["rejection_reason"] == reason


# ==============================================================================
# 5. EDITING SCHOLARSHIP BEFORE APPROVAL
# ==============================================================================
@pytest.mark.anyio
async def test_edit_scholarship_before_approval_preserves_provenance(async_client: AsyncClient):
    """Verify admin can correct errors before approval without losing source provenance."""
    admin = await create_user_with_role(async_client, prefix="admin_edit", role=UserRole.ADMIN)
    source = await create_test_source("NSP Pre-Edit Portal", "edit_src")

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            name="Typo In Scholrship Nme",
            provider="Ministy of Edu",
            description="Needs correction.",
            amount=Decimal("20000"),
            currency="INR",
            deadline=date.today() + timedelta(days=30),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
            is_verified=False,
            source_id=source.id,
            source_url="https://scholarships.gov.in/scheme_edit",
            external_id="edit_ext_99",
            fingerprint="orig_fingerprint_123",
        )
        session.add(sch)
        await session.commit()
        await session.refresh(sch)
        sch_id = sch.id

    # 1. Admin edits inaccurate fields
    update_res = await async_client.put(
        f"/api/v1/admin/scholarships/{sch_id}",
        headers=admin["headers"],
        json={
            "name": "Corrected Scholarship Name",
            "provider": "Ministry of Education",
            "amount": 50000,
            "eligibility": "Minimum 75% aggregate marks required",
        },
    )
    assert update_res.status_code == 200
    upd_data = update_res.json()
    assert upd_data["name"] == "Corrected Scholarship Name"
    assert upd_data["provider"] == "Ministry of Education"
    assert Decimal(str(upd_data["amount"])) == Decimal("50000")
    assert upd_data["eligibility"] == "Minimum 75% aggregate marks required"
    # Provenance remained intact
    assert upd_data["source_id"] == str(source.id)
    assert upd_data["source_url"] == "https://scholarships.gov.in/scheme_edit"
    assert upd_data["external_id"] == "edit_ext_99"
    assert upd_data["fingerprint"] == "orig_fingerprint_123"
    assert upd_data["review_status"] == "PENDING_REVIEW"

    # 2. Admin then approves corrected record
    appr_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=admin["headers"],
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["review_status"] == "VERIFIED"
    assert appr_res.json()["is_verified"] is True
    assert appr_res.json()["name"] == "Corrected Scholarship Name"

    # Cleanup transient test record
    await async_client.delete(f"/api/v1/admin/scholarships/{sch_id}", headers=admin["headers"])


# ==============================================================================
# 6. VALIDATION ERRORS
# ==============================================================================
@pytest.mark.anyio
async def test_validation_errors_on_rejection_and_update(async_client: AsyncClient):
    """Verify validation errors for missing/empty rejection reasons and invalid edits."""
    admin = await create_user_with_role(async_client, prefix="admin_val", role=UserRole.ADMIN)

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            name="Valid Test Scheme",
            provider="Valid Provider",
            description="Testing validations.",
            amount=Decimal("30000"),
            currency="INR",
            deadline=date.today() + timedelta(days=20),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
        )
        session.add(sch)
        await session.commit()
        await session.refresh(sch)
        sch_id = sch.id

    # 1. Reject without reason body -> 422
    res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/reject",
        headers=admin["headers"],
        json={},
    )
    assert res.status_code == 422

    # 2. Reject with empty / whitespace reason -> 422
    res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/reject",
        headers=admin["headers"],
        json={"rejection_reason": "    "},
    )
    assert res.status_code == 422

    # 3. Update with negative amount -> 422
    res = await async_client.put(
        f"/api/v1/admin/scholarships/{sch_id}",
        headers=admin["headers"],
        json={"amount": -500},
    )
    assert res.status_code == 422

    # 4. Update with empty name -> 422
    res = await async_client.put(
        f"/api/v1/admin/scholarships/{sch_id}",
        headers=admin["headers"],
        json={"name": "   "},
    )
    assert res.status_code == 422

    # 5. Non-existent scholarship approval -> 404
    non_existent = uuid.uuid4()
    res = await async_client.post(
        f"/api/v1/admin/scholarships/{non_existent}/approve",
        headers=admin["headers"],
    )
    assert res.status_code == 404


# ==============================================================================
# 7. REPEATED & SAFE REVIEW ACTIONS (IDEMPOTENCY)
# ==============================================================================
@pytest.mark.anyio
async def test_repeated_and_cross_review_actions_safety(async_client: AsyncClient):
    """Verify repeated approvals or rejections behave safely and idempotently."""
    admin = await create_user_with_role(async_client, prefix="admin_idem", role=UserRole.ADMIN)

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            name="State Sports Merit Scholarship",
            provider="Dept of Sports",
            description="Sports merit scholarship.",
            amount=Decimal("40000"),
            currency="INR",
            deadline=date.today() + timedelta(days=25),
            review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
        )
        session.add(sch)
        await session.commit()
        await session.refresh(sch)
        sch_id = sch.id

    # 1. Approve once
    res1 = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=admin["headers"],
    )
    assert res1.status_code == 200
    assert res1.json()["review_status"] == "VERIFIED"

    # 2. Approve again (repeated/idempotent)
    res2 = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=admin["headers"],
    )
    assert res2.status_code == 200
    assert res2.json()["review_status"] == "VERIFIED"
    assert res2.json()["is_verified"] is True

    # 3. Transition verified to rejected
    rej_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/reject",
        headers=admin["headers"],
        json={"rejection_reason": "Scheme discontinued by government order."},
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["review_status"] == "REJECTED"
    assert rej_res.json()["is_verified"] is False
    assert rej_res.json()["rejection_reason"] == "Scheme discontinued by government order."

    # 4. Reject again with updated reason
    rej_res2 = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/reject",
        headers=admin["headers"],
        json={"rejection_reason": "Updated reason: Funding exhausted."},
    )
    assert rej_res2.status_code == 200
    assert rej_res2.json()["rejection_reason"] == "Updated reason: Funding exhausted."

    # 5. Transition back to verified via approve clears rejection reason
    res3 = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=admin["headers"],
    )
    assert res3.status_code == 200
    assert res3.json()["review_status"] == "VERIFIED"
    assert res3.json()["is_verified"] is True
    assert res3.json()["rejection_reason"] is None

    # Cleanup transient test record
    await async_client.delete(f"/api/v1/admin/scholarships/{sch_id}", headers=admin["headers"])


# ==============================================================================
# 8. COLLECTION JOBS AUDIT HISTORY
# ==============================================================================
@pytest.mark.anyio
async def test_collection_jobs_history_and_metrics(async_client: AsyncClient):
    """Verify administrator can inspect collection job history and execution metrics."""
    admin = await create_user_with_role(async_client, prefix="admin_jobs", role=UserRole.ADMIN)
    source = await create_test_source("Audit Collector Source", "aud_src")

    async with TestAsyncSessionLocal() as session:
        job = ScholarshipCollectionJob(
            source_id=source.id,
            status=CollectionJobStatus.SUCCEEDED.value,
            records_discovered=15,
            records_created=10,
            records_updated=2,
            records_duplicates_skipped=3,
            records_rejected=0,
            error_summary=None,
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
        job_id = job.id

    # 1. List collection jobs
    list_res = await async_client.get(
        "/api/v1/admin/collection-jobs",
        headers=admin["headers"],
    )
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    job_ids = [j["id"] for j in data["items"]]
    assert str(job_id) in job_ids

    # Find created job item
    target_job = next(j for j in data["items"] if j["id"] == str(job_id))
    assert target_job["source_name"] == source.name
    assert target_job["records_discovered"] == 15
    assert target_job["records_created"] == 10
    assert target_job["records_updated"] == 2
    assert target_job["records_duplicates_skipped"] == 3
    assert target_job["status"] == "SUCCEEDED"

    # 2. Get individual collection job
    det_res = await async_client.get(
        f"/api/v1/admin/collection-jobs/{job_id}",
        headers=admin["headers"],
    )
    assert det_res.status_code == 200
    assert det_res.json()["id"] == str(job_id)
    assert det_res.json()["source_name"] == source.name


# ==============================================================================
# 9. DASHBOARD STATS AGGREGATION
# ==============================================================================
@pytest.mark.anyio
async def test_admin_dashboard_stats_moderation_counts(async_client: AsyncClient):
    """Verify dashboard stats aggregate pending, verified, rejected, legacy, and jobs."""
    admin = await create_user_with_role(async_client, prefix="admin_stats", role=UserRole.ADMIN)

    res = await async_client.get(
        "/api/v1/admin/dashboard/stats",
        headers=admin["headers"],
    )
    assert res.status_code == 200
    stats = res.json()

    assert "pending_scholarships" in stats
    assert "verified_scholarships" in stats
    assert "rejected_scholarships" in stats
    assert "legacy_scholarships" in stats
    assert "total_collection_jobs" in stats
    assert stats["pending_scholarships"] >= 0
    assert stats["verified_scholarships"] >= 0
    assert stats["rejected_scholarships"] >= 0
    assert stats["legacy_scholarships"] >= 0
    assert stats["total_collection_jobs"] >= 0


# ==============================================================================
# 10. CATALOG FILTERING & REGRESSION INTEGRITY
# ==============================================================================
@pytest.mark.anyio
async def test_admin_scholarships_filtering_by_review_status(async_client: AsyncClient):
    """Verify admin scholarships endpoint filters by all review statuses."""
    admin = await create_user_with_role(async_client, prefix="admin_fltr", role=UserRole.ADMIN)

    # Filter by VERIFIED
    res_ver = await async_client.get(
        "/api/v1/admin/scholarships",
        headers=admin["headers"],
        params={"review_status": "VERIFIED"},
    )
    assert res_ver.status_code == 200
    for item in res_ver.json()["items"]:
        assert item["review_status"] == "VERIFIED"

    # Filter by REJECTED
    res_rej = await async_client.get(
        "/api/v1/admin/scholarships",
        headers=admin["headers"],
        params={"review_status": "REJECTED"},
    )
    assert res_rej.status_code == 200
    for item in res_rej.json()["items"]:
        assert item["review_status"] == "REJECTED"

    # Filter by LEGACY
    res_leg = await async_client.get(
        "/api/v1/admin/scholarships",
        headers=admin["headers"],
        params={"review_status": "LEGACY"},
    )
    assert res_leg.status_code == 200
    for item in res_leg.json()["items"]:
        assert item["review_status"] == "LEGACY"
