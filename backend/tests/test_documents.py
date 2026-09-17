import io
import uuid
from datetime import date, timedelta
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import StudentDocument
from app.models.user import User
from app.services.document_service import document_service
from app.services.storage.cloudinary_service import (
    StorageConfigurationError,
    StorageDeleteError,
    StorageUploadError,
)
from tests.conftest import TestAsyncSessionLocal


# Helper functions to register and login users for testing
async def create_and_login_user(
    async_client: AsyncClient,
    prefix: str = "doc_student",
    password: str = "SecurePass123!",
) -> dict:
    user_email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": user_email,
            "password": password,
            "first_name": "Doc",
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
    data = login_res.json()
    token = data["access_token"]

    return {"Authorization": f"Bearer {token}", "user_id": user_id, "token": token}


@pytest.fixture(autouse=True)
def mock_storage():
    """Default mock for Cloudinary storage service in all document tests."""
    with patch.object(
        document_service.storage,
        "upload_file",
        return_value={
            "secure_url": "https://res.cloudinary.com/testcloud/image/upload/v123456789/scholarhub/student_documents/doc123.pdf",
            "public_id": "scholarhub/student_documents/doc123",
            "bytes": 2048,
            "format": "pdf",
            "resource_type": "auto",
        },
    ), patch.object(
        document_service.storage,
        "delete_file",
        return_value=True,
    ):
        yield


@pytest.mark.anyio
async def test_successful_document_upload(async_client: AsyncClient):
    """Test 1: Successful document upload returns 201 with metadata."""
    auth = await create_and_login_user(async_client, prefix="upload_test")

    pdf_content = b"%PDF-1.4 test document content here"
    files = {"file": ("my_aadhaar.pdf", io.BytesIO(pdf_content), "application/pdf")}
    data = {
        "type": "aadhaar",
        "category": "Identity",
        "expiry_date": "2030-12-31",
    }

    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data=data,
    )

    assert res.status_code == 201
    res_data = res.json()
    assert res_data["type"] == "aadhaar"
    assert res_data["category"] == "Identity"
    assert res_data["file_name"] == "my_aadhaar.pdf"
    assert res_data["expiry_date"] == "2030-12-31"
    assert "https://res.cloudinary.com" in res_data["file_url"]
    assert res_data["user_id"] == auth["user_id"]


@pytest.mark.anyio
async def test_upload_missing_authentication(async_client: AsyncClient):
    """Test 2: Upload without token returns 401 Unauthorized."""
    pdf_content = b"%PDF-1.4 test document"
    files = {"file": ("doc.pdf", io.BytesIO(pdf_content), "application/pdf")}
    data = {"type": "pan", "category": "Identity"}

    res = await async_client.post("/api/v1/documents", files=files, data=data)
    assert res.status_code == 401


@pytest.mark.anyio
async def test_invalid_uuid_handling(async_client: AsyncClient):
    """Test 3: Requesting document with invalid UUID string returns 422."""
    auth = await create_and_login_user(async_client, prefix="uuid_test")

    res = await async_client.get(
        "/api/v1/documents/not-a-valid-uuid",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 422


@pytest.mark.anyio
async def test_unsupported_file_extension(async_client: AsyncClient):
    """Test 4a: Uploading executable or disallowed extension returns 400."""
    auth = await create_and_login_user(async_client, prefix="ext_test")

    file_content = b"malicious script content"
    files = {"file": ("hack.exe", io.BytesIO(file_content), "application/pdf")}
    data = {"type": "marksheet", "category": "Academic"}

    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data=data,
    )
    assert res.status_code == 400
    assert "Unsupported file extension" in res.json()["detail"]


@pytest.mark.anyio
async def test_unsupported_mime_type(async_client: AsyncClient):
    """Test 4b: Uploading disallowed MIME type returns 400."""
    auth = await create_and_login_user(async_client, prefix="mime_test")

    file_content = b"random text data"
    files = {"file": ("doc.pdf", io.BytesIO(file_content), "text/html")}
    data = {"type": "marksheet", "category": "Academic"}

    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data=data,
    )
    assert res.status_code == 400
    assert "Unsupported MIME type" in res.json()["detail"]


@pytest.mark.anyio
async def test_oversized_file_rejected(async_client: AsyncClient):
    """Test 5: Uploading file larger than 10MB limit returns 400."""
    auth = await create_and_login_user(async_client, prefix="size_test")

    # Create dummy bytes > 10 MB
    large_bytes = b"0" * (10 * 1024 * 1024 + 1024)
    files = {"file": ("huge.pdf", io.BytesIO(large_bytes), "application/pdf")}
    data = {"type": "income_certificate", "category": "Financial"}

    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data=data,
    )
    assert res.status_code == 400
    assert "exceeds the maximum limit" in res.json()["detail"]


