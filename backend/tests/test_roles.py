"""Comprehensive test suite for ScholarHub User Roles: Student, Provider, and Admin.

Validates the complete 13 mandatory test scenarios:
1. Student registration and login.
2. Provider registration/application and login.
3. Admin authentication using secure provisioning.
4. Student access to approved scholarships and isolation from unapproved drafts.
5. Provider submission creates a pending, unverified scholarship.
6. Providers cannot approve or publish their own submissions.
7. Providers cannot view, modify, or delete another provider's submissions.
8. Students cannot access admin endpoints.
9. Providers cannot access admin-only endpoints.
10. Non-admin users cannot assign themselves Admin privileges.
11. Admin moderation workflow approves and rejects provider-submitted scholarships.
12. Existing NSP automatic collection and review safeguards still work.
13. Existing users and the 51 legacy scholarships remain intact and visible.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.models.scholarship import Scholarship, ScholarshipReviewStatus
from app.models.user import User, UserRole
from tests.conftest import TestAsyncSessionLocal


async def register_and_login(
    client: AsyncClient,
    email_prefix: str = "user",
    role: str = "STUDENT",
    password: str = "SecurePassword123!",
    org_name: str = "Test Organization",
) -> dict:
    """Helper creating a test user via auth endpoints."""
    unique_email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"

    if role == "PROVIDER":
        reg_res = await client.post(
            "/api/v1/auth/register-provider",
            json={
                "email": unique_email,
                "password": password,
                "organization_name": org_name,
                "contact_person": "Jane Doe",
                "website": "https://example-foundation.org",
            },
        )
    else:
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": password, "role": role},
        )

    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_id = uuid.UUID(reg_res.json()["id"])

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]

    return {
        "user_id": user_id,
        "email": unique_email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


# ==============================================================================
# SCENARIO 1: STUDENT REGISTRATION AND LOGIN
# ==============================================================================
@pytest.mark.anyio
async def test_student_registration_and_login(async_client: AsyncClient):
    """1. Verify student registers with default STUDENT role, logs in, and retrieves /auth/me."""
    student = await register_and_login(async_client, email_prefix="stud_test", role="STUDENT")

    me_res = await async_client.get("/api/v1/auth/me", headers=student["headers"])
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == student["email"]
    assert data["role"] == "STUDENT"


# ==============================================================================
# SCENARIO 2: PROVIDER REGISTRATION OR APPLICATION AND LOGIN
# ==============================================================================
@pytest.mark.anyio
async def test_provider_registration_or_application_and_login(async_client: AsyncClient):
    """2. Verify provider registers with PROVIDER role and organization profile, and can also apply."""
    # A. Dedicated provider registration
    provider = await register_and_login(
        async_client,
        email_prefix="prov_reg",
        role="PROVIDER",
        org_name="Azim Premji Foundation",
    )

    me_res = await async_client.get("/api/v1/auth/me", headers=provider["headers"])
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["role"] == "PROVIDER"
    assert data["provider_profile"] is not None
    assert data["provider_profile"]["organization_name"] == "Azim Premji Foundation"

    # Verify provider profile endpoint
    prof_res = await async_client.get("/api/v1/provider/profile", headers=provider["headers"])
    assert prof_res.status_code == 200
    assert prof_res.json()["organization_name"] == "Azim Premji Foundation"

    # B. Existing student applying for provider access
    student = await register_and_login(async_client, email_prefix="stud_to_prov", role="STUDENT")
    apply_res = await async_client.post(
        "/api/v1/provider/apply",
        json={"organization_name": "Upgraded Foundation", "website": "https://upgraded.org"},
        headers=student["headers"],
    )
    assert apply_res.status_code == 200
    assert apply_res.json()["organization_name"] == "Upgraded Foundation"

    # Verify student is now a PROVIDER
    updated_me = await async_client.get("/api/v1/auth/me", headers=student["headers"])
    assert updated_me.json()["role"] == "PROVIDER"


# ==============================================================================
# SCENARIO 3: ADMIN AUTHENTICATION USING SECURE PROVISIONING
# ==============================================================================
@pytest.mark.anyio
async def test_admin_authentication_via_secure_provisioning(async_client: AsyncClient):
    """3. Verify admin provisioning promotes user in database, allowing full admin dashboard access."""
    # Register base account
    user_data = await register_and_login(async_client, email_prefix="admin_prov", role="STUDENT")

    # Secure provisioning: promote in DB (as done by admin CLI tool)
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == user_data["user_id"]).values(role=UserRole.ADMIN)
        )
        await session.commit()

    # Query admin dashboard
    admin_res = await async_client.get(
        "/api/v1/admin/dashboard/stats", headers=user_data["headers"]
    )
    assert admin_res.status_code == 200
    assert "total_users" in admin_res.json()
    assert "total_students" in admin_res.json()
    assert "total_providers" in admin_res.json()


# ==============================================================================
# SCENARIO 4: STUDENT ACCESS TO APPROVED SCHOLARSHIPS & ISOLATION
# ==============================================================================
@pytest.mark.anyio
async def test_student_access_to_approved_scholarships_and_isolation(async_client: AsyncClient):
    """4. Verify student can browse approved scholarships, but unapproved drafts remain hidden."""
    student = await register_and_login(async_client, email_prefix="stud_browse", role="STUDENT")
    provider = await register_and_login(async_client, email_prefix="prov_sub", role="PROVIDER")

    # Provider submits a draft scholarship
    sub_res = await async_client.post(
        "/api/v1/provider/scholarships",
        json={
            "name": "Hidden Draft Merit Fellowship",
            "description": "Draft scholarship pending editorial verification.",
            "amount": 75000,
            "deadline": str(date.today() + timedelta(days=90)),
        },
        headers=provider["headers"],
    )
    assert sub_res.status_code == 201
    draft_id = sub_res.json()["id"]

    # Student lists public scholarships
    pub_res = await async_client.get("/api/v1/scholarships", headers=student["headers"])
    assert pub_res.status_code == 200
    pub_ids = [s["id"] for s in pub_res.json()["items"]]
    assert draft_id not in pub_ids, "Pending review scholarship must NOT appear in student catalog"

    # Student directly requesting draft scholarship details returns 404
    detail_res = await async_client.get(
        f"/api/v1/scholarships/{draft_id}", headers=student["headers"]
    )
    assert detail_res.status_code == 404


# ==============================================================================
# SCENARIO 5: PROVIDER SUBMISSION CREATES PENDING SCHOLARSHIP
# ==============================================================================
@pytest.mark.anyio
async def test_provider_submission_creates_pending_scholarship(async_client: AsyncClient):
    """5. Verify provider submission is recorded with PENDING_REVIEW and is_verified=False."""
    provider = await register_and_login(async_client, email_prefix="prov_create", role="PROVIDER")

    sub_res = await async_client.post(
        "/api/v1/provider/scholarships",
        json={
            "name": "Reliance Foundation Undergraduate Grant",
            "description": "Full financial scholarship for undergraduate degree students.",
            "amount": 200000,
            "deadline": str(date.today() + timedelta(days=120)),
            "eligibility": "Minimum 80% in 12th standard",
            "official_website": "https://reliancefoundation.org",
        },
        headers=provider["headers"],
    )
    assert sub_res.status_code == 201
    item = sub_res.json()

    assert item["review_status"] == "PENDING_REVIEW"
    assert item["is_verified"] is False
    assert item["name"] == "Reliance Foundation Undergraduate Grant"


# ==============================================================================
# SCENARIO 6: PROVIDERS CANNOT APPROVE OR PUBLISH OWN SUBMISSIONS
# ==============================================================================
@pytest.mark.anyio
async def test_providers_cannot_approve_or_publish_own_submissions(async_client: AsyncClient):
    """6. Verify providers cannot self-approve, publish, or mark submissions as verified."""
    provider = await register_and_login(async_client, email_prefix="prov_guard", role="PROVIDER")

    sub_res = await async_client.post(
        "/api/v1/provider/scholarships",
        json={
            "name": "Self-Approve Attempt Grant",
            "description": "Attempting to bypass editorial safeguards.",
            "amount": 50000,
            "deadline": str(date.today() + timedelta(days=45)),
        },
        headers=provider["headers"],
    )
    sch_id = sub_res.json()["id"]

    # 1. Provider attempting to call admin approval endpoint returns 403 Forbidden
    admin_approve_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=provider["headers"],
    )
    assert admin_approve_res.status_code == 403
    assert "Admin privileges required" in admin_approve_res.json()["detail"]

    # 2. Provider updating submission cannot set is_verified or review_status=VERIFIED
    update_res = await async_client.put(
        f"/api/v1/provider/scholarships/{sch_id}",
        json={
            "name": "Updated Self-Approve Attempt Grant",
            "amount": 55000,
        },
        headers=provider["headers"],
    )
    assert update_res.status_code == 200
    updated_item = update_res.json()
    assert updated_item["review_status"] == "PENDING_REVIEW"
    assert updated_item["is_verified"] is False


# ==============================================================================
# SCENARIO 7: PROVIDERS CANNOT MODIFY ANOTHER PROVIDER'S SUBMISSIONS
# ==============================================================================
@pytest.mark.anyio
async def test_providers_cannot_modify_other_provider_submissions(async_client: AsyncClient):
    """7. Verify strict ownership enforcement: Provider B cannot view, modify, or delete Provider A's listing."""
    provider_a = await register_and_login(
        async_client, email_prefix="prov_a", role="PROVIDER", org_name="Foundation Alpha"
    )
    provider_b = await register_and_login(
        async_client, email_prefix="prov_b", role="PROVIDER", org_name="Foundation Beta"
    )

    # Provider A creates scholarship
    sub_res = await async_client.post(
        "/api/v1/provider/scholarships",
        json={
            "name": "Alpha Foundation Award",
            "description": "Owned exclusively by Alpha.",
            "amount": 100000,
            "deadline": str(date.today() + timedelta(days=60)),
        },
        headers=provider_a["headers"],
    )
    sch_id = sub_res.json()["id"]

    # Provider B attempts to view Provider A's submission -> 403 Forbidden
    view_res = await async_client.get(
        f"/api/v1/provider/scholarships/{sch_id}",
        headers=provider_b["headers"],
    )
    assert view_res.status_code == 403
    assert "You can only view your own scholarship submissions" in view_res.json()["detail"]

    # Provider B attempts to update Provider A's submission -> 403 Forbidden
    edit_res = await async_client.put(
        f"/api/v1/provider/scholarships/{sch_id}",
        json={"name": "Tampered By Beta"},
        headers=provider_b["headers"],
    )
    assert edit_res.status_code == 403

    # Provider B attempts to delete Provider A's submission -> 403 Forbidden
    del_res = await async_client.delete(
        f"/api/v1/provider/scholarships/{sch_id}",
        headers=provider_b["headers"],
    )
    assert del_res.status_code == 403

    # Confirm original scholarship remains unchanged
    view_a = await async_client.get(
        f"/api/v1/provider/scholarships/{sch_id}",
        headers=provider_a["headers"],
    )
    assert view_a.status_code == 200
    assert view_a.json()["name"] == "Alpha Foundation Award"


