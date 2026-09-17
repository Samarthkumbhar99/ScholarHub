import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserSettings
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student/user",
    responses={
        201: {"description": "User successfully registered"},
        409: {"description": "Email address already registered"},
        422: {"description": "Validation error in request payload"},
    },
)
async def register_user(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Register a new student account with email and password.

    Creates the base User record and initializes default UserSettings transactionally.
    """
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

    # Initialize User and default UserSettings
    new_user = User(
        email=payload.email,
        password_hash=hashed_pwd,
    )
    user_settings = UserSettings(
        user=new_user,
        notifications_enabled=True,
        language="en",
    )

    db.add(new_user)
    db.add(user_settings)

    try:
        await db.commit()
        await db.refresh(new_user)
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

    return new_user


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
