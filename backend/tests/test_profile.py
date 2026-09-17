import uuid
from decimal import Decimal
import pytest
from httpx import AsyncClient

from app.models.profile import StudyPreference


async def create_and_authenticate_user(async_client: AsyncClient, prefix: str = "user") -> tuple[dict, str]:
    """Helper to register a user, log in, and return (user_dict, access_token)."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"

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


@pytest.mark.anyio
async def test_personal_profile_lifecycle(async_client: AsyncClient):
    """Verify creating, reading, and updating personal student profile."""
    user, token = await create_and_authenticate_user(async_client, "pers")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Profile not created yet -> 404
    get_init_resp = await async_client.get("/api/v1/profile", headers=headers)
    assert get_init_resp.status_code == 404

    # 2. Create profile via PUT
    profile_payload = {
        "first_name": "Rahul",
        "last_name": "Sharma",
        "date_of_birth": "2004-05-14",
        "gender": "Male",
        "mobile": "+919876543210",
        "country": "India",
        "state": "Maharashtra",
        "district": "Pune",
        "city": "Pune",
    }
    create_resp = await async_client.put("/api/v1/profile", json=profile_payload, headers=headers)
    assert create_resp.status_code == 200
    data = create_resp.json()
    assert data["first_name"] == "Rahul"
    assert data["last_name"] == "Sharma"
    assert data["date_of_birth"] == "2004-05-14"
    assert data["user_id"] == user["id"]
    assert "password_hash" not in data

    # 3. Read profile via GET
    get_resp = await async_client.get("/api/v1/profile", headers=headers)
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["first_name"] == "Rahul"
    assert get_data["city"] == "Pune"

    # 4. Update profile via PUT
    update_payload = {"city": "Mumbai", "district": "Mumbai City"}
    update_resp = await async_client.put("/api/v1/profile", json=update_payload, headers=headers)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["city"] == "Mumbai"
    assert updated_data["district"] == "Mumbai City"
    assert updated_data["first_name"] == "Rahul"  # Preserved


@pytest.mark.anyio
async def test_academic_profile_lifecycle(async_client: AsyncClient):
    """Verify creating, reading, and updating academic profile."""
    user, token = await create_and_authenticate_user(async_client, "acad")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initially 404
    get_init_resp = await async_client.get("/api/v1/profile/academic", headers=headers)
    assert get_init_resp.status_code == 404

    # 2. Create academic profile
    academic_payload = {
        "course": "B.Tech",
        "branch": "Computer Science & Engineering",
        "current_year": "Final Year",
        "university": "Savitribai Phule Pune University",
        "college": "Pune Institute of Computer Technology",
        "cgpa": "9.15",
        "previous_percentage": "92.40",
    }
    create_resp = await async_client.put("/api/v1/profile/academic", json=academic_payload, headers=headers)
    assert create_resp.status_code == 200
    data = create_resp.json()
    assert data["course"] == "B.Tech"
    assert data["cgpa"] == "9.15"
    assert data["previous_percentage"] == "92.40"
    assert data["user_id"] == user["id"]

    # 3. Read academic profile
    get_resp = await async_client.get("/api/v1/profile/academic", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["university"] == "Savitribai Phule Pune University"

    # 4. Update academic profile
    update_resp = await async_client.put(
        "/api/v1/profile/academic",
        json={"cgpa": "9.45"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["cgpa"] == "9.45"
    assert update_resp.json()["course"] == "B.Tech"


@pytest.mark.anyio
async def test_financial_preferences_lifecycle(async_client: AsyncClient):
    """Verify creating, reading, and updating financial preferences."""
    user, token = await create_and_authenticate_user(async_client, "fin")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initially 404
    get_init_resp = await async_client.get("/api/v1/profile/preferences", headers=headers)
    assert get_init_resp.status_code == 404

    # 2. Create preferences
    pref_payload = {
        "reservation_category": "OBC",
        "special_categories": ["Minority"],
        "family_income": "450000.00",
        "study_preference": "BOTH",
    }
    create_resp = await async_client.put("/api/v1/profile/preferences", json=pref_payload, headers=headers)
    assert create_resp.status_code == 200
    data = create_resp.json()
    assert data["reservation_category"] == "OBC"
    assert data["special_categories"] == ["Minority"]
    assert data["family_income"] == "450000.00"
    assert data["study_preference"] == "BOTH"
    assert data["user_id"] == user["id"]

    # 3. Read preferences
    get_resp = await async_client.get("/api/v1/profile/preferences", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["study_preference"] == "BOTH"

    # 4. Update preferences
    update_resp = await async_client.put(
        "/api/v1/profile/preferences",
        json={"study_preference": "ABROAD", "family_income": "500000.00"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["study_preference"] == "ABROAD"
    assert update_resp.json()["family_income"] == "500000.00"


@pytest.mark.anyio
async def test_combined_profile_endpoint(async_client: AsyncClient):
    """Verify combined /profile/me returns partial and full profile states."""
    _, token = await create_and_authenticate_user(async_client, "comb")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Completely empty profile
    resp1 = await async_client.get("/api/v1/profile/me", headers=headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["personal"] is None
    assert data1["academic"] is None
    assert data1["preferences"] is None

    # 2. Partially populated (only personal)
    await async_client.put(
        "/api/v1/profile",
        json={"first_name": "Aarav", "last_name": "Patel"},
        headers=headers,
    )
    resp2 = await async_client.get("/api/v1/profile/me", headers=headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["personal"] is not None
    assert data2["personal"]["first_name"] == "Aarav"
    assert data2["academic"] is None
    assert data2["preferences"] is None

    # 3. Fully populated
    await async_client.put(
        "/api/v1/profile/academic",
        json={"course": "B.Sc Computer Science", "cgpa": "8.80"},
        headers=headers,
    )
    await async_client.put(
        "/api/v1/profile/preferences",
        json={"reservation_category": "General", "study_preference": "INDIA"},
        headers=headers,
    )
    resp3 = await async_client.get("/api/v1/profile/me", headers=headers)
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["personal"]["first_name"] == "Aarav"
    assert data3["academic"]["course"] == "B.Sc Computer Science"
    assert data3["preferences"]["study_preference"] == "INDIA"


@pytest.mark.anyio
async def test_profile_validation_errors(async_client: AsyncClient):
    """Verify Pydantic validation rejects invalid CGPA, percentage, income, study_preference, and dates."""
    _, token = await create_and_authenticate_user(async_client, "val")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. CGPA > 10
    resp_cgpa_high = await async_client.put(
        "/api/v1/profile/academic",
        json={"cgpa": "11.5"},
        headers=headers,
    )
    assert resp_cgpa_high.status_code == 422

    # 2. CGPA < 0
    resp_cgpa_low = await async_client.put(
        "/api/v1/profile/academic",
        json={"cgpa": "-1.0"},
        headers=headers,
    )
    assert resp_cgpa_low.status_code == 422

    # 3. Percentage > 100
    resp_pct_high = await async_client.put(
        "/api/v1/profile/academic",
        json={"previous_percentage": "105.0"},
        headers=headers,
    )
    assert resp_pct_high.status_code == 422

    # 4. Percentage < 0
    resp_pct_low = await async_client.put(
        "/api/v1/profile/academic",
        json={"previous_percentage": "-5.0"},
        headers=headers,
    )
    assert resp_pct_low.status_code == 422

    # 5. Negative family income
    resp_inc_neg = await async_client.put(
        "/api/v1/profile/preferences",
        json={"family_income": "-50000"},
        headers=headers,
    )
    assert resp_inc_neg.status_code == 422

    # 6. Invalid study preference
    resp_pref_inv = await async_client.put(
        "/api/v1/profile/preferences",
        json={"study_preference": "INVALID_CHOICE"},
        headers=headers,
    )
    assert resp_pref_inv.status_code == 422

    # 7. Malformed date of birth
    resp_dob_inv = await async_client.put(
        "/api/v1/profile",
        json={"first_name": "Test", "last_name": "User", "date_of_birth": "invalid-date-string"},
        headers=headers,
    )
    assert resp_dob_inv.status_code == 422


@pytest.mark.anyio
async def test_profile_ownership_isolation(async_client: AsyncClient):
    """Verify strict tenant isolation: User A cannot see or modify User B's profile."""
    user_a, token_a = await create_and_authenticate_user(async_client, "usera")
    user_b, token_b = await create_and_authenticate_user(async_client, "userb")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates their profile
    await async_client.put(
        "/api/v1/profile",
        json={"first_name": "Alice", "last_name": "Smith", "city": "London"},
        headers=headers_a,
    )

    # User B creates their profile
    await async_client.put(
        "/api/v1/profile",
        json={"first_name": "Bob", "last_name": "Jones", "city": "Paris"},
        headers=headers_b,
    )

    # User A reads profile -> receives Alice, never Bob
    res_a = await async_client.get("/api/v1/profile", headers=headers_a)
    assert res_a.json()["first_name"] == "Alice"
    assert res_a.json()["city"] == "London"

    # User B reads profile -> receives Bob, never Alice
    res_b = await async_client.get("/api/v1/profile", headers=headers_b)
    assert res_b.json()["first_name"] == "Bob"
    assert res_b.json()["city"] == "Paris"


@pytest.mark.anyio
async def test_unauthorized_profile_access(async_client: AsyncClient):
    """Verify all profile endpoints return 401 when accessed without valid auth token."""
    endpoints = [
        ("GET", "/api/v1/profile"),
        ("PUT", "/api/v1/profile"),
        ("GET", "/api/v1/profile/academic"),
        ("PUT", "/api/v1/profile/academic"),
        ("GET", "/api/v1/profile/preferences"),
        ("PUT", "/api/v1/profile/preferences"),
        ("GET", "/api/v1/profile/me"),
    ]

    for method, path in endpoints:
        if method == "GET":
            resp = await async_client.get(path)
        else:
            resp = await async_client.put(path, json={})
        assert resp.status_code == 401