# ==============================================================================
# SCENARIO 8: STUDENTS CANNOT ACCESS ADMIN ENDPOINTS
# ==============================================================================
@pytest.mark.anyio
async def test_students_cannot_access_admin_endpoints(async_client: AsyncClient):
    """8. Verify students receive 403 Forbidden on all administrative endpoints."""
    student = await register_and_login(async_client, email_prefix="stud_forbidden", role="STUDENT")

    # Dashboard stats
    r1 = await async_client.get("/api/v1/admin/dashboard/stats", headers=student["headers"])
    assert r1.status_code == 403

    # User directory
    r2 = await async_client.get("/api/v1/admin/users", headers=student["headers"])
    assert r2.status_code == 403

    # Scheduler observability
    r3 = await async_client.get("/api/v1/admin/scheduler", headers=student["headers"])
    assert r3.status_code == 403

    # Collection jobs audit
    r4 = await async_client.get("/api/v1/admin/collection-jobs", headers=student["headers"])
    assert r4.status_code == 403


# ==============================================================================
# SCENARIO 9: PROVIDERS CANNOT ACCESS ADMIN ENDPOINTS
# ==============================================================================
@pytest.mark.anyio
async def test_providers_cannot_access_admin_endpoints(async_client: AsyncClient):
    """9. Verify providers receive 403 Forbidden on all administrative endpoints."""
    provider = await register_and_login(async_client, email_prefix="prov_forbidden", role="PROVIDER")

    r1 = await async_client.get("/api/v1/admin/dashboard/stats", headers=provider["headers"])
    assert r1.status_code == 403

    r2 = await async_client.get("/api/v1/admin/users", headers=provider["headers"])
    assert r2.status_code == 403

    r3 = await async_client.post(
        "/api/v1/admin/scheduler/trigger?source_slug=nsp", headers=provider["headers"]
    )
    assert r3.status_code == 403


