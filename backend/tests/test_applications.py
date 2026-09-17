"""Tests for ScholarHub Scholarship Application Tracker APIs (Step 27).

Tests cover:
- Application creation with default and specified initial status
- Nonexistent scholarship handling (404)
- Duplicate application prevention (409 Conflict)
- Application listing, pagination, and tab/status filtering
- Single application retrieval and 404 handling
- Application status updates and applied_at timestamping
- Application deletion and lifecycle cancellation
- Cross-user ownership isolation and security
- Response payload structure and data integrity
"""

from datetime import date, timedelta
from decimal import Decimal
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete

from app.models.application import Application, ApplicationStatus
from app.models.scholarship import Scholarship
from app.models.user import User
from tests.conftest import TestAsyncSessionLocal


async def create_and_auth_user(async_client: AsyncClient, prefix: str = "app_user") -> tuple[dict, dict[str, str], uuid.UUID]:
    """Helper to register, login, and return (user_dict, headers, user_id)."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201
    user_id = uuid.UUID(reg_resp.json()["id"])

    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return reg_resp.json(), headers, user_id


async def create_test_scholarship(
    name: str = "National Excellence Award",
    amount: str = "100000.00",
) -> uuid.UUID:
    """Helper to insert a test scholarship directly into the database."""
    sch_id = uuid.uuid4()
    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            id=sch_id,
            name=name,
            provider="Ministry of Higher Education",
            description="Prestigious award for higher education students.",
            amount=Decimal(amount),
            deadline=date.today() + timedelta(days=45),
            eligibility="Undergraduate students with strong academic standing.",
            benefits=["Full tuition", "Annual stipend"],
            selection_process=["Document Verification", "Merit Evaluation"],
            official_website="https://scholarships.gov.in",
        )
        session.add(sch)
        await session.commit()
    return sch_id


# ==============================================================================
# 1. APPLICATION CREATION TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_create_application_default_status(async_client: AsyncClient) -> None:
    """POST /api/v1/applications creates an application with default SAVED status."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="create_def")
    sch_id = await create_test_scholarship("Default Status Test")

    try:
        resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()

        assert data["user_id"] == str(user_id)
        assert data["scholarship_id"] == str(sch_id)
        assert data["status"] == "SAVED"
        assert data["applied_at"] is None
        assert "created_at" in data
        assert "updated_at" in data
        assert data["scholarship"]["name"] == "Default Status Test"
        assert float(data["scholarship"]["amount"]) == 100000.0
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_create_application_with_custom_status(async_client: AsyncClient) -> None:
    """POST /api/v1/applications allows setting initial status such as PREPARING_DOCUMENTS or APPLIED."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="create_custom")
    sch_id = await create_test_scholarship("Custom Status Test")

    try:
        resp = await async_client.post(
            "/api/v1/applications",
            json={
                "scholarship_id": str(sch_id),
                "status": "APPLIED",
            },
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()

        assert data["status"] == "APPLIED"
        assert data["applied_at"] is not None  # applied_at set automatically when status is APPLIED
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_create_application_nonexistent_scholarship_returns_404(async_client: AsyncClient) -> None:
    """POST /api/v1/applications with nonexistent scholarship UUID returns 404."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="create_404")
    fake_id = uuid.uuid4()

    try:
        resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(fake_id)},
            headers=headers,
        )
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Scholarship not found"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_create_duplicate_application_returns_409(async_client: AsyncClient) -> None:
    """POST /api/v1/applications duplicate attempt returns 409 Conflict."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="dup_test")
    sch_id = await create_test_scholarship("Duplicate Check Award")

    try:
        # First creation succeeds
        resp1 = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        assert resp1.status_code == 201

        # Duplicate creation rejected
        resp2 = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        assert resp2.status_code == 409
        assert "already exists" in resp2.json()["detail"].lower()
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 2. APPLICATION LISTING, PAGINATION & FILTERING TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_list_applications_authenticated_and_paginated(async_client: AsyncClient) -> None:
    """GET /api/v1/applications lists current user's applications with pagination."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="list_apps")
    sch_ids = [await create_test_scholarship(f"List Scholarship {i}") for i in range(3)]

    try:
        for s_id in sch_ids:
            await async_client.post(
                "/api/v1/applications",
                json={"scholarship_id": str(s_id)},
                headers=headers,
            )

        resp = await async_client.get(
            "/api/v1/applications?page=1&page_size=2",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["total"] == 3
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total_pages"] == 2
        assert len(data["items"]) == 2
        assert data["items"][0]["scholarship"]["id"] is not None
    finally:
        async with TestAsyncSessionLocal() as session:
            for s_id in sch_ids:
                await session.execute(delete(Application).where(Application.scholarship_id == s_id))
                await session.execute(delete(Scholarship).where(Scholarship.id == s_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_list_applications_tab_filtering(async_client: AsyncClient) -> None:
    """GET /api/v1/applications?tab=active / completed filters by stage groupings."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="tab_filter")
    sch_active = await create_test_scholarship("Active Scholarship")
    sch_completed = await create_test_scholarship("Completed Scholarship")

    try:
        # Create active application (Stage 2: PREPARING_DOCUMENTS)
        await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_active), "status": "PREPARING_DOCUMENTS"},
            headers=headers,
        )
        # Create completed application (Stage 6: SELECTED)
        await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_completed), "status": "SELECTED"},
            headers=headers,
        )

        # 1. Filter tab=active
        resp_active = await async_client.get("/api/v1/applications?tab=active", headers=headers)
        assert resp_active.status_code == 200
        active_items = resp_active.json()["items"]
        assert len(active_items) == 1
        assert active_items[0]["status"] == "PREPARING_DOCUMENTS"

        # 2. Filter tab=completed
        resp_comp = await async_client.get("/api/v1/applications?tab=completed", headers=headers)
        assert resp_comp.status_code == 200
        comp_items = resp_comp.json()["items"]
        assert len(comp_items) == 1
        assert comp_items[0]["status"] == "SELECTED"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.user_id == user_id))
            await session.execute(delete(Scholarship).where(Scholarship.id.in_([sch_active, sch_completed])))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_list_applications_status_filter(async_client: AsyncClient) -> None:
    """GET /api/v1/applications?status=UNDER_REVIEW filters by exact status."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="status_filter")
    sch1 = await create_test_scholarship("Status Filter 1")
    sch2 = await create_test_scholarship("Status Filter 2")

    try:
        await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch1), "status": "SAVED"},
            headers=headers,
        )
        await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch2), "status": "UNDER_REVIEW"},
            headers=headers,
        )

        resp = await async_client.get("/api/v1/applications?status=UNDER_REVIEW", headers=headers)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["status"] == "UNDER_REVIEW"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.user_id == user_id))
            await session.execute(delete(Scholarship).where(Scholarship.id.in_([sch1, sch2])))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 3. SINGLE APPLICATION DETAILS TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_get_application_by_id_success(async_client: AsyncClient) -> None:
    """GET /api/v1/applications/{id} returns full application details."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="get_single")
    sch_id = await create_test_scholarship("Single App Detail")

    try:
        create_resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        get_resp = await async_client.get(f"/api/v1/applications/{app_id}", headers=headers)
        assert get_resp.status_code == 200
        data = get_resp.json()

        assert data["id"] == app_id
        assert data["scholarship_id"] == str(sch_id)
        assert data["scholarship"]["name"] == "Single App Detail"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_get_application_nonexistent_returns_404(async_client: AsyncClient) -> None:
    """GET /api/v1/applications/{id} with unknown UUID returns 404."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="get_404")
    fake_id = uuid.uuid4()

    try:
        resp = await async_client.get(f"/api/v1/applications/{fake_id}", headers=headers)
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Application not found"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 4. APPLICATION STATUS UPDATE TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_update_application_status_lifecycle(async_client: AsyncClient) -> None:
    """PATCH /api/v1/applications/{id}/status progresses status through canonical stages."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="status_update")
    sch_id = await create_test_scholarship("Status Lifecycle")

    try:
        create_resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id), "status": "SAVED"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]
        assert create_resp.json()["applied_at"] is None

        # 1. Update to PREPARING_DOCUMENTS
        resp1 = await async_client.patch(
            f"/api/v1/applications/{app_id}/status",
            json={"status": "PREPARING_DOCUMENTS"},
            headers=headers,
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "PREPARING_DOCUMENTS"

        # 2. Update to APPLIED (triggers applied_at timestamping)
        resp2 = await async_client.patch(
            f"/api/v1/applications/{app_id}/status",
            json={"status": "APPLIED"},
            headers=headers,
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "APPLIED"
        assert resp2.json()["applied_at"] is not None
        applied_time = resp2.json()["applied_at"]

        # 3. Update to UNDER_REVIEW
        resp3 = await async_client.patch(
            f"/api/v1/applications/{app_id}/status",
            json={"status": "UNDER_REVIEW"},
            headers=headers,
        )
        assert resp3.status_code == 200
        assert resp3.json()["status"] == "UNDER_REVIEW"
        assert resp3.json()["applied_at"] == applied_time  # Preserves initial applied_at

        # 4. Advance through INTERVIEW -> SELECTED -> SCHOLARSHIP_RECEIVED
        for target_status in ["INTERVIEW", "SELECTED", "SCHOLARSHIP_RECEIVED"]:
            step_resp = await async_client.patch(
                f"/api/v1/applications/{app_id}/status",
                json={"status": target_status},
                headers=headers,
            )
            assert step_resp.status_code == 200
            assert step_resp.json()["status"] == target_status
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_update_application_invalid_status_returns_422(async_client: AsyncClient) -> None:
    """PATCH /api/v1/applications/{id}/status with invalid enum value returns 422."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="bad_status")
    sch_id = await create_test_scholarship("Invalid Status Test")

    try:
        create_resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        resp = await async_client.patch(
            f"/api/v1/applications/{app_id}/status",
            json={"status": "INVALID_STAGE_NAME"},
            headers=headers,
        )
        assert resp.status_code == 422
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 5. APPLICATION DELETION / CANCELLATION TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_delete_application_success_and_recreation(async_client: AsyncClient) -> None:
    """DELETE /api/v1/applications/{id} removes record and permits subsequent re-application."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="del_app")
    sch_id = await create_test_scholarship("Deletion Lifecycle Award")

    try:
        # Create
        create_resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        # Delete
        del_resp = await async_client.delete(f"/api/v1/applications/{app_id}", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["message"] == "Application deleted successfully"

        # Verify 404 on subsequent get
        get_resp = await async_client.get(f"/api/v1/applications/{app_id}", headers=headers)
        assert get_resp.status_code == 404

        # Verify student can re-apply to the scholarship now that previous application was removed
        reapply_resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers,
        )
        assert reapply_resp.status_code == 201
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 6. CROSS-USER ISOLATION & SECURITY TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_application_cross_user_isolation(async_client: AsyncClient) -> None:
    """Ensure User B cannot list, retrieve, update, or delete User A's application."""
    _, headers_a, user_a_id = await create_and_auth_user(async_client, prefix="user_a")
    _, headers_b, user_b_id = await create_and_auth_user(async_client, prefix="user_b")
    sch_id = await create_test_scholarship("Isolation Test Award")

    try:
        # User A creates application
        create_resp = await async_client.post(
            "/api/v1/applications",
            json={"scholarship_id": str(sch_id)},
            headers=headers_a,
        )
        assert create_resp.status_code == 201
        app_a_id = create_resp.json()["id"]

        # 1. User B lists applications -> Does NOT contain User A's application
        list_b_resp = await async_client.get("/api/v1/applications", headers=headers_b)
        assert list_b_resp.status_code == 200
        assert not any(item["id"] == app_a_id for item in list_b_resp.json()["items"])

        # 2. User B attempts to get User A's application -> 404
        get_b_resp = await async_client.get(f"/api/v1/applications/{app_a_id}", headers=headers_b)
        assert get_b_resp.status_code == 404

        # 3. User B attempts to update User A's application -> 404
        patch_b_resp = await async_client.patch(
            f"/api/v1/applications/{app_a_id}/status",
            json={"status": "APPLIED"},
            headers=headers_b,
        )
        assert patch_b_resp.status_code == 404

        # 4. User B attempts to delete User A's application -> 404
        del_b_resp = await async_client.delete(f"/api/v1/applications/{app_a_id}", headers=headers_b)
        assert del_b_resp.status_code == 404

        # 5. User A can still retrieve and manage their own application
        get_a_resp = await async_client.get(f"/api/v1/applications/{app_a_id}", headers=headers_a)
        assert get_a_resp.status_code == 200
        assert get_a_resp.json()["status"] == "SAVED"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Application).where(Application.scholarship_id == sch_id))
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id.in_([user_a_id, user_b_id])))
            await session.commit()


# ==============================================================================
# 7. UNAUTHENTICATED ACCESS TESTS (401)
# ==============================================================================
@pytest.mark.anyio
async def test_unauthenticated_requests_return_401(async_client: AsyncClient) -> None:
    """All application endpoints require authentication and return 401 if missing JWT."""
    random_id = uuid.uuid4()

    post_resp = await async_client.post("/api/v1/applications", json={"scholarship_id": str(random_id)})
    assert post_resp.status_code == 401

    get_all_resp = await async_client.get("/api/v1/applications")
    assert get_all_resp.status_code == 401

    get_one_resp = await async_client.get(f"/api/v1/applications/{random_id}")
    assert get_one_resp.status_code == 401

    patch_resp = await async_client.patch(f"/api/v1/applications/{random_id}/status", json={"status": "APPLIED"})
    assert patch_resp.status_code == 401

    del_resp = await async_client.delete(f"/api/v1/applications/{random_id}")
    assert del_resp.status_code == 401
