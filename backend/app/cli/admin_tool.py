"""CLI tool for securely provisioning and promoting Administrator accounts in ScholarHub."""

import argparse
import asyncio
import sys

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole, UserSettings


async def promote_user_to_admin(email: str) -> None:
    """Promote an existing registered user account to ADMIN role."""
    normalized_email = email.strip().lower()
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == normalized_email)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()

        if user is None:
            print(f"[ERROR] User with email '{normalized_email}' not found.")
            sys.exit(1)

        user.role = UserRole.ADMIN
        await session.commit()
        print(f"[SUCCESS] User '{normalized_email}' (ID: {user.id}) successfully promoted to ADMIN.")


async def create_admin_user(email: str, password: str) -> None:
    """Create a new administrator account directly in the database."""
    normalized_email = email.strip().lower()
    if len(password) < 8:
        print("[ERROR] Password must be at least 8 characters.")
        sys.exit(1)

    hashed_pwd = hash_password(password)

    async with AsyncSessionLocal() as session:
        # Check if user already exists
        stmt = select(User).where(User.email == normalized_email)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing is not None:
            print(f"[INFO] User '{normalized_email}' already exists. Promoting to ADMIN...")
            existing.role = UserRole.ADMIN
            await session.commit()
            print(f"[SUCCESS] Existing user '{normalized_email}' updated to ADMIN.")
            return

        new_admin = User(
            email=normalized_email,
            password_hash=hashed_pwd,
            role=UserRole.ADMIN,
        )
        user_settings = UserSettings(
            user=new_admin,
            notifications_enabled=True,
            language="en",
        )
        session.add(new_admin)
        session.add(user_settings)

        try:
            await session.commit()
            await session.refresh(new_admin)
            print(f"[SUCCESS] Created new Administrator account: '{normalized_email}' (ID: {new_admin.id}).")
        except IntegrityError as exc:
            await session.rollback()
            print(f"[ERROR] Integrity error creating admin: {exc}")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="ScholarHub Administrator Provisioning Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # promote command
    promote_parser = subparsers.add_parser("promote", help="Promote an existing user to ADMIN")
    promote_parser.add_argument("--email", required=True, help="User email address to promote")

    # create command
    create_parser = subparsers.add_parser("create", help="Create a new ADMIN user")
    create_parser.add_argument("--email", required=True, help="Administrator email address")
    create_parser.add_argument("--password", required=True, help="Administrator password (min 8 chars)")

    args = parser.parse_args()

    if args.command == "promote":
        asyncio.run(promote_user_to_admin(args.email))
    elif args.command == "create":
        asyncio.run(create_admin_user(args.email, args.password))


if __name__ == "__main__":
    main()
