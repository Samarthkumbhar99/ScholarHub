import uuid
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

# Standard HTTPBearer scheme for Authorization: Bearer <token> header extraction
http_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate JWT access token from Authorization header and return the authenticated User.

    Raises HTTP 401 Unauthorized if token is missing, invalid, expired, or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or not credentials.credentials:
        raise credentials_exception

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id_str: Optional[str] = payload.get("sub")
        if not user_id_str:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    # Query user by primary key UUID with provider_profile loaded
    result = await db.execute(
        select(User)
        .options(selectinload(User.provider_profile))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_student(
    current_user: User = Depends(get_current_user),
) -> User:
    """Validate that the authenticated user has STUDENT role privileges.

    Raises HTTP 403 Forbidden if user is authenticated but does not have the STUDENT role.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Student privileges required",
        )
    return current_user


async def get_current_provider(
    current_user: User = Depends(get_current_user),
) -> User:
    """Validate that the authenticated user has PROVIDER role privileges.

    Raises HTTP 403 Forbidden if user is authenticated but does not have the PROVIDER role.
    """
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Provider privileges required",
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Validate that the authenticated user has ADMIN role privileges.

    Raises HTTP 403 Forbidden if user is authenticated but does not have the ADMIN role.
    Raises HTTP 401 Unauthorized if user is unauthenticated (handled by get_current_user).
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privileges required",
        )
    return current_user

