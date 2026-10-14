"""CLI tool for seeding or resetting standard demo accounts for Student, Provider, and Admin."""

import asyncio
from datetime import date
from decimal import Decimal
import sys

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole, UserSettings
from app.models.profile import StudentProfile, AcademicProfile, ProviderProfile


async def seed_demo_accounts() -> None:
    """Create or update demo accounts for Student, Provider, and Admin."""
    demo_password = "Password123!"
    hashed_pwd = hash_password(demo_password)

    async with AsyncSessionLocal() as session:
        # 1. Student Demo Account
        student_email = "rahul.sharma@university.edu"
        res = await session.execute(
            select(User)
            .where(User.email == student_email)
            .options(
                selectinload(User.profile),
                selectinload(User.academic_profile),
                selectinload(User.settings),
            )
        )
        student_user = res.scalar_one_or_none()

        if student_user is None:
            student_user = User(
                email=student_email,
                password_hash=hashed_pwd,
                role=UserRole.STUDENT,
            )
            session.add(student_user)
            await session.flush()

            student_profile = StudentProfile(
                user_id=student_user.id,
                first_name="Rahul",
                last_name="Sharma",
                mobile="+91-9876543210",
                country="India",
                state="Maharashtra",
                city="Mumbai",
                date_of_birth=date(2002, 5, 14),
                gender="Male",
            )
            academic_profile = AcademicProfile(
                user_id=student_user.id,
                course="B.Tech",
                branch="Computer Engineering",
                current_year="3rd Year",
                university="University of Mumbai",
                college="VJTI Mumbai",
                cgpa=Decimal("9.20"),
                previous_percentage=Decimal("91.50"),
            )
            user_settings = UserSettings(
                user_id=student_user.id,
                notifications_enabled=True,
                language="en",
            )
            session.add_all([student_profile, academic_profile, user_settings])
            print(f"[SUCCESS] Created demo student account: {student_email}")
        else:
            student_user.password_hash = hashed_pwd
            student_user.role = UserRole.STUDENT
            print(f"[INFO] Updated existing demo student account password: {student_email}")

        # 2. Provider Demo Account
        provider_email = "tata.trusts@foundation.org"
        res = await session.execute(
            select(User)
            .where(User.email == provider_email)
            .options(
                selectinload(User.provider_profile),
                selectinload(User.settings),
            )
        )
        provider_user = res.scalar_one_or_none()

        if provider_user is None:
            provider_user = User(
                email=provider_email,
                password_hash=hashed_pwd,
                role=UserRole.PROVIDER,
            )
            session.add(provider_user)
            await session.flush()

            provider_profile = ProviderProfile(
                user_id=provider_user.id,
                organization_name="Tata Trusts",
                contact_person="Ratan Tata",
                phone="+91-22-6665-8282",
                website="https://www.tatatrusts.org",
                description="Supporting underprivileged and meritorious students across India with grants and scholarship funding.",
                is_approved=True,
            )
            user_settings = UserSettings(
                user_id=provider_user.id,
                notifications_enabled=True,
                language="en",
            )
            session.add_all([provider_profile, user_settings])
            print(f"[SUCCESS] Created demo provider account: {provider_email}")
        else:
            provider_user.password_hash = hashed_pwd
            provider_user.role = UserRole.PROVIDER
            if provider_user.provider_profile:
                provider_user.provider_profile.is_approved = True
            else:
                provider_profile = ProviderProfile(
                    user_id=provider_user.id,
                    organization_name="Tata Trusts",
                    contact_person="Ratan Tata",
                    phone="+91-22-6665-8282",
                    website="https://www.tatatrusts.org",
                    description="Supporting underprivileged and meritorious students.",
                    is_approved=True,
                )
                session.add(provider_profile)
            print(f"[INFO] Updated existing demo provider account: {provider_email}")

        # 3. Admin Demo Account
        admin_email = "admin@scholarhub.edu"
        res = await session.execute(
            select(User)
            .where(User.email == admin_email)
            .options(selectinload(User.settings))
        )
        admin_user = res.scalar_one_or_none()

        if admin_user is None:
            admin_user = User(
                email=admin_email,
                password_hash=hashed_pwd,
                role=UserRole.ADMIN,
            )
            session.add(admin_user)
            await session.flush()

            user_settings = UserSettings(
                user_id=admin_user.id,
                notifications_enabled=True,
                language="en",
            )
            session.add(user_settings)
            print(f"[SUCCESS] Created demo admin account: {admin_email}")
        else:
            admin_user.password_hash = hashed_pwd
            admin_user.role = UserRole.ADMIN
            print(f"[INFO] Updated existing demo admin account: {admin_email}")

        await session.commit()
        print("\nAll demo accounts are seeded, verified, and ready for 1-click login.")


def main():
    asyncio.run(seed_demo_accounts())


if __name__ == "__main__":
    main()
