# ScholarHub — Automatic Scholarship Discovery: Phase 4 Final Report
**Automatic Scheduled Scholarship Collection**

*Date: October 13, 2026*  
*Project: ScholarHub*  
*Stage: Phase 4 Completed*  
*Backend Test Status: 217 Passing Tests (100% Success Rate)*  
*Frontend TypeScript Check: 0 Errors (`npx tsc --noEmit`)*  
*Database Integrity: 51 Legacy Scholarships Intact and Public*

---

## 1. Executive Summary

Phase 4 completes the automation lifecycle of ScholarHub's Scholarship Discovery Engine. 

In Phases 1–3:
- **Phase 1** established the database schema, provenance architecture, source registry (`scholarship_sources`), and collection job models (`scholarship_collection_jobs`).
- **Phase 2** built the first official source connector for the **National Scholarship Portal (NSP)** with robust semantic parsing, content fingerprinting, deduplication, and on-demand CLI execution.
- **Phase 3** delivered the administrative review workflow, approval/rejection endpoints, role-based access control (RBAC), and moderation dashboard UI.

**Phase 4 operationalizes automatic recurring discovery:**
1. **Lightweight, Zero-Dependency In-Process Scheduler**: Integrates directly into FastAPI's asynchronous application lifecycle (`lifespan`) using native Python `asyncio`. Avoids heavy external infrastructure dependencies such as Redis, RabbitMQ, or Celery.
2. **Distributed Concurrency Protection via PostgreSQL Advisory Locks**: Employs PostgreSQL session-level advisory locks (`pg_try_advisory_lock` / `pg_advisory_unlock`) with deterministic 64-bit bigint keys hashed from source slugs. Prevents overlapping collection runs across multiple Uvicorn workers, Kubernetes pods, container replicas, and concurrent CLI invocations.
3. **Resilient Failure and Retry Handling**: Features bounded retries on transient network errors, configurable timeout guards (`asyncio.wait_for`), and automatic failure recording in `scholarship_collection_jobs` without crashing the application.
4. **Mandatory Review and Publication Safeguards Preserved**: All newly discovered records strictly remain `review_status = "PENDING_REVIEW"` and `is_verified = False`. Upstream updates safely refresh deadlines and URLs while strictly preserving administrator-edited descriptions, custom titles, approved/rejected states, and legacy scholarship visibility.
5. **Admin Telemetry and Observability**: Exposes scheduler state, active loop status, interval, next projected run time, and granular counters (`discovered`, `created`, `updated`, `duplicates_skipped`, `rejected`) in the admin dashboard and dedicated API endpoints.
6. **Zero-Regression Verification**: All 217 backend tests passed with 100% success rate across the isolated test database. Frontend TypeScript verification compiled with 0 errors. All 51 legacy scholarship records in the development database remain intact and public.

---

## 2. Architecture Decision: Scheduling Strategy

### 2.1 Evaluated Alternatives

| Strategy | Infrastructure Footprint | Concurrency Safety | Operational Complexity | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Celery + Redis / RabbitMQ** | Heavy (Requires Redis/RabbitMQ server, Celery worker process, Celery Beat daemon) | High (Distributed lock via Redis) | High (Multiple separate system processes to monitor, scale, and secure) | ❌ **Rejected**: Unnecessary operational overhead for low-frequency periodic collection (e.g., every 12 hours). |
| **B. External Crontab / Kubernetes CronJob (CLI Only)** | Low (Invokes `python -m app.cli.collect`) | Low unless locked (Overlapping runs possible if jobs take longer than interval) | Medium (Requires platform-level scheduler or host crontab) | ⚠️ **Supported as Secondary / Alternative Mode** via the CLI entrypoint. |
| **C. In-Process Async Scheduler + PostgreSQL Advisory Locks** | **Zero Extra Infrastructure** (Uses existing FastAPI event loop and PostgreSQL connection) | **Highest** (Native PostgreSQL session-level advisory locks enforce distributed mutual exclusion) | **Lowest** (Self-contained, configured via `.env`, graceful startup/shutdown via FastAPI lifespan) |  **Chosen & Implemented** |

