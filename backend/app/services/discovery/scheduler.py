"""Automatic Recurring Scholarship Discovery Scheduler.

Manages background periodic collection runs for official sources (starting with NSP),
enforces PostgreSQL advisory locking to prevent concurrency collisions,
tracks execution metrics, and integrates with FastAPI application lifecycle.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import logging
import time
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
)
from app.services.discovery.base import BaseConnector
from app.services.discovery.lock import PostgresAdvisoryLock
from app.services.discovery.orchestrator import DiscoveryOrchestrator
from app.services.discovery.registry import get_source_by_slug, seed_official_sources

logger = logging.getLogger("scholarhub.discovery.scheduler")


class DiscoveryScheduler:
    """Manages recurring automated scholarship discovery collection."""

    def __init__(
        self,
        session_factory: Optional[async_sessionmaker[AsyncSession]] = None,
        db_engine: Optional[AsyncEngine] = None,
    ):
        self.session_factory = session_factory or AsyncSessionLocal
        self.db_engine = db_engine or engine
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self._is_executing = False

        # In-memory execution tracking
        self._last_run_at: Optional[datetime] = None
        self._next_run_at: Optional[datetime] = None
        self._last_run_status: Optional[str] = None
        self._last_run_source: Optional[str] = None
        self._last_run_summary: Optional[Dict[str, Any]] = None

    @property
    def is_enabled(self) -> bool:
        """Return whether discovery scheduling is enabled by configuration."""
        return bool(settings.DISCOVERY_SCHEDULE_ENABLED)

    @property
    def is_running(self) -> bool:
        """Return whether the background scheduler task is currently active."""
        return self._task is not None and not self._task.done()

    @property
    def is_executing(self) -> bool:
        """Return whether a collection job is actively in-flight on this worker."""
        return self._is_executing

    def get_status(self) -> Dict[str, Any]:
        """Return structured status overview for administration APIs."""
        return {
            "enabled": self.is_enabled,
            "is_running": self.is_running,
            "is_executing": self.is_executing,
            "interval_hours": settings.DISCOVERY_SCHEDULE_INTERVAL_HOURS,
            "initial_delay_seconds": settings.DISCOVERY_SCHEDULE_INITIAL_DELAY_SECONDS,
            "timeout_seconds": settings.DISCOVERY_SCHEDULE_TIMEOUT_SECONDS,
            "max_retries": settings.DISCOVERY_SCHEDULE_MAX_RETRIES,
            "configured_sources": list(settings.DISCOVERY_SCHEDULE_SOURCES),
            "last_run_at": self._last_run_at,
            "next_run_at": self._next_run_at,
            "last_run_status": self._last_run_status,
            "last_run_source": self._last_run_source,
            "last_run_summary": self._last_run_summary,
        }

    async def start(self) -> None:
        """Start the background discovery scheduler loop if enabled."""
        if not self.is_enabled:
            logger.info("Automatic scholarship discovery scheduler is disabled via DISCOVERY_SCHEDULE_ENABLED=False.")
            return

        if self.is_running:
            logger.info("Discovery scheduler is already running.")
            return

        self._stop_event.clear()
        self._task = asyncio.create_task(
            self._run_loop(),
            name="scholarhub_discovery_scheduler",
        )
        logger.info(
            "Discovery scheduler started (Interval: %dh, Delay: %ds, Timeout: %ds, Sources: %s)",
            settings.DISCOVERY_SCHEDULE_INTERVAL_HOURS,
            settings.DISCOVERY_SCHEDULE_INITIAL_DELAY_SECONDS,
            settings.DISCOVERY_SCHEDULE_TIMEOUT_SECONDS,
            settings.DISCOVERY_SCHEDULE_SOURCES,
        )

    async def stop(self) -> None:
        """Gracefully stop the background discovery scheduler."""
        if self._task is None:
            return

        logger.info("Stopping scholarship discovery scheduler...")
        self._stop_event.set()
        self._task.cancel()

        try:
            await self._task
        except (asyncio.CancelledError, Exception):
            pass
        finally:
            self._task = None
            self._next_run_at = None
            logger.info("Scholarship discovery scheduler stopped successfully.")

    async def trigger_now(
        self,
        source_slug: Optional[str] = None,
        custom_connector: Optional[BaseConnector] = None,
    ) -> Optional[ScholarshipCollectionJob]:
        """Manually trigger collection on-demand, respecting the distributed advisory lock."""
        target_slug = source_slug or (settings.DISCOVERY_SCHEDULE_SOURCES[0] if settings.DISCOVERY_SCHEDULE_SOURCES else "nsp")
        return await self.execute_collection(
            source_slug=target_slug,
            custom_connector=custom_connector,
        )

    async def execute_collection(
        self,
        source_slug: str,
        custom_connector: Optional[BaseConnector] = None,
    ) -> Optional[ScholarshipCollectionJob]:
        """Execute a single collection job guarded by PostgreSQL advisory lock and bounded timeouts."""
        source_slug = (source_slug or "nsp").strip().lower()

        # 1. Acquire Distributed Advisory Lock to prevent duplicate / concurrent runs
        async with PostgresAdvisoryLock(self.db_engine, source_slug) as lock:
            if not lock.acquired:
                logger.info(
                    "Collection for source '%s' skipped: Advisory lock currently held by another worker/process.",
                    source_slug,
                )
                return None

            self._is_executing = True
            start_wall_time = time.perf_counter()
            retries_remaining = max(0, settings.DISCOVERY_SCHEDULE_MAX_RETRIES)
            last_job: Optional[ScholarshipCollectionJob] = None

            try:
                # 2. Ensure official sources are seeded in DB
                async with self.session_factory() as session:
                    source = await get_source_by_slug(session, source_slug)
                    if not source:
                        logger.info("Seeding official sources before executing collection for '%s'...", source_slug)
                        source = await seed_official_sources(session)

                    if not source.is_active:
                        logger.warning("Source '%s' is registered but currently inactive. Skipping scheduled run.", source_slug)
                        return None

                # 3. Execute collection with bounded timeout and retries
                while True:
                    try:
                        async with self.session_factory() as session:
                            orchestrator = DiscoveryOrchestrator(session)
                            timeout_sec = max(10, settings.DISCOVERY_SCHEDULE_TIMEOUT_SECONDS)

                            last_job = await asyncio.wait_for(
                                orchestrator.run_collection(
                                    source_slug=source_slug,
                                    custom_connector=custom_connector,
                                ),
                                timeout=timeout_sec,
                            )

                            if last_job.status == CollectionJobStatus.FAILED.value and retries_remaining > 0:
                                retries_remaining -= 1
                                logger.warning(
                                    "Collection run returned FAILED status for source '%s': %s. Retrying (%d retries left)...",
                                    source_slug,
                                    last_job.error_summary,
                                    retries_remaining,
                                )
                                await asyncio.sleep(2)
                                continue

                            break  # Success or no retries left, exit retry loop

                    except asyncio.TimeoutError:
                        logger.error(
                            "Collection job for source '%s' exceeded timeout of %ds.",
                            source_slug,
                            settings.DISCOVERY_SCHEDULE_TIMEOUT_SECONDS,
                        )
                        # Record timeout failure in DB
                        last_job = await self._record_failure_job(
                            source_slug=source_slug,
                            error_msg=f"Execution timed out after {settings.DISCOVERY_SCHEDULE_TIMEOUT_SECONDS}s",
                        )
                        break

                    except Exception as exc:
                        if retries_remaining > 0:
                            retries_remaining -= 1
                            logger.warning(
                                "Transient error during collection of '%s': %s. Retrying (%d retries left)...",
                                source_slug,
                                exc,
                                retries_remaining,
                            )
                            await asyncio.sleep(3)
                        else:
                            logger.error(
                                "Collection run failed for source '%s' after all retries: %s",
                                source_slug,
                                exc,
                                exc_info=True,
                            )
                            last_job = await self._record_failure_job(
                                source_slug=source_slug,
                                error_msg=str(exc),
                            )
                            break

                # 4. Update in-memory telemetry and log concise operational summary
                elapsed = time.perf_counter() - start_wall_time
                if last_job is not None:
                    self._last_run_at = last_job.started_at
                    self._last_run_status = last_job.status
                    self._last_run_source = source_slug
                    self._last_run_summary = {
                        "discovered": last_job.records_discovered,
                        "created": last_job.records_created,
                        "updated": last_job.records_updated,
                        "duplicates": last_job.records_duplicates_skipped,
                        "rejected": last_job.records_rejected,
                        "error": last_job.error_summary,
                    }

                    logger.info(
                        "Discovery collection completed for '%s': Status=%s, Discovered=%d, Created=%d, "
                        "Updated=%d, Duplicates=%d, Rejected=%d in %.2fs",
                        source_slug,
                        last_job.status,
                        last_job.records_discovered,
                        last_job.records_created,
                        last_job.records_updated,
                        last_job.records_duplicates_skipped,
                        last_job.records_rejected,
                        elapsed,
                    )

                return last_job

            finally:
                self._is_executing = False

    async def _record_failure_job(
        self,
        source_slug: str,
        error_msg: str,
    ) -> Optional[ScholarshipCollectionJob]:
        """Safely record a failed collection job in the database when unhandled exceptions occur."""
        try:
            async with self.session_factory() as session:
                source = await get_source_by_slug(session, source_slug)
                if not source:
                    return None

                job = ScholarshipCollectionJob(
                    source_id=source.id,
                    status=CollectionJobStatus.FAILED.value,
                    started_at=datetime.now(timezone.utc),
                    finished_at=datetime.now(timezone.utc),
                    records_discovered=0,
                    records_created=0,
                    records_updated=0,
                    records_duplicates_skipped=0,
                    records_rejected=0,
                    error_summary=error_msg[:1000],
                )
                session.add(job)
                await session.commit()
                await session.refresh(job)
                return job
        except Exception as db_exc:
            logger.error("Failed to persist failure job record to database: %s", db_exc)
            return None

    async def _run_loop(self) -> None:
        """Continuous background scheduling loop with initial delay and interval sleep."""
        # 1. Initial delay
        initial_delay = max(0, settings.DISCOVERY_SCHEDULE_INITIAL_DELAY_SECONDS)
        if initial_delay > 0:
            logger.info("Discovery scheduler waiting initial delay of %ds before first run...", initial_delay)
            try:
                await asyncio.sleep(initial_delay)
            except asyncio.CancelledError:
                return

        # 2. Recurring loop
        while not self._stop_event.is_set():
            try:
                # Execute for all configured sources
                sources = list(settings.DISCOVERY_SCHEDULE_SOURCES)
                for slug in sources:
                    if self._stop_event.is_set():
                        break
                    await self.execute_collection(source_slug=slug)

                # Compute next run time
                interval_hours = max(1, settings.DISCOVERY_SCHEDULE_INTERVAL_HOURS)
                interval_seconds = interval_hours * 3600
                self._next_run_at = datetime.now(timezone.utc) + timedelta(seconds=interval_seconds)

                logger.info(
                    "Scheduled discovery run finished. Next run at %s (in %d hours).",
                    self._next_run_at.isoformat(),
                    interval_hours,
                )

                # Sleep until next scheduled run
                await asyncio.sleep(interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as loop_exc:
                logger.error("Unexpected error in discovery scheduler loop: %s", loop_exc, exc_info=True)
                # Short backoff to prevent tight exception looping
                try:
                    await asyncio.sleep(60)
                except asyncio.CancelledError:
                    break


# Singleton instance
_scheduler_instance: Optional[DiscoveryScheduler] = None


def get_discovery_scheduler() -> DiscoveryScheduler:
    """Retrieve or initialize the global DiscoveryScheduler singleton."""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = DiscoveryScheduler()
    return _scheduler_instance


def reset_discovery_scheduler() -> None:
    """Reset the scheduler singleton (used in test teardown)."""
    global _scheduler_instance
    _scheduler_instance = None
