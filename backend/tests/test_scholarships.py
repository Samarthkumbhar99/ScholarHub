from datetime import date, timedelta
from decimal import Decimal
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.scholarship import Scholarship, ScholarshipRequirement
from app.models.user import User
from tests.conftest import TestAsyncSessionLocal


@pytest.fixture
async def test_user_and_token(async_client: AsyncClient) -> tuple[dict, str]:
    """Create an isolated test user and return the user and access token."""
    email = f"sch_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "ValidPassword123!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()

    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return user_data, token


@pytest.fixture
async def auth_headers(test_user_and_token: tuple[dict, str]) -> dict[str, str]:
    _, token = test_user_and_token
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sample_scholarships() -> list[dict]:
    """Insert 3 distinct test scholarships and clean them up after test."""
    today = date.today()
    sch1_id = uuid.uuid4()
    sch2_id = uuid.uuid4()
    sch3_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        sch1 = Scholarship(
            id=sch1_id,
            name="Alpha Merit Scholarship",
            provider="Apex Foundation",
            description="Prestigious merit grant for top performing students in STEM fields.",
            amount=Decimal("50000.00"),
            deadline=today + timedelta(days=10),
            eligibility="Minimum 8.5 CGPA required",
            benefits=["Full tuition waiver", "Laptop grant"],
            selection_process=["Merit screening", "Interview"],
            official_website="https://apex.example.org",
        )
        sch2 = Scholarship(
            id=sch2_id,
            name="Beta Need-Based Grant",
            provider="Global Trust",
            description="Financial support for students with annual family income under 4 lakhs.",
            amount=Decimal("120000.00"),
            deadline=today + timedelta(days=30),
            eligibility="Family income under INR 4,00,000 per annum",
            benefits=["Monthly stipend of ₹10,000", "Book allowance"],
            selection_process=["Income document verification"],
            official_website="https://globaltrust.example.org",
        )
        sch3 = Scholarship(
            id=sch3_id,
            name="Gamma Research Fellowship",
            provider="Apex Research Labs",
            description="Doctoral and postgraduate fellowship for cutting-edge computing research.",
            amount=Decimal("80000.00"),
            deadline=today + timedelta(days=20),
            eligibility="Enrolled in accredited postgraduate computing program",
            benefits=["Research publication subsidy"],
            selection_process=["Proposal evaluation", "Peer review"],
            official_website="https://apexresearch.example.org",
        )

        req1 = ScholarshipRequirement(
            id=uuid.uuid4(),
            scholarship_id=sch1_id,
            name="Official Academic Transcripts",
            document_type="marksheet",
            required=True,
        )
        req2 = ScholarshipRequirement(
            id=uuid.uuid4(),
            scholarship_id=sch1_id,
            name="Letter of Recommendation",
            document_type="recommendation_letter",
            required=False,
        )

        session.add_all([sch1, sch2, sch3, req1, req2])
        await session.commit()

    yield [
        {"id": sch1_id, "name": "Alpha Merit Scholarship", "amount": Decimal("50000.00")},
        {"id": sch2_id, "name": "Beta Need-Based Grant", "amount": Decimal("120000.00")},
        {"id": sch3_id, "name": "Gamma Research Fellowship", "amount": Decimal("80000.00")},
    ]

    # Cleanup
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            delete(ScholarshipRequirement).where(
                ScholarshipRequirement.scholarship_id.in_([sch1_id, sch2_id, sch3_id])
            )
        )
        await session.execute(
            delete(Scholarship).where(Scholarship.id.in_([sch1_id, sch2_id, sch3_id]))
        )
        await session.commit()


# ==============================================================================
# TEST CASES
# ==============================================================================

