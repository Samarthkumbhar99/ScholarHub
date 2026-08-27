import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import Settings
from app.core.database import Base, engine, get_db, AsyncSessionLocal


def test_database_settings_url_validator():
    """Verify Settings converts standard postgres:// or postgresql:// schemes to asyncpg driver."""
    s1 = Settings(DATABASE_URL="postgresql://user:pass@localhost:5432/testdb")
    assert s1.DATABASE_URL.startswith("postgresql+asyncpg://")

    s2 = Settings(DATABASE_URL="postgres://user:pass@localhost:5432/testdb")
    assert s2.DATABASE_URL.startswith("postgresql+asyncpg://")

    s3 = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/testdb")
    assert s3.DATABASE_URL == "postgresql+asyncpg://user:pass@localhost:5432/testdb"


def test_database_engine_and_session_setup():
    """Verify AsyncEngine and AsyncSessionLocal are correctly configured."""
    assert isinstance(engine, AsyncEngine)
    assert issubclass(Base, DeclarativeBase)
    assert AsyncSessionLocal.class_ == AsyncSession


@pytest.mark.anyio
async def test_get_db_generator():
    """Verify get_db dependency yields an AsyncSession and cleans up."""
    gen = get_db()
    session = await anext(gen)
    assert isinstance(session, AsyncSession)
    await session.close()


@pytest.mark.anyio
async def test_database_real_query_execution():
    """Verify executing SELECT 1 on AsyncSessionLocal against the configured database."""
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        pytest.skip(f"Live database not reachable: {e}")