### 2.2 Why PostgreSQL Advisory Locks?
ScholarHub already relies on PostgreSQL via SQLAlchemy 2.x and `asyncpg`. PostgreSQL provides native, high-performance distributed advisory locks (`pg_try_advisory_lock`):
1. **Zero External Dependencies**: Operates directly over existing database connections without Redis or ZooKeeper.
2. **Deterministic Bigint Keys**: Computes a stable signed 64-bit integer from the source slug (`get_source_advisory_lock_key("nsp")`), partitioning locks by source so independent connectors can run in parallel while identical sources never collide.
3. **Non-Blocking Acquisition**: `pg_try_advisory_lock` immediately returns `False` if another process or worker holds the lock, allowing redundant workers or duplicate cron jobs to exit cleanly without stalling or throwing exceptions.
4. **Crash Safety**: Session-level advisory locks are automatically released by PostgreSQL if a process terminates or its connection terminates abruptly.
5. **Universal Exclusion**: Shared across the in-process scheduler, multiple Uvicorn workers, manual CLI runs, and external cron containers.

### 2.3 Limitations of In-Process Scheduling
- **Serverless / Ephemeral Sleep**: On platforms where web containers sleep or terminate after periods of HTTP inactivity (e.g., Heroku Free tier or serverless lambdas), in-process timers pause while sleeping. For such environments, deployment should utilize the external cron mode invoking `python -m app.cli.collect --source nsp`.
- **Dynamic Worker Scaling**: When scaling to N Uvicorn workers (`--workers N`), all N workers initialize the scheduler loop. However, the PostgreSQL advisory lock guarantees that only the first worker to wake up executes the run; all other N-1 workers skip the iteration safely.

---

## 3. Files Created and Modified

### New Files Created
| File Path | Description |
| :--- | :--- |
| `backend/app/services/discovery/lock.py` | Distributed PostgreSQL session advisory lock manager (`PostgresAdvisoryLock`, `get_source_advisory_lock_key`). |
| `backend/app/services/discovery/scheduler.py` | Core `DiscoveryScheduler` managing recurring `asyncio` task loop, execution timeouts, bounded retries, status telemetry, and manual triggers. |
| `backend/tests/test_discovery_phase4.py` | Comprehensive test suite containing 11 tests verifying configuration, locking, deduplication, retry, failure recording, safeguards, and admin endpoints. |
| `docs/ScholarHub_Automatic_Scholarship_Discovery_Phase4_Report.md` | Comprehensive architectural documentation and operational guide for Phase 4. |

### Existing Files Modified
| File Path | Modifications |
| :--- | :--- |
| `backend/app/core/config.py` | Added discovery schedule configuration properties (`DISCOVERY_SCHEDULE_ENABLED`, `DISCOVERY_SCHEDULE_INTERVAL_HOURS`, `DISCOVERY_SCHEDULE_INITIAL_DELAY_SECONDS`, `DISCOVERY_SCHEDULE_SOURCES`, `DISCOVERY_SCHEDULE_TIMEOUT_SECONDS`, `DISCOVERY_SCHEDULE_MAX_RETRIES`) and source slug list validator. |
| `backend/app/services/discovery/__init__.py` | Exported `PostgresAdvisoryLock`, `get_source_advisory_lock_key`, `DiscoveryScheduler`, and `get_discovery_scheduler`. |
| `backend/app/services/discovery/orchestrator.py` | Updated safe update logic to preserve administrator-curated descriptions on verified scholarships (`if item.description and not (existing.is_verified and existing.description)`). |
| `backend/app/main.py` | Added `@asynccontextmanager def lifespan` to initialize and gracefully terminate `DiscoveryScheduler` during FastAPI application startup and shutdown. |
| `backend/app/cli/collect.py` | Wrapped on-demand CLI execution in `PostgresAdvisoryLock` to prevent manual runs from conflicting with background scheduler runs. |
| `backend/app/schemas/admin.py` | Added `AdminSchedulerInfo` and `AdminSchedulerTriggerResponse` schemas, and included `scheduler_info` in `AdminDashboardStatsResponse`. |
| `backend/app/services/admin_service.py` | Updated `get_dashboard_stats` to query the latest database collection job and populate real-time scheduler telemetry. |
| `backend/app/api/v1/routes/admin.py` | Added `GET /api/v1/admin/scheduler` (telemetry lookup) and `POST /api/v1/admin/scheduler/trigger` (on-demand manual trigger with lock protection). |
| `src/constants/apiEndpoints.ts` | Added `SCHEDULER` and `SCHEDULER_TRIGGER` routes to `API_ENDPOINTS.ADMIN`. |
| `src/services/adminService.ts` | Added `AdminSchedulerInfo`, `AdminSchedulerTriggerResponse` TypeScript interfaces and client methods `getSchedulerStatus`, `triggerScheduler`. |
| `src/screens/admin/AdminModerationDashboardScreen.tsx` | Added recurring scheduler status card (frequency, active state, next run timestamp) to the Collection History tab. |
| `backend/tests/conftest.py` | Configured `settings.DISCOVERY_SCHEDULE_ENABLED = False` by default and bound `DiscoveryScheduler` to isolated `test_async_engine` and `TestAsyncSessionLocal`. |

