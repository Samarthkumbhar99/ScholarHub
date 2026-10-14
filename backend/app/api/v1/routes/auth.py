import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.profile import ProviderProfile
from app.models.user import User, UserRole, UserSettings
from app.schemas.auth import (
    LoginRequest,
    ProviderRegisterRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student or provider account",
    responses={
        201: {"description": "User successfully registered"},
        400: {"description": "Invalid registration request or forbidden role"},
        409: {"description": "Email address already registered"},
        422: {"description": "Validation error in request payload"},
    },
)
async def register_user(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Register a new student or provider account with email and password.

    Direct registration as ADMIN is strictly prohibited.
    """
    if payload.role == UserRole.ADMIN or str(payload.role).upper() == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct registration as ADMIN is not permitted",
        )

    # Check for existing user by normalized email
    stmt = select(User).where(User.email == payload.email)
    existing_result = await db.execute(stmt)
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Hash the user's password using Argon2id
    hashed_pwd = hash_password(payload.password)

    target_role = payload.role or UserRole.STUDENT

    # Initialize User and default UserSettings
    new_user = User(
        email=payload.email,
        password_hash=hashed_pwd,
        role=target_role,
    )
    user_settings = UserSettings(
        user=new_user,
        notifications_enabled=True,
        language="en",
    )

    db.add(new_user)
    db.add(user_settings)

    if target_role == UserRole.PROVIDER:
        provider_profile = ProviderProfile(
            user=new_user,
            organization_name=payload.organization_name or f"Provider ({payload.email.split('@')[0]})",
            is_approved=True,
        )
        db.add(provider_profile)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        logger.warning(f"Integrity error during registration for {payload.email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    except Exception as exc:
        await db.rollback()
        logger.error(f"Unexpected error during registration for {payload.email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the account",
        )

    res = await db.execute(
        select(User).options(selectinload(User.provider_profile)).where(User.id == new_user.id)
    )
    return res.scalar_one()


@router.post(
    "/register-provider",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new scholarship provider organization",
    responses={
        201: {"description": "Provider account registered successfully"},
        409: {"description": "Email address already registered"},
        422: {"description": "Validation error in request payload"},
    },
)
async def register_provider(
    payload: ProviderRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Register a dedicated scholarship provider account with organization details."""
    stmt = select(User).where(User.email == payload.email)
    existing_result = await db.execute(stmt)
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    hashed_pwd = hash_password(payload.password)

    new_user = User(
        email=payload.email,
        password_hash=hashed_pwd,
        role=UserRole.PROVIDER,
    )
    user_settings = UserSettings(
        user=new_user,
        notifications_enabled=True,
        language="en",
    )
    provider_profile = ProviderProfile(
        user=new_user,
        organization_name=payload.organization_name,
        contact_person=payload.contact_person,
        website=payload.website,
        phone=payload.phone,
        description=payload.description,
        is_approved=True,
    )

    db.add(new_user)
    db.add(user_settings)
    db.add(provider_profile)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        logger.warning(f"Integrity error during provider registration for {payload.email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    except Exception as exc:
        await db.rollback()
        logger.error(f"Unexpected error during provider registration for {payload.email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the provider account",
        )

    res = await db.execute(
        select(User).options(selectinload(User.provider_profile)).where(User.id == new_user.id)
    )
    return res.scalar_one()


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and obtain JWT access token",
    responses={
        200: {"description": "Authentication successful"},
        401: {"description": "Invalid email or password credentials"},
        422: {"description": "Validation error in request payload"},
    },
)
async def login_user(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Verify credentials and issue a signed JWT access token.

    Returns a generic 401 Unauthorized for both nonexistent email and invalid password.
    """
    generic_unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise generic_unauthorized

    if not verify_password(payload.password, user.password_hash):
        raise generic_unauthorized

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated current user profile",
    responses={
        200: {"description": "Current user profile retrieved successfully"},
        401: {"description": "Missing, expired, or invalid authorization token"},
    },
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """Retrieve the authenticated user's account details using the Bearer access token."""
    return current_user