@pytest.mark.anyio
async def test_empty_file_rejected(async_client: AsyncClient):
    """Test 6: Uploading 0-byte file returns 400."""
    auth = await create_and_login_user(async_client, prefix="empty_test")

    files = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}
    data = {"type": "caste_certificate", "category": "Category"}

    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data=data,
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_empty_document_type_rejected(async_client: AsyncClient):
    """Test 7: Uploading with whitespace/empty type returns 400."""
    auth = await create_and_login_user(async_client, prefix="type_test")

    files = {"file": ("doc.png", io.BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png")}
    data = {"type": "   ", "category": "Identity"}

    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data=data,
    )
    assert res.status_code == 400
    assert "type cannot be empty" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_list_documents_pagination_and_isolation(async_client: AsyncClient):
    """Test 8, 9, 10, 23: Document listing, pagination, and strict user isolation."""
    user_a = await create_and_login_user(async_client, prefix="student_a")
    user_b = await create_and_login_user(async_client, prefix="student_b")

    # Upload doc for user A
    files_a = {"file": ("a_marksheet.pdf", io.BytesIO(b"%PDF A"), "application/pdf")}
    await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": user_a["Authorization"]},
        files=files_a,
        data={"type": "marksheet", "category": "Academic"},
    )

    # Upload doc for user B
    files_b = {"file": ("b_passport.jpg", io.BytesIO(b"\xff\xd8\xff B"), "image/jpeg")}
    await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": user_b["Authorization"]},
        files=files_b,
        data={"type": "passport", "category": "Identity"},
    )

    # List as User A
    res_a = await async_client.get(
        "/api/v1/documents",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["total"] >= 1
    # Check that only user A's documents are in data_a
    for item in data_a["items"]:
        assert item["user_id"] == user_a["user_id"]
        assert item["user_id"] != user_b["user_id"]

    # List as User B
    res_b = await async_client.get(
        "/api/v1/documents",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert res_b.status_code == 200
    data_b = res_b.json()
    for item in data_b["items"]:
        assert item["user_id"] == user_b["user_id"]
        assert item["user_id"] != user_a["user_id"]


@pytest.mark.anyio
async def test_get_document_detail_and_cross_user_404(async_client: AsyncClient):
    """Test 11 & 12: Retrieve own document vs. foreign document returning 404."""
    user_a = await create_and_login_user(async_client, prefix="get_a")
    user_b = await create_and_login_user(async_client, prefix="get_b")

    # User A uploads a document
    files_a = {"file": ("a_doc.pdf", io.BytesIO(b"%PDF A"), "application/pdf")}
    upload_res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": user_a["Authorization"]},
        files=files_a,
        data={"type": "bank_passbook", "category": "Banking"},
    )
    doc_id = upload_res.json()["id"]

    # User A retrieves own document
    get_res_a = await async_client.get(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert get_res_a.status_code == 200
    assert get_res_a.json()["id"] == doc_id
    assert get_res_a.json()["type"] == "bank_passbook"

    # User B tries to retrieve User A's document -> 404 (isolation, no existence leak)
    get_res_b = await async_client.get(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert get_res_b.status_code == 404
    assert "not found" in get_res_b.json()["detail"].lower()


@pytest.mark.anyio
async def test_delete_own_document_and_cross_user_delete_404(async_client: AsyncClient):
    """Test 13 & 14: Delete own document vs. delete foreign document returning 404."""
    user_a = await create_and_login_user(async_client, prefix="del_a")
    user_b = await create_and_login_user(async_client, prefix="del_b")

    # User A uploads doc
    files = {"file": ("del_doc.pdf", io.BytesIO(b"%PDF Del"), "application/pdf")}
    upload_res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": user_a["Authorization"]},
        files=files,
        data={"type": "sop", "category": "Application"},
    )
    doc_id = upload_res.json()["id"]

    # User B tries to delete User A's doc -> 404
    del_res_b = await async_client.delete(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": user_b["Authorization"]},
    )
    assert del_res_b.status_code == 404

    # User A deletes own doc -> 200
    del_res_a = await async_client.delete(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert del_res_a.status_code == 200
    assert del_res_a.json()["document_id"] == doc_id

    # Verify doc is gone
    verify_res = await async_client.get(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": user_a["Authorization"]},
    )
    assert verify_res.status_code == 404


@pytest.mark.anyio
async def test_duplicate_document_type_replaces_file(async_client: AsyncClient):
    """Test 15: Uploading same type replaces existing document & updates metadata."""
    auth = await create_and_login_user(async_client, prefix="replace_test")

    # First upload
    files_v1 = {"file": ("photo_old.jpg", io.BytesIO(b"\xff\xd8\xff v1"), "image/jpeg")}
    res_v1 = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files_v1,
        data={"type": "photograph", "category": "Personal"},
    )
    assert res_v1.status_code == 201
    doc_id_1 = res_v1.json()["id"]
    assert res_v1.json()["file_name"] == "photo_old.jpg"

    # Second upload with same type
    files_v2 = {"file": ("photo_new.png", io.BytesIO(b"\x89PNG v2"), "image/png")}
    res_v2 = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files_v2,
        data={"type": "photograph", "category": "Personal"},
    )
    assert res_v2.status_code == 201
    assert res_v2.json()["id"] == doc_id_1  # Replaces existing record
    assert res_v2.json()["file_name"] == "photo_new.png"


@pytest.mark.anyio
async def test_explicit_replace_put_endpoint(async_client: AsyncClient):
    """Test 24: PUT /api/v1/documents/{id} replaces document file and metadata."""
    auth = await create_and_login_user(async_client, prefix="put_replace")

    files = {"file": ("sig1.png", io.BytesIO(b"\x89PNG sig1"), "image/png")}
    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data={"type": "signature", "category": "Personal"},
    )
    doc_id = res.json()["id"]

    # PUT replace
    files_put = {"file": ("sig2.jpg", io.BytesIO(b"\xff\xd8 sig2"), "image/jpeg")}
    put_res = await async_client.put(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": auth["Authorization"]},
        files=files_put,
        data={"category": "Personal"},
    )
    assert put_res.status_code == 200
    assert put_res.json()["file_name"] == "sig2.jpg"


