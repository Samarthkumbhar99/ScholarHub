"""ScholarHub Test Configuration and Isolation Fixtures.

Testing Isolation Architecture:
-------------------------------
By default, tests NEVER target or mutate the developer's active 'public' schema or data.
Test execution isolates database operations using one of two strategies:
1. Explicit TEST_DATABASE_URL: If configured in environment/.env, tests connect directly to that database.
2. Isolated 'scholarhub_test' Schema: If TEST_DATABASE_URL is not provided, tests connect using settings.DATABASE_URL
   with PostgreSQL session parameter `server_settings={"search_path": "scholarhub_test"}`.
   The 'scholarhub_test' schema is automatically created and populated with Base.metadata.create_all,
   ensuring the developer's 'public' schema (including existing manual scholarship records) is 100% untouched.

Safety Guardrail:
-----------------
If any configuration attempts to run tests against an un-isolated 'public' schema, the test harness
explicitly raises RuntimeError to prevent accidental test data pollution or corruption.
"""

import asyncio
from typing import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import Base, get_db
import app.models  # Ensure all 17 domain models are registered in Base.metadata

# Disable automatic background discovery scheduler in all test suites
settings.DISCOVERY_SCHEDULE_ENABLED = False

from app.main import app

TEST_SCHEMA = "scholarhub_test"

if settings.TEST_DATABASE_URL:
    _test_db_url = settings.TEST_DATABASE_URL
    _connect_args = {}
else:
    _test_db_url = settings.DATABASE_URL
    _connect_args = {"server_settings": {"search_path": TEST_SCHEMA}}

# Dedicated test AsyncEngine using NullPool to prevent event loop connection caching in tests
test_async_engine = create_async_engine(
    _test_db_url,
    poolclass=NullPool,
    connect_args=_connect_args,
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Configure scheduler singleton to use isolated test engine and session factory
from app.services.discovery.scheduler import get_discovery_scheduler
_test_sched = get_discovery_scheduler()
_test_sched.session_factory = TestAsyncSessionLocal
_test_sched.db_engine = test_async_engine


async def _async_prepare_test_environment() -> None:
    """Prepare isolated test environment and tables."""
    if not settings.TEST_DATABASE_URL:
        admin_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
        async with admin_engine.begin() as conn:
            await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {TEST_SCHEMA};"))
        await admin_engine.dispose()

    async with test_async_engine.begin() as conn:
        res = await conn.execute(text("SHOW search_path;"))
        current_search_path = res.scalar() or ""
        if not settings.TEST_DATABASE_URL and TEST_SCHEMA not in current_search_path:
            raise RuntimeError(
                f"SAFETY GUARD TRIGGERED: Tests are attempting to run against unsafe search_path: '{current_search_path}'. "
                f"Must include '{TEST_SCHEMA}' or configure TEST_DATABASE_URL."
            )
        # Create all schema tables in test environment and commit transaction
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS rejection_reason TEXT;"))
        await conn.execute(text("ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS submitted_by_id UUID;"))
        try:
            await conn.execute(text("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'PROVIDER';"))
        except Exception:
            pass


async def _async_cleanup_test_environment() -> None:
    """Clean up test engine connection."""
    await test_async_engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def prepare_test_environment():
    """Session-level setup and teardown for isolated database testing."""
    asyncio.run(_async_prepare_test_environment())
    yield
    asyncio.run(_async_cleanup_test_environment())


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency override providing an isolated test AsyncSession per request with NullPool."""
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
