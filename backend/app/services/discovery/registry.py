"""Scholarship Discovery Source Registry and Seeding Helpers."""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discovery import ScholarshipSource, ScholarshipSourceType

logger = logging.getLogger(__name__)

NSP_DEFAULT_CONFIG = {
    "schemes_endpoint": "/All-Scholarships",
    "timeout_seconds": 20.0,
    "max_retries": 3,
    "verify_ssl": True,
    "user_agent": "ScholarHub-Discovery-Bot/1.0 (+https://scholarhub.edu; contact@scholarhub.edu)",
}

NSP_SOURCE_DEFAULTS = {
    "name": "National Scholarship Portal",
    "slug": "nsp",
    "base_url": "https://scholarships.gov.in",
    "source_type": ScholarshipSourceType.HTML_PARSING.value,
    "is_active": True,
    "config": NSP_DEFAULT_CONFIG,
}


async def seed_official_sources(db: AsyncSession) -> ScholarshipSource:
    """Seed or update official scholarship sources idempotently.

    Running this function repeatedly is guaranteed never to create duplicate sources.
    """
    stmt = select(ScholarshipSource).where(ScholarshipSource.slug == NSP_SOURCE_DEFAULTS["slug"])
    res = await db.execute(stmt)
    source = res.scalar_one_or_none()

    if source is not None:
        logger.info("Official source '%s' already registered (ID: %s). Updating configuration.", source.slug, source.id)
        source.name = NSP_SOURCE_DEFAULTS["name"]
        source.base_url = NSP_SOURCE_DEFAULTS["base_url"]
        source.source_type = NSP_SOURCE_DEFAULTS["source_type"]
        source.is_active = NSP_SOURCE_DEFAULTS["is_active"]
        # Merge or update config
        current_cfg = source.config or {}
        merged_cfg = {**NSP_DEFAULT_CONFIG, **current_cfg}
        source.config = merged_cfg
    else:
        logger.info("Registering new official scholarship source: '%s'.", NSP_SOURCE_DEFAULTS["slug"])
        source = ScholarshipSource(
            name=NSP_SOURCE_DEFAULTS["name"],
            slug=NSP_SOURCE_DEFAULTS["slug"],
            base_url=NSP_SOURCE_DEFAULTS["base_url"],
            source_type=NSP_SOURCE_DEFAULTS["source_type"],
            is_active=NSP_SOURCE_DEFAULTS["is_active"],
            config=dict(NSP_DEFAULT_CONFIG),
        )
        db.add(source)

    await db.commit()
    await db.refresh(source)
    return source


async def get_source_by_slug(db: AsyncSession, slug: str) -> Optional[ScholarshipSource]:
    """Retrieve scholarship source by its unique slug."""
    stmt = select(ScholarshipSource).where(ScholarshipSource.slug == slug)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()
