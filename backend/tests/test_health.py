import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Test the root endpoint returns app metadata and endpoint map."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION
    assert "docs_url" in data
    assert "endpoints" in data


@pytest.mark.asyncio
async def test_basic_health_endpoint(async_client: AsyncClient):
    """Test the basic /health endpoint returns 200 OK."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION
    assert "environment" in data


@pytest.mark.asyncio
async def test_redis_health_endpoint(async_client: AsyncClient):
    """Test the /health/redis endpoint handles enabled or disabled state properly."""
    response = await async_client.get("/health/redis")
    # If redis is enabled and running, expect 200. If disabled, expect 200.
    # If enabled and disconnected, expect 503.
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "disabled", "unhealthy")


@pytest.mark.asyncio
async def test_database_health_endpoint_response_structure(async_client: AsyncClient):
    """Test /health/db returns structured status (200 if connected, 503 if disconnected)."""
    response = await async_client.get("/health/db")
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "unhealthy")
    assert "database" in data