---

## 4. Configuration Specification

All scheduler parameters are fully configurable via `.env` or system environment variables:

| Environment Variable | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `DISCOVERY_SCHEDULE_ENABLED` | Boolean | `true` | Enables or disables the background discovery scheduler loop. Set to `false` in testing or CLI-only setups. |
| `DISCOVERY_SCHEDULE_INTERVAL_HOURS` | Integer | `12` | Frequency in hours between automatic collection runs (minimum 1 hour). Conservative 12-hour default prevents portal throttling. |
| `DISCOVERY_SCHEDULE_INITIAL_DELAY_SECONDS`| Integer | `60` | Delay after server startup before executing the first scheduled run. Allows health checks and DB initialization to complete first. |
| `DISCOVERY_SCHEDULE_SOURCES` | List / String | `["nsp"]` | Comma-separated or JSON list of source slugs to collect (e.g. `nsp` or `nsp,mahadbt`). |
| `DISCOVERY_SCHEDULE_TIMEOUT_SECONDS` | Integer | `300` | Maximum execution time in seconds for a single collection run before timing out (5 minutes). |
| `DISCOVERY_SCHEDULE_MAX_RETRIES` | Integer | `2` | Number of bounded retries attempted on transient network or portal errors before recording failure. |

---

## 5. Distributed Concurrency & Locking Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 INCOMING INVOCATIONS                                   │
│                                                                                        │
│     Uvicorn Worker #1              Uvicorn Worker #2             Manual CLI / Cron     │
│   (Scheduled Interval)           (Scheduled Interval)        (python -m app.cli.collect)│
└──────────────┬──────────────────────────────┬─────────────────────────────┬────────────┘
               │                              │                             │
               ▼                              ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Session Advisory Lock                                │
│                     SELECT pg_try_advisory_lock(:source_key)                            │
│                  (Key: SHA-256("scholarhub_discovery_lock_nsp"))                       │
└──────────────┬──────────────────────────────┬─────────────────────────────┬────────────┘
               │                              │                             │
        Acquired: True                 Acquired: False               Acquired: False
               │                              │                             │
               ▼                              ▼                             ▼
┌──────────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
│   EXECUTES COLLECTION JOB    │ │      SKIPS SAFELY        │ │      SKIPS SAFELY        │
│ • Fetch official portal HTML │ │ • Logs lock contention   │ │ • Prints notice to stdout│
│ • Deduplicate & parse schemes│ │ • Exits iteration cleanly│ │ • Exits with code 0      │
│ • Commit mutations / updates │ │ • Zero DB write conflict │ │ • Zero DB write conflict │
│ • Release advisory lock      │ └──────────────────────────┘ └──────────────────────────┘
└──────────────────────────────┘
```

### Deterministic Lock Key Generation
```python
def get_source_advisory_lock_key(source_slug: str) -> int:
    clean_slug = (source_slug or "unknown").strip().lower()
    raw = f"scholarhub_discovery_lock_{clean_slug}".encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=True)
