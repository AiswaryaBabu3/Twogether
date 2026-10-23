import logging
import time
from typing import AsyncGenerator, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

logger = logging.getLogger("twogether.database")

class Base(DeclarativeBase):
    pass


# Global engine and sessionmaker instances
engine: Optional[AsyncEngine] = None
async_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    global engine
    if engine is None:
        logger.info("Initializing async database engine...")
        engine = create_async_engine(
            settings.async_database_url,
            echo=settings.DEBUG and False,  # keep false by default to prevent leaking credentials in logs
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            pool_pre_ping=True,
            connect_args={"ssl": "require"} if "supabase" in settings.DATABASE_URL else {}
        )
    return engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global async_session_factory
    if async_session_factory is None:
        async_session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )
    return async_session_factory


async def init_db() -> None:
    """Verify database connection on application startup."""
    try:
        current_engine = get_engine()
        async with current_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successfully initialized.")
    except Exception as exc:
        logger.warning(f"Database connection could not be established at startup: {exc}")


async def close_db() -> None:
    """Dispose of the database engine and connection pool on shutdown."""
    global engine, async_session_factory
    if engine is not None:
        logger.info("Disposing database engine pool...")
        await engine.dispose()
        engine = None
        async_session_factory = None
        logger.info("Database engine disposed.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_health() -> Dict[str, Any]:
    """Check connectivity and latency to Supabase PostgreSQL."""
    start_time = time.perf_counter()
    try:
        factory = get_session_factory()
        async with factory() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            latency = (time.perf_counter() - start_time) * 1000
            if val == 1:
                return {
                    "status": "healthy",
                    "database": "connected",
                    "latency_ms": round(latency, 2),
                    "dialect": "postgresql+asyncpg"
                }
            else:
                return {
                    "status": "unhealthy",
                    "database": "unexpected response",
                    "latency_ms": round(latency, 2)
                }
    except Exception as exc:
        latency = (time.perf_counter() - start_time) * 1000
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(exc),
            "latency_ms": round(latency, 2)
        }
