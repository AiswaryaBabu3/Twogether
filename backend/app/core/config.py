import logging
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

logger = logging.getLogger("twogether.config")


class Settings(BaseSettings):
    PROJECT_NAME: str = "Twogether API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Supabase PostgreSQL Database Configuration
    DATABASE_URL: str = "postgresql://postgres:[YOUR-PASSWORD]@db.kzxllpwcaynyddkzypro.supabase.co:5432/postgres"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # Redis Cache Configuration
    REDIS_ENABLED: bool = True
    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    REDIS_PROTOCOL: int = 2
    REDIS_CONNECT_TIMEOUT: float = 3.0

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @computed_field
    @property
    def async_database_url(self) -> str:
        """
        Converts generic or sync postgresql URLs to asyncpg dialect for SQLAlchemy async engine.
        Removes any sync-only query params like sslmode if present.
        """
        url_obj = make_url(self.DATABASE_URL)
        # Set driver to asyncpg
        url_obj = url_obj.set(drivername="postgresql+asyncpg")
        
        # Clean query parameters for asyncpg if needed
        query = dict(url_obj.query)
        if "sslmode" in query:
            sslmode = query.pop("sslmode")
            if sslmode in ("require", "verify-ca", "verify-full"):
                query["ssl"] = "require"
            url_obj = url_obj.set(query=query)

        return url_obj.render_as_string(hide_password=False)

    @computed_field
    @property
    def sync_database_url(self) -> str:
        """
        Converts generic or async postgresql URLs to psycopg2 dialect for Alembic sync migrations.
        """
        url_obj = make_url(self.DATABASE_URL)
        url_obj = url_obj.set(drivername="postgresql+psycopg2")
        return url_obj.render_as_string(hide_password=False)


settings = Settings()
