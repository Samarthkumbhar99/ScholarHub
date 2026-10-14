import asyncio
import uuid
from datetime import date, timedelta
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.user import User, UserRole
from tests.conftest import TestAsyncSessionLocal, override_get_db
from app.core.database import get_db
from sqlalchemy import update


async def run_manual_api_verification():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        print("--- 1. Health Check ---")
        health_res = await client.get("/api/v1/health")
        print(f"GET /api/v1/health -> {health_res.status_code}, data: {health_res.json()}")
        assert health_res.status_code == 200

        print("\n--- 2. Create Student and Admin Accounts ---")
        student_email = f"student_manual_{uuid.uuid4().hex[:6]}@example.com"
        admin_email = f"admin_manual_{uuid.uuid4().hex[:6]}@example.com"

        # Register student
        s_reg = await client.post("/api/v1/auth/register", json={"email": student_email, "password": "Password123!"})
        assert s_reg.status_code == 201
        student_id = uuid.UUID(s_reg.json()["id"])
        s_log = await client.post("/api/v1/auth/login", json={"email": student_email, "password": "Password123!"})
        student_token = s_log.json()["access_token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}
        print(f"Student created: {student_email} (role: {s_reg.json()['role']})")

        # Register and promote admin
        a_reg = await client.post("/api/v1/auth/register", json={"email": admin_email, "password": "Password123!"})
        assert a_reg.status_code == 201
        admin_id = uuid.UUID(a_reg.json()["id"])
        async with TestAsyncSessionLocal() as session:
            await session.execute(update(User).where(User.id == admin_id).values(role=UserRole.ADMIN))
            await session.commit()
        a_log = await client.post("/api/v1/auth/login", json={"email": admin_email, "password": "Password123!"})
        admin_token = a_log.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        a_me = await client.get("/api/v1/auth/me", headers=admin_headers)
        print(f"Admin created & verified: {admin_email} (role: {a_me.json()['role']})")

        print("\n--- 3. Verify RBAC on Dashboard Stats ---")
        unauth_stats = await client.get("/api/v1/admin/dashboard/stats")
        print(f"Unauthenticated GET /api/v1/admin/dashboard/stats -> {unauth_stats.status_code}")
        assert unauth_stats.status_code == 401

        stud_stats = await client.get("/api/v1/admin/dashboard/stats", headers=student_headers)
        print(f"Student GET /api/v1/admin/dashboard/stats -> {stud_stats.status_code} ({stud_stats.json()['detail']})")
        assert stud_stats.status_code == 403

        adm_stats = await client.get("/api/v1/admin/dashboard/stats", headers=admin_headers)
        print(f"Admin GET /api/v1/admin/dashboard/stats -> {adm_stats.status_code}, stats: {adm_stats.json()}")
        assert adm_stats.status_code == 200

        print("\n--- 4. Verify Admin Scholarship Management ---")
        sch_payload = {
            "name": "Live Verified Scholarship",
            "provider": "Apex Research Council",
            "description": "Grant for higher education",
            "amount": "95000.00",
            "deadline": (date.today() + timedelta(days=90)).isoformat(),
            "eligibility": "Open to all verified applicants",
            "benefits": ["Annual Stipend", "Equipment Grant"],
        }
        create_sch = await client.post("/api/v1/admin/scholarships", json=sch_payload, headers=admin_headers)
        print(f"Admin POST /api/v1/admin/scholarships -> {create_sch.status_code}, id: {create_sch.json()['id']}")
        assert create_sch.status_code == 201
        sch_id = create_sch.json()["id"]

        stud_create = await client.post("/api/v1/admin/scholarships", json=sch_payload, headers=student_headers)
        print(f"Student POST /api/v1/admin/scholarships -> {stud_create.status_code}")
        assert stud_create.status_code == 403

        get_sch = await client.get(f"/api/v1/admin/scholarships/{sch_id}", headers=admin_headers)
        print(f"Admin GET /api/v1/admin/scholarships/{sch_id} -> {get_sch.status_code}")
        assert get_sch.status_code == 200

        update_sch = await client.put(f"/api/v1/admin/scholarships/{sch_id}", json={"amount": "100000.00"}, headers=admin_headers)
        print(f"Admin PUT /api/v1/admin/scholarships/{sch_id} -> {update_sch.status_code}, new amount: {update_sch.json()['amount']}")
        assert update_sch.status_code == 200

        list_sch = await client.get("/api/v1/admin/scholarships?page=1&page_size=5", headers=admin_headers)
        print(f"Admin GET /api/v1/admin/scholarships -> {list_sch.status_code}, total: {list_sch.json()['total']}")
        assert list_sch.status_code == 200

        print("\n--- 5. Verify Requirement Management ---")
        req_res = await client.post(
            f"/api/v1/admin/scholarships/{sch_id}/requirements",
            json={"name": "Identity Proof", "document_type": "aadhaar", "required": True},
            headers=admin_headers
        )
        print(f"Admin POST /api/v1/admin/scholarships/{sch_id}/requirements -> {req_res.status_code}")
        assert req_res.status_code == 201
        req_id = req_res.json()["id"]

        list_reqs = await client.get(f"/api/v1/admin/scholarships/{sch_id}/requirements", headers=admin_headers)
        print(f"Admin GET /api/v1/admin/scholarships/{sch_id}/requirements -> {list_reqs.status_code}, count: {len(list_reqs.json())}")
        assert list_reqs.status_code == 200

        del_req = await client.delete(f"/api/v1/admin/requirements/{req_id}", headers=admin_headers)
        print(f"Admin DELETE /api/v1/admin/requirements/{req_id} -> {del_req.status_code}")
        assert del_req.status_code == 200

        print("\n--- 6. Verify User Directory ---")
        list_users = await client.get("/api/v1/admin/users?page=1&page_size=10", headers=admin_headers)
        print(f"Admin GET /api/v1/admin/users -> {list_users.status_code}, total: {list_users.json()['total']}")
        assert list_users.status_code == 200

        stud_list_users = await client.get("/api/v1/admin/users", headers=student_headers)
        print(f"Student GET /api/v1/admin/users -> {stud_list_users.status_code}")
        assert stud_list_users.status_code == 403

        view_user = await client.get(f"/api/v1/admin/users/{student_id}", headers=admin_headers)
        print(f"Admin GET /api/v1/admin/users/{student_id} -> {view_user.status_code}, email: {view_user.json()['email']}")
        assert view_user.status_code == 200

        print("\n--- 7. Delete Test Scholarship ---")
        del_sch = await client.delete(f"/api/v1/admin/scholarships/{sch_id}", headers=admin_headers)
        print(f"Admin DELETE /api/v1/admin/scholarships/{sch_id} -> {del_sch.status_code}")
        assert del_sch.status_code == 200

        print("\n=== ALL MANUAL API VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

    app.dependency_overrides.clear()


if __name__ == "__main__":
    asyncio.run(run_manual_api_verification())
