import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.profile import StudyPreference


class StudentProfileBase(BaseModel):
    """Base fields for personal and contact details."""

    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    date_of_birth: Optional[date] = Field(None, description="Date of birth (YYYY-MM-DD)")
    gender: Optional[str] = Field(None, max_length=50, description="Gender identity")
    mobile: Optional[str] = Field(None, max_length=20, description="Mobile contact number")
    country: Optional[str] = Field(None, max_length=100, description="Country of residence")
    state: Optional[str] = Field(None, max_length=100, description="State / Province")
    district: Optional[str] = Field(None, max_length=100, description="District / Region")
    city: Optional[str] = Field(None, max_length=100, description="City / Town")

    @field_validator(
        "first_name",
        "last_name",
        "gender",
        "mobile",
        "country",
        "state",
        "district",
        "city",
        mode="before",
    )
    @classmethod
    def trim_strings(cls, value: Optional[str]) -> Optional[str]:
        """Trim surrounding whitespace for optional string fields."""
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return value


class StudentProfileUpdate(StudentProfileBase):
    """Payload for creating or updating personal profile details."""
    pass


class StudentProfileResponse(StudentProfileBase):
    """Response representation of StudentProfile."""

    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AcademicProfileBase(BaseModel):
    """Base fields for academic details."""

    course: Optional[str] = Field(None, max_length=150, description="Degree or program course (e.g. B.Tech, M.Sc)")
    branch: Optional[str] = Field(None, max_length=150, description="Academic branch or specialization")
    current_year: Optional[str] = Field(None, max_length=50, description="Current year of study (e.g. 1st Year, Final Year)")
    university: Optional[str] = Field(None, max_length=255, description="Affiliated university name")
    college: Optional[str] = Field(None, max_length=255, description="Attending college or institute name")
    cgpa: Optional[Decimal] = Field(
        None,
        ge=0.0,
        le=10.0,
        description="Cumulative Grade Point Average (0.00 to 10.00)",
    )
    previous_percentage: Optional[Decimal] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Previous qualifying score percentage (0.00 to 100.00)",
    )

    @field_validator("course", "branch", "current_year", "university", "college", mode="before")
    @classmethod
    def trim_academic_strings(cls, value: Optional[str]) -> Optional[str]:
        """Trim surrounding whitespace for academic string fields."""
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return value


class AcademicProfileUpdate(AcademicProfileBase):
    """Payload for creating or updating academic details."""
    pass


class AcademicProfileResponse(AcademicProfileBase):
    """Response representation of AcademicProfile."""

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FinancialPreferenceBase(BaseModel):
    """Base fields for financial and study destination preferences."""

    reservation_category: Optional[str] = Field(
        None, max_length=50, description="Reservation quota category (General, OBC, SC, ST, EWS)"
    )
    special_categories: Optional[List[str]] = Field(
        None, description="Special quota categories (Minority, Disability, Defence, etc.)"
    )
    family_income: Optional[Decimal] = Field(
        None, ge=0, description="Annual gross household income in INR (must be >= 0)"
    )
    study_preference: Optional[StudyPreference] = Field(
        None, description="Study destination preference: INDIA, ABROAD, or BOTH"
    )

    @field_validator("reservation_category", mode="before")
    @classmethod
    def trim_category_string(cls, value: Optional[str]) -> Optional[str]:
        """Trim surrounding whitespace for category strings."""
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return value


class FinancialPreferenceUpdate(FinancialPreferenceBase):
    """Payload for creating or updating financial and preference details."""
    pass


class FinancialPreferenceResponse(FinancialPreferenceBase):
    """Response representation of FinancialPreference."""

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CombinedProfileResponse(BaseModel):
    """Unified profile representation combining personal, academic, and financial preferences."""

    personal: Optional[StudentProfileResponse] = Field(
        None, description="Personal and contact information"
    )
    academic: Optional[AcademicProfileResponse] = Field(
        None, description="Academic history and performance information"
    )
    preferences: Optional[FinancialPreferenceResponse] = Field(
        None, description="Financial and study preference information"
    )

    model_config = ConfigDict(from_attributes=True)
