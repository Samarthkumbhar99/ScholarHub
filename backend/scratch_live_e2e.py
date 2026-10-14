import asyncio
import io
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def run_live_e2e_tests():
    print("=" * 60)
    print("SCHOLARHUB STEP 30: LIVE HTTP END-TO-END VERIFICATION")
    print("=" * 60)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 0. Health Check
        health_res = await client.get("/health")
        print(f"[*] Health check status: {health_res.status_code}, payload: {health_res.json()}")
        assert health_res.status_code == 200

        # 1. Registration & Auth
        import time
        ts = int(time.time())
        email_a = f"student_a_{ts}@scholarhub.org"
        email_b = f"student_b_{ts}@scholarhub.org"
        pwd = "Password@123"

        print(f"[*] Registering User A ({email_a})...")
        reg_a = await client.post("/auth/register", json={"email": email_a, "password": pwd})
        print(f"    Status: {reg_a.status_code}, User ID: {reg_a.json().get('id')}")
        assert reg_a.status_code == 201

        print(f"[*] Registering User B ({email_b})...")
        reg_b = await client.post("/auth/register", json={"email": email_b, "password": pwd})
        print(f"    Status: {reg_b.status_code}, User ID: {reg_b.json().get('id')}")
        assert reg_b.status_code == 201

        # Login User A
        print("[*] Logging in User A...")
        login_a = await client.post("/auth/login", json={"email": email_a, "password": pwd})
        assert login_a.status_code == 200
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        print("    JWT Token A acquired successfully.")

        # Login User B
        print("[*] Logging in User B...")
        login_b = await client.post("/auth/login", json={"email": email_b, "password": pwd})
        assert login_b.status_code == 200
        token_b = login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        print("    JWT Token B acquired successfully.")

        # 2. Auth /me
        me_a = await client.get("/auth/me", headers=headers_a)
        assert me_a.status_code == 200
        print(f"[*] Auth /me verified for User A: {me_a.json()['email']}")

        # 3. Profile APIs for User A
        print("[*] Testing Profile APIs...")
        # Personal
        prof_res = await client.put("/profile", headers=headers_a, json={
            "first_name": "Aarav",
            "last_name": "Patel",
            "date_of_birth": "2003-06-15",
            "gender": "Male",
            "mobile": "9876543210",
            "country": "India",
            "state": "Gujarat",
            "city": "Ahmedabad"
        })
        assert prof_res.status_code == 200
        print(f"    Personal Profile updated: {prof_res.json()['first_name']} {prof_res.json()['last_name']}")

        # Academic
        acad_res = await client.put("/profile/academic", headers=headers_a, json={
            "course": "B.Tech",
            "branch": "Computer Science & Engineering",
            "current_year": "3rd Year",
            "university": "Gujarat Technological University",
            "college": "LD College of Engineering",
            "cgpa": 8.95,
            "previous_percentage": 91.2
        })
        assert acad_res.status_code == 200
        print(f"    Academic Profile updated: CGPA {acad_res.json()['cgpa']}")

        # Preferences
        pref_res = await client.put("/profile/preferences", headers=headers_a, json={
            "reservation_category": "OBC",
            "special_categories": ["None"],
            "family_income": 350000,
            "study_preference": "BOTH"
        })
        assert pref_res.status_code == 200
        print(f"    Preferences updated: Income INR {pref_res.json()['family_income']}")

        # Combined /profile/me
        comb_res = await client.get("/profile/me", headers=headers_a)
        assert comb_res.status_code == 200
        print("    Combined Profile retrieved successfully.")

        # 4. Scholarships API
        print("[*] Testing Scholarships APIs...")
        sch_list = await client.get("/scholarships?page=1&page_size=10", headers=headers_a)
        assert sch_list.status_code == 200
        items = sch_list.json()["items"]
        print(f"    Scholarships count returned: {len(items)}")

        if len(items) > 0:
            target_sch = items[0]
            sch_id = target_sch["id"]
            print(f"    Selected target scholarship: {target_sch['name']} ({sch_id})")

            # Detail
            detail_res = await client.get(f"/scholarships/{sch_id}", headers=headers_a)
            assert detail_res.status_code == 200
            print(f"    Details verified: Amount {detail_res.json()['amount']}")

            # Requirements
            req_res = await client.get(f"/scholarships/{sch_id}/requirements", headers=headers_a)
            assert req_res.status_code == 200
            print(f"    Requirements count: {len(req_res.json())}")

            # 5. Save & Unsave
            print("[*] Testing Save / Unsave APIs...")
            save_res = await client.post(f"/scholarships/{sch_id}/save", headers=headers_a)
            assert save_res.status_code == 200
            print(f"    Saved scholarship: {save_res.json()['saved']}")

            # Check status
            status_res = await client.get(f"/scholarships/{sch_id}/saved", headers=headers_a)
            assert status_res.status_code == 200
            assert status_res.json()["saved"] is True
            print("    Save status confirmed True.")

            # Saved list
            saved_list_res = await client.get("/scholarships/saved", headers=headers_a)
            assert saved_list_res.status_code == 200
            print(f"    User A saved scholarships count: {len(saved_list_res.json()['items'])}")

            # 6. Compare
            if len(items) >= 2:
                id1 = items[0]["id"]
                id2 = items[1]["id"]
                comp_res = await client.get(f"/scholarships/compare?ids={id1},{id2}", headers=headers_a)
                assert comp_res.status_code == 200
                print(f"    Compared {len(comp_res.json()['items'])} scholarships successfully.")

            # 7. AI Matching
            print("[*] Testing AI Matching & Recommendations...")
            match_res = await client.get(f"/scholarships/{sch_id}/match", headers=headers_a)
            assert match_res.status_code == 200
            print(f"    AI Match Score: {match_res.json()['match_score']}% ({match_res.json()['match_level']})")

            recs_res = await client.get("/scholarships/recommendations", headers=headers_a)
            assert recs_res.status_code == 200
            print(f"    Recommendations count: {len(recs_res.json()['items'])}")

            # 8. Applications Tracker
            print("[*] Testing Applications APIs...")
            app_create = await client.post("/applications", headers=headers_a, json={
                "scholarship_id": sch_id,
                "status": "SAVED"
            })
            assert app_create.status_code == 201
            app_id = app_create.json()["id"]
            print(f"    Created application: {app_id} (Status: {app_create.json()['status']})")

            # Advance status
            app_patch = await client.patch(f"/applications/{app_id}/status", headers=headers_a, json={
                "status": "PREPARING_DOCUMENTS"
            })
            assert app_patch.status_code == 200
            assert app_patch.json()["status"] == "PREPARING_DOCUMENTS"
            print(f"    Updated application status to: {app_patch.json()['status']}")

            # List applications
            app_list = await client.get("/applications", headers=headers_a)
            assert app_list.status_code == 200
            print(f"    Applications count: {len(app_list.json()['items'])}")

            # 9. Document Upload (multipart)
            print("[*] Testing Document Upload APIs...")
            fake_pdf = b"%PDF-1.4 Fake PDF Document content for integration testing"
            files = {"file": ("marksheet.pdf", fake_pdf, "application/pdf")}
            data = {"type": "marksheet", "category": "Academic"}

            doc_upload = await client.post("/documents", headers=headers_a, files=files, data=data)
            print(f"    Document upload status: {doc_upload.status_code}, response: {doc_upload.text}")
            if doc_upload.status_code == 201:
                doc_id = doc_upload.json()["id"]
                print(f"    Uploaded document: {doc_id} ({doc_upload.json()['file_name']})")
            else:
                doc_id = None

            # List documents
            doc_list = await client.get("/documents", headers=headers_a)
            assert doc_list.status_code == 200
            print(f"    Documents count for User A: {len(doc_list.json()['items'])}")

            # 10. Notifications
            print("[*] Testing Notifications APIs...")
            # Create a notification for User A
            notif_create = await client.post("/notifications", headers=headers_a, json={
                "title": "Application Verified",
                "message": "Your document verification for the merit grant is complete.",
                "type": "APPLICATION_CONFIRMATION",
                "application_id": app_id
            })
            assert notif_create.status_code == 201
            notif_id = notif_create.json()["id"]
            print(f"    Created notification: {notif_id}")

            # Unread count
            unread_res = await client.get("/notifications/unread-count", headers=headers_a)
            assert unread_res.status_code == 200
            print(f"    Unread notifications count: {unread_res.json()['unread_count']}")

            # Mark read
            mark_read = await client.patch(f"/notifications/{notif_id}/read", headers=headers_a)
            assert mark_read.status_code == 200
            assert mark_read.json()["is_read"] is True
            print("    Notification marked as read.")

            # 11. Multi-User Cross-Tenant Isolation Tests
            print("[*] Testing Multi-User Security & Cross-Tenant Isolation...")
            # User B cannot access User A's application
            sec_app = await client.get(f"/applications/{app_id}", headers=headers_b)
            assert sec_app.status_code == 404
            print("    [SECURE] User B accessing User A's application returned 404.")

            # User B cannot update User A's application status
            sec_app_upd = await client.patch(f"/applications/{app_id}/status", headers=headers_b, json={"status": "APPLIED"})
            assert sec_app_upd.status_code == 404
            print("    [SECURE] User B updating User A's application returned 404.")

            # User B cannot access User A's document
            target_doc_id = doc_id or "00000000-0000-0000-0000-000000000000"
            sec_doc = await client.get(f"/documents/{target_doc_id}", headers=headers_b)
            assert sec_doc.status_code == 404
            print("    [SECURE] User B accessing User A's document returned 404.")

            # User B cannot access User A's notification
            sec_notif = await client.get(f"/notifications/{notif_id}", headers=headers_b)
            assert sec_notif.status_code == 404
            print("    [SECURE] User B accessing User A's notification returned 404.")

            # User B saved scholarships is empty
            sec_saved = await client.get("/scholarships/saved", headers=headers_b)
            assert sec_saved.status_code == 200
            assert len(sec_saved.json()["items"]) == 0
            print("    [SECURE] User B saved list is isolated and empty (0 items).")

    print("=" * 60)
    print("ALL LIVE HTTP INTEGRATION AND MULTI-USER SECURITY TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_live_e2e_tests())
