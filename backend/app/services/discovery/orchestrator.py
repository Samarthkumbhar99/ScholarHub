"""Scholarship Discovery Orchestration Service.

Coordinates connector execution, deduplication, safe updating,
job metrics tracking, and admin review compliance.
"""

from datetime import datetime, timezone
import logging
import re
from typing import Optional, Type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
)
from app.models.scholarship import Scholarship, ScholarshipReviewStatus
from app.services.discovery.base import BaseConnector, DiscoveredScholarship
from app.services.discovery.nsp_connector import NSPConnector

logger = logging.getLogger(__name__)

CONNECTOR_REGISTRY: dict[str, Type[BaseConnector]] = {
    "nsp": NSPConnector,
}


def sanitize_error_message(msg: str) -> str:
    """Sanitize error messages to prevent leakage of credentials, tokens, or internal URLs."""
    if not msg:
        return ""
    # Remove tokens, passwords, secrets, connection strings
    sanitized = re.sub(r"://([^:@]+):([^@]+)@", "://***:***@", msg)
    sanitized = re.sub(r"(bearer\s+)[a-zA-Z0-9_\-\.]+", r"\1***", sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r"(api[_-]?key[:=]\s*)[a-zA-Z0-9_\-]+", r"\1***", sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r"(password[:=]\s*)[^\s,]+", r"\1***", sanitized, flags=re.IGNORECASE)
    return sanitized.strip()[:1000]


