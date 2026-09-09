# Evidence — EPT-13

_Generated 2026-09-09T18:47:13Z by collect-evidence.sh from runner output._
_Raw logs: `.agentic/tickets/EPT-13/logs/` · RED baseline: `red.log`_

## Verification

| Layer | Result |
|---|---|
| Build | PASS |
| Lint | PASS |
| Type check | SKIPPED (no command configured) |
| Unit tests | PASS |
| Integration | PASS |
| Migration up | SKIPPED (no command configured) |
| Migration down | SKIPPED (no command configured) |

## Requirement coverage

| AC | TC | In test suite | Result |
|---|---|---|---|
| AC-001 | TC-001 | yes | see logs |
| AC-001 | TC-002 | yes | see logs |
| AC-004 | TC-003 | yes | see logs |
| AC-010 | TC-004 | yes | see logs |
| AC-002 | TC-010 | yes | see logs |
| AC-002 | TC-011 | yes | see logs |
| AC-002 | TC-012 | yes | see logs |
| AC-002 | TC-013 | yes | see logs |
| AC-002 | TC-014 | yes | see logs |
| AC-002 | TC-015 | yes | see logs |
| AC-003 | TC-020 | yes | see logs |
| AC-003 | TC-021 | yes | see logs |
| AC-009 | TC-022 | yes | see logs |
| AC-009 | TC-023 | yes | see logs |
| AC-008 | TC-030 | yes | see logs |
| AC-008 | TC-031 | yes | see logs |
| AC-005 | TC-040 | yes | see logs |
| AC-005 | TC-041 | yes | see logs |
| AC-009 | TC-042 | yes | see logs |
| AC-007 | TC-050 | yes | see logs |
| AC-006 | TC-060 | yes | see logs |
| AC-006 | TC-061 | yes | see logs |
| AC-006 | TC-062 | yes | see logs |
| AC-001 | TC-070 | yes | see logs |
| AC-005 | TC-071 | yes | see logs |
| AC-004 | TC-080 | yes | see logs |

## Changes

```
 .agentic/tickets/EPT-13/frozen.lock                |  12 +
 .agentic/tickets/EPT-13/red.log                    | 922 +++++++++++++++++++++
 .agentic/tickets/EPT-13/state.json                 |  33 +
 .claude/current-scope.yaml                         |  95 +++
 backend/conftest.py                                | 226 +++++
 backend/main.py                                    |   4 +-
 backend/models.py                                  |  42 +-
 backend/pytest.ini                                 |   8 +
 backend/requirements.txt                           |   4 +
 backend/routers/admin.py                           | 108 ++-
 backend/routers/endorsements.py                    | 109 +++
 backend/schemas.py                                 |  25 +
 backend/tests/test_endorsement_approve.py          |  82 ++
 backend/tests/test_endorsement_authz.py            |  68 ++
 backend/tests/test_endorsement_history.py          |  53 ++
 backend/tests/test_endorsement_policy_state.py     |  37 +
 backend/tests/test_endorsement_reject.py           |  39 +
 backend/tests/test_endorsement_submit.py           |  84 ++
 backend/tests/test_endorsement_validation.py       |  82 ++
 backend/tests/test_migration.py                    |  49 ++
 backend/vehicle_validation.py                      |  71 ++
 database/endorsements_schema.sql                   |  13 +
 database/init.sql                                  |  26 +
 database/migrations/EPT-13_down.sql                |   3 +
 database/migrations/EPT-13_up.sql                  |  25 +
 database/vehicles_schema.sql                       |  12 +
 frontend/src/App.js                                |   4 +
 frontend/src/components/EndorsementHistory.css     |  74 ++
 frontend/src/components/EndorsementHistory.js      |  80 ++
 frontend/src/components/EndorsementHistory.test.js |  45 +
 frontend/src/components/Sidebar.js                 |   8 +-
 frontend/src/components/VehicleEndorsementModal.js |  85 ++
 .../src/components/VehicleEndorsementModal.test.js |  31 +
 frontend/src/pages/AdminEndorsements.css           |  38 +
 frontend/src/pages/AdminEndorsements.js            | 149 ++++
 frontend/src/pages/AdminEndorsements.test.js       |  56 ++
 frontend/src/pages/Policies.endorsement.test.js    |  46 +
 frontend/src/pages/Policies.js                     | 103 +++
 frontend/src/utils/validation.js                   |  31 +
 39 files changed, 2976 insertions(+), 6 deletions(-)
```