```
- Guarantees distinct, non-colliding locks across different sources (e.g. `nsp` vs future `mahadbt`).
- Uses signed 64-bit integers matching PostgreSQL's `bigint` parameter type.

---

## 6. Scholarship Review & Publication Safeguards

Phase 4 strictly adheres to ScholarHub's moderation principles:

1. **Unpublished Ingestion**:
   Every newly discovered scheme created by the recurring scheduler is assigned:
   ```python
   is_verified = False
   review_status = "PENDING_REVIEW"
   ```
   Unreviewed records are filtered out by `Scholarship.is_published_condition()` and return `HTTP 404 Not Found` on public endpoints.
2. **Protection of Administrator Edits**:
   When recurring collection discovers an existing scholarship with an extended deadline or updated guidelines:
   - `deadline`, `source_url`, and `fingerprint` update safely.
   - If `is_verified == True` and `description` was edited by an administrator, the curated description is **never** overwritten by upstream portal text.
   - `is_verified` and `review_status` (whether `VERIFIED` or `REJECTED`) are strictly preserved.
3. **Zero Duplication**:
   If upstream portal content is identical, the SHA-256 content fingerprint matches. The scheduler records `records_duplicates_skipped += 1` and refreshes `last_collected_at` without duplicating rows.
4. **Legacy Record Safety**:
   Manual scholarships (`source_id IS NULL`) remain untouched and published.

---

## 7. Admin Observability & Endpoints

### 7.1 New & Enhanced Administrative Endpoints

#### `GET /api/v1/admin/scheduler`
- **Description**: Returns operational status, background task health, interval, and latest run telemetry.
- **Authorization**: Administrator only (`Depends(require_admin)`). Students receive `HTTP 403 Forbidden`.
- **Sample Response**:
  ```json
  {
    "enabled": true,
    "is_running": true,
    "is_executing": false,
    "interval_hours": 12,
    "initial_delay_seconds": 60,
    "timeout_seconds": 300,
    "max_retries": 2,
    "configured_sources": ["nsp"],
    "last_run_at": "2026-10-13T18:00:00Z",
    "next_run_at": "2026-10-14T06:00:00Z",
    "last_run_status": "SUCCEEDED",
    "last_run_source": "nsp",
    "last_run_records_discovered": 31,
    "last_run_records_created": 0,
    "last_run_records_updated": 0,
    "last_run_records_duplicates_skipped": 31,
    "last_run_records_rejected": 0,
    "last_run_error_summary": null
  }
  ```

#### `POST /api/v1/admin/scheduler/trigger?source=nsp`
- **Description**: Allows an administrator to manually trigger an immediate scheduled collection run on-demand.
- **Lock Protection**: Automatically attempts the PostgreSQL advisory lock. If an existing job is in progress, returns `status: "SKIPPED_LOCKED"` without failing.
- **Sample Response**:
  ```json
  {
    "detail": "Collection job for source 'nsp' completed with status SUCCEEDED.",
    "status": "SUCCEEDED",
    "job_id": "b3e2189a-0f81-42cb-b152-a5e2f183789b",
    "records_discovered": 31,
    "records_created": 0,
    "records_updated": 0,
    "records_duplicates_skipped": 31,
    "records_rejected": 0,
    "error_summary": null
  }
  ```

#### `GET /api/v1/admin/dashboard/stats` (Enhanced)
- Incorporates `scheduler_info: AdminSchedulerInfo` alongside user, application, and moderation counters.

---

## 8. Deployment & Operational Guide

### 8.1 Environment Configuration (`.env`)
To run the automated discovery scheduler in production:
```bash
# Enable scheduler
DISCOVERY_SCHEDULE_ENABLED=true

# Conservative 12-hour interval
DISCOVERY_SCHEDULE_INTERVAL_HOURS=12

# Delay initial run 60 seconds after container boot
DISCOVERY_SCHEDULE_INITIAL_DELAY_SECONDS=60

# Configured active sources
DISCOVERY_SCHEDULE_SOURCES=nsp

# 5-minute timeout per collection execution
DISCOVERY_SCHEDULE_TIMEOUT_SECONDS=300

# 2 bounded retries on network failures
DISCOVERY_SCHEDULE_MAX_RETRIES=2
```

### 8.2 Application Startup & Shutdown Logs
On startup, FastAPI's `lifespan` handler logs:
```
INFO:scholarhub.discovery.scheduler:Discovery scheduler started (Interval: 12h, Delay: 60s, Timeout: 300s, Sources: ['nsp'])
INFO:scholarhub.discovery.scheduler:Discovery scheduler waiting initial delay of 60s before first run...
```
During collection runs:
```
INFO:scholarhub.discovery.scheduler:Discovery collection completed for 'nsp': Status=SUCCEEDED, Discovered=31, Created=0, Updated=0, Duplicates=31, Rejected=0 in 4.82s
INFO:scholarhub.discovery.scheduler:Scheduled discovery run finished. Next run at 2026-10-14T06:00:00+00:00 (in 12 hours).
```
On graceful shutdown (`SIGTERM` / `SIGINT`):
```
INFO:scholarhub.discovery.scheduler:Stopping scholarship discovery scheduler...
INFO:scholarhub.discovery.scheduler:Scholarship discovery scheduler stopped successfully.
```

### 8.3 Manual CLI Fallback & External Crontab
If deploying to serverless platforms that sleep on idle, background tasks can be managed via external cron or CLI:
```bash
# Execute on-demand collection for NSP
python -m app.cli.collect --source nsp

# Dry-run collection (no database commits)
python -m app.cli.collect --source nsp --dry-run
```
Even when run from an external cron, the CLI uses `PostgresAdvisoryLock`, ensuring zero overlap with running API workers.

---

## 9. Verification & Test Results

### 9.1 Phase 4 Test Suite (`backend/tests/test_discovery_phase4.py`)

| Test Name | Test Objective | Result |
| :--- | :--- | :--- |
| `test_scheduler_disabled_in_tests` | Asserts scheduler is disabled by default in test suite and start() is a no-op. |  PASSED |
| `test_scheduling_configuration_validation` | Verifies parsing of interval, timeout, retries, and comma/JSON source lists. |  PASSED |
| `test_advisory_lock_mutual_exclusion` | Verifies `pg_try_advisory_lock` prevents concurrent lock acquisition. |  PASSED |
| `test_no_overlapping_runs_via_scheduler` | Asserts scheduler skips cleanly (`returns None`) when source is already locked. |  PASSED |
| `test_concurrent_workers_advisory_lock_protection` | Runs two concurrent collection tasks; asserts exactly one executes and one skips. |  PASSED |
| `test_failed_runs_recorded_accurately` | Simulates portal 503 error; asserts FAILED job record created with error summary. |  PASSED |
| `test_retry_and_timeout_behavior` | Simulates transient error on attempt 1; asserts bounded retry succeeds on attempt 2. |  PASSED |
| `test_repeated_collection_and_deduplication` | Executes repeated scheduled runs; asserts duplicates are skipped without insertion. |  PASSED |
| `test_approved_and_admin_edited_scholarships_protected` | Asserts verified status and admin-edited descriptions are preserved across upstream updates. |  PASSED |
| `test_pending_records_hidden_from_student_apis` | Verifies newly scheduled records remain 100% hidden from student list search and detail lookup. |  PASSED |
| `test_admin_scheduler_endpoints_and_observability` | Asserts admin access succeeds on `/admin/scheduler` and `/trigger`, and student access returns 403. |  PASSED |

### 9.2 Full Backend Test Suite Output

Execution against the isolated test database (`scholarhub_test`):

```bash
$ .venv\Scripts\pytest.exe -v
====================================================================== test session starts =======================================================================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.6.0 -- E:\ScholarHub\backend\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: E:\ScholarHub\backend
plugins: anyio-4.14.2
collecting ... collected 217 items

tests/test_admin.py ....................................................                                                                                  [ 24%]
tests/test_ai.py .......                                                                                                                                  [ 28%]
tests/test_applications.py .....                                                                                                                         [ 30%]
tests/test_auth.py .......                                                                                                                                [ 33%]
tests/test_database.py ....                                                                                                                               [ 35%]
tests/test_discovery_phase1.py ......                                                                                                                     [ 38%]
tests/test_discovery_phase2.py ..............                                                                                                             [ 44%]
tests/test_discovery_phase3.py ...........                                                                                                                [ 49%]
tests/test_discovery_phase4.py ...........                                                                                                                [ 54%]
tests/test_documents.py ..............                                                                                                                    [ 61%]
tests/test_models.py ............                                                                                                                         [ 66%]
tests/test_notifications.py ....................                                                                                                          [ 76%]
tests/test_profile.py .......                                                                                                                             [ 79%]
tests/test_saved_scholarships.py ....................                                                                                                     [ 88%]
tests/test_scholarships.py ..........................                                                                                                     [100%]

======================================================= 217 passed, 6 warnings in 142.64s (0:02:22) =======================================================
```

**Test Summary Progression:**
- **Phase 1 Baseline**: 181 passing tests
- **Phase 2 Baseline**: 195 passing tests (+14 tests)
- **Phase 3 Baseline**: 206 passing tests (+11 tests)
- **Phase 4 Total**: **217 passing tests** (+11 tests, 0 failures, 100% success rate)

### 9.3 Frontend TypeScript Verification
```bash
$ npx tsc --noEmit
# Exited with code 0. Zero errors.
```

### 9.4 Database Integrity Verification
Executed on the development database:
```
LEGACY_SCHOLARSHIPS_COUNT: 51
DISCOVERED_SCHOLARSHIPS_COUNT: 31
TOTAL_SCHOLARSHIPS_COUNT: 82
```
- All **51 baseline legacy scholarships** are intact, public, and untouched.
- All **31 discovered NSP scholarships** remain preserved.

---

## 10. Conclusion and Stop Rule Adherence

Phase 4 is complete, fully tested, and verified:
- **Scheduling**: Fully automatic in-process recurring scheduler with configurable interval, initial startup delay, timeouts, and bounded retries.
- **Concurrency**: PostgreSQL distributed session-level advisory locks prevent multi-worker and multi-container collision.
- **Safeguards**: All discoveries remain unverified and pending review; admin edits and legacy records are protected.
- **Observability**: Admin dashboard and API endpoints provide real-time status and manual trigger capabilities.
- **Verification**: 217 backend tests passing; 0 TypeScript errors; 51 legacy records intact.

In accordance with the project instructions:
> *"Implement Phase 4 only. Do not add more source connectors or change the frontend unnecessarily. Generate the report and stop for review."*

Phase 4 is ready for final review.
