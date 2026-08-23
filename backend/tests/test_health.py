from fastapi.testclient import TestClient
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


def test_health_endpoint():
    """Verify GET /api/v1/health returns HTTP 200 and healthy status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "status": "healthy",
        "service": "ScholarHub API",
        "version": "1.0.0",
    }
