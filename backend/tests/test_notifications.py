import uuid
from datetime import datetime, timezone
from typing import Optional

import pytest
from httpx import AsyncClient

from app.models.notification import NotificationType
from app.models.scholarship import Scholarship
from app.services.notification_service import notification_service
from tests.conftest import TestAsyncSessionLocal


# Helper function to register and authenticate a fresh student
async def create_and_login_user(
    async_client: AsyncClient,
    prefix: str = "notif_user",
    password: str = "SecurePass123!",
) -> dict:
    user_email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": user_email,
            "password": password,
            "first_name": "Notif",
            "last_name": "Student",
        },
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "user_id": uuid.UUID(user_id),
        "token": token,
    }


# Helper function to seed test notifications directly
async def seed_notification(
    user_id: uuid.UUID,
    notif_type: NotificationType = NotificationType.DEADLINE_REMINDER,
    title: str = "Application Deadline Approaching",
    message: str = "Your application is due in 3 days.",
    is_read: bool = False,
    scholarship_id: Optional[uuid.UUID] = None,
    application_id: Optional[uuid.UUID] = None,
) -> uuid.UUID:
    async with TestAsyncSessionLocal() as session:
        notif = await notification_service.create_notification(
            db=session,
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            scholarship_id=scholarship_id,
            application_id=application_id,
        )
        if is_read:
            await notification_service.mark_as_read(
                db=session,
                user_id=user_id,
                notification_id=notif.id,
            )
        return notif.id


# ==============================================================================
# 1. AUTHENTICATION TESTS (401 UNAUTHORIZED)
# ==============================================================================

@pytest.mark.anyio
async def test_unauthorized_list_notifications(async_client: AsyncClient):
    """Test 1: Unauthenticated request to list notifications returns 401."""
    res = await async_client.get("/api/v1/notifications")
    assert res.status_code == 401


@pytest.mark.anyio
async def test_unauthorized_get_notification(async_client: AsyncClient):
    """Test 2: Unauthenticated request to get single notification returns 401."""
    random_id = uuid.uuid4()
    res = await async_client.get(f"/api/v1/notifications/{random_id}")
    assert res.status_code == 401


@pytest.mark.anyio
async def test_unauthorized_mark_read(async_client: AsyncClient):
    """Test 3: Unauthenticated request to mark notification read returns 401."""
    random_id = uuid.uuid4()
    res = await async_client.patch(f"/api/v1/notifications/{random_id}/read")
    assert res.status_code == 401


@pytest.mark.anyio
async def test_unauthorized_mark_all_read(async_client: AsyncClient):
    """Test 4: Unauthenticated request to mark all read returns 401."""
    res = await async_client.patch("/api/v1/notifications/read-all")
    assert res.status_code == 401


@pytest.mark.anyio
async def test_unauthorized_unread_count(async_client: AsyncClient):
    """Test 5: Unauthenticated request for unread count returns 401."""
    res = await async_client.get("/api/v1/notifications/unread-count")
    assert res.status_code == 401


@pytest.mark.anyio
async def test_unauthorized_delete_notification(async_client: AsyncClient):
    """Test 6: Unauthenticated request to delete notification returns 401."""
    random_id = uuid.uuid4()
    res = await async_client.delete(f"/api/v1/notifications/{random_id}")
    assert res.status_code == 401


# ==============================================================================
# 2. LIST & FILTER NOTIFICATIONS
# ==============================================================================

