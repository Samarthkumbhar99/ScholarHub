from datetime import date, timedelta
from decimal import Decimal
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete

from app.models.scholarship import SavedScholarship, Scholarship
from tests.conftest import TestAsyncSessionLocal


async def create_and_auth_user(async_client: AsyncClient, prefix: str = "user") -> tuple[dict, dict[str, str]]:
    """Helper to register, login, and return (user_dict, headers)."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201

    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return reg_resp.json(), headers


@pytest.fixture
async def sample_scholarships() -> list[dict]:
    """Create 4 test scholarships for save and compare tests."""
    today = date.today()
    ids = [uuid.uuid4() for _ in range(4)]

    async with TestAsyncSessionLocal() as session:
        sch1 = Scholarship(
            id=ids[0],
            name="Merit Excellence Award",
            provider="National Science Board",
            description="Prestigious STEM award for meritorious scholars.",
            amount=Decimal("100000.00"),
            deadline=today + timedelta(days=15),
            eligibility="Min 8.5 CGPA",
            benefits=["Full tuition", "Book stipend"],
            selection_process=["Written test", "Interview"],
            official_website="https://nsb.example.org",
        )
        sch2 = Scholarship(
            id=ids[1],
            name="Opportunity Grant",
            provider="Future Trust",
            description="Need-based financial aid for low income households.",
            amount=Decimal("75000.00"),
            deadline=today + timedelta(days=30),
            eligibility="Annual income below 3 Lakhs",
            benefits=["Living allowance"],
            selection_process=["Document verification"],
            official_website="https://futuretrust.example.org",
        )
        sch3 = Scholarship(
            id=ids[2],
            name="Global Research Fellowship",
            provider="International Academic Exchange",
            description="Fellowship for study abroad and research collaboration.",
            amount=Decimal("250000.00"),
            deadline=today + timedelta(days=45),
            eligibility="Postgraduate research enrollment",
            benefits=["Travel grant", "Lab access stipend"],
            selection_process=["Research proposal evaluation"],
            official_website="https://iaexchange.example.org",
        )
        sch4 = Scholarship(
            id=ids[3],
            name="Tech Innovators Bursary",
            provider="Tech Corp Foundation",
            description="Grant for software and hardware innovators.",
            amount=Decimal("50000.00"),
            deadline=today + timedelta(days=60),
            eligibility="CS / IT undergraduate",
            benefits=["Mentorship", "Hackathon sponsorship"],
            selection_process=["Code submission"],
            official_website="https://techcorp.example.org",
        )
        session.add_all([sch1, sch2, sch3, sch4])
        await session.commit()

    yield [{"id": i} for i in ids]

    # Cleanup
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            delete(SavedScholarship).where(SavedScholarship.scholarship_id.in_(ids))
        )
        await session.execute(
            delete(Scholarship).where(Scholarship.id.in_(ids))
        )
        await session.commit()


# ==============================================================================
# SAVE / UNSAVE / SAVED STATUS TESTS
# ==============================================================================

@pytest.mark.anyio
async def test_save_scholarship_success(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test POST /api/v1/scholarships/{scholarship_id}/save saves a scholarship."""
    _, headers = await create_and_auth_user(async_client, "save_user")
    sch_id = sample_scholarships[0]["id"]

    response = await async_client.post(
        f"/api/v1/scholarships/{sch_id}/save",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["scholarship_id"] == str(sch_id)
    assert data["saved"] is True


@pytest.mark.anyio
async def test_save_nonexistent_scholarship_returns_404(
    async_client: AsyncClient,
):
    """Test saving a non-existent scholarship returns 404."""
    _, headers = await create_and_auth_user(async_client, "save_404")
    fake_id = uuid.uuid4()

    response = await async_client.post(
        f"/api/v1/scholarships/{fake_id}/save",
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Scholarship not found"


@pytest.mark.anyio
async def test_duplicate_save_is_idempotent(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test saving an already-saved scholarship returns 200 without creating duplicate records."""
    _, headers = await create_and_auth_user(async_client, "dup_save")
    sch_id = sample_scholarships[0]["id"]

    res1 = await async_client.post(f"/api/v1/scholarships/{sch_id}/save", headers=headers)
    assert res1.status_code == 200
    assert res1.json()["saved"] is True

    res2 = await async_client.post(f"/api/v1/scholarships/{sch_id}/save", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["saved"] is True


@pytest.mark.anyio
async def test_check_saved_status(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test GET /api/v1/scholarships/{scholarship_id}/saved returns correct boolean status."""
    _, headers = await create_and_auth_user(async_client, "check_status")
    sch_id = sample_scholarships[0]["id"]

    # 1. Initially not saved
    res1 = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved", headers=headers)
    assert res1.status_code == 200
    assert res1.json()["saved"] is False

    # 2. Save
    await async_client.post(f"/api/v1/scholarships/{sch_id}/save", headers=headers)

    # 3. Now saved
    res2 = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["saved"] is True


@pytest.mark.anyio
async def test_check_saved_status_nonexistent_returns_404(
    async_client: AsyncClient,
):
    """Test checking saved status of a non-existent scholarship returns 404."""
    _, headers = await create_and_auth_user(async_client, "check_404")
    fake_id = uuid.uuid4()

    response = await async_client.get(f"/api/v1/scholarships/{fake_id}/saved", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Scholarship not found"


@pytest.mark.anyio
async def test_unsave_scholarship_success(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test DELETE /api/v1/scholarships/{scholarship_id}/save removes bookmark."""
    _, headers = await create_and_auth_user(async_client, "unsave_user")
    sch_id = sample_scholarships[0]["id"]

    # Save first
    await async_client.post(f"/api/v1/scholarships/{sch_id}/save", headers=headers)

    # Unsave
    res_unsave = await async_client.delete(f"/api/v1/scholarships/{sch_id}/save", headers=headers)
    assert res_unsave.status_code == 200
    assert res_unsave.json()["saved"] is False

    # Check status
    res_status = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved", headers=headers)
    assert res_status.json()["saved"] is False


@pytest.mark.anyio
async def test_unsave_nonexistent_scholarship_returns_404(
    async_client: AsyncClient,
):
    """Test unsaving a non-existent scholarship returns 404."""
    _, headers = await create_and_auth_user(async_client, "unsave_404")
    fake_id = uuid.uuid4()

    response = await async_client.delete(f"/api/v1/scholarships/{fake_id}/save", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Scholarship not found"


@pytest.mark.anyio
async def test_unsave_when_not_previously_saved_is_idempotent(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test unsaving a scholarship that was never saved returns 200 with saved=false."""
    _, headers = await create_and_auth_user(async_client, "unsave_unsaved")
    sch_id = sample_scholarships[0]["id"]

    response = await async_client.delete(f"/api/v1/scholarships/{sch_id}/save", headers=headers)
    assert response.status_code == 200
    assert response.json()["saved"] is False


# ==============================================================================
# GET SAVED SCHOLARSHIPS LIST TESTS
# ==============================================================================

@pytest.mark.anyio
async def test_get_saved_scholarships_list(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test GET /api/v1/scholarships/saved retrieves all bookmarked scholarships with pagination."""
    _, headers = await create_and_auth_user(async_client, "saved_list_user")
    sch1 = sample_scholarships[0]["id"]
    sch2 = sample_scholarships[1]["id"]

    # 1. Initially empty
    res_init = await async_client.get("/api/v1/scholarships/saved", headers=headers)
    assert res_init.status_code == 200
    assert res_init.json()["items"] == []
    assert res_init.json()["total"] == 0

    # 2. Save 2 scholarships
    await async_client.post(f"/api/v1/scholarships/{sch1}/save", headers=headers)
    await async_client.post(f"/api/v1/scholarships/{sch2}/save", headers=headers)

    # 3. Retrieve saved list
    res_saved = await async_client.get("/api/v1/scholarships/saved", headers=headers)
    assert res_saved.status_code == 200
    data = res_saved.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    saved_ids = [item["id"] for item in data["items"]]
    assert str(sch1) in saved_ids
    assert str(sch2) in saved_ids
    assert "name" in data["items"][0]
    assert "amount" in data["items"][0]
    assert "provider" in data["items"][0]


@pytest.mark.anyio
async def test_saved_scholarships_pagination(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test pagination on saved scholarships list."""
    _, headers = await create_and_auth_user(async_client, "saved_page_user")
    for sch in sample_scholarships[:3]:
        await async_client.post(f"/api/v1/scholarships/{sch['id']}/save", headers=headers)

    # Page 1 with size 2
    res_p1 = await async_client.get(
        "/api/v1/scholarships/saved",
        params={"page": 1, "page_size": 2},
        headers=headers,
    )
    assert res_p1.status_code == 200
    assert len(res_p1.json()["items"]) == 2
    assert res_p1.json()["total"] == 3
    assert res_p1.json()["total_pages"] == 2

    # Page 2 with size 2
    res_p2 = await async_client.get(
        "/api/v1/scholarships/saved",
        params={"page": 2, "page_size": 2},
        headers=headers,
    )
    assert res_p2.status_code == 200
    assert len(res_p2.json()["items"]) == 1


# ==============================================================================
# CROSS-USER ISOLATION TESTS
# ==============================================================================

@pytest.mark.anyio
async def test_saved_scholarships_cross_user_isolation(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Verify complete ownership isolation between User A and User B."""
    _, headers_a = await create_and_auth_user(async_client, "user_a")
    _, headers_b = await create_and_auth_user(async_client, "user_b")
    sch_id = sample_scholarships[0]["id"]

    # User A saves scholarship
    await async_client.post(f"/api/v1/scholarships/{sch_id}/save", headers=headers_a)

    # User A sees saved=True
    res_a_stat = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved", headers=headers_a)
    assert res_a_stat.json()["saved"] is True

    # User B sees saved=False
    res_b_stat = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved", headers=headers_b)
    assert res_b_stat.json()["saved"] is False

    # User A saved list has 1 item
    res_a_list = await async_client.get("/api/v1/scholarships/saved", headers=headers_a)
    assert res_a_list.json()["total"] == 1

    # User B saved list has 0 items
    res_b_list = await async_client.get("/api/v1/scholarships/saved", headers=headers_b)
    assert res_b_list.json()["total"] == 0

    # User B tries to unsave the scholarship
    await async_client.delete(f"/api/v1/scholarships/{sch_id}/save", headers=headers_b)

    # User A's save record is untouched
    res_a_check = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved", headers=headers_a)
    assert res_a_check.json()["saved"] is True


# ==============================================================================
# COMPARE ENDPOINT TESTS
# ==============================================================================

@pytest.mark.anyio
async def test_compare_valid_scholarships(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test GET /api/v1/scholarships/compare with 2 to 3 valid scholarship UUIDs."""
    _, headers = await create_and_auth_user(async_client, "compare_user")
    sch1 = sample_scholarships[0]["id"]
    sch2 = sample_scholarships[1]["id"]
    sch3 = sample_scholarships[2]["id"]

    # Compare 2 scholarships
    res2 = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": f"{sch1},{sch2}"},
        headers=headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["count"] == 2
    assert len(data2["items"]) == 2
    assert data2["items"][0]["id"] == str(sch1)
    assert data2["items"][1]["id"] == str(sch2)
    assert "benefits" in data2["items"][0]
    assert "selection_process" in data2["items"][0]

    # Compare 3 scholarships
    res3 = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": f"{sch1},{sch2},{sch3}"},
        headers=headers,
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["count"] == 3
    assert len(data3["items"]) == 3


@pytest.mark.anyio
async def test_compare_handles_missing_or_duplicate_ids(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test compare gracefully handles duplicate IDs and filters out non-existent ones."""
    _, headers = await create_and_auth_user(async_client, "compare_dup")
    sch1 = sample_scholarships[0]["id"]
    sch2 = sample_scholarships[1]["id"]
    fake_id = uuid.uuid4()

    # Duplicates should be deduplicated without exceeding max limit error
    res_dup = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": f"{sch1},{sch1},{sch2}"},
        headers=headers,
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["count"] == 2

    # Non-existent ID is gracefully omitted from items
    res_missing = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": f"{sch1},{fake_id}"},
        headers=headers,
    )
    assert res_missing.status_code == 200
    assert res_missing.json()["count"] == 1
    assert res_missing.json()["items"][0]["id"] == str(sch1)


@pytest.mark.anyio
async def test_compare_limit_exceeded_returns_422(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test comparing more than 3 distinct scholarships returns 422."""
    _, headers = await create_and_auth_user(async_client, "compare_limit")
    ids = [str(s["id"]) for s in sample_scholarships[:4]]

    response = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": ",".join(ids)},
        headers=headers,
    )
    assert response.status_code == 422
    assert "You can compare up to 3 scholarships" in response.json()["detail"]


@pytest.mark.anyio
async def test_compare_invalid_or_empty_uuid_returns_422(
    async_client: AsyncClient,
):
    """Test invalid or malformed UUID strings in compare return 422."""
    _, headers = await create_and_auth_user(async_client, "compare_err")

    # Invalid UUID format
    res_invalid = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": "not-a-valid-uuid,also-invalid"},
        headers=headers,
    )
    assert res_invalid.status_code == 422

    # Empty string
    res_empty = await async_client.get(
        "/api/v1/scholarships/compare",
        params={"ids": "   "},
        headers=headers,
    )
    assert res_empty.status_code == 422


# ==============================================================================
# UNAUTHORIZED ACCESS TESTS
# ==============================================================================

@pytest.mark.anyio
async def test_unauthorized_endpoints_return_401(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test unauthenticated calls to all save/compare endpoints return 401."""
    sch_id = sample_scholarships[0]["id"]

    # 1. Save
    res_save = await async_client.post(f"/api/v1/scholarships/{sch_id}/save")
    assert res_save.status_code == 401

    # 2. Unsave
    res_unsave = await async_client.delete(f"/api/v1/scholarships/{sch_id}/save")
    assert res_unsave.status_code == 401

    # 3. Check status
    res_status = await async_client.get(f"/api/v1/scholarships/{sch_id}/saved")
    assert res_status.status_code == 401

    # 4. Get saved list
    res_list = await async_client.get("/api/v1/scholarships/saved")
    assert res_list.status_code == 401

    # 5. Compare
    res_compare = await async_client.get(f"/api/v1/scholarships/compare?ids={sch_id}")
    assert res_compare.status_code == 401


# ==============================================================================
# SENSITIVE DATA LEAKAGE TEST
# ==============================================================================

@pytest.mark.anyio
async def test_no_sensitive_fields_in_responses(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Ensure no password hashes or internal fields leak in responses."""
    _, headers = await create_and_auth_user(async_client, "leak_check")
    sch1 = sample_scholarships[0]["id"]
    sch2 = sample_scholarships[1]["id"]

    # Save
    res_save = await async_client.post(f"/api/v1/scholarships/{sch1}/save", headers=headers)
    res_stat = await async_client.get(f"/api/v1/scholarships/{sch1}/saved", headers=headers)
    res_list = await async_client.get("/api/v1/scholarships/saved", headers=headers)
    res_comp = await async_client.get(f"/api/v1/scholarships/compare?ids={sch1},{sch2}", headers=headers)

    for resp in [res_save, res_stat, res_list, res_comp]:
        text = resp.text
        assert "password_hash" not in text
        assert "password" not in text
        assert "hashed_password" not in text
