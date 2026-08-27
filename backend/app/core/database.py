from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Initialize SQLAlchemy 2.x Asynchronous Engine
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    future=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
)

# Async Session Factory for managing asynchronous database sessions
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# Declarative Base for future SQLAlchemy 2.x domain models
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# FastApi Dependency: Provides an isolated AsyncSession per request
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an AsyncSession per request and ensures

    proper cleanup and closing upon request completion.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
