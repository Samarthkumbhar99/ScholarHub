from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify GET / returns HTTP 200 and expected status message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ScholarHub API"
    assert data["status"] == "running"
    assert "version" in data


def test_health_endpoint_healthy():
    """Verify GET /api/v1/health returns HTTP 200 and database connected status when database is reachable."""
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar.return_value = 1
    mock_session.execute.return_value = mock_result

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data == {
            "status": "healthy",
            "service": "ScholarHub API",
            "version": "1.0.0",
            "database": "connected",
        }
    finally:
        app.dependency_overrides.clear()


def test_health_endpoint_unhealthy():
    """Verify GET /api/v1/health returns HTTP 503 and database disconnected status when database is unreachable."""
    mock_session = AsyncMock()
    mock_session.execute.side_effect = Exception("Connection refused to database")

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = client.get("/api/v1/health")
        assert response.status_code == 503
        data = response.json()
        assert data == {
            "status": "unhealthy",
            "service": "ScholarHub API",
            "version": "1.0.0",
            "database": "disconnected",
        }
    finally:
        app.dependency_overrides.clear()


def test_live_health_endpoint_integration():
    """Verify live GET /api/v1/health executes real query against database without mock overrides."""
    response = client.get("/api/v1/health")
    assert response.status_code in (200, 503)
    data = response.json()
    assert data["service"] == "ScholarHub API"
    assert "version" in data
    assert data["database"] in ("connected", "disconnected")
    if response.status_code == 200:
        assert data["database"] == "connected"
        assert data["status"] == "healthy"
