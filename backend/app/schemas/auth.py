import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Payload for registering a new student/user account."""

    email: EmailStr = Field(..., description="Unique email address for the user account")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="User password (minimum 8 characters)",
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Trim surrounding whitespace and lowercase the email address."""
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


class UserResponse(BaseModel):
    """Safe user account representation without sensitive password hashes."""

    id: uuid.UUID = Field(..., description="Unique User UUID")
    email: EmailStr = Field(..., description="User email address")
    created_at: datetime = Field(..., description="Account creation timestamp (UTC)")
    updated_at: datetime = Field(..., description="Account last update timestamp (UTC)")

    model_config = ConfigDict(from_attributes=True)
