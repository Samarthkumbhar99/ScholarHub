"""ScholarHub CLI Command for On-Demand Scholarship Discovery Collection.

Usage:
    python -m app.cli.collect --source nsp
    python -m app.cli.collect --source nsp --dry-run
    python -m app.cli.collect --seed-only
"""

import argparse
import asyncio
import logging
import sys
import time

from app.core.database import AsyncSessionLocal
from app.models.discovery import CollectionJobStatus
from app.services.discovery.orchestrator import DiscoveryOrchestrator
from app.services.discovery.registry import get_source_by_slug, seed_official_sources

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("scholarhub.cli.collect")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ScholarHub On-Demand Scholarship Discovery Collector",
    )
    parser.add_argument(
        "--source",
        type=str,
        default="nsp",
        help="Unique slug of the scholarship source to collect (default: nsp)",
    )
    parser.add_argument(
        "--seed-first",
        action="store_true",
        default=True,
        help="Ensure the source is seeded in the database before collecting (default: True)",
    )
    parser.add_argument(
        "--no-seed",
        dest="seed_first",
        action="store_false",
        help="Do not seed or update the source registry before collection",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Execute collection without persisting mutations to the database",
    )
    parser.add_argument(
        "--seed-only",
        action="store_true",
        default=False,
        help="Only seed/update official sources and exit without running collection",
    )
    return parser.parse_args()


async def main_async() -> int:
    args = parse_args()

    async with AsyncSessionLocal() as session:
        # 1. Handle Seeding
        if args.seed_first or args.seed_only:
            logger.info("Verifying official scholarship source registration...")
            source = await seed_official_sources(session)
            print(f"Official source '{source.slug}' registered/verified (ID: {source.id})")
            if args.seed_only:
                return 0

        # 2. Verify target source exists
        source = await get_source_by_slug(session, args.source)
        if not source:
            print(f"ERROR: Scholarship source '{args.source}' is not registered.")
            return 1

        if not source.is_active:
            print(f"ERROR: Scholarship source '{args.source}' is currently inactive.")
            return 1

        # 3. Execute Collection Job with Distributed Advisory Lock
        source_name = source.name
        source_slug = source.slug
        source_base_url = source.base_url

        print(f"\nInitiating on-demand collection for: {source_name} ({source_slug})")
        if args.dry_run:
            print("[DRY-RUN MODE ENABLED: Changes will not be committed to the database]\n")

        from app.services.discovery.lock import PostgresAdvisoryLock

        async with PostgresAdvisoryLock(session, args.source) as lock:
            if not lock.acquired:
                print(
                    f"\nNOTICE: Source '{args.source}' is currently locked by another active collection process. "
                    "Skipping duplicate run to prevent concurrency conflicts."
                )
                return 0

            orchestrator = DiscoveryOrchestrator(session)
            start_time = time.perf_counter()

            try:
                job = await orchestrator.run_collection(
                    source_slug=args.source,
                    dry_run=args.dry_run,
                )
            except Exception as exc:
                print(f"\nFATAL: Collection run failed with unexpected error: {exc}")
                return 1

            elapsed = time.perf_counter() - start_time

        # 4. Display Formatted Summary Report
        print("\n" + "=" * 64)
        print(" SCHOLARHUB SCHOLARSHIP DISCOVERY COLLECTION REPORT")
        print("=" * 64)
        print(f" Source Name:         {source_name}")
        print(f" Source Slug:         {source_slug}")
        print(f" Source Base URL:     {source_base_url}")
        print(f" Job ID:              {job.id}")
        print(f" Job Status:          {job.status}")
        print("-" * 64)
        print(f" Records Discovered:  {job.records_discovered}")
        print(f" Records Created:     {job.records_created}")
        print(f" Records Updated:     {job.records_updated}")
        print(f" Duplicates Skipped:  {job.records_duplicates_skipped}")
        print(f" Records Rejected:    {job.records_rejected}")
        print("-" * 64)
        print(f" Started At:          {job.started_at.isoformat() if job.started_at else 'N/A'}")
        print(f" Finished At:         {job.finished_at.isoformat() if job.finished_at else 'N/A'}")
        print(f" Duration:            {elapsed:.2f} seconds")
        if job.error_summary:
            print(f" Error Summary:       {job.error_summary}")
        print("=" * 64 + "\n")

        if job.status == CollectionJobStatus.FAILED.value:
            return 1
        return 0


def main():
    code = asyncio.run(main_async())
    sys.exit(code)


if __name__ == "__main__":
    main()