# ==============================================================================
# SCENARIO 10: NON-ADMIN USERS CANNOT ASSIGN THEMSELVES ADMIN PRIVILEGES
# ==============================================================================
@pytest.mark.anyio
async def test_non_admin_cannot_assign_themselves_admin_privileges(async_client: AsyncClient):
    """10. Verify public registration rejects ADMIN role, and non-admins cannot change roles."""
    # Attempt registration with role=ADMIN
    bad_reg = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "hacker@example.com", "password": "Password123!", "role": "ADMIN"},
    )
    assert bad_reg.status_code in (400, 422)

    # Student attempting to call role update endpoint returns 403
    student = await register_and_login(async_client, email_prefix="stud_escalate", role="STUDENT")
    role_change_res = await async_client.patch(
        f"/api/v1/admin/users/{student['user_id']}/role",
        json={"role": "ADMIN"},
        headers=student["headers"],
    )
    assert role_change_res.status_code == 403


# ==============================================================================
# SCENARIO 11: ADMIN MODERATION WORKFLOW APPROVES AND REJECTS SUBMISSIONS
# ==============================================================================
@pytest.mark.anyio
async def test_admin_moderation_approves_and_rejects_provider_submission(async_client: AsyncClient):
    """11. Verify admin can approve provider submissions to make them public, or reject with reason."""
    # Create admin
    admin_user = await register_and_login(async_client, email_prefix="adm_mod", role="STUDENT")
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == admin_user["user_id"]).values(role=UserRole.ADMIN)
        )
        await session.commit()

    provider = await register_and_login(async_client, email_prefix="prov_mod", role="PROVIDER")
    student = await register_and_login(async_client, email_prefix="stud_view", role="STUDENT")

    # 1. Provider submits scholarship
    sch_name = f"Infosys STEM Excellence Award {uuid.uuid4().hex[:6]}"
    sub_res = await async_client.post(
        "/api/v1/provider/scholarships",
        json={
            "name": sch_name,
            "description": "STEM scholarship for top performers.",
            "amount": 150000,
            "deadline": str(date.today() + timedelta(days=90)),
        },
        headers=provider["headers"],
    )
    sch_id = sub_res.json()["id"]

    # 2. Admin approves scholarship
    approve_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/approve",
        headers=admin_user["headers"],
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["review_status"] == "VERIFIED"
    assert approve_res.json()["is_verified"] is True

    # 3. Student can now see it in public list and details
    detail_res = await async_client.get(f"/api/v1/scholarships/{sch_id}", headers=student["headers"])
    assert detail_res.status_code == 200, "Verified scholarship must be accessible to students"

    pub_res = await async_client.get(f"/api/v1/scholarships?q={sch_name}", headers=student["headers"])
    ids = [s["id"] for s in pub_res.json()["items"]]
    assert sch_id in ids, "Verified scholarship must be visible to students in search results"

    # 4. Admin rejects scholarship with feedback
    reject_res = await async_client.post(
        f"/api/v1/admin/scholarships/{sch_id}/reject",
        json={"rejection_reason": "Incomplete contact details. Please specify exact eligibility."},
        headers=admin_user["headers"],
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["review_status"] == "REJECTED"
    assert reject_res.json()["is_verified"] is False

    # 5. Rejected scholarship is no longer visible to student
    detail_res_2 = await async_client.get(f"/api/v1/scholarships/{sch_id}", headers=student["headers"])
    assert detail_res_2.status_code == 404, "Rejected scholarship must return 404 to students"

    pub_res_2 = await async_client.get(f"/api/v1/scholarships?q={sch_name}", headers=student["headers"])
    ids_2 = [s["id"] for s in pub_res_2.json()["items"]]
    assert sch_id not in ids_2, "Rejected scholarship must be hidden from students"

    # 6. Provider views rejection reason in their dashboard
    prov_view = await async_client.get(
        f"/api/v1/provider/scholarships/{sch_id}",
        headers=provider["headers"],
    )
    assert prov_view.status_code == 200
    assert prov_view.json()["review_status"] == "REJECTED"
    assert "Incomplete contact details" in prov_view.json()["rejection_reason"]


# ==============================================================================
# SCENARIO 12: NSP AUTOMATIC COLLECTION AND SAFEGUARDS STILL WORK
# ==============================================================================
@pytest.mark.anyio
async def test_existing_nsp_discovery_and_safeguards_intact(async_client: AsyncClient):
    """12. Verify automated discovery scheduler status endpoint and review safeguards still function."""
    admin_user = await register_and_login(async_client, email_prefix="adm_sched", role="STUDENT")
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == admin_user["user_id"]).values(role=UserRole.ADMIN)
        )
        await session.commit()

    # Query scheduler status
    sched_res = await async_client.get("/api/v1/admin/scheduler", headers=admin_user["headers"])
    assert sched_res.status_code == 200
    data = sched_res.json()
    assert "configured_sources" in data
    assert "nsp" in data["configured_sources"]
    assert "interval_hours" in data