@pytest.mark.anyio
async def test_list_scholarships_returns_200(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test GET /api/v1/scholarships returns 200 with paginated structure."""
    response = await async_client.get("/api/v1/scholarships", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "total_pages" in data
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert data["total"] >= 3
    assert len(data["items"]) >= 3


@pytest.mark.anyio
async def test_empty_scholarship_search_returns_empty_items(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
):
    """Test search yielding no results returns 200 with empty items and total 0."""
    response = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "nonexistent_term_xyz_12345"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["total_pages"] == 0
    assert data["page"] == 1


@pytest.mark.anyio
async def test_scholarship_pagination(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test pagination parameters page and page_size."""
    response_p1 = await async_client.get(
        "/api/v1/scholarships",
        params={"page": 1, "page_size": 2},
        headers=auth_headers,
    )
    assert response_p1.status_code == 200
    data_p1 = response_p1.json()
    assert data_p1["page"] == 1
    assert data_p1["page_size"] == 2
    assert len(data_p1["items"]) == 2

    response_p2 = await async_client.get(
        "/api/v1/scholarships",
        params={"page": 2, "page_size": 2},
        headers=auth_headers,
    )
    assert response_p2.status_code == 200
    data_p2 = response_p2.json()
    assert data_p2["page"] == 2
    assert data_p2["page_size"] == 2
    assert len(data_p2["items"]) >= 1

    # Ensure items on page 1 and page 2 are distinct
    p1_ids = {item["id"] for item in data_p1["items"]}
    p2_ids = {item["id"] for item in data_p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)


@pytest.mark.anyio
async def test_pagination_limits_enforced(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
):
    """Test page_size > 100 or page < 1 return 422 Unprocessable Entity."""
    # page_size too large
    res_large = await async_client.get(
        "/api/v1/scholarships",
        params={"page_size": 101},
        headers=auth_headers,
    )
    assert res_large.status_code == 422

    # page < 1
    res_zero = await async_client.get(
        "/api/v1/scholarships",
        params={"page": 0},
        headers=auth_headers,
    )
    assert res_zero.status_code == 422

    # page_size < 1
    res_neg = await async_client.get(
        "/api/v1/scholarships",
        params={"page_size": 0},
        headers=auth_headers,
    )
    assert res_neg.status_code == 422


@pytest.mark.anyio
async def test_search_case_insensitive(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test case-insensitive text search across name, provider, and description."""
    # Search name with lower case
    res1 = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "alpha merit"},
        headers=auth_headers,
    )
    assert res1.status_code == 200
    items1 = res1.json()["items"]
    assert any(i["name"] == "Alpha Merit Scholarship" for i in items1)

    # Search provider with mixed case
    res2 = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "gLoBaL tRuSt"},
        headers=auth_headers,
    )
    assert res2.status_code == 200
    items2 = res2.json()["items"]
    assert any(i["name"] == "Beta Need-Based Grant" for i in items2)

    # Search description keyword
    res3 = await async_client.get(
        "/api/v1/scholarships",
        params={"q": "cutting-edge computing"},
        headers=auth_headers,
    )
    assert res3.status_code == 200
    items3 = res3.json()["items"]
    assert any(i["name"] == "Gamma Research Fellowship" for i in items3)


@pytest.mark.anyio
async def test_provider_filtering(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test filtering by provider substring."""
    res = await async_client.get(
        "/api/v1/scholarships",
        params={"provider": "Apex"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 2
    assert all("Apex" in i["provider"] for i in items)


@pytest.mark.anyio
async def test_amount_filtering(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test filtering by min_amount and max_amount."""
    # min_amount 60,000 should exclude Alpha (50,000)
    res_min = await async_client.get(
        "/api/v1/scholarships",
        params={"min_amount": 60000},
        headers=auth_headers,
    )
    assert res_min.status_code == 200
    min_items = res_min.json()["items"]
    assert all(float(i["amount"]) >= 60000 for i in min_items)
    assert not any(i["name"] == "Alpha Merit Scholarship" for i in min_items)

    # max_amount 75,000 should only include Alpha (50,000) among our samples
    res_max = await async_client.get(
        "/api/v1/scholarships",
        params={"max_amount": 75000},
        headers=auth_headers,
    )
    assert res_max.status_code == 200
    max_items = res_max.json()["items"]
    assert all(float(i["amount"]) <= 75000 for i in max_items)
    assert any(i["name"] == "Alpha Merit Scholarship" for i in max_items)

    # Combined range [60000, 100000] should match Gamma (80000)
    res_range = await async_client.get(
        "/api/v1/scholarships",
        params={"min_amount": 60000, "max_amount": 100000},
        headers=auth_headers,
    )
    assert res_range.status_code == 200
    range_items = res_range.json()["items"]
    assert any(i["name"] == "Gamma Research Fellowship" for i in range_items)
    assert not any(i["name"] == "Beta Need-Based Grant" for i in range_items)


@pytest.mark.anyio
async def test_deadline_filtering(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test filtering by deadline_from and deadline_to."""
    today = date.today()
    from_date = (today + timedelta(days=15)).isoformat()
    to_date = (today + timedelta(days=25)).isoformat()

    res = await async_client.get(
        "/api/v1/scholarships",
        params={"deadline_from": from_date, "deadline_to": to_date},
        headers=auth_headers,
    )
    assert res.status_code == 200
    items = res.json()["items"]
    # Gamma deadline is today + 20 days, which is in range
    assert any(i["name"] == "Gamma Research Fellowship" for i in items)
    # Alpha deadline is today + 10 days, outside range
    assert not any(i["name"] == "Alpha Merit Scholarship" for i in items)


@pytest.mark.anyio
async def test_sorting_options(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test each allowed sorting option."""
    # Amount descending
    res_amt_desc = await async_client.get(
        "/api/v1/scholarships",
        params={"sort_by": "amount_desc"},
        headers=auth_headers,
    )
    assert res_amt_desc.status_code == 200
    items = res_amt_desc.json()["items"]
    amounts = [float(i["amount"]) for i in items]
    assert amounts == sorted(amounts, reverse=True)

    # Amount ascending
    res_amt_asc = await async_client.get(
        "/api/v1/scholarships",
        params={"sort_by": "amount_asc"},
        headers=auth_headers,
    )
    assert res_amt_asc.status_code == 200
    items_asc = res_amt_asc.json()["items"]
    amounts_asc = [float(i["amount"]) for i in items_asc]
    assert amounts_asc == sorted(amounts_asc)

    # Name ascending
    res_name_asc = await async_client.get(
        "/api/v1/scholarships",
        params={"sort_by": "name_asc"},
        headers=auth_headers,
    )
    assert res_name_asc.status_code == 200
    names = [i["name"] for i in res_name_asc.json()["items"]]
    assert names == sorted(names)

    # Name descending
    res_name_desc = await async_client.get(
        "/api/v1/scholarships",
        params={"sort_by": "name_desc"},
        headers=auth_headers,
    )
    assert res_name_desc.status_code == 200
    names_desc = [i["name"] for i in res_name_desc.json()["items"]]
    assert names_desc == sorted(names_desc, reverse=True)

    # Deadline ascending (default)
    res_dl_asc = await async_client.get(
        "/api/v1/scholarships",
        params={"sort_by": "deadline_asc"},
        headers=auth_headers,
    )
    assert res_dl_asc.status_code == 200
    deadlines = [i["deadline"] for i in res_dl_asc.json()["items"]]
    assert deadlines == sorted(deadlines)


@pytest.mark.anyio
async def test_invalid_sort_option_returns_422(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
):
    """Test that client-supplied arbitrary sort field is rejected with 422."""
    response = await async_client.get(
        "/api/v1/scholarships",
        params={"sort_by": "drop_table_scholarships"},
        headers=auth_headers,
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_get_scholarship_details_200(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test GET /api/v1/scholarships/{scholarship_id} returns complete scholarship details."""
    target_id = sample_scholarships[0]["id"]
    response = await async_client.get(
        f"/api/v1/scholarships/{target_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(target_id)
    assert data["name"] == "Alpha Merit Scholarship"
    assert data["provider"] == "Apex Foundation"
    assert "benefits" in data
    assert "Full tuition waiver" in data["benefits"]
    assert "selection_process" in data
    assert "Merit screening" in data["selection_process"]
    assert data["official_website"] == "https://apex.example.org"
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.anyio
async def test_get_nonexistent_scholarship_details_returns_404(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
):
    """Test GET /api/v1/scholarships/{scholarship_id} returns 404 for non-existent UUID."""
    fake_id = uuid.uuid4()
    response = await async_client.get(
        f"/api/v1/scholarships/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Scholarship not found"


@pytest.mark.anyio
async def test_get_scholarship_requirements_returns_200(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test GET /api/v1/scholarships/{scholarship_id}/requirements returns requirements list."""
    target_id = sample_scholarships[0]["id"]
    response = await async_client.get(
        f"/api/v1/scholarships/{target_id}/requirements",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    req_names = [r["name"] for r in data]
    assert "Official Academic Transcripts" in req_names
    assert "Letter of Recommendation" in req_names
    assert all("document_type" in r for r in data)
    assert all("required" in r for r in data)


@pytest.mark.anyio
async def test_get_requirements_for_scholarship_without_requirements_returns_empty_list(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Test scholarship with no requirements returns empty list [] with 200 OK."""
    # sample_scholarships[1] (Beta Need-Based Grant) has no requirements inserted
    target_id = sample_scholarships[1]["id"]
    response = await async_client.get(
        f"/api/v1/scholarships/{target_id}/requirements",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_get_requirements_for_nonexistent_scholarship_returns_404(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
):
    """Test GET requirements for non-existent scholarship returns 404."""
    fake_id = uuid.uuid4()
    response = await async_client.get(
        f"/api/v1/scholarships/{fake_id}/requirements",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Scholarship not found"


@pytest.mark.anyio
async def test_invalid_uuid_returns_422(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
):
    """Test providing invalid UUID string returns 422."""
    res1 = await async_client.get(
        "/api/v1/scholarships/invalid-uuid-format-123",
        headers=auth_headers,
    )
    assert res1.status_code == 422

    res2 = await async_client.get(
        "/api/v1/scholarships/invalid-uuid-format-123/requirements",
        headers=auth_headers,
    )
    assert res2.status_code == 422


@pytest.mark.anyio
async def test_unauthorized_access_returns_401(
    async_client: AsyncClient,
    sample_scholarships: list[dict],
):
    """Test that all scholarship endpoints reject unauthenticated requests with 401."""
    sch_id = sample_scholarships[0]["id"]

    # 1. List
    res_list = await async_client.get("/api/v1/scholarships")
    assert res_list.status_code == 401

    # 2. Details
    res_detail = await async_client.get(f"/api/v1/scholarships/{sch_id}")
    assert res_detail.status_code == 401

    # 3. Requirements
    res_req = await async_client.get(f"/api/v1/scholarships/{sch_id}/requirements")
    assert res_req.status_code == 401


@pytest.mark.anyio
async def test_no_sensitive_or_user_data_exposed(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    sample_scholarships: list[dict],
):
    """Verify scholarship endpoints do not leak password_hash or user info."""
    sch_id = sample_scholarships[0]["id"]
    res_list = await async_client.get("/api/v1/scholarships", headers=auth_headers)
    res_detail = await async_client.get(f"/api/v1/scholarships/{sch_id}", headers=auth_headers)
    res_req = await async_client.get(f"/api/v1/scholarships/{sch_id}/requirements", headers=auth_headers)

    for resp in [res_list, res_detail, res_req]:
        text_content = resp.text
        assert "password_hash" not in text_content
        assert "password" not in text_content
        assert "hashed_password" not in text_content
