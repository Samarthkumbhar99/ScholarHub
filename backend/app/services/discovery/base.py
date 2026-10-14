"""Abstract Base Connector and Data Classes for Scholarship Discovery."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
import hashlib
from typing import Any, Dict, List, Optional

from app.models.discovery import ScholarshipSource


@dataclass
class DiscoveredScholarship:
    """Normalized scholarship entity discovered from an external source."""

    external_id: str
    name: str
    provider: str
    description: str
    amount: Decimal
    currency: str
    deadline: date
    eligibility: Optional[str] = None
    benefits: Optional[List[str]] = None
    selection_process: Optional[List[str]] = None
    official_website: Optional[str] = None
    source_url: Optional[str] = None
    fingerprint: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = field(default_factory=dict)

    def __post_init__(self):
        """Ensure amount is a Decimal, currency defaults to INR, and calculate fingerprint if omitted."""
        if not isinstance(self.amount, Decimal):
            self.amount = Decimal(str(self.amount))

        if not self.currency:
            self.currency = "INR"

        if not self.fingerprint:
            self.fingerprint = self.calculate_fingerprint()

    def calculate_fingerprint(self) -> str:
        """Compute deterministic SHA-256 fingerprint from core attributes."""
        norm_name = " ".join(self.name.strip().lower().split())
        norm_provider = " ".join(self.provider.strip().lower().split())
        norm_deadline = self.deadline.isoformat() if self.deadline else ""
        norm_url = (self.source_url or "").strip().lower()

        canonical_repr = f"{norm_name}|{norm_provider}|{norm_deadline}|{norm_url}"
        return hashlib.sha256(canonical_repr.encode("utf-8")).hexdigest()


class BaseConnector(ABC):
    """Abstract base class for all scholarship discovery connectors."""

    def __init__(self, source: ScholarshipSource):
        self.source = source

    @abstractmethod
    async def fetch(self) -> str:
        """Fetch raw content from the scholarship source.

        Must raise appropriate exceptions on network failure or invalid response.
        """
        pass

    @abstractmethod
    def parse(self, raw_content: str) -> List[DiscoveredScholarship]:
        """Parse raw content and normalize into DiscoveredScholarship objects."""
        pass

    async def collect(self) -> List[DiscoveredScholarship]:
        """Orchestrate fetch and parse execution for this connector."""
        raw_content = await self.fetch()
        return self.parse(raw_content)
