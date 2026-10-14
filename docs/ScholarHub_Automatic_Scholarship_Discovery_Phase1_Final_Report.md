# ScholarHub — Automatic Scholarship Discovery Phase 1 Final Report

## 1. Executive Summary

Phase 1 of the **ScholarHub Automatic Scholarship Discovery System** establishes the database foundation, provenance tracking, publication safety policy, and automated test isolation for web-based and API-based scholarship discovery.

The primary engineering objectives accomplished in Phase 1 include:
1. **Provenance & Publication Extension**: Extended the core `Scholarship` entity with metadata tracking origin (`source_url`, `source_id`, `external_id`, `fingerprint`), currency denomination (`currency` defaulting to `'INR'`), verification status (`is_verified` defaulting to `False`), and lifecycle status (`review_status`).
2. **Controlled Source Registry**: Created the `scholarship_sources` model to track official portals, connector types (`API`, `RSS`, `HTML_PARSING`, `SITEMAP`), operational health, and rate-limiting configurations without secrets.
3. **Execution Metrics & Job Tracking**: Created `scholarship_collection_jobs` to audit automated collection executions with status transitions (`RUNNING`, `SUCCEEDED`, `PARTIAL`, `FAILED`), bounded execution metrics, and database-level non-negative check constraints.
4. **Publication & Verification Safety Policy**: Implemented a strict publication condition (`Scholarship.is_published_condition()`) across all public student endpoints (`/scholarships`, `/scholarships/{id}`, `/saved`, `/compare`, `/recommendations`, `/match`, and `/requirements`). Pre-existing records are designated `review_status = 'LEGACY'`, keeping them visible without claiming artificial verification. Newly collected automated records default to `review_status = 'PENDING_REVIEW'`, keeping them strictly hidden from students until explicitly approved.
5. **Zero-Downtime Reversible Alembic Migration**: Authored revision `4d5e6f7a8b9c` branching from `2a3b4c5d6e7f`. Upgraded the active database preserving all 51 pre-existing scholarship records in the developer's database without data loss, and verified downgrade reversibility in an isolated disposable schema.
6. **Complete Database Test Isolation**: Resolved the test suite database hazard by introducing schema-level test isolation in `scholarhub_test` (and configurable via `TEST_DATABASE_URL`), eliminating test data pollution in the developer's active database and eliminating pagination test flakes.
7. **Zero-Defect Verification**: 100% of the backend test suite passed (181 passed out of 181, 0 failures), and React Native TypeScript compilation succeeded with zero errors (`npx tsc --noEmit`).

Per the **Critical Stop Rule**, no website scrapers, background schedulers, connector runners, or Gemini extraction pipelines were created in this phase.

---

## 2. Existing Architecture Inspected

The repository architecture inspected prior to implementation:
- **Backend Framework**: FastAPI with Python 3.13, asynchronous SQLAlchemy 2.x, and `asyncpg` driver.
- **Database**: PostgreSQL 16+ running on `localhost:5432/scholarhub_db`.
- **Migration Engine**: Alembic with async engine support (`NullPool` in online migration runner).
- **Previous Alembic Migration Head**: `2a3b4c5d6e7f` (`2a3b4c5d6e7f_add_user_role_enum_and_column.py`).
- **Initial Database Audit**: The active database contained 51 scholarship rows in schema `public` (43 seeded records plus 8 legacy entries created during previous audit passes).
- **API Surface**:
  - Public Scholarship API: `backend/app/api/v1/routes/scholarship.py`
  - Admin Scholarship API: `backend/app/api/v1/routes/admin.py` and `backend/app/services/admin_service.py`
- **Testing Configuration**: `backend/tests/conftest.py` previously connected directly to `settings.DATABASE_URL` in the default `public` schema without isolation, which previously caused test row contamination and test flakes.

---

## 3. Files Created and Modified

