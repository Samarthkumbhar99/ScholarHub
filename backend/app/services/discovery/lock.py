"""PostgreSQL Distributed Advisory Locking for Scholarship Discovery.

Provides mutual exclusion across processes, workers, and containers using
PostgreSQL session-level advisory locks (pg_try_advisory_lock / pg_advisory_unlock).
Guarantees that overlapping collection runs for the same source never execute simultaneously.
"""

import hashlib
import logging
from typing import Optional, Union

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession

logger = logging.getLogger(__name__)


def get_source_advisory_lock_key(source_slug: str) -> int:
    """Generate a deterministic 64-bit signed integer key for PostgreSQL advisory lock.

    Uses SHA-256 on a namespaced string to guarantee uniform distribution within
    PostgreSQL's signed 64-bit bigint range (-2^63 to 2^63 - 1).
    """
    clean_slug = (source_slug or "unknown").strip().lower()
    raw = f"scholarhub_discovery_lock_{clean_slug}".encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=True)


class PostgresAdvisoryLock:
    """Session-level PostgreSQL advisory lock manager for scholarship discovery sources.

    Usage:
        async with PostgresAdvisoryLock(engine, "nsp") as lock:
            if not lock.acquired:
                logger.warning("Source 'nsp' is currently locked. Skipping run.")
                return
            # Execute collection safely
    """

    def __init__(
        self,
        engine_or_session: Union[AsyncEngine, AsyncSession],
        source_slug: str,
    ):
        self.engine_or_session = engine_or_session
        self.source_slug = (source_slug or "nsp").strip().lower()
        self.lock_key = get_source_advisory_lock_key(self.source_slug)
        self.acquired: bool = False
        self._dedicated_conn: Optional[AsyncConnection] = None

    async def acquire(self) -> bool:
        """Attempt to acquire session advisory lock without blocking.

        Returns:
            True if the lock was acquired, False if another process/session holds it.
        """
        if self.acquired:
            return True

        if isinstance(self.engine_or_session, AsyncEngine):
            # Check out a dedicated connection so transactions and commits in the session
            # do not interfere with the session-level advisory lock.
            self._dedicated_conn = await self.engine_or_session.connect()
            result = await self._dedicated_conn.execute(
                text("SELECT pg_try_advisory_lock(:key);"),
                {"key": self.lock_key},
            )
            self.acquired = bool(result.scalar())
        else:
            result = await self.engine_or_session.execute(
                text("SELECT pg_try_advisory_lock(:key);"),
                {"key": self.lock_key},
            )
            self.acquired = bool(result.scalar())

        if not self.acquired and self._dedicated_conn is not None:
            await self._dedicated_conn.close()
            self._dedicated_conn = None

        return self.acquired

    async def release(self) -> bool:
        """Release session advisory lock if held by this instance.

        Returns:
            True if lock was successfully released, False otherwise.
        """
        if not self.acquired:
            if self._dedicated_conn is not None:
                await self._dedicated_conn.close()
                self._dedicated_conn = None
            return False

        released = False
        try:
            if self._dedicated_conn is not None:
                result = await self._dedicated_conn.execute(
                    text("SELECT pg_advisory_unlock(:key);"),
                    {"key": self.lock_key},
                )
                released = bool(result.scalar())
            else:
                result = await self.engine_or_session.execute(
                    text("SELECT pg_advisory_unlock(:key);"),
                    {"key": self.lock_key},
                )
                released = bool(result.scalar())
        except Exception as exc:
            logger.warning(
                "Error while releasing advisory lock for '%s' (key=%d): %s",
                self.source_slug,
                self.lock_key,
                exc,
            )
        finally:
            self.acquired = False
            if self._dedicated_conn is not None:
                await self._dedicated_conn.close()
                self._dedicated_conn = None

        return released

    async def __aenter__(self) -> "PostgresAdvisoryLock":
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.release()
