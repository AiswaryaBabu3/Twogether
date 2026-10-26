import logging
import time
from typing import AsyncGenerator, Dict, Any, Optional
import redis.asyncio as aioredis
from redis.asyncio import Redis, ConnectionPool
from app.core.config import settings

logger = logging.getLogger("twogether.redis")

redis_pool: Optional[ConnectionPool] = None
redis_client: Optional[Redis] = None


def get_redis_client() -> Optional[Redis]:
    """Return the global Redis client if Redis is enabled, else None."""
    global redis_pool, redis_client
    if not settings.REDIS_ENABLED:
        return None

    if redis_client is None:
        logger.info(f"Connecting to Redis at {settings.REDIS_URL} with protocol {settings.REDIS_PROTOCOL}...")
        try:
            redis_pool = ConnectionPool.from_url(
                settings.REDIS_URL,
                protocol=settings.REDIS_PROTOCOL,
                socket_connect_timeout=settings.REDIS_CONNECT_TIMEOUT,
                socket_timeout=settings.REDIS_CONNECT_TIMEOUT,
                decode_responses=True,
                max_connections=20
            )
        except TypeError:
            redis_pool = ConnectionPool.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=settings.REDIS_CONNECT_TIMEOUT,
                socket_timeout=settings.REDIS_CONNECT_TIMEOUT,
                decode_responses=True,
                max_connections=20
            )
        redis_client = Redis(connection_pool=redis_pool)
    return redis_client


async def init_redis() -> None:
    """Test connection on startup if Redis is enabled."""
    if not settings.REDIS_ENABLED:
        logger.info("Redis is disabled in configuration. Skipping startup initialization.")
        return

    try:
        client = get_redis_client()
        if client:
            pong = await client.ping()
            if pong:
                logger.info("Redis connection successfully initialized and pinged.")
    except Exception as exc:
        logger.warning(f"Redis is enabled but connection failed during startup: {exc}. App will continue running.")


async def close_redis() -> None:
    """Close Redis connection and pool on shutdown."""
    global redis_client, redis_pool
    if redis_client is not None:
        logger.info("Closing Redis connection...")
        try:
            await redis_client.aclose()
        except Exception as exc:
            logger.warning(f"Error while closing Redis client: {exc}")
        redis_client = None

    if redis_pool is not None:
        logger.info("Disconnecting Redis connection pool...")
        try:
            await redis_pool.disconnect()
        except Exception as exc:
            logger.warning(f"Error while disconnecting Redis pool: {exc}")
        redis_pool = None
        logger.info("Redis pool disconnected.")


async def get_redis() -> AsyncGenerator[Optional[Redis], None]:
    """Dependency that yields Redis client (or None if disabled)."""
    client = get_redis_client()
    yield client


async def check_redis_health() -> Dict[str, Any]:
    """Check connectivity and latency to Redis cache."""
    if not settings.REDIS_ENABLED:
        return {
            "status": "disabled",
            "redis": "disabled",
            "message": "Redis is disabled in configuration."
        }

    start_time = time.perf_counter()
    try:
        client = get_redis_client()
        if client is None:
            return {
                "status": "disabled",
                "redis": "disabled",
                "message": "Redis client is not available."
            }

        pong = await client.ping()
        latency = (time.perf_counter() - start_time) * 1000

        if pong:
            return {
                "status": "healthy",
                "redis": "connected",
                "latency_ms": round(latency, 2),
                "url": settings.REDIS_URL
            }
        else:
            return {
                "status": "unhealthy",
                "redis": "unexpected response",
                "latency_ms": round(latency, 2)
            }
    except Exception as exc:
        latency = (time.perf_counter() - start_time) * 1000
        return {
            "status": "unhealthy",
            "redis": "disconnected",
            "error": str(exc),
            "latency_ms": round(latency, 2)
        }