@pytest.mark.anyio
async def test_list_notifications_empty(async_client: AsyncClient):
    """Test 7 & 11: Fresh student has empty notification list with total=0 and unread_count=0."""
    auth = await create_and_login_user(async_client, prefix="empty_notif")

    res = await async_client.get(
        "/api/v1/notifications",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["unread_count"] == 0
    assert data["page"] == 1
    assert data["total_pages"] == 0


@pytest.mark.anyio
async def test_list_notifications_pagination_and_ordering(async_client: AsyncClient):
    """Test 8 & 9: List notifications returns paginated items sorted newest first."""
    auth = await create_and_login_user(async_client, prefix="page_notif")
    user_id = auth["user_id"]

    # Seed 3 notifications with distinct titles
    id1 = await seed_notification(user_id, NotificationType.DEADLINE_REMINDER, title="Alert 1")
    id2 = await seed_notification(user_id, NotificationType.NEW_SCHOLARSHIP, title="Alert 2")
    id3 = await seed_notification(user_id, NotificationType.APPLICATION_CONFIRMATION, title="Alert 3")

    # Fetch page 1 with page_size = 2
    res = await async_client.get(
        "/api/v1/notifications?page=1&page_size=2",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert data["unread_count"] == 3
    assert len(data["items"]) == 2
    assert data["total_pages"] == 2
    # Alert 3 was created last, so it must be first
    assert data["items"][0]["title"] == "Alert 3"
    assert data["items"][1]["title"] == "Alert 2"

    # Fetch page 2
    res_p2 = await async_client.get(
        "/api/v1/notifications?page=2&page_size=2",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["items"]) == 1
    assert data_p2["items"][0]["title"] == "Alert 1"


@pytest.mark.anyio
async def test_list_notifications_filter_unread(async_client: AsyncClient):
    """Test 12: Filter tab 'unread' returns only unread notifications."""
    auth = await create_and_login_user(async_client, prefix="filter_notif")
    user_id = auth["user_id"]

    # Seed 1 read, 2 unread
    await seed_notification(user_id, NotificationType.RESULT, title="Read Alert", is_read=True)
    await seed_notification(user_id, NotificationType.INTERVIEW, title="Unread Alert 1", is_read=False)
    await seed_notification(user_id, NotificationType.MISSING_DOCUMENT, title="Unread Alert 2", is_read=False)

    # Filter unread
    res = await async_client.get(
        "/api/v1/notifications?filter=unread",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert data["unread_count"] == 2
    assert all(item["is_read"] is False for item in data["items"])

    # Filter all
    res_all = await async_client.get(
        "/api/v1/notifications?filter=all",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total"] == 3
    assert data_all["unread_count"] == 2


@pytest.mark.anyio
async def test_list_notifications_cross_user_isolation(async_client: AsyncClient):
    """Test 10: Notifications of User A are never visible to User B."""
    user_a = await create_and_login_user(async_client, prefix="notif_iso_a")
    user_b = await create_and_login_user(async_client, prefix="notif_iso_b")

    await seed_notification(user_a["user_id"], title="User A Secret Alert")
    await seed_notification(user_b["user_id"], title="User B Public Alert")

    # User A lists
    res_a = await async_client.get(
        "/api/v1/notifications",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert res_a.status_code == 200
    items_a = res_a.json()["items"]
    assert len(items_a) == 1
    assert items_a[0]["title"] == "User A Secret Alert"
    assert str(items_a[0]["user_id"]) == str(user_a["user_id"])

    # User B lists
    res_b = await async_client.get(
        "/api/v1/notifications",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert res_b.status_code == 200
    items_b = res_b.json()["items"]
    assert len(items_b) == 1
    assert items_b[0]["title"] == "User B Public Alert"
    assert str(items_b[0]["user_id"]) == str(user_b["user_id"])


# ==============================================================================
# 3. GET SINGLE NOTIFICATION DETAIL
# ==============================================================================

@pytest.mark.anyio
async def test_get_own_notification_detail(async_client: AsyncClient):
    """Test 13: Retrieve detail of own notification."""
    auth = await create_and_login_user(async_client, prefix="detail_notif")
    notif_id = await seed_notification(
        auth["user_id"],
        NotificationType.INTERVIEW,
        title="Panel Interview Invite",
        message="Interview scheduled for Monday 10:00 AM.",
    )

    res = await async_client.get(
        f"/api/v1/notifications/{notif_id}",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(notif_id)
    assert data["type"] == "INTERVIEW"
    assert data["title"] == "Panel Interview Invite"
    assert data["message"] == "Interview scheduled for Monday 10:00 AM."
    assert data["is_read"] is False
    assert "created_at" in data


@pytest.mark.anyio
async def test_get_foreign_notification_returns_404(async_client: AsyncClient):
    """Test 14: User B attempting to get User A's notification returns 404."""
    user_a = await create_and_login_user(async_client, prefix="for_a")
    user_b = await create_and_login_user(async_client, prefix="for_b")

    notif_id = await seed_notification(user_a["user_id"], title="Private to A")

    res = await async_client.get(
        f"/api/v1/notifications/{notif_id}",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_get_missing_notification_returns_404(async_client: AsyncClient):
    """Test 15: Nonexistent notification UUID returns 404."""
    auth = await create_and_login_user(async_client, prefix="miss_notif")
    random_id = uuid.uuid4()

    res = await async_client.get(
        f"/api/v1/notifications/{random_id}",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 404


@pytest.mark.anyio
async def test_invalid_uuid_returns_422(async_client: AsyncClient):
    """Test 16: Malformed UUID path parameter returns 422 Unprocessable Entity."""
    auth = await create_and_login_user(async_client, prefix="uuid_notif")

    res = await async_client.get(
        "/api/v1/notifications/invalid-uuid-string",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 422


# ==============================================================================
# 4. MARK AS READ (SINGLE & IDEMPOTENCY)
# ==============================================================================

@pytest.mark.anyio
async def test_mark_single_notification_as_read(async_client: AsyncClient):
    """Test 17 & 18: Mark single notification read is successful and idempotent."""
    auth = await create_and_login_user(async_client, prefix="read_notif")
    notif_id = await seed_notification(auth["user_id"], title="Unread Notice", is_read=False)

    # First call: mark as read
    res1 = await async_client.patch(
        f"/api/v1/notifications/{notif_id}/read",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res1.status_code == 200
    assert res1.json()["is_read"] is True

    # Second call: idempotent, still returns 200 and is_read=True
    res2 = await async_client.patch(
        f"/api/v1/notifications/{notif_id}/read",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res2.status_code == 200
    assert res2.json()["is_read"] is True


@pytest.mark.anyio
async def test_mark_foreign_notification_read_returns_404(async_client: AsyncClient):
    """Test 19: User B cannot mark User A's notification as read (returns 404)."""
    user_a = await create_and_login_user(async_client, prefix="rf_a")
    user_b = await create_and_login_user(async_client, prefix="rf_b")

    notif_id = await seed_notification(user_a["user_id"], title="User A Unread", is_read=False)

    res = await async_client.patch(
        f"/api/v1/notifications/{notif_id}/read",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert res.status_code == 404


# ==============================================================================
# 5. MARK ALL AS READ
# ==============================================================================

@pytest.mark.anyio
async def test_mark_all_notifications_as_read(async_client: AsyncClient):
    """Test 20, 21, 22: Mark all read updates own notifications only and is repeatable."""
    user_a = await create_and_login_user(async_client, prefix="all_a")
    user_b = await create_and_login_user(async_client, prefix="all_b")

    # User A has 3 unread
    await seed_notification(user_a["user_id"], title="A1", is_read=False)
    await seed_notification(user_a["user_id"], title="A2", is_read=False)
    await seed_notification(user_a["user_id"], title="A3", is_read=False)

    # User B has 2 unread
    await seed_notification(user_b["user_id"], title="B1", is_read=False)
    await seed_notification(user_b["user_id"], title="B2", is_read=False)

    # User A marks all read
    res_a = await async_client.patch(
        "/api/v1/notifications/read-all",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert res_a.status_code == 200
    assert res_a.json()["updated_count"] == 3

    # Verify User A has 0 unread
    count_a = await async_client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert count_a.json()["unread_count"] == 0

    # Verify User B still has 2 unread (isolation)
    count_b = await async_client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert count_b.json()["unread_count"] == 2

    # User A calls read-all again: safe, returns updated_count=0
    res_a2 = await async_client.patch(
        "/api/v1/notifications/read-all",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert res_a2.status_code == 200
    assert res_a2.json()["updated_count"] == 0


# ==============================================================================
# 6. UNREAD COUNT
# ==============================================================================

@pytest.mark.anyio
async def test_unread_count_lifecycle(async_client: AsyncClient):
    """Test 23, 24, 25, 26: Unread count increments, decrements on read, and becomes 0 on read-all."""
    auth = await create_and_login_user(async_client, prefix="count_notif")
    user_id = auth["user_id"]

    # Initial: 0
    res0 = await async_client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res0.json()["unread_count"] == 0

    # Add 2 unread, 1 read
    n1 = await seed_notification(user_id, title="Unread 1", is_read=False)
    n2 = await seed_notification(user_id, title="Unread 2", is_read=False)
    await seed_notification(user_id, title="Already Read", is_read=True)

    res1 = await async_client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res1.json()["unread_count"] == 2

    # Mark 1 read
    await async_client.patch(
        f"/api/v1/notifications/{n1}/read",
        headers={"Authorization": auth["Authorization"]},
    )

    res2 = await async_client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res2.json()["unread_count"] == 1

    # Mark all read
    await async_client.patch(
        "/api/v1/notifications/read-all",
        headers={"Authorization": auth["Authorization"]},
    )

    res3 = await async_client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res3.json()["unread_count"] == 0


# ==============================================================================
# 7. DELETE NOTIFICATION
# ==============================================================================

@pytest.mark.anyio
async def test_delete_own_notification(async_client: AsyncClient):
    """Test 27: Delete own notification succeeds."""
    auth = await create_and_login_user(async_client, prefix="del_notif")
    notif_id = await seed_notification(auth["user_id"], title="Delete Me")

    res = await async_client.delete(
        f"/api/v1/notifications/{notif_id}",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    assert res.json()["notification_id"] == str(notif_id)

    # Verify 404 when getting deleted notification
    get_res = await async_client.get(
        f"/api/v1/notifications/{notif_id}",
        headers={"Authorization": auth["Authorization"]},
    )
    assert get_res.status_code == 404


@pytest.mark.anyio
async def test_delete_foreign_notification_returns_404(async_client: AsyncClient):
    """Test 28: User B cannot delete User A's notification."""
    user_a = await create_and_login_user(async_client, prefix="del_a")
    user_b = await create_and_login_user(async_client, prefix="del_b")

    notif_id = await seed_notification(user_a["user_id"], title="A's alert")

    res = await async_client.delete(
        f"/api/v1/notifications/{notif_id}",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert res.status_code == 404


@pytest.mark.anyio
async def test_delete_missing_notification_returns_404(async_client: AsyncClient):
    """Test 29: Deleting nonexistent notification returns 404."""
    auth = await create_and_login_user(async_client, prefix="del_miss")
    random_id = uuid.uuid4()

    res = await async_client.delete(
        f"/api/v1/notifications/{random_id}",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 404


# ==============================================================================
# 8. NOTIFICATION CREATION SERVICE & API ENDPOINT
# ==============================================================================

@pytest.mark.anyio
async def test_notification_creation_service_with_relations(async_client: AsyncClient):
    """Test 30, 31, 32: Notification creation service supports optional scholarship and application IDs."""
    auth = await create_and_login_user(async_client, prefix="service_notif")
    user_id = auth["user_id"]

    # Create real scholarship and application to satisfy FK constraints
    sch_id = uuid.uuid4()
    app_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        from app.models.application import Application, ApplicationStatus
        from decimal import Decimal

        sch = Scholarship(
            id=sch_id,
            name=f"Test Notification Scholarship {sch_id.hex[:6]}",
            provider="Tech Foundation",
            description="Fellowship grant",
            amount=Decimal("50000.00"),
            deadline=datetime.now(timezone.utc).date(),
        )
        session.add(sch)
        await session.flush()

        app_record = Application(
            id=app_id,
            user_id=user_id,
            scholarship_id=sch_id,
            status=ApplicationStatus.APPLIED,
        )
        session.add(app_record)
        await session.commit()

    async with TestAsyncSessionLocal() as session:
        notif = await notification_service.create_notification(
            db=session,
            user_id=user_id,
            type=NotificationType.NEW_SCHOLARSHIP,
            title="New Match Found",
            message="You matched with a scholarship.",
            scholarship_id=sch_id,
            application_id=app_id,
        )
        assert notif.id is not None
        assert notif.scholarship_id == sch_id
        assert notif.application_id == app_id
        assert notif.is_read is False

        # Cleanup test records
        await session.delete(notif)
        del_app = await session.get(Application, app_id)
        if del_app:
            await session.delete(del_app)
        del_sch = await session.get(Scholarship, sch_id)
        if del_sch:
            await session.delete(del_sch)
        await session.commit()


@pytest.mark.anyio
async def test_post_notification_endpoint(async_client: AsyncClient):
    """Test 33: Create notification via POST /api/v1/notifications returns 201."""
    auth = await create_and_login_user(async_client, prefix="post_notif")

    payload = {
        "type": "MISSING_DOCUMENT",
        "title": "Upload Income Certificate",
        "message": "Please upload income proof before Sept 30.",
    }
    res = await async_client.post(
        "/api/v1/notifications",
        headers={"Authorization": auth["Authorization"]},
        json=payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "MISSING_DOCUMENT"
    assert data["title"] == "Upload Income Certificate"
    assert data["message"] == "Please upload income proof before Sept 30."
    assert data["is_read"] is False


@pytest.mark.anyio
async def test_no_sensitive_fields_in_notification_responses(async_client: AsyncClient):
    """Test 34: Notification responses contain no secrets, password hashes, or internal tokens."""
    auth = await create_and_login_user(async_client, prefix="sec_notif")
    await seed_notification(auth["user_id"], title="Security Verification Alert")

    res = await async_client.get(
        "/api/v1/notifications",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    res_str = res.text
    assert "password_hash" not in res_str
    assert "secret" not in res_str.lower()
    assert "api_key" not in res_str.lower()
