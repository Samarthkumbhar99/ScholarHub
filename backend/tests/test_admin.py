import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.models.scholarship import Scholarship, ScholarshipRequirement
from app.models.user import User, UserRole
from tests.conftest import TestAsyncSessionLocal


async def create_and_login_user(
    async_client: AsyncClient,
    prefix: str = "user",
    role: UserRole = UserRole.STUDENT,
    password: str = "TestPassword123!",
) -> dict:
    """Helper to register and log in a user with a given role using test client and test DB session."""
    unique_email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert reg_res.status_code == 201
    user_id = uuid.UUID(reg_res.json()["id"])

    # If ADMIN role requested, promote in DB
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
        "role": role,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


# ==============================================================================
# 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
# ==============================================================================
@pytest.mark.anyio
async def test_unauthenticated_admin_endpoint_returns_401(async_client: AsyncClient):
    """1. Verify unauthenticated requests to admin endpoints return 401."""
    res = await async_client.get("/api/v1/admin/dashboard/stats")
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]


@pytest.mark.anyio
async def test_student_calling_admin_endpoint_returns_403(async_client: AsyncClient):
    """2. Verify student user calling admin endpoint returns 403 Forbidden."""
    student = await create_and_login_user(async_client, prefix="stud_auth", role=UserRole.STUDENT)
    res = await async_client.get("/api/v1/admin/dashboard/stats", headers=student["headers"])
    assert res.status_code == 403
    assert res.json()["detail"] == "Access forbidden: Admin privileges required"


@pytest.mark.anyio
async def test_admin_calling_admin_endpoint_succeeds(async_client: AsyncClient):
    """3. Verify admin user calling admin endpoint succeeds with 200."""
    admin = await create_and_login_user(async_client, prefix="admin_auth", role=UserRole.ADMIN)
    res = await async_client.get("/api/v1/admin/dashboard/stats", headers=admin["headers"])
    assert res.status_code == 200
    assert "total_users" in res.json()


# ==============================================================================
# 2. SCHOLARSHIP MANAGEMENT
# ==============================================================================
@pytest.mark.anyio
async def test_admin_create_scholarship(async_client: AsyncClient):
    """4. Verify Admin can create a new scholarship with all fields."""
    admin = await create_and_login_user(async_client, prefix="adm_csch", role=UserRole.ADMIN)
    import uuid
    sch_name = f"Tata Innovation Fellowship {uuid.uuid4().hex[:6]}"
    payload = {
        "name": sch_name,
        "provider": "Tata Trusts",
        "description": "Fellowship supporting innovative STEM initiatives.",
        "amount": "120000.00",
        "deadline": (date.today() + timedelta(days=45)).isoformat(),
        "eligibility": "Postgraduate students in science/engineering",
        "benefits": ["Tuition waiver", "Lab access allowance"],
        "selection_process": ["Screening", "Interview"],
        "official_website": "https://www.tatatrusts.org",
    }
    res = await async_client.post("/api/v1/admin/scholarships", json=payload, headers=admin["headers"])
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == sch_name
    assert float(data["amount"]) == 120000.00
    assert data["benefits"] == payload["benefits"]

    # Clean up test scholarship
    if "id" in data:
        await async_client.delete(f"/api/v1/admin/scholarships/{data['id']}", headers=admin["headers"])


@pytest.mark.anyio
async def test_admin_list_scholarships(async_client: AsyncClient):
    """5. Verify Admin can list scholarships with pagination and search."""
    admin = await create_and_login_user(async_client, prefix="adm_lsch", role=UserRole.ADMIN)
    res = await async_client.get("/api/v1/admin/scholarships?page=1&page_size=10", headers=admin["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


@pytest.mark.anyio
async def test_admin_get_scholarship_by_id(async_client: AsyncClient):
    """6. Verify Admin can get scholarship details by ID."""
    admin = await create_and_login_user(async_client, prefix="adm_gsch", role=UserRole.ADMIN)
    create_res = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Get By ID Test",
            "provider": "Test Agency",
            "description": "Testing single retrieval",
            "amount": "25000.00",
            "deadline": (date.today() + timedelta(days=30)).isoformat(),
        },
        headers=admin["headers"],
    )
    sch_id = create_res.json()["id"]

    res = await async_client.get(f"/api/v1/admin/scholarships/{sch_id}", headers=admin["headers"])
    assert res.status_code == 200
    assert res.json()["name"] == "Get By ID Test"


