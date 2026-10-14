"""ScholarHub Automated Scholarship Discovery Package."""

from app.services.discovery.base import BaseConnector, DiscoveredScholarship
from app.services.discovery.lock import PostgresAdvisoryLock, get_source_advisory_lock_key
from app.services.discovery.nsp_connector import NSPConnector
from app.services.discovery.orchestrator import DiscoveryOrchestrator
from app.services.discovery.registry import seed_official_sources
from app.services.discovery.scheduler import DiscoveryScheduler, get_discovery_scheduler

__all__ = [
    "BaseConnector",
    "DiscoveredScholarship",
    "NSPConnector",
    "DiscoveryOrchestrator",
    "PostgresAdvisoryLock",
    "get_source_advisory_lock_key",
    "DiscoveryScheduler",
    "get_discovery_scheduler",
    "seed_official_sources",
]

