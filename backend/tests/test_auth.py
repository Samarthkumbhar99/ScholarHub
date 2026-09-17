import uuid
from datetime import timedelta
import pytest
from httpx import AsyncClient

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hashing_and_verification():
    """Verify Argon2 password hashing and verification functions."""
    raw_password = "SecurePassword123!"
    hashed = hash_password(raw_password)

    # Verify hashing generates non-empty Argon2 string
    assert hashed.startswith("$argon2")
    assert hashed != raw_password

    # Verification checks
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False
    assert verify_password("", hashed) is False

    # Unique salts check: Hashing same password twice yields different hashes
    hashed2 = hash_password(raw_password)
    assert hashed != hashed2
    assert verify_password(raw_password, hashed2) is True


def test_jwt_creation_and_decoding():
    """Verify JWT access token creation, claims, and expiration."""
    user_id = str(uuid.uuid4())
    token = create_access_token(data={"sub": user_id})

    payload = decode_access_token(token)
    assert payload.get("sub") == user_id
    assert "exp" in payload
    assert "iat" in payload

    # Test expired token decoding raises exception
    expired_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(seconds=-10),
    )
    with pytest.raises(Exception):
        decode_access_token(expired_token)


@pytest.mark.anyio
async def test_user_registration_flow(async_client: AsyncClient):
    """Verify successful user registration, safe response, and password hashing in database."""
    unique_email = f"student_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPassword123!"

    response = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert response.status_code == 201
    data = response.json()

    assert "id" in data
    assert data["email"] == unique_email.lower()
    assert "created_at" in data
    assert "updated_at" in data
    assert "password_hash" not in data
    assert "password" not in data


@pytest.mark.anyio
async def test_duplicate_email_registration_conflict(async_client: AsyncClient):
    """Verify duplicate email registration returns 409 Conflict."""
    unique_email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPassword123!"

    # First registration
    resp1 = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert resp1.status_code == 201

    # Second registration with same email (even with different casing/spaces)
    resp2 = await async_client.post(
        "/api/v1/auth/register",
        json={"email": f" {unique_email.upper()} ", "password": password},
    )
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]


@pytest.mark.anyio
async def test_registration_validation_errors(async_client: AsyncClient):
    """Verify invalid registration payload returns 422 Unprocessable Entity."""
    # Short password
    resp1 = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "valid@example.com", "password": "short"},
    )
    assert resp1.status_code == 422

    # Invalid email
    resp2 = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "ValidPassword123!"},
    )
    assert resp2.status_code == 422


@pytest.mark.anyio
async def test_user_login_success_and_failure(async_client: AsyncClient):
    """Verify user login with correct credentials, wrong password, and nonexistent email."""
    unique_email = f"login_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword123!"

    # Register user
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert reg_resp.status_code == 201

    # Successful login
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert "password" not in token_data
    assert "password_hash" not in token_data

    # Login with wrong password
    wrong_pwd_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPassword!"},
    )
    assert wrong_pwd_resp.status_code == 401
    assert wrong_pwd_resp.json()["detail"] == "Incorrect email or password"

    # Login with nonexistent email
    nonexistent_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": password},
    )
    assert nonexistent_resp.status_code == 401
    assert nonexistent_resp.json()["detail"] == "Incorrect email or password"


@pytest.mark.anyio
async def test_get_current_user_me_endpoint(async_client: AsyncClient):
    """Verify protected /api/v1/auth/me endpoint with valid, missing, expired, and invalid tokens."""
    unique_email = f"me_{uuid.uuid4().hex[:8]}@example.com"
    password = "MySecurePassword123!"

    # Register and login
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    token = login_resp.json()["access_token"]

    # 1. Valid token
    me_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data["email"] == unique_email
    assert "password_hash" not in user_data

    # 2. Missing token
    no_token_resp = await async_client.get("/api/v1/auth/me")
    assert no_token_resp.status_code == 401

    # 3. Invalid / malformed token
    invalid_token_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert invalid_token_resp.status_code == 401

    # 4. Expired token
    expired_token = create_access_token(
        data={"sub": user_data["id"]},
        expires_delta=timedelta(seconds=-10),
    )
    expired_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_resp.status_code == 401

    # 5. Nonexistent user UUID in valid token
    ghost_user_id = str(uuid.uuid4())
    ghost_token = create_access_token(data={"sub": ghost_user_id})
    ghost_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {ghost_token}"},
    )
    assert ghost_resp.status_code == 401