@pytest.mark.anyio
async def test_admin_update_scholarship(async_client: AsyncClient):
    """7. Verify Admin can update scholarship attributes."""
    admin = await create_and_login_user(async_client, prefix="adm_usch", role=UserRole.ADMIN)
    create_res = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Pre-Update Scholarship",
            "provider": "Initial Provider",
            "description": "Original text",
            "amount": "30000.00",
            "deadline": (date.today() + timedelta(days=30)).isoformat(),
        },
        headers=admin["headers"],
    )
    sch_id = create_res.json()["id"]

    res = await async_client.put(
        f"/api/v1/admin/scholarships/{sch_id}",
        json={"amount": "35000.00", "description": "Updated text"},
        headers=admin["headers"],
    )
    assert res.status_code == 200
    assert float(res.json()["amount"]) == 35000.00
    assert res.json()["description"] == "Updated text"


@pytest.mark.anyio
async def test_admin_delete_scholarship(async_client: AsyncClient):
    """8. Verify Admin can delete a scholarship."""
    admin = await create_and_login_user(async_client, prefix="adm_dsch", role=UserRole.ADMIN)
    create_res = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Delete Me Scholarship",
            "provider": "Ephemeral Agency",
            "description": "Will be deleted",
            "amount": "15000.00",
            "deadline": (date.today() + timedelta(days=15)).isoformat(),
        },
        headers=admin["headers"],
    )
    sch_id = create_res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/admin/scholarships/{sch_id}", headers=admin["headers"])
    assert del_res.status_code == 200
    assert del_res.json()["id"] == sch_id

    # Confirm 404
    get_res = await async_client.get(f"/api/v1/admin/scholarships/{sch_id}", headers=admin["headers"])
    assert get_res.status_code == 404


@pytest.mark.anyio
async def test_student_cannot_create_scholarship(async_client: AsyncClient):
    """9. Verify student cannot create a scholarship (403)."""
    student = await create_and_login_user(async_client, prefix="stud_csch", role=UserRole.STUDENT)
    res = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Hacked Scholarship",
            "provider": "Student",
            "description": "Fail",
            "amount": "100.00",
            "deadline": date.today().isoformat(),
        },
        headers=student["headers"],
    )
    assert res.status_code == 403


@pytest.mark.anyio
async def test_student_cannot_update_scholarship(async_client: AsyncClient):
    """10. Verify student cannot update a scholarship (403)."""
    student = await create_and_login_user(async_client, prefix="stud_usch", role=UserRole.STUDENT)
    res = await async_client.put(
        f"/api/v1/admin/scholarships/{uuid.uuid4()}",
        json={"amount": "99999.00"},
        headers=student["headers"],
    )
    assert res.status_code == 403


@pytest.mark.anyio
async def test_student_cannot_delete_scholarship(async_client: AsyncClient):
    """11. Verify student cannot delete a scholarship (403)."""
    student = await create_and_login_user(async_client, prefix="stud_dsch", role=UserRole.STUDENT)
    res = await async_client.delete(
        f"/api/v1/admin/scholarships/{uuid.uuid4()}",
        headers=student["headers"],
    )
    assert res.status_code == 403


# ==============================================================================
# 3. SCHOLARSHIP REQUIREMENTS MANAGEMENT
# ==============================================================================
@pytest.mark.anyio
async def test_admin_create_requirement(async_client: AsyncClient):
    """12. Verify Admin creates requirement for a scholarship."""
    admin = await create_and_login_user(async_client, prefix="adm_creq", role=UserRole.ADMIN)
    create_sch = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Parent For Req",
            "provider": "Agency",
            "description": "Desc",
            "amount": "20000.00",
            "deadline": (date.today() + timedelta(days=30)).isoformat(),
        },
        headers=admin["headers"],
    )
    sch_id = create_sch.json()["id"]

    res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/requirements",
        json={"name": "Income Proof", "document_type": "income_certificate", "required": True},
        headers=admin["headers"],
    )
    assert res.status_code == 201
    assert res.json()["name"] == "Income Proof"
    assert res.json()["document_type"] == "income_certificate"