@pytest.mark.anyio
async def test_cloudinary_upload_failure_handling(async_client: AsyncClient):
    """Test 16: Cloudinary upload failure triggers 502 without creating DB record."""
    auth = await create_and_login_user(async_client, prefix="cloud_err")

    with patch.object(
        document_service.storage,
        "upload_file",
        side_effect=StorageUploadError("Cloudinary connection timeout"),
    ):
        files = {"file": ("fail.pdf", io.BytesIO(b"%PDF Fail"), "application/pdf")}
        res = await async_client.post(
            "/api/v1/documents",
            headers={"Authorization": auth["Authorization"]},
            files=files,
            data={"type": "bonafide_certificate", "category": "Academic"},
        )
        assert res.status_code == 502
        assert "Storage service error" in res.json()["detail"]


@pytest.mark.anyio
async def test_db_failure_triggers_cloudinary_cleanup(async_client: AsyncClient):
    """Test 17 & 18: Database commit failure rolls back DB and calls storage.delete_file cleanup."""
    auth = await create_and_login_user(async_client, prefix="db_fail")

    cleanup_mock = MagicMock(return_value=True)
    async_commit_mock = AsyncMock(side_effect=Exception("Simulated PostgreSQL connection drop"))

    with patch.object(
        document_service.storage,
        "upload_file",
        return_value={
            "secure_url": "https://res.cloudinary.com/testcloud/image/upload/v123/scholarhub/cleanup_test.pdf",
            "public_id": "scholarhub/cleanup_test",
            "bytes": 1024,
            "format": "pdf",
            "resource_type": "auto",
        },
    ), patch.object(
        document_service.storage,
        "delete_file",
        cleanup_mock,
    ), patch.object(
        AsyncSession,
        "commit",
        async_commit_mock,
    ):
        files = {"file": ("cleanup.pdf", io.BytesIO(b"%PDF"), "application/pdf")}
        res = await async_client.post(
            "/api/v1/documents",
            headers={"Authorization": auth["Authorization"]},
            files=files,
            data={"type": "recommendation_letter", "category": "Academic"},
        )
        assert res.status_code == 500
        # Verify Cloudinary cleanup was invoked with the uploaded secure_url
        cleanup_mock.assert_called_with("https://res.cloudinary.com/testcloud/image/upload/v123/scholarhub/cleanup_test.pdf")


@pytest.mark.anyio
async def test_no_sensitive_fields_exposed(async_client: AsyncClient):
    """Test 20: Verify document endpoints never expose secrets, passwords, or internal keys."""
    auth = await create_and_login_user(async_client, prefix="sensitive_check")

    files = {"file": ("safe.pdf", io.BytesIO(b"%PDF Safe"), "application/pdf")}
    res = await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files=files,
        data={"type": "other", "category": "Other"},
    )
    assert res.status_code == 201
    res_text = res.text
    assert "password_hash" not in res_text
    assert "CLOUDINARY_API_SECRET" not in res_text
    assert "api_secret" not in res_text


@pytest.mark.anyio
async def test_category_filter_in_list(async_client: AsyncClient):
    """Test category filtering in GET /api/v1/documents."""
    auth = await create_and_login_user(async_client, prefix="filter_cat")

    # Upload 1 Identity, 1 Academic
    await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files={"file": ("p.jpg", io.BytesIO(b"\xff\xd8"), "image/jpeg")},
        data={"type": "passport", "category": "Identity"},
    )
    await async_client.post(
        "/api/v1/documents",
        headers={"Authorization": auth["Authorization"]},
        files={"file": ("m.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
        data={"type": "marksheet", "category": "Academic"},
    )

    # Filter Identity
    res = await async_client.get(
        "/api/v1/documents?category=Identity",
        headers={"Authorization": auth["Authorization"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert all(item["category"] == "Identity" for item in data["items"])
