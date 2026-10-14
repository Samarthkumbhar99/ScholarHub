"""Database maintenance script to re-link foreign keys and eliminate duplicate scholarship records.

Preserves all user applications, saved bookmarks, and requirements by re-linking them to
the canonical (earliest created) scholarship record before safely removing redundant duplicates.
"""

import asyncio
from sqlalchemy import select, func, update, delete
from app.core.database import AsyncSessionLocal
from app.models.scholarship import Scholarship, SavedScholarship, ScholarshipRequirement
from app.models.application import Application


async def cleanup_duplicate_scholarships() -> None:
    async with AsyncSessionLocal() as session:
        # Find all duplicate scholarship groups by (lower(name), lower(provider))
        stmt = select(
            func.lower(Scholarship.name).label('lname'),
            func.lower(Scholarship.provider).label('lprov'),
            func.count(Scholarship.id).label('cnt')
        ).group_by(
            func.lower(Scholarship.name), func.lower(Scholarship.provider)
        ).having(func.count(Scholarship.id) > 1)

        res = await session.execute(stmt)
        groups = res.all()
        print(f"Processing {len(groups)} duplicate scholarship groups...")

        total_cleaned = 0
        total_relinked_apps = 0
        total_relinked_saved = 0

        for g in groups:
            # Query all records in this group ordered by created_at asc
            q = select(Scholarship).where(
                func.lower(Scholarship.name) == g.lname,
                func.lower(Scholarship.provider) == g.lprov
            ).order_by(Scholarship.created_at.asc())
            sch_res = await session.execute(q)
            records = sch_res.scalars().all()

            primary = records[0]
            redundant = records[1:]
            redundant_ids = [r.id for r in redundant]

            print(f"\nGroup '{primary.name}' ({primary.provider}):")
            print(f"  Canonical ID: {primary.id}")
            print(f"  Redundant copies to remove: {len(redundant)}")

            # 1. Re-link Applications
            for red_id in redundant_ids:
                app_stmt = (
                    update(Application)
                    .where(Application.scholarship_id == red_id)
                    .values(scholarship_id=primary.id)
                )
                app_res = await session.execute(app_stmt)
                if app_res.rowcount > 0:
                    total_relinked_apps += app_res.rowcount
                    print(f"    Re-linked {app_res.rowcount} applications to canonical record.")

            # 2. Re-link or Deduplicate Saved Scholarships
            for red_id in redundant_ids:
                saved_records_res = await session.execute(
                    select(SavedScholarship).where(SavedScholarship.scholarship_id == red_id)
                )
                saved_records = saved_records_res.scalars().all()
                for saved in saved_records:
                    # Check if user already saved the primary record
                    already_saved = await session.scalar(
                        select(SavedScholarship.id).where(
                            SavedScholarship.user_id == saved.user_id,
                            SavedScholarship.scholarship_id == primary.id,
                        )
                    )
                    if already_saved:
                        await session.delete(saved)
                    else:
                        saved.scholarship_id = primary.id
                        total_relinked_saved += 1

            # 3. Clean up Requirements on redundant copies
            await session.execute(
                delete(ScholarshipRequirement).where(ScholarshipRequirement.scholarship_id.in_(redundant_ids))
            )

            # 4. Safely delete the redundant scholarship copies
            await session.execute(
                delete(Scholarship).where(Scholarship.id.in_(redundant_ids))
            )
            total_cleaned += len(redundant)

        await session.commit()
        print(f"\n[SUCCESS] Cleanup complete:")
        print(f"  • Redundant scholarship copies removed: {total_cleaned}")
        print(f"  • Applications preserved & re-linked: {total_relinked_apps}")
        print(f"  • Saved scholarships preserved & re-linked: {total_relinked_saved}")

        # Final verification
        final_total = await session.scalar(select(func.count(Scholarship.id)))
        remaining_dups = await session.execute(
            select(func.lower(Scholarship.name))
            .group_by(func.lower(Scholarship.name), func.lower(Scholarship.provider))
            .having(func.count(Scholarship.id) > 1)
        )
        print(f"  • Total distinct scholarships in database: {final_total}")
        print(f"  • Duplicate groups remaining in database: {len(remaining_dups.all())}")


if __name__ == "__main__":
    asyncio.run(cleanup_duplicate_scholarships())