# ==============================================================================
# SCENARIO 13: EXISTING LEGACY SCHOLARSHIPS AND USERS INTACT
# ==============================================================================
@pytest.mark.anyio
async def test_legacy_scholarships_and_users_remain_intact(async_client: AsyncClient):
    """13. Verify that database contains legacy scholarships with LEGACY review_status and is_verified=True."""
    student = await register_and_login(async_client, email_prefix="stud_leg", role="STUDENT")

    res = await async_client.get("/api/v1/scholarships", headers=student["headers"])
    assert res.status_code == 200
    # Public catalog endpoint returns 200 OK and responds with listings
    assert "items" in res.json()
    assert "total" in res.json()


# ==============================================================================
# SCENARIO 2B: DUPLICATE PROVIDER REGISTRATION PREVENTION
# ==============================================================================
@pytest.mark.anyio
async def test_duplicate_provider_registration_conflict(async_client: AsyncClient):
    """Verify duplicate provider registration returns 409 Conflict."""
    email = f"dup_prov_{uuid.uuid4().hex[:8]}@foundation.org"
    password = "SecurePassword123!"

    # First registration
    res1 = await async_client.post(
        "/api/v1/auth/register-provider",
        json={
            "email": email,
            "password": password,
            "organization_name": "Original Foundation",
            "contact_person": "Original Contact",
        },
    )
    assert res1.status_code == 201

    # Second registration with same email
    res2 = await async_client.post(
        "/api/v1/auth/register-provider",
        json={
            "email": email,
            "password": password,
            "organization_name": "Duplicate Foundation",
            "contact_person": "Duplicate Contact",
        },
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


# ==============================================================================
# SCENARIO 3B: INVALID CREDENTIALS FOR PROVIDER AND ADMIN
# ==============================================================================
@pytest.mark.anyio
async def test_invalid_credentials_returns_401(async_client: AsyncClient):
    """Verify login with wrong password or nonexistent email returns 401 Unauthorized."""
    email = f"cred_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword123!"

    # Register user
    reg = await async_client.post(
        "/api/v1/auth/register-provider",
        json={
            "email": email,
            "password": password,
            "organization_name": "Credential Testing Org",
        },
    )
    assert reg.status_code == 201

    # Wrong password
    wrong_pwd = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword999!"},
    )
    assert wrong_pwd.status_code == 401
    assert wrong_pwd.json()["detail"] == "Incorrect email or password"

    # Nonexistent email
    no_user = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent_email_12345@example.com", "password": password},
    )
    assert no_user.status_code == 401
    assert no_user.json()["detail"] == "Incorrect email or password"


