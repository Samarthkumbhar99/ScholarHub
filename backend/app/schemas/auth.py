import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    """Payload for registering a new student or provider account."""

    email: EmailStr = Field(..., description="Unique email address for the user account")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="User password (minimum 8 characters)",
    )
    role: Optional[UserRole] = Field(
        default=UserRole.STUDENT,
        description="Desired user role (STUDENT or PROVIDER). ADMIN registration is forbidden.",
    )
    organization_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Organization name if registering as PROVIDER",
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Trim surrounding whitespace and lowercase the email address."""
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[UserRole]) -> Optional[UserRole]:
        """Prevent self-assignment of ADMIN role during registration."""
        if value == UserRole.ADMIN or str(value).upper() == "ADMIN":
            raise ValueError("Direct public registration with ADMIN role is forbidden")
        return value


class ProviderRegisterRequest(BaseModel):
    """Dedicated registration payload for scholarship provider organizations."""

    email: EmailStr = Field(..., description="Unique provider contact email")
    password: str = Field(..., min_length=8, max_length=128, description="Provider account password")
    organization_name: str = Field(..., min_length=2, max_length=255, description="Official organization/foundation name")
    contact_person: Optional[str] = Field(None, max_length=150, description="Primary contact person name")
    website: Optional[str] = Field(None, max_length=500, description="Organization website URL")
    phone: Optional[str] = Field(None, max_length=50, description="Official phone number")
    description: Optional[str] = Field(None, description="Brief organization background or mission statement")
    pending_approval: Optional[bool] = Field(default=False, description="Whether to mark provider as pending admin verification")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class LoginRequest(BaseModel):
    """Payload for user authentication and access token generation."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Trim surrounding whitespace and lowercase the email address."""
        if isinstance(value, str):
            return value.strip().lower()
        return value


class TokenResponse(BaseModel):
    """OAuth2 / JWT Bearer access token response."""

    access_token: str = Field(..., description="Signed JWT access token")
    token_type: str = Field("bearer", description="Token type header prefix")


class ProviderProfileInfo(BaseModel):
    """Safe representation of provider organization profile."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_name: str
    contact_person: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    is_approved: bool = True


class UserResponse(BaseModel):
    """Safe user account representation without sensitive password hashes."""

    id: uuid.UUID = Field(..., description="Unique User UUID")
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(default=UserRole.STUDENT, description="User authorization role (STUDENT, PROVIDER, or ADMIN)")
    provider_profile: Optional[ProviderProfileInfo] = Field(default=None, description="Provider profile if applicable")
    created_at: datetime = Field(..., description="Account creation timestamp (UTC)")
    updated_at: datetime = Field(..., description="Account last update timestamp (UTC)")

    model_config = ConfigDict(from_attributes=True)