@pytest.mark.anyio
async def test_admin_update_requirement(async_client: AsyncClient):
    """13. Verify Admin updates a requirement."""
    admin = await create_and_login_user(async_client, prefix="adm_ureq", role=UserRole.ADMIN)
    create_sch = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Parent For Update Req",
            "provider": "Agency",
            "description": "Desc",
            "amount": "20000.00",
            "deadline": (date.today() + timedelta(days=30)).isoformat(),
        },
        headers=admin["headers"],
    )
    sch_id = create_sch.json()["id"]
    create_req = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/requirements",
        json={"name": "Initial Doc", "document_type": "other", "required": True},
        headers=admin["headers"],
    )
    req_id = create_req.json()["id"]

    res = await async_client.put(
        f"/api/v1/admin/requirements/{req_id}",
        json={"name": "Modified Doc", "required": False},
        headers=admin["headers"],
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Modified Doc"
    assert res.json()["required"] is False


@pytest.mark.anyio
async def test_admin_delete_requirement(async_client: AsyncClient):
    """14. Verify Admin deletes a requirement."""
    admin = await create_and_login_user(async_client, prefix="adm_dreq", role=UserRole.ADMIN)
    create_sch = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": "Parent For Del Req",
            "provider": "Agency",
            "description": "Desc",
            "amount": "20000.00",
            "deadline": (date.today() + timedelta(days=30)).isoformat(),
        },
        headers=admin["headers"],
    )
    sch_id = create_sch.json()["id"]
    create_req = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/requirements",
        json={"name": "Temp Doc", "document_type": "other", "required": True},
        headers=admin["headers"],
    )
    req_id = create_req.json()["id"]

    del_res = await async_client.delete(f"/api/v1/admin/requirements/{req_id}", headers=admin["headers"])
    assert del_res.status_code == 200
    assert del_res.json()["id"] == req_id


@pytest.mark.anyio
async def test_student_cannot_manage_requirements(async_client: AsyncClient):
    """15. Verify student cannot manage scholarship requirements (403)."""
    student = await create_and_login_user(async_client, prefix="stud_mreq", role=UserRole.STUDENT)
    dummy_id = uuid.uuid4()

    res1 = await async_client.post(
        f"/api/v1/admin/scholarships/{dummy_id}/requirements",
        json={"name": "Doc", "document_type": "doc", "required": True},
        headers=student["headers"],
    )
    assert res1.status_code == 403

    res2 = await async_client.put(
        f"/api/v1/admin/requirements/{dummy_id}",
        json={"name": "Doc"},
        headers=student["headers"],
    )
    assert res2.status_code == 403

    res3 = await async_client.delete(
        f"/api/v1/admin/requirements/{dummy_id}",
        headers=student["headers"],
    )
    assert res3.status_code == 403


