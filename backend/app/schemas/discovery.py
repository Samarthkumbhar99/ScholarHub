from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.discovery import CollectionJobStatus, ScholarshipSourceType


# ==============================================================================
# SCHOLARSHIP SOURCE SCHEMAS
# ==============================================================================
class ScholarshipSourceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Official portal or provider name")
    slug: str = Field(..., min_length=2, max_length=100, description="Unique URL-friendly slug")
    base_url: str = Field(..., max_length=500, description="Base portal URL")
    source_type: str = Field(default=ScholarshipSourceType.HTML_PARSING.value, description="Connector type (API, RSS, HTML_PARSING)")
    is_active: bool = Field(default=True, description="Whether automated collection is enabled")
    config: Optional[Dict[str, Any]] = Field(default=None, description="Non-sensitive connector configuration")


class ScholarshipSourceCreate(ScholarshipSourceBase):
    pass


class ScholarshipSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=100)
    base_url: Optional[str] = Field(None, max_length=500)
    source_type: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class ScholarshipSourceResponse(ScholarshipSourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    last_attempted_at: Optional[datetime] = None
    last_successful_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# COLLECTION JOB SCHEMAS
# ==============================================================================
class CollectionJobCreate(BaseModel):
    source_id: Optional[UUID] = Field(None, description="Source registry ID or None for all sources")
    status: str = Field(default=CollectionJobStatus.RUNNING.value)


class CollectionJobUpdate(BaseModel):
    status: Optional[str] = None
    finished_at: Optional[datetime] = None
    records_discovered: Optional[int] = Field(None, ge=0)
    records_created: Optional[int] = Field(None, ge=0)
    records_updated: Optional[int] = Field(None, ge=0)
    records_duplicates_skipped: Optional[int] = Field(None, ge=0)
    records_rejected: Optional[int] = Field(None, ge=0)
    error_summary: Optional[str] = Field(None, max_length=1000)


class CollectionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_id: Optional[UUID] = None
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    records_discovered: int = 0
    records_created: int = 0
    records_updated: int = 0
    records_duplicates_skipped: int = 0
    records_rejected: int = 0
    error_summary: Optional[str] = None
    created_at: datetime
