"""National Scholarship Portal (NSP) Discovery Connector.

Source: https://scholarships.gov.in
Directory: https://scholarships.gov.in/All-Scholarships
"""

import asyncio
from datetime import date, datetime
from decimal import Decimal
import html
import logging
import re
from typing import Any, Dict, List, Optional
import unicodedata

import httpx

from app.models.discovery import ScholarshipSource
from app.services.discovery.base import BaseConnector, DiscoveredScholarship

logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    """Generate a clean, normalized ASCII slug from arbitrary text."""
    normalized = unicodedata.normalize("NFKD", text)
    cleaned = re.sub(r"[^\w\s-]", "", normalized).strip().lower()
    return re.sub(r"[-\s]+", "-", cleaned)[:240]


class NSPConnector(BaseConnector):
    """Discovery connector for the official Indian National Scholarship Portal (NSP)."""

    DEFAULT_BASE_URL = "https://scholarships.gov.in"
    DEFAULT_SCHEMES_ENDPOINT = "/All-Scholarships"
    DEFAULT_TIMEOUT_SECONDS = 20.0
    DEFAULT_MAX_RETRIES = 3
    DEFAULT_USER_AGENT = "ScholarHub-Discovery-Bot/1.0 (+https://scholarhub.edu; contact@scholarhub.edu)"

    def __init__(self, source: ScholarshipSource):
        super().__init__(source)
        cfg: Dict[str, Any] = self.source.config or {}
        self.base_url = (self.source.base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self.schemes_endpoint = cfg.get("schemes_endpoint", self.DEFAULT_SCHEMES_ENDPOINT)
        if not self.schemes_endpoint.startswith("/"):
            self.schemes_endpoint = f"/{self.schemes_endpoint}"
        self.timeout_seconds = float(cfg.get("timeout_seconds", self.DEFAULT_TIMEOUT_SECONDS))
        self.max_retries = int(cfg.get("max_retries", self.DEFAULT_MAX_RETRIES))
        self.verify_ssl = bool(cfg.get("verify_ssl", True))
        self.user_agent = cfg.get("user_agent", self.DEFAULT_USER_AGENT)

    @property
    def target_url(self) -> str:
        """Construct full target URL for the schemes directory."""
        return f"{self.base_url}{self.schemes_endpoint}"

    async def fetch(self) -> str:
        """Fetch schemes HTML from NSP with bounded retries and exponential backoff.

        Raises:
            RuntimeError: If all retry attempts fail.
        """
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        timeout = httpx.Timeout(
            connect=10.0,
            read=self.timeout_seconds,
            write=10.0,
            pool=10.0,
        )

        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(
                    "Fetching NSP schemes from %s (attempt %d/%d)",
                    self.target_url,
                    attempt,
                    self.max_retries,
                )
                async with httpx.AsyncClient(
                    timeout=timeout,
                    verify=self.verify_ssl,
                    follow_redirects=True,
                ) as client:
                    response = await client.get(self.target_url, headers=headers)
                    response.raise_for_status()
                    return response.text
            except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as exc:
                last_error = exc
                logger.warning(
                    "NSP fetch attempt %d/%d failed: %s (%s)",
                    attempt,
                    self.max_retries,
                    type(exc).__name__,
                    str(exc),
                )
                if attempt < self.max_retries:
                    backoff = 1.0 * (2 ** (attempt - 1))
                    await asyncio.sleep(backoff)
            except Exception as exc:
                last_error = exc
                logger.error("Unexpected error during NSP fetch: %s", str(exc))
                break

        raise RuntimeError(
            f"Failed to fetch scholarship data from NSP at {self.target_url} "
            f"after {self.max_retries} attempts: {type(last_error).__name__}: {str(last_error)}"
        )

    def parse(self, raw_content: str) -> List[DiscoveredScholarship]:
        """Parse NSP All-Scholarships HTML and normalize into DiscoveredScholarship items."""
        if not raw_content or not raw_content.strip():
            logger.warning("NSP parser received empty content.")
            return []

        discovered_list: List[DiscoveredScholarship] = []

        # Find all accordion buttons representing ministries / authorities
        accordion_buttons = list(
            re.finditer(
                r"<button[^>]*class=[\"'][^\"']*accordion-button[^\"']*[\"'][^>]*>(.*?)</button>",
                raw_content,
                re.DOTALL | re.IGNORECASE,
            )
        )

        non_ministry_headers = {
            "students",
            "institute",
            "officers",
            "public",
            "state scheme",
            "central scheme",
        }

        for idx, btn_match in enumerate(accordion_buttons):
            raw_ministry = re.sub(r"<[^>]+>", "", btn_match.group(1)).strip()
            ministry = html.unescape(raw_ministry)
            if not ministry or ministry.lower() in non_ministry_headers:
                continue

            # Section boundary extends to next accordion button or end of HTML
            start_pos = btn_match.end()
            end_pos = (
                accordion_buttons[idx + 1].start()
                if idx + 1 < len(accordion_buttons)
                else len(raw_content)
            )
            section_html = raw_content[start_pos:end_pos]

            # Find all scheme headings (h6)
            h6_matches = list(re.finditer(r"<h6>(.*?)</h6>", section_html, re.DOTALL | re.IGNORECASE))
            for h6 in h6_matches:
                raw_title = re.sub(r"<[^>]+>", "", h6.group(1)).strip()
                title = html.unescape(raw_title)

                # Skip non-scheme headings (e.g., 'by Ministry of...')
                if not title or title.lower().startswith("by ") or len(title) < 5:
                    continue

                scheme_start = h6.start()
                # Use up to 3000 chars after heading for scheme metadata
                scheme_chunk = section_html[scheme_start : scheme_start + 3000]

                # Parse dates
                app_close_match = re.search(
                    r"Student\s+Application\s+Open\s+till\s*:\s*([0-9]{1,2}-[0-9]{1,2}-[0-9]{4})",
                    scheme_chunk,
                    re.IGNORECASE,
                )
                open_from_match = re.search(
                    r"Scheme\s+Open\s+from\s*:\s*([0-9]{1,2}-[0-9]{1,2}-[0-9]{4})",
                    scheme_chunk,
                    re.IGNORECASE,
                )

                deadline: Optional[date] = None
                if app_close_match:
                    try:
                        deadline = datetime.strptime(
                            app_close_match.group(1).strip(), "%d-%m-%Y"
                        ).date()
                    except ValueError:
                        deadline = None

                # Fallback to end of current academic calendar if date is missing/unannounced
                if deadline is None:
                    current_year = date.today().year
                    deadline = date(current_year, 12, 31)

                # Parse specifications / guidelines link
                spec_match = re.search(
                    r"href=[\"']([^\"']+)[\"'][^>]*>(?:Specifications|Guidelines)",
                    scheme_chunk,
                    re.IGNORECASE,
                )
                faq_match = re.search(
                    r"href=[\"']([^\"']+)[\"'][^>]*>FAQ",
                    scheme_chunk,
                    re.IGNORECASE,
                )

                spec_url = self._normalize_url(spec_match.group(1).strip()) if spec_match else None
                faq_url = self._normalize_url(faq_match.group(1).strip()) if faq_match else None

                # Construct stable deterministic external ID
                ministry_slug = slugify(ministry)
                title_slug = slugify(title)
                ext_id = f"nsp_{ministry_slug}_{title_slug}"[:250]

                # Specific source URL or portal schemes page
                source_url = spec_url or self.target_url

                # Construct structured descriptive fields
                open_str = open_from_match.group(1).strip() if open_from_match else "To be announced"
                close_str = app_close_match.group(1).strip() if app_close_match else "To be announced"
                desc = (
                    f"Official Central Government Scholarship Scheme administered by {ministry}. "
                    f"Application cycle: {open_str} to {close_str}. "
                    f"Disbursed via Direct Benefit Transfer (DBT) through the National Scholarship Portal (NSP). "
                    f"Refer to official scheme specifications for detailed guidelines and income criteria."
                )

                eligibility = (
                    f"Eligibility criteria prescribed by {ministry}. "
                    f"Open to eligible students meeting academic qualifications, category classifications, "
                    f"and parental annual income thresholds outlined in official specifications."
                )

                benefits = [
                    "Direct financial scholarship or stipend credited via DBT",
                    "Tuition fee waiver, maintenance allowance, or book grant as per scheme norms",
                ]

                selection_process = [
                    "Online application via National Scholarship Portal (scholarships.gov.in)",
                    "One-Time Registration (OTR) and biometric/demographic authentication",
                    "Institute/College level application verification",
                    "District / State / Ministry verification (DNO/SNO/MNO)",
                    "Merit order generation and PFMS/DBT fund disbursement",
                ]

                discovered = DiscoveredScholarship(
                    external_id=ext_id,
                    name=title[:255],
                    provider=ministry[:255],
                    description=desc,
                    amount=Decimal("0.00"),
                    currency="INR",
                    deadline=deadline,
                    eligibility=eligibility,
                    benefits=benefits,
                    selection_process=selection_process,
                    official_website=self.base_url,
                    source_url=source_url[:1000],
                    raw_data={
                        "ministry": ministry,
                        "title": title,
                        "open_from": open_from_match.group(1).strip() if open_from_match else None,
                        "open_till": app_close_match.group(1).strip() if app_close_match else None,
                        "spec_url": spec_url,
                        "faq_url": faq_url,
                    },
                )
                discovered_list.append(discovered)

        logger.info(
            "Parsed %d scholarships from NSP portal content.", len(discovered_list)
        )
        return discovered_list

    def _normalize_url(self, raw_url: str) -> str:
        """Resolve relative URL path against portal base URL."""
        if not raw_url or raw_url.lower() in ("#", "javascript:void(0)"):
            return self.target_url
        if raw_url.startswith("http://") or raw_url.startswith("https://"):
            return raw_url
        if raw_url.startswith("/"):
            return f"{self.base_url}{raw_url}"
        return f"{self.base_url}/{raw_url}"