# ==============================================================================
# 4. USER MANAGEMENT
# ==============================================================================
@pytest.mark.anyio
async def test_admin_can_list_users(async_client: AsyncClient):
    """16. Verify Admin can list users."""
    admin = await create_and_login_user(async_client, prefix="adm_lusr", role=UserRole.ADMIN)
    res = await async_client.get("/api/v1/admin/users?page=1&page_size=20", headers=admin["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.anyio
async def test_admin_can_view_user(async_client: AsyncClient):
    """17. Verify Admin can view user details."""
    admin = await create_and_login_user(async_client, prefix="adm_vusr", role=UserRole.ADMIN)
    student = await create_and_login_user(async_client, prefix="stud_vusr", role=UserRole.STUDENT)

    res = await async_client.get(f"/api/v1/admin/users/{student['user_id']}", headers=admin["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(student["user_id"])
    assert data["email"] == student["email"]
    assert data["role"] == "STUDENT"


@pytest.mark.anyio
async def test_student_cannot_list_or_view_users(async_client: AsyncClient):
    """18. Verify student cannot list or view other users (403)."""
    student = await create_and_login_user(async_client, prefix="stud_nousr", role=UserRole.STUDENT)
    res1 = await async_client.get("/api/v1/admin/users", headers=student["headers"])
    assert res1.status_code == 403

    res2 = await async_client.get(f"/api/v1/admin/users/{uuid.uuid4()}", headers=student["headers"])
    assert res2.status_code == 403


@pytest.mark.anyio
async def test_sensitive_fields_not_returned_in_admin_user_views(async_client: AsyncClient):
    """19. Verify sensitive fields (password_hash, JWT secrets) are never returned."""
    admin = await create_and_login_user(async_client, prefix="adm_sec", role=UserRole.ADMIN)
    res = await async_client.get(f"/api/v1/admin/users/{admin['user_id']}", headers=admin["headers"])
    assert res.status_code == 200
    text = res.text.lower()
    assert "password_hash" not in text
    assert "argon2" not in text
    assert "secret" not in text


# ==============================================================================
# 5. DASHBOARD STATS
# ==============================================================================
@pytest.mark.anyio
async def test_admin_dashboard_stats(async_client: AsyncClient):
    """20. Verify Admin dashboard stats endpoint returns comprehensive metrics."""
    admin = await create_and_login_user(async_client, prefix="adm_dst", role=UserRole.ADMIN)
    res = await async_client.get("/api/v1/admin/dashboard/stats", headers=admin["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["total_users"] >= 1
    assert data["total_students"] >= 0
    assert data["total_scholarships"] >= 0
    assert data["active_scholarships"] >= 0
    assert data["total_applications"] >= 0
    assert data["total_saved_scholarships"] >= 0
    assert data["total_documents"] >= 0
    assert data["unread_notifications"] >= 0


@pytest.mark.anyio
async def test_student_cannot_access_admin_stats(async_client: AsyncClient):
    """21. Verify student cannot access dashboard stats (403)."""
    student = await create_and_login_user(async_client, prefix="stud_dst", role=UserRole.STUDENT)
    res = await async_client.get("/api/v1/admin/dashboard/stats", headers=student["headers"])
    assert res.status_code == 403


# ==============================================================================
# 6. ROLE INTEGRITY & MIGRATION CHECKS
# ==============================================================================
@pytest.mark.anyio
async def test_existing_users_default_to_student_after_migration(async_client: AsyncClient):
    """22. Verify existing users and standard registrations default to STUDENT role."""
    user = await create_and_login_user(async_client, prefix="reg_def_stud", role=UserRole.STUDENT)
    me_res = await async_client.get("/api/v1/auth/me", headers=user["headers"])
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "STUDENT"


@pytest.mark.anyio
async def test_admin_role_persists(async_client: AsyncClient):
    """23. Verify Admin role persists and is reflected in /auth/me."""
    admin = await create_and_login_user(async_client, prefix="adm_persist", role=UserRole.ADMIN)
    me_res = await async_client.get("/api/v1/auth/me", headers=admin["headers"])
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "ADMIN"


@pytest.mark.anyio
async def test_invalid_role_cannot_be_injected_through_request_body(async_client: AsyncClient):
    """24. Verify role injection during registration is rejected or sanitized and cannot grant ADMIN."""
    email = f"inject_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "role": "ADMIN"},
    )
    assert reg_res.status_code in (400, 422) or (reg_res.status_code == 201 and reg_res.json()["role"] == "STUDENT")


@pytest.mark.anyio
async def test_frontend_provided_role_cannot_override_database_role(async_client: AsyncClient):
    """25. Verify sending fake role headers or query params cannot bypass database RBAC."""
    student = await create_and_login_user(async_client, prefix="stud_bypass", role=UserRole.STUDENT)
    headers = {
        "Authorization": f"Bearer {student['token']}",
        "X-User-Role": "ADMIN",
        "Role": "ADMIN",
    }
    res = await async_client.get("/api/v1/admin/dashboard/stats?role=ADMIN", headers=headers)
    assert res.status_code == 403


# ==============================================================================
# 7. DATA ISOLATION & REGRESSION INTEGRITY
# ==============================================================================
@pytest.mark.anyio
async def test_student_data_remains_isolated(async_client: AsyncClient):
    """26. Verify Student A and Student B data remains isolated."""
    student_a = await create_and_login_user(async_client, prefix="iso_a", role=UserRole.STUDENT)
    student_b = await create_and_login_user(async_client, prefix="iso_b", role=UserRole.STUDENT)

    # Student A updates personal profile
    await async_client.put(
        "/api/v1/profile",
        json={"first_name": "Alice", "last_name": "Wonderland"},
        headers=student_a["headers"],
    )

    # Student B views own profile -> not Alice
    res_b = await async_client.get("/api/v1/profile", headers=student_b["headers"])
    assert res_b.status_code == 404  # Student B has no profile yet


@pytest.mark.anyio
async def test_admin_operations_do_not_break_student_apis(async_client: AsyncClient):
    """27. Verify scholarships created by Admin are immediately visible to Students."""
    admin = await create_and_login_user(async_client, prefix="adm_feed", role=UserRole.ADMIN)
    student = await create_and_login_user(async_client, prefix="stud_feed", role=UserRole.STUDENT)

    sch_name = f"Public Discovery Award {uuid.uuid4().hex[:6]}"
    create_res = await async_client.post(
        "/api/v1/admin/scholarships",
        json={
            "name": sch_name,
            "provider": "Government",
            "description": "Visible to all students",
            "amount": "50000.00",
            "deadline": (date.today() + timedelta(days=60)).isoformat(),
        },
        headers=admin["headers"],
    )
    assert create_res.status_code == 201

    # Student lists public scholarships
    stud_list_res = await async_client.get(
        f"/api/v1/scholarships?q={sch_name}",
        headers=student["headers"],
    )
    assert stud_list_res.status_code == 200
    items = stud_list_res.json()["items"]
    assert len(items) >= 1
    assert items[0]["name"] == sch_name

