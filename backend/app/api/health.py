from fastapi import APIRouter, status, Response
from app.core.config import settings
from app.core.database import check_db_health
from app.core.redis import check_redis_health

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Basic service health")
async def health_check():
    """Returns basic health check information for the Twogether API."""
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@router.get("/health/db", summary="Database connection health")
async def db_health_check(response: Response):
    """
    Checks Supabase PostgreSQL database connectivity using asyncpg.
    Returns latency and connection status.
    """
    result = await check_db_health()
    if result.get("status") != "healthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return result


@router.get("/health/redis", summary="Redis cache health")
async def redis_health_check(response: Response):
    """
    Checks Redis cache connectivity.
    If Redis is disabled, reports 'disabled' with 200 OK.
    If Redis is enabled but unreachable, returns 503 SERVICE UNAVAILABLE.
    """
    result = await check_redis_health()
    if result.get("status") == "unhealthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return result