class DiscoveryOrchestrator:
    """Orchestrates scholarship discovery jobs with deduplication and provenance enforcement."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_collection(
        self,
        source_slug: str,
        dry_run: bool = False,
        custom_connector: Optional[BaseConnector] = None,
    ) -> ScholarshipCollectionJob:
        """Execute a scholarship collection job for the specified source.

        Args:
            source_slug: Unique slug of the registered ScholarshipSource.
            dry_run: If True, executes discovery without committing changes to DB.
            custom_connector: Optional pre-instantiated connector (for testing/mocking).

        Returns:
            The completed ScholarshipCollectionJob record.
        """
        # 1. Lookup source
        stmt = select(ScholarshipSource).where(ScholarshipSource.slug == source_slug)
        res = await self.db.execute(stmt)
        source = res.scalar_one_or_none()

        if source is None:
            raise ValueError(f"Scholarship source '{source_slug}' is not registered.")

        if not source.is_active:
            raise ValueError(f"Scholarship source '{source_slug}' is currently disabled/inactive.")

        # 2. Initialize collection job record
        job = ScholarshipCollectionJob(
            source_id=source.id,
            status=CollectionJobStatus.RUNNING.value,
            started_at=datetime.now(timezone.utc),
            records_discovered=0,
            records_created=0,
            records_updated=0,
            records_duplicates_skipped=0,
            records_rejected=0,
        )
        self.db.add(job)
        await self.db.flush()
        source.last_attempted_at = datetime.now(timezone.utc)

        # 3. Instantiate or select connector
        connector = custom_connector
        if connector is None:
            connector_cls = CONNECTOR_REGISTRY.get(source.slug)
            if connector_cls is None:
                job.status = CollectionJobStatus.FAILED.value
                job.error_summary = f"No connector implementation registered for slug '{source.slug}'"
                job.finished_at = datetime.now(timezone.utc)
                await self.db.commit()
                return job
            connector = connector_cls(source)

        # 4. Execute data extraction
        try:
            discovered_items = await connector.collect()
        except Exception as exc:
            logger.error("Connector execution failed for source '%s': %s", source_slug, str(exc))
            job.status = CollectionJobStatus.FAILED.value
            job.error_summary = sanitize_error_message(str(exc))
            job.finished_at = datetime.now(timezone.utc)
            await self.db.commit()
            return job

        job.records_discovered = len(discovered_items)

        # 5. Normalize, deduplicate, and persist
        for item in discovered_items:
            try:
                # Validation check
                if not item.name or not item.provider or not item.external_id:
                    logger.warning("Rejecting invalid discovered item with missing core identifiers: %s", item)
                    job.records_rejected += 1
                    continue

                # Query existing scholarship by (source_id, external_id)
                find_stmt = select(Scholarship).where(
                    Scholarship.source_id == source.id,
                    Scholarship.external_id == item.external_id,
                )
                find_res = await self.db.execute(find_stmt)
                existing = find_res.scalar_one_or_none()

                if existing is not None:
                    # Record already exists for this source and external ID
                    if existing.fingerprint == item.fingerprint:
                        # Identical fingerprint -> Duplicate; skip insertion
                        job.records_duplicates_skipped += 1
                        existing.last_collected_at = datetime.now(timezone.utc)
                    else:
                        # Fingerprint changed -> Safe update without overwriting admin state
                        job.records_updated += 1
                        if item.deadline:
                            existing.deadline = item.deadline
                        if item.source_url:
                            existing.source_url = item.source_url
                        if item.description and not (existing.is_verified and existing.description):
                            existing.description = item.description
                        if item.eligibility and not existing.eligibility:
                            existing.eligibility = item.eligibility
                        if item.benefits and not existing.benefits:
                            existing.benefits = item.benefits
                        if item.selection_process and not existing.selection_process:
                            existing.selection_process = item.selection_process
                        if item.amount and item.amount > 0 and (not existing.amount or existing.amount == 0):
                            existing.amount = item.amount

                        existing.fingerprint = item.fingerprint
                        existing.last_collected_at = datetime.now(timezone.utc)
                        # NOTE: Preserves existing.is_verified and existing.review_status!
                else:
                    # New record creation
                    new_scholarship = Scholarship(
                        name=item.name[:255],
                        provider=item.provider[:255],
                        description=item.description,
                        amount=item.amount,
                        currency=item.currency or "INR",
                        deadline=item.deadline,
                        eligibility=item.eligibility,
                        benefits=item.benefits,
                        selection_process=item.selection_process,
                        official_website=item.official_website,
                        source_url=item.source_url[:1000] if item.source_url else None,
                        source_id=source.id,
                        external_id=item.external_id[:255],
                        fingerprint=item.fingerprint,
                        # CRITICAL SAFEGUARD: Automatic discoveries ALWAYS start as unverified and pending review
                        is_verified=False,
                        review_status=ScholarshipReviewStatus.PENDING_REVIEW.value,
                        last_collected_at=datetime.now(timezone.utc),
                    )
                    self.db.add(new_scholarship)
                    job.records_created += 1

            except Exception as item_exc:
                logger.warning("Error processing discovered item '%s': %s", item.external_id, str(item_exc))
                job.records_rejected += 1

        # 6. Determine final job status
        if job.records_rejected > 0:
            if job.records_created > 0 or job.records_updated > 0 or job.records_duplicates_skipped > 0:
                job.status = CollectionJobStatus.PARTIAL.value
                job.error_summary = f"{job.records_rejected} records were rejected during normalization."
            else:
                job.status = CollectionJobStatus.FAILED.value
                job.error_summary = "All discovered records failed normalization or validation."
        else:
            job.status = CollectionJobStatus.SUCCEEDED.value

        job.finished_at = datetime.now(timezone.utc)

        # 7. Update source timestamps
        if job.status in (CollectionJobStatus.SUCCEEDED.value, CollectionJobStatus.PARTIAL.value):
            source.last_successful_at = datetime.now(timezone.utc)

        if dry_run:
            logger.info("Dry-run requested: rolling back database mutations for collection job %s", job.id)
            cached_job = {
                "id": job.id,
                "status": job.status,
                "records_discovered": job.records_discovered,
                "records_created": job.records_created,
                "records_updated": job.records_updated,
                "records_duplicates_skipped": job.records_duplicates_skipped,
                "records_rejected": job.records_rejected,
                "started_at": job.started_at,
                "finished_at": job.finished_at,
                "error_summary": job.error_summary,
            }
            await self.db.rollback()
            # Return detached job record populated with summary counts
            for k, v in cached_job.items():
                setattr(job, k, v)
        else:
            await self.db.commit()
            await self.db.refresh(job)

        return job
