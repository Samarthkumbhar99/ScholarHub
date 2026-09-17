from typing import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app

# Dedicated test AsyncEngine using NullPool to prevent event loop connection caching in tests
test_async_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
)
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency override providing a test AsyncSession per request with NullPool."""
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Yield an authenticated/unauthenticated AsyncClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
    app.dependency_overrides.clear()