## Risk inputs

- Risk tier: HIGH
- Files changed: 7
- Migration touched: no
- Public interface changed: reviewer to confirm from diff.patch

_No overall risk rating is asserted here. These are the inputs; the
pr-reviewer agent and the human draw the conclusion._

---

## Tester notes (Phase 5, appended after generation, not auto-transcribed)

### RED to GREEN
The test functions captured failing in red.log were re-run from the same frozen files.
- Backend (pytest -q): 22 passed, 1 skipped. The 22 endorsement TCs that failed in RED now pass; TC-080 is the 1 skip (see migration below).
- Frontend targeted suites (react-scripts test testPathPattern): 4 passed, 4 total. TC-015, TC-062, TC-070, TC-071, all failing in RED (Cannot find module / findByRole timeout), now pass.
Raw runner output: logs/unit-tests.log, logs/integration.log. The coverage table "see logs" Result column is the script grep being conservative; actual outcome is every listed TC passing except TC-080 skipped.

### Full frontend suite
CI=true npx react-scripts test watchAll=false gives Test Suites: 1 failed, 4 passed, 5 total / Tests: 1 failed, 4 passed. The one failure is src/App.test.js "renders learn react link", the stock CRA placeholder test, failing with "useToast must be used within a ToastProvider". Pre-existing on main / the RED baseline (App.js already consumed ToastContext before this ticket; the placeholder never wrapped a provider). Not in EPT-13 scope, not modified here, not a regression.

### What the frozen RTL tests exercise (component level, jsdom, not a browser)
- TC-015 VehicleEndorsementModal.test.js: renders the modal, submits with a blank make plus out-of-range year, asserts onSubmit is NOT called and inline errors render for both fields.
- TC-062 EndorsementHistory.test.js: renders the history list from a mock array, asserts one row per endorsement with old/new changed fields, request date, and a Pending/Approved/Rejected badge.
- TC-070 Policies.endorsement.test.js: on an owned auto-policy card, finds the "Update vehicle details" action, opens the modal, and on submit asserts POST /userpolicies/:id/endorsements is called and a success toast shows.
- TC-071 AdminEndorsements.test.js: renders the standalone admin page, lists pending rows from GET /admin/endorsements?status=pending, asserts Approve / Reject call their endpoints and the row leaves the pending list.

### ui_tests layer (scope: required) NOT RUN
No running application stack and Playwright MCP unavailable in this environment. Docker daemon is down (docker compose up -d db fails: dockerDesktopLinuxEngine cannot find the file specified), so Postgres plus FastAPI plus React could not be stood up for an end-to-end browser test. The four frozen RTL tests above cover the same UI surfaces at component/page level and pass.

### migration_up / migration_down layers (scope: required) NOT RUN as live apply
No local PostgreSQL, no psql on host, Docker daemon down, so no scratch DB. collect-evidence.sh reports both SKIPPED for the same reason. TC-080 ran its static branch (files exist, expected DDL present) then skipped the live-apply branch (no PostgreSQL TEST_DATABASE_URL).

Static review of the delivered SQL (by the tester):
- database/vehicles_schema.sql and database/migrations/EPT-13_up.sql: well-formed Postgres. "create table if not exists vehicles" with user_policy_id UNIQUE NOT NULL FK to userpolicies(id) ON DELETE CASCADE; policy_endorsements with FKs to userpolicies(id) and users(id), status default 'Pending', nullable decision_date / decided_by. Columns match plan.md and the SQLAlchemy models.
- database/migrations/EPT-13_down.sql: drops policy_endorsements then vehicles (child before parent), idempotent (if exists), reversible.
- endorsements_schema.sql matches the up migration policy_endorsements block.
A human must apply these against a real PostgreSQL with release (schema ships as reviewed .sql, no migration tool, per plan.md and forbidden_operations: migration).

### Lint
pylint, repo convention non-blocking (|| true, mirrors .github/workflows/pylint.yml). Aggregate score on changed backend modules 6.02/10; the two brand-new modules vehicle_validation.py and routers/endorsements.py score 9.21/10 with only style findings (missing docstrings, import order, one consider-using-f-string). The E1102 not-callable hits on routers/admin.py (func.now(), func.count()) are the known pylint/SQLAlchemy false positive and also fire on pre-existing admin.py code. No functional lint errors introduced.