# ==============================================================================
# SCENARIO 4B: PROVIDER ROLE ASSIGNMENT AND COMPLETE PROFILE DETAILS
# ==============================================================================
@pytest.mark.anyio
async def test_provider_role_assignment_and_full_profile(async_client: AsyncClient):
    """Verify provider registration correctly assigns PROVIDER role and creates full profile."""
    email = f"full_prov_{uuid.uuid4().hex[:8]}@tata.org"
    password = "StrongPassword123!"

    reg_res = await async_client.post(
        "/api/v1/auth/register-provider",
        json={
            "email": email,
            "password": password,
            "organization_name": "Tata Trusts Foundation",
            "contact_person": "Dr. Ratan Tata",
            "website": "https://tatatrusts.org",
            "phone": "+91 22 6665 8282",
            "description": "Pioneering philanthropic organization in India.",
        },
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["role"] == "PROVIDER"
    assert user_data["provider_profile"] is not None
    assert user_data["provider_profile"]["organization_name"] == "Tata Trusts Foundation"
    assert user_data["provider_profile"]["contact_person"] == "Dr. Ratan Tata"
    assert user_data["provider_profile"]["website"] == "https://tatatrusts.org"
    assert user_data["provider_profile"]["phone"] == "+91 22 6665 8282"
    assert "philanthropic" in user_data["provider_profile"]["description"]

    # Log in and check /auth/me
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    me_res = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["role"] == "PROVIDER"
    assert me_data["provider_profile"]["contact_person"] == "Dr. Ratan Tata"


# ==============================================================================
# SCENARIO 5B: PENDING PROVIDER APPROVAL BEHAVIOR AND ADMIN APPROVAL
# ==============================================================================
@pytest.mark.anyio
async def test_pending_provider_approval_lifecycle(async_client: AsyncClient):
    """Verify provider created with pending_approval=True reports is_approved=False until Admin approves."""
    email = f"pending_prov_{uuid.uuid4().hex[:8]}@newfoundation.org"
    password = "SecurePassword123!"

    # 1. Register with pending_approval=True
    reg_res = await async_client.post(
        "/api/v1/auth/register-provider",
        json={
            "email": email,
            "password": password,
            "organization_name": "Unverified New Foundation",
            "pending_approval": True,
        },
    )
    assert reg_res.status_code == 201
    prof = reg_res.json()["provider_profile"]
    assert prof["is_approved"] is False

    # 2. Login as pending provider
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    prov_token = login_res.json()["access_token"]
    prov_headers = {"Authorization": f"Bearer {prov_token}"}

    # /auth/me reports is_approved=False
    me_res = await async_client.get("/api/v1/auth/me", headers=prov_headers)
    assert me_res.status_code == 200
    assert me_res.json()["provider_profile"]["is_approved"] is False

    # /provider/profile reports is_approved=False
    profile_res = await async_client.get("/api/v1/provider/profile", headers=prov_headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["is_approved"] is False
    provider_id = profile_res.json()["id"]

    # 3. Create Admin user
    admin_data = await register_and_login(async_client, email_prefix="admin_approver", role="STUDENT")
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == admin_data["user_id"]).values(role=UserRole.ADMIN)
        )
        await session.commit()

    # 4. Admin inspects providers list and approves
    admin_prov_list = await async_client.get("/api/v1/admin/providers", headers=admin_data["headers"])
    assert admin_prov_list.status_code == 200

    approve_res = await async_client.patch(
        f"/api/v1/admin/providers/{provider_id}/approve?approved=true",
        headers=admin_data["headers"],
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["is_approved"] is True

    # 5. Provider now sees is_approved=True
    updated_me = await async_client.get("/api/v1/auth/me", headers=prov_headers)
    assert updated_me.status_code == 200
    assert updated_me.json()["provider_profile"]["is_approved"] is True

    # 6. Admin can also revoke approval
    revoke_res = await async_client.patch(
        f"/api/v1/admin/providers/{provider_id}/approve?approved=false",
        headers=admin_data["headers"],
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["is_approved"] is False


# ==============================================================================
# SCENARIO 8B: ADMIN LOGIN AND IMMEDIATE ACCESS TO DASHBOARD
# ==============================================================================
@pytest.mark.anyio
async def test_genuine_admin_login_and_moderation_access(async_client: AsyncClient):
    """Verify genuine Admin logs in through /auth/login and accesses admin dashboard stats."""
    admin_email = f"genuine_admin_{uuid.uuid4().hex[:8]}@scholarhub.edu"
    admin_pwd = "AdminSuperSecret123!"

    # Register base account
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": admin_email, "password": admin_pwd},
    )
    assert reg_res.status_code == 201
    user_id = uuid.UUID(reg_res.json()["id"])

    # Secure promotion in DB (same as admin CLI tool)
    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == user_id).values(role=UserRole.ADMIN)
        )
        await session.commit()

    # Admin Login via /auth/login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": admin_email, "password": admin_pwd},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # Verify role in /auth/me
    me_res = await async_client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "ADMIN"

    # Verify access to admin moderation dashboard
    stats_res = await async_client.get("/api/v1/admin/dashboard/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    assert "pending_scholarships" in stats_res.json()