### Created Files:
1. `backend/app/models/discovery.py` — SQLAlchemy models `ScholarshipSource` and `ScholarshipCollectionJob`, and enums `ScholarshipSourceType` and `CollectionJobStatus`.
2. `backend/app/schemas/discovery.py` — Pydantic v2 validation and serialization schemas for source registry and collection jobs.
3. `backend/alembic/versions/4d5e6f7a8b9c_add_scholarship_discovery_phase1.py` — Alembic revision adding `scholarship_sources`, `scholarship_collection_jobs`, and 9 provenance columns to `scholarships`.
4. `backend/tests/test_discovery_phase1.py` — 13 comprehensive test cases validating provenance, publication filtering, check constraints, foreign keys, and admin CRUD.

### Modified Files:
1. `backend/app/models/scholarship.py` — Added `ScholarshipReviewStatus` enum, extended `Scholarship` with provenance columns, `uq_scholarships_source_external_id` constraint, origin-aware `__init__`, and `is_published_condition()` classmethod.
2. `backend/app/models/__init__.py` — Registered and exported `ScholarshipSource`, `ScholarshipCollectionJob`, `ScholarshipSourceType`, `CollectionJobStatus`, and `ScholarshipReviewStatus`.
3. `backend/app/schemas/scholarship.py` — Extended `ScholarshipListItem` and `ScholarshipResponse` with `currency`, `source_url`, `is_verified`, and `review_status`.
4. `backend/app/schemas/admin.py` — Updated `AdminScholarshipCreate` and `AdminScholarshipUpdate` with `currency`, `source_url`, `is_verified`, and `review_status`.
5. `backend/app/services/admin_service.py` — Updated admin scholarship creation service to populate `currency`, `source_url`, `is_verified` (default `True`), and `review_status` (default `VERIFIED`).
6. `backend/app/api/v1/routes/scholarship.py` — Enforced `Scholarship.is_published_condition()` across all public queries (`list_scholarships`, `get_saved_scholarships`, `compare_scholarships`, `get_scholarship_recommendations`, `get_scholarship_details`, `get_scholarship_requirements`, `match_scholarship`, `save_scholarship`, `check_saved_status`).
7. `backend/app/core/config.py` — Added `TEST_DATABASE_URL: Optional[str] = None` with asyncpg URL assembling validator.
8. `backend/tests/conftest.py` — Configured isolated test execution targeting schema `scholarhub_test` with safety guardrails against `public` schema execution.

---

## 4. Final Scholarship Model Changes

The `Scholarship` model in `backend/app/models/scholarship.py` was extended with the following evaluated candidate fields:

