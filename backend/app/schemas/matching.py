from datetime import datetime, timezone
from enum import Enum
import math
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.scholarship import ScholarshipListItem


class MatchLevel(str, Enum):
    """Categorical match tier for student eligibility and scholarship fit."""

    EXCELLENT_MATCH = "EXCELLENT_MATCH"  # 85 - 100
    GOOD_MATCH = "GOOD_MATCH"            # 70 - 84
    MODERATE_MATCH = "MODERATE_MATCH"    # 50 - 69
    LOW_MATCH = "LOW_MATCH"              # 30 - 49
    NOT_ELIGIBLE = "NOT_ELIGIBLE"        # 0 - 29 or disqualified
    UNKNOWN = "UNKNOWN"                  # Incomplete profile or unverified


class ScholarshipMatchResponse(BaseModel):
    """Structured AI & deterministic matching assessment for a single scholarship."""

    scholarship_id: UUID = Field(..., description="UUID of the evaluated scholarship")
    scholarship_name: str = Field(..., description="Name of the evaluated scholarship")
    match_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Deterministic and semantic match compatibility score (0 to 100)",
    )
    match_level: MatchLevel = Field(..., description="Categorical tier for the match score")
    summary: str = Field(
        ...,
        description="Concise summary explaining why this scholarship matches or poses eligibility challenges",
    )
    matched_criteria: List[str] = Field(
        default_factory=list,
        description="Confirmed or inferred qualifications satisfied by the student profile",
    )
    potential_issues: List[str] = Field(
        default_factory=list,
        description="Potential eligibility constraints, missing requirements, or warnings",
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Actionable steps or guidance for the student to maximize admission/selection chances",
    )
    is_ai_generated: bool = Field(
        default=True,
        description="Whether the match was generated via Gemini AI reasoning or deterministic fallback",
    )
    evaluated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the evaluation was computed",
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("match_score", mode="before")
    @classmethod
    def clamp_match_score(cls, v: int) -> int:
        """Ensure match_score is always clamped within integer range [0, 100]."""
        if isinstance(v, (int, float)):
            return max(0, min(100, int(round(v))))
        return v


class ScholarshipRecommendationItem(BaseModel):
    """Pairing of scholarship overview and calculated student match evaluation."""

    scholarship: ScholarshipListItem = Field(..., description="Basic scholarship metadata")
    match: ScholarshipMatchResponse = Field(..., description="Student-specific match evaluation")

    model_config = ConfigDict(from_attributes=True)


class ScholarshipRecommendationResponse(BaseModel):
    """Paginated collection of ranked scholarship recommendations for the current student."""

    items: List[ScholarshipRecommendationItem] = Field(
        default_factory=list,
        description="List of ranked scholarship recommendation items",
    )
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total: int = Field(..., ge=0, description="Total number of eligible recommendations")
    total_pages: int = Field(..., ge=0, description="Total pages available")

    @classmethod
    def create(
        cls,
        items: List[ScholarshipRecommendationItem],
        total: int,
        page: int,
        page_size: int,
    ) -> "ScholarshipRecommendationResponse":
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return cls(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )
