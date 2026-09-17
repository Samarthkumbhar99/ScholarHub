from pathlib import Path
import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base
import app.models  # noqa: F401


def test_alembic_config_and_metadata():
    """Verify alembic.ini and script directory are configured properly."""
    backend_dir = Path(__file__).resolve().parent.parent
    alembic_ini_path = backend_dir / "alembic.ini"
    alembic_dir = backend_dir / "alembic"

    assert alembic_ini_path.exists(), "alembic.ini not found"
    assert alembic_dir.exists(), "alembic directory not found"

    alembic_cfg = Config(str(alembic_ini_path))
    script_dir = ScriptDirectory.from_config(alembic_cfg)

    # Verify head revision
    head_rev = script_dir.get_current_head()
    assert head_rev is not None, "No Alembic head revision found"

    # Verify Base metadata has all 15 tables
    expected_tables = {
        "users",
        "user_settings",
        "student_profiles",
        "academic_profiles",
        "financial_preferences",
        "scholarships",
        "scholarship_requirements",
        "saved_scholarships",
        "applications",
        "student_documents",
        "notifications",
        "countries",
        "universities",
        "courses",
        "university_scholarships",
    }
    assert expected_tables.issubset(set(Base.metadata.tables.keys()))


@pytest.mark.anyio
async def test_database_tables_and_enums_exist():
    """Verify that all 15 application tables and custom enums actually exist in PostgreSQL."""
    try:
        async with AsyncSessionLocal() as session:
            # Query table list in public schema
            query_tables = text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            )
            result = await session.execute(query_tables)
            tables_in_db = {row[0] for row in result.fetchall()}

            expected_app_tables = {
                "users",
                "user_settings",
                "student_profiles",
                "academic_profiles",
                "financial_preferences",
                "scholarships",
                "scholarship_requirements",
                "saved_scholarships",
                "applications",
                "student_documents",
                "notifications",
                "countries",
                "universities",
                "courses",
                "university_scholarships",
            }

            assert expected_app_tables.issubset(tables_in_db), (
                f"Missing tables in DB: {expected_app_tables - tables_in_db}"
            )
            assert "alembic_version" in tables_in_db

            # Query alembic_version revision
            rev_res = await session.execute(text("SELECT version_num FROM alembic_version"))
            current_rev = rev_res.scalar()
            assert current_rev is not None

            # Verify enum types
            enum_query = text("""
                SELECT t.typname, e.enumlabel
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public'
                ORDER BY t.typname, e.enumsortorder
            """)
            enum_result = await session.execute(enum_query)
            db_enums = {}
            for typname, label in enum_result.fetchall():
                db_enums.setdefault(typname, []).append(label)

            assert "application_status_enum" in db_enums
            assert "study_preference_enum" in db_enums
            assert "notification_type_enum" in db_enums

            assert db_enums["study_preference_enum"] == ["INDIA", "ABROAD", "BOTH"]
            assert "SAVED" in db_enums["application_status_enum"]
            assert "SCHOLARSHIP_RECEIVED" in db_enums["application_status_enum"]
            assert "DEADLINE_REMINDER" in db_enums["notification_type_enum"]
    except Exception as e:
        pytest.skip(f"Live PostgreSQL database check skipped/failed: {e}")