| Field Name | Type | Nullable | Default / Server Default | Description & Constraint |
| :--- | :--- | :--- | :--- | :--- |
| `currency` | `String(3)` | `NOT NULL` | `"INR"` | Currency ISO code. Standardizes financial representation across domestic and international grants. |
| `source_url` | `String(1000)` | `NULL` | `None` | Canonical or direct URL to the official source publication or portal notice. |
| `source_id` | `UUID` | `NULL` | `None` | Foreign key referencing `scholarship_sources.id` (`ondelete="SET NULL"`). Indexed. |
| `external_id` | `String(255)` | `NULL` | `None` | Source-specific unique identifier. Indexed. |
| `fingerprint` | `String(64)` | `NULL` | `None` | SHA-256 normalized deduplication hash of title + provider + deadline + amount. Indexed. |
| `is_verified` | `Boolean` | `NOT NULL` | `False` | Boolean verification badge. Only verified and legacy records are visible. Indexed. |
| `review_status` | `String(30)` | `NOT NULL` | `"LEGACY"` (DB default) | Controlled lifecycle state (`LEGACY`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED`, `ARCHIVED`). Indexed. |
| `last_collected_at` | `DateTime(tz=True)` | `NULL` | `None` | Timezone-aware timestamp when the record was last seen/scraped by a collection job. |
| `last_verified_at` | `DateTime(tz=True)` | `NULL` | `None` | Timezone-aware timestamp when the record was reviewed and validated. |

### Constraints and Origin Logic:
- **Unique Constraint**: `uq_scholarships_source_external_id` on `(source_id, external_id)`.
  - In PostgreSQL, rows with `NULL` in `source_id` or `external_id` do not violate this constraint, allowing manual scholarships to coexist without collision.
  - Rows with non-null `(source_id, external_id)` tuples are strictly deduplicated per source.
- **Origin-Aware `__init__`**:
  ```python
  def __init__(self, **kwargs):
      if "review_status" not in kwargs:
          if kwargs.get("source_id") is not None:
              kwargs["review_status"] = ScholarshipReviewStatus.PENDING_REVIEW.value
          else:
              kwargs["review_status"] = ScholarshipReviewStatus.LEGACY.value
      super().__init__(**kwargs)
  ```
  - When instantiated with a `source_id`, the record is recognized as an automated discovery record and defaults to `review_status='PENDING_REVIEW'`.
  - When instantiated without a `source_id` (e.g. test fixtures, manual scripts), it defaults to `review_status='LEGACY'`.

### Candidate Fields Omitted / Justification:
- No candidate fields were omitted; all 9 candidate fields were fully implemented.

---

## 5. Source Registry Schema

Table `scholarship_sources` in `backend/app/models/discovery.py` defines the authorized catalog of external scholarship sources:

| Column Name | SQLAlchemy Type | Nullable | Default / Constraints | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID(as_uuid=True)` | `NOT NULL` | `uuid.uuid4`, PK | Unique registry identifier. |
| `name` | `String(255)` | `NOT NULL` | Unique index | Human-readable portal name (e.g., "National Scholarship Portal"). |
| `slug` | `String(100)` | `NOT NULL` | Unique index | URL and CLI friendly identifier (e.g., "nsp-india"). |
| `base_url` | `String(500)` | `NOT NULL` | None | Base domain URL of the authorized provider. |
| `source_type` | `String(50)` | `NOT NULL` | `"HTML_PARSING"` | Controlled type (`API`, `RSS`, `HTML_PARSING`, `SITEMAP`). |
| `is_active` | `Boolean` | `NOT NULL` | `True`, index | Switch to enable/disable automated scraping. |
| `config` | `JSONB` | `NULL` | None | Configuration JSON (e.g. rate limits, selectors, pagination keys). Strictly no secrets. |
| `last_attempted_at` | `DateTime(tz=True)` | `NULL` | None | Timestamp of the most recent collection attempt. |
| `last_successful_at` | `DateTime(tz=True)` | `NULL` | None | Timestamp of the most recent error-free run. |
| `created_at` | `DateTime(tz=True)` | `NOT NULL` | `func.now()` | Record creation timestamp. |
| `updated_at` | `DateTime(tz=True)` | `NOT NULL` | `func.now()`, onupdate | Timestamp of last modification. |

---

## 6. Collection Job Schema

Table `scholarship_collection_jobs` in `backend/app/models/discovery.py` tracks execution runs:

| Column Name | SQLAlchemy Type | Nullable | Default / Constraints | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID(as_uuid=True)` | `NOT NULL` | `uuid.uuid4`, PK | Unique job execution run ID. |
| `source_id` | `UUID(as_uuid=True)` | `NULL` | FK -> `scholarship_sources.id`, ondelete SET NULL | Source for this run; indexed. |
| `status` | `String(30)` | `NOT NULL` | `"RUNNING"`, index | Execution lifecycle (`RUNNING`, `SUCCEEDED`, `PARTIAL`, `FAILED`). |
| `started_at` | `DateTime(tz=True)` | `NOT NULL` | `func.now()` | Start timestamp. |
| `finished_at` | `DateTime(tz=True)` | `NULL` | None | Finish timestamp. |
| `records_discovered` | `Integer` | `NOT NULL` | `0`, `CHECK >= 0` | Total candidates found in source feed/listing. |
| `records_created` | `Integer` | `NOT NULL` | `0`, `CHECK >= 0` | New scholarships inserted. |
| `records_updated` | `Integer` | `NOT NULL` | `0`, `CHECK >= 0` | Existing scholarships updated. |
| `records_duplicates_skipped`| `Integer` | `NOT NULL` | `0`, `CHECK >= 0` | Exact duplicate fingerprints skipped. |
| `records_rejected` | `Integer` | `NOT NULL` | `0`, `CHECK >= 0` | Items failing validation or schema rules. |
| `error_summary` | `String(1000)` | `NULL` | None | Bounded high-level failure reason (no secrets or stack traces). |
| `created_at` | `DateTime(tz=True)` | `NOT NULL` | `func.now()` | Job record creation timestamp. |

Check constraints:
- `chk_job_records_discovered_non_negative`: `records_discovered >= 0`
- `chk_job_records_created_non_negative`: `records_created >= 0`
- `chk_job_records_updated_non_negative`: `records_updated >= 0`
- `chk_job_duplicates_skipped_non_negative`: `records_duplicates_skipped >= 0`
- `chk_job_records_rejected_non_negative`: `records_rejected >= 0`

---

## 7. Raw Payload Storage Decision

### Decision: Defer to Phase 2 (Do Not Implement in Phase 1)
**Architectural Justification:**
1. **Scope Boundary**: In Phase 1, no crawlers, connectors, HTML parsers, or Gemini extraction pipelines are built. Creating a raw payload table now would create an orphaned, unpopulated database table without active consumers.
2. **Payload Sizing & Storage Strategy**: The optimal storage model depends on connector payloads (RSS XML items vs. API JSON responses vs. extracted HTML snippets). Creating a premature schema risks committing to an inefficient representation before the source connectors are benchmarked.
3. **Database Bloat Prevention**: Storing unparsed raw HTML pages in PostgreSQL directly can significantly inflate WAL volume and database backups. In Phase 2, bounded normalized extraction payloads (`< 200 KB`) can be evaluated for JSONB persistence or offloaded to object storage (Cloudinary/S3) if raw archival is required.
4. **Data Minimization**: Deferral complies with security best practices by preventing unparsed external web data from entering the database before parser sanitation pipelines exist.

---

## 8. Publication and Verification Policy

The publication policy guarantees that student users only see valid, high-quality scholarships.

### Condition Definition:
```python
@classmethod
def is_published_condition(cls):
    """SQLAlchemy filter condition defining public visibility.

    A scholarship is publicly visible if:
    1. review_status is 'LEGACY' (existing manually seeded/migrated records), OR
    2. review_status is 'VERIFIED' and is_verified is True.
    """
    return or_(
        cls.review_status == ScholarshipReviewStatus.LEGACY.value,
        and_(
            cls.review_status == ScholarshipReviewStatus.VERIFIED.value,
            cls.is_verified.is_(True),
        ),
    )
```

### Applied Endpoints:
1. `GET /api/v1/scholarships` (public search & listing) — filters items and total count.
2. `GET /api/v1/scholarships/{scholarship_id}` (detail) — returns 404 for unapproved items.
3. `GET /api/v1/scholarships/{scholarship_id}/requirements` — returns 404 for unapproved items.
4. `GET /api/v1/scholarships/{scholarship_id}/match` (AI match) — returns 404 for unapproved items.
5. `POST /api/v1/scholarships/{scholarship_id}/save` (bookmarking) — returns 404 for unapproved items.
6. `GET /api/v1/scholarships/{scholarship_id}/saved` (saved status) — returns 404 for unapproved items.
7. `GET /api/v1/scholarships/saved` (saved list) — includes only published items.
8. `GET /api/v1/scholarships/compare` (side-by-side compare) — filters compare candidates by publication condition.
9. `GET /api/v1/scholarships/recommendations` (AI recommendations) — evaluates only published scholarships.

### State Matrix:
| `review_status` | `is_verified` | Origin | Publicly Visible? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `LEGACY` | `False` | Pre-migration / Seeding | **YES** | Preserves existing catalog without claiming false verification. |
| `PENDING_REVIEW` | `False` | Automated Crawlers | **NO** | Default for all newly discovered automated records. |
| `VERIFIED` | `True` | Admin Approved / Admin Created | **YES** | Formally verified scholarships visible to all students. |
| `REJECTED` | `False` / `True` | Admin Rejected | **NO** | Flagged as invalid, spam, or expired. |
| `ARCHIVED` | `False` / `True` | Admin Archived | **NO** | Historical record preserved for applications, hidden from search. |

---

## 9. Backward Compatibility

1. **Student API Compatibility**:
   - `ScholarshipListItem` and `ScholarshipResponse` Pydantic schemas include `currency`, `source_url`, `is_verified`, and `review_status`.
   - All fields have sensible defaults or optional types (`currency: str = "INR"`).
   - The React Native mobile frontend does not break, and all TypeScript types compile without errors.
2. **Admin API Compatibility**:
   - `AdminScholarshipCreate` and `AdminScholarshipUpdate` accept `currency`, `source_url`, `is_verified`, and `review_status`.
   - Manual admin creation via `POST /api/v1/admin/scholarships` automatically defaults to `is_verified = True` and `review_status = "VERIFIED"`, allowing admins to publish immediate manual scholarships.
3. **Data Integrity for Existing Scholarships**:
   - Existing records retained all values across all columns.
   - Initial count: 51 records in `public.scholarships`.
   - Post-migration count: 51 records in `public.scholarships`.
   - All 51 records have `review_status = 'LEGACY'`, `is_verified = False`, `currency = 'INR'`.
4. **Verified Live Public API Access to Existing Records**:
   - Directly queried FastAPI `/api/v1/scholarships` against `public` schema without mocks:
     - `GET /api/v1/scholarships?page=1&page_size=100`: `total = 51`, returned 51 published items.
     - `GET /api/v1/scholarships/{id}`: `status_code = 200`, returning full details with `review_status = 'LEGACY'` and `is_verified = False`.

---

## 10. Alembic Migration Revision and Verification

- **Revision ID**: `4d5e6f7a8b9c`
- **Revises**: `2a3b4c5d6e7f`
- **File**: `backend/alembic/versions/4d5e6f7a8b9c_add_scholarship_discovery_phase1.py`

### Migration Strategy:
1. `op.create_table("scholarship_sources", ...)`
2. `op.create_table("scholarship_collection_jobs", ...)`
3. `op.add_column("scholarships", sa.Column("review_status", sa.String(30), nullable=False, server_default="LEGACY"))`
   - Setting `server_default="LEGACY"` guarantees that existing rows in PostgreSQL are populated with `'LEGACY'` upon column creation.
4. `op.add_column("scholarships", ...)` for remaining 8 provenance columns.
5. `op.create_foreign_key("fk_scholarships_source_id", ...)`
6. `op.create_unique_constraint("uq_scholarships_source_external_id", ...)`
7. `op.create_index(...)` for all lookup columns.

### Verification of Upgrade on Active Development Database:
Executed: `.venv\Scripts\python.exe -m alembic upgrade head`
Result:
```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 2a3b4c5d6e7f -> 4d5e6f7a8b9c, Add scholarship discovery phase 1 models and provenance fields
```
Verified active database state:
```text
Scholarship counts by review_status, is_verified, currency: [(51, 'LEGACY', False, 'INR')]
Sources count: 0
Jobs count: 0
```

### Actual Alembic Upgrade and Downgrade Verification on Disposable Schema:
To guarantee absolute reversibility without risking the developer's 51 active records, the actual Alembic migration engine (`alembic.command.upgrade` and `alembic.command.downgrade`) was executed against an isolated disposable schema `disposable_migration_test`:

```text
=== Starting Actual Alembic Migration Verification on Disposable Schema 'disposable_migration_test' ===
[OK] Created isolated schema 'disposable_migration_test'.

--- Running actual Alembic upgrade to 2a3b4c5d6e7f ---
INFO  [alembic.runtime.migration] Running upgrade  -> 18e2e3a789b8, initial ScholarHub schema
INFO  [alembic.runtime.migration] Running upgrade 18e2e3a789b8 -> 2a3b4c5d6e7f, add user role enum and column
[OK] Migrated up to 2a3b4c5d6e7f.
[OK] Pre-Phase 1 scholarships table verified without provenance fields.
[OK] Seeded 1 legacy scholarship row in disposable_migration_test.scholarships.

--- Running actual Alembic upgrade to 4d5e6f7a8b9c (Phase 1) ---
INFO  [alembic.runtime.migration] Running upgrade 2a3b4c5d6e7f -> 4d5e6f7a8b9c, Add scholarship discovery phase 1 models and provenance fields
[OK] Migrated up to 4d5e6f7a8b9c.
[OK] New tables exist: 'scholarship_sources', 'scholarship_collection_jobs'.
[OK] All 9 provenance/publication columns verified on scholarships.
[OK] Pre-existing record safely migrated: review_status='LEGACY', is_verified=False, currency='INR'.
[OK] Unique constraint 'uq_scholarships_source_external_id' verified.
[OK] Collection job non-negative counter check constraint verified.

--- Running actual Alembic downgrade to 2a3b4c5d6e7f ---
INFO  [alembic.runtime.migration] Running downgrade 4d5e6f7a8b9c -> 2a3b4c5d6e7f, Add scholarship discovery phase 1 models and provenance fields
[OK] Downgraded back to 2a3b4c5d6e7f.
[OK] Tables 'scholarship_sources' and 'scholarship_collection_jobs' successfully dropped.
[OK] All 9 provenance/publication columns successfully dropped on downgrade.
[OK] Legacy record intact after downgrade.

--- Running actual Alembic re-upgrade to 4d5e6f7a8b9c ---
INFO  [alembic.runtime.migration] Running upgrade 2a3b4c5d6e7f -> 4d5e6f7a8b9c, Add scholarship discovery phase 1 models and provenance fields
[OK] Re-upgraded cleanly to 4d5e6f7a8b9c.
[OK] Cleaned up and dropped 'disposable_migration_test'.
[OK] Public schema scholarships count: 51 (must be 51).

=== ALL ACTUAL ALEMBIC UPGRADE AND DOWNGRADE VERIFICATIONS PASSED 100% ===
```

---

## 11. Database Safety and Test Isolation

### The Problem Identified in Architecture Audit:
`backend/tests/conftest.py` previously connected directly to `settings.DATABASE_URL` targeting schema `public`. Tests (such as `test_admin.py`) inserted rows without cleaning them up, causing the development database to swell to 25+ records with October deadlines. This previously caused `test_deadline_filtering` to fail because the items spilled beyond the default page size of 20.

### The Resolution:
`backend/tests/conftest.py` was refactored with an isolated test architecture:
1. **Configurable Test URL**: `settings.TEST_DATABASE_URL` is checked first.
2. **Schema-Level Isolation**: If `TEST_DATABASE_URL` is not set, the test engine connects with:
   ```python
   connect_args = {"server_settings": {"search_path": "scholarhub_test"}}
   ```
3. **Session-Level Auto-Initialization with Committed Transactions**:
   A session-scoped autouse fixture automatically executes `CREATE SCHEMA IF NOT EXISTS scholarhub_test;` using an admin connection, and then executes `Base.metadata.create_all` inside `test_async_engine.begin()` to commit all 17 domain tables into PostgreSQL.
4. **Safety Guardrail**:
   ```python
   res = await conn.execute(text("SHOW search_path;"))
   current_search_path = res.scalar() or ""
   if not settings.TEST_DATABASE_URL and TEST_SCHEMA not in current_search_path:
       raise RuntimeError(
           f"SAFETY GUARD TRIGGERED: Tests are attempting to run against unsafe search_path: '{current_search_path}'. "
           f"Must include '{TEST_SCHEMA}' or configure TEST_DATABASE_URL."
       )
   ```
   If tests ever attempt to run against `public`, execution immediately halts with `RuntimeError`.

---

## 12. Tests Added

A dedicated test suite was implemented in `backend/tests/test_discovery_phase1.py` containing 13 focused test cases:

1. `test_database_isolation_active`: Confirms `search_path` is `scholarhub_test`.
2. `test_scholarship_provenance_defaults`: Validates `currency="INR"`, `is_verified=False`, `review_status="LEGACY"` on unadorned instantiation.
3. `test_automated_scholarship_defaults_to_pending_review`: Confirms that creating a scholarship with `source_id` defaults to `review_status="PENDING_REVIEW"` and `is_verified=False`.
4. `test_legacy_scholarships_remain_visible`: Verifies pre-migration records remain visible in public list and detail queries.
5. `test_pending_and_rejected_scholarships_hidden_from_public`: Verifies `PENDING_REVIEW` and `REJECTED` records return 404 in detail, save, match, and are excluded from lists.
6. `test_verified_scholarships_visible`: Verifies `VERIFIED` + `is_verified=True` records are accessible on public endpoints.
7. `test_scholarship_source_registry`: Tests CRUD operations and unique name constraints on `ScholarshipSource`.
8. `test_collection_job_creation_and_lifecycle`: Tests `ScholarshipCollectionJob` metrics tracking and status transitions.
9. `test_collection_job_negative_counter_constraint`: Verifies database-level `CheckConstraint` blocks negative counters.
10. `test_source_deletion_sets_null_foreign_key`: Verifies `ondelete="SET NULL"` preserves scholarships and jobs when their source is deleted.
11. `test_source_and_external_id_unique_constraint`: Verifies duplicate `(source_id, external_id)` tuples are blocked by the database.
12. `test_null_external_ids_do_not_conflict`: Verifies multiple manual scholarships with `NULL` source and external IDs do not conflict.
13. `test_admin_create_scholarship_with_provenance_fields`: Tests admin creation with custom currency (`USD`), source URL, and verified status.

---

## 13. Complete Backend Regression Results

The full pytest test suite was executed across all backend test modules on a freshly created test schema (`scholarhub_test` dropped and recreated):

```bash
.venv\Scripts\python.exe -m pytest
```

### Verified Test Run Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.6.0
rootdir: E:\ScholarHub\backend
plugins: anyio-4.14.2
collected 181 items

tests\test_admin.py ...........................                          [ 14%]
tests\test_ai_matching.py ..................                             [ 24%]
tests\test_applications.py ..............                                [ 32%]
tests\test_auth.py .......                                               [ 36%]
tests\test_database.py ....                                              [ 38%]
tests\test_discovery_phase1.py .............                             [ 45%]
tests\test_documents.py .................                                [ 55%]
tests\test_health.py ....                                                [ 57%]
tests\test_migrations.py ..                                              [ 58%]
tests\test_models.py .........                                           [ 63%]
tests\test_notifications.py ........................                     [ 76%]
tests\test_profile.py .......                                            [ 80%]
tests\test_saved_scholarships.py .................                       [ 90%]
tests\test_scholarships.py ..................                            [100%]

================= 181 passed, 3 warnings in 128.54s (0:02:08) =================
```

- **Total Test Items**: 181
- **Passed**: 181
- **Failed**: 0
- **Regression Status**: Zero regressions. All 168 pre-existing tests passed, and all 13 Phase 1 tests passed cleanly.

---

## 14. TypeScript Results

Executed TypeScript compiler check from the project root:

```bash
npx tsc --noEmit
```

### Verified Output:
```text
Exit code: 0
Stdout: (empty - 0 errors)
Stderr: (empty)
```

No type errors or breaking interface mismatches were introduced.

---

## 15. Problems Found and Fixes

| Problem Identified | Root Cause | Engineering Fix Applied |
| :--- | :--- | :--- |
| **`test_deadline_filtering` baseline failure** | Tests ran against `public` schema in development DB. Uncleaned test rows from `test_admin.py` overflowed the page size (`page_size=20`). | Implemented isolated test schema `scholarhub_test` in `conftest.py` with `search_path` isolation and `TEST_DATABASE_URL` support. |
| **Uncommitted DDL on fresh test schema initialization** | `test_async_engine.connect()` in `_async_prepare_test_environment` did not commit DDL transactions upon fresh setup, causing `relation "users" does not exist` when schema was wiped. | Switched to `async with test_async_engine.begin() as conn:`, ensuring all 17 tables are committed in PostgreSQL upon creation. |
| **Test fixture scholarships hidden after publication filter** | Test fixtures created scholarships using raw `Scholarship(...)` with default `review_status = PENDING_REVIEW`. | Implemented origin-aware `__init__` on `Scholarship`: records without `source_id` default to `LEGACY` (visible), while records with `source_id` default to `PENDING_REVIEW` (hidden). |
| **Job deletion on source deletion** | `ScholarshipSource.jobs` relationship had `cascade="all, delete-orphan"`, conflicting with `ForeignKey(ondelete="SET NULL")`. | Removed `cascade="all, delete-orphan"` on `jobs` relationship so collection jobs persist audit records with `source_id = NULL`. |
| **PostgreSQL test user permissions** | `scholarhub_user` lacks `CREATEDB` privileges in PostgreSQL. | Used schema-level isolation (`scholarhub_test`) which `scholarhub_user` owns and has full DDL privileges to create and drop. |

---

## 16. Remaining Limitations

1. **No External Ingestion Pipeline**: In accordance with Phase 1 scope, there are no live scrapers or connectors fetching real-world scholarship data yet.
2. **No Webhook or Async Scheduler**: No cron scheduler (Celery, ARQ, or APScheduler) is currently running to trigger collection jobs.
3. **No Raw Content Archival**: Raw page payloads are deferred until Phase 2 source connectors are developed and storage sizes can be profiled.

---

## 17. Confirmation That No Collector or Scheduler Was Implemented

In strict compliance with the Phase 1 specifications:
- **No website scrapers or crawlers were created.**
- **No external source connectors (API, RSS, HTML) were implemented.**
- **No periodic background scheduler (cron/celery/apscheduler) was introduced.**
- **No Gemini extraction pipelines were connected to discovery jobs.**
- **No changes were made to the React Native UI.**

---

## 18. Recommended Phase 2

For Phase 2 (Automatic Scholarship Discovery — Source Connectors & Extraction Engine), the recommended implementation steps are:

1. **Source Connector Framework**:
   - Create an abstract `BaseScholarshipConnector` class in `backend/app/services/discovery/connectors/base.py`.
   - Implement rate-limiting, backoff retries, user-agent headers, and robots.txt compliance.
   - Implement an RSS connector for scholarship feeds and an API connector for open government portals (e.g., National Scholarship Portal API or UGC feeds).
2. **HTML Sanitization & Extraction Engine**:
   - Implement BeautifulSoup4/Playwright extraction with CSS/XPath selector configuration stored in `ScholarshipSource.config`.
   - Implement structured LLM extraction via Gemini 2.5 Flash for unstructured portals to parse eligibility, deadlines, benefits, and monetary amounts into structured Pydantic schemas.
3. **Fingerprint & Deduplication Service**:
   - Implement `ScholarshipDeduplicationService` that computes normalized SHA-256 fingerprints across title, provider, deadline, and normalized amount.
   - Check existing fingerprints before database insertion, incrementing `records_duplicates_skipped` when matches occur.
4. **Admin Discovery Management Dashboard**:
   - Expose admin review endpoints:
     - `GET /api/v1/admin/discovery/sources`
     - `POST /api/v1/admin/discovery/sources`
     - `GET /api/v1/admin/discovery/pending` (paginated list of `PENDING_REVIEW` scholarships)
     - `POST /api/v1/admin/discovery/{id}/approve` (transitions to `VERIFIED` and publishes)
     - `POST /api/v1/admin/discovery/{id}/reject` (transitions to `REJECTED`)
5. **Background Scheduler**:
   - Integrate an asynchronous worker or periodic task runner to trigger active sources based on configured polling intervals.

---

### Verification Summary
- **Database Migrations Head**: `4d5e6f7a8b9c`
- **Active Database Records**: 51 legacy scholarships preserved intact
- **Backend Test Suite**: 181 passed / 181 total (100% passing)
- **TypeScript Compiler**: 0 errors (`npx tsc --noEmit` clean)
- **Stop Rule Enforced**: Phase 1 completed, waiting for review.
