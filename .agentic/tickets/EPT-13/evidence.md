# Evidence — EPT-13

_Generated 2026-09-09T19:49:29Z by collect-evidence.sh from runner output._
_Raw logs: `.agentic/tickets/EPT-13/logs/` · RED baseline: `red.log`_

## Verification

| Layer | Result |
|---|---|
| Build | PASS |
| Lint | PASS |
| Type check | SKIPPED (no command configured) |
| Unit tests | PASS |
| Integration | PASS |
| Migration up | PASS |
| Migration down | PASS |

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
 .agentic/tickets/EPT-13/diff.patch                 | 3327 ++++++++++++++++++++
 .agentic/tickets/EPT-13/evidence.md                |  136 +
 .agentic/tickets/EPT-13/frozen.lock                |   12 +
 .agentic/tickets/EPT-13/plan.md                    |  255 ++
 .agentic/tickets/EPT-13/red.log                    |  922 ++++++
 .agentic/tickets/EPT-13/state.json                 |   33 +
 .agentic/tickets/EPT-13/test-plan.md               |  162 +
 .claude/current-scope.yaml                         |   95 +
 backend/conftest.py                                |  226 ++
 backend/main.py                                    |    4 +-
 backend/models.py                                  |   42 +-
 backend/pytest.ini                                 |    8 +
 backend/requirements.txt                           |    4 +
 backend/routers/admin.py                           |  108 +-
 backend/routers/endorsements.py                    |  109 +
 backend/schemas.py                                 |   25 +
 backend/tests/test_endorsement_approve.py          |   82 +
 backend/tests/test_endorsement_authz.py            |   68 +
 backend/tests/test_endorsement_history.py          |   53 +
 backend/tests/test_endorsement_policy_state.py     |   37 +
 backend/tests/test_endorsement_reject.py           |   39 +
 backend/tests/test_endorsement_submit.py           |   84 +
 backend/tests/test_endorsement_validation.py       |   82 +
 backend/tests/test_migration.py                    |   49 +
 backend/vehicle_validation.py                      |   71 +
 database/endorsements_schema.sql                   |   13 +
 database/init.sql                                  |   26 +
 database/migrations/EPT-13_down.sql                |    3 +
 database/migrations/EPT-13_up.sql                  |   25 +
 database/vehicles_schema.sql                       |   12 +
 frontend/src/App.js                                |    4 +
 frontend/src/components/EndorsementHistory.css     |   74 +
 frontend/src/components/EndorsementHistory.js      |   80 +
 frontend/src/components/EndorsementHistory.test.js |   45 +
 frontend/src/components/Sidebar.js                 |    8 +-
 frontend/src/components/VehicleEndorsementModal.js |   85 +
 .../src/components/VehicleEndorsementModal.test.js |   31 +
 frontend/src/pages/AdminEndorsements.css           |   38 +
 frontend/src/pages/AdminEndorsements.js            |  149 +
 frontend/src/pages/AdminEndorsements.test.js       |   56 +
 frontend/src/pages/Policies.endorsement.test.js    |   46 +
 frontend/src/pages/Policies.js                     |  103 +
 frontend/src/utils/validation.js                   |   31 +
 43 files changed, 6856 insertions(+), 6 deletions(-)
```

## Risk inputs

- Risk tier: HIGH
- Files changed: 9
- Migration touched: yes
- Public interface changed: reviewer to confirm from diff.patch

_No overall risk rating is asserted here. These are the inputs; the
pr-reviewer agent and the human draw the conclusion._

---

## Verification notes (appended after generation — not auto-transcribed)

### RED -> GREEN
Same frozen tests, re-run from `red.log`:
- Backend `pytest -q` against a scratch PostgreSQL (`TEST_DATABASE_URL` set): **23 passed**
  (was 23 failing in RED). TC-080's live-apply branch now runs (it skipped in the
  earlier no-Docker run).
- Frontend targeted suites: **4 passed / 4** (TC-015, TC-062, TC-070, TC-071 — all
  failing in RED with "Cannot find module" / findByRole timeout).
- Raw: `logs/unit-tests.log`, `logs/integration.log`. The coverage-table "see logs"
  column is the collect-evidence grep being conservative; every listed TC passes.

### Migration up / down — LIVE (this run)
Applied against a scratch PostgreSQL 16 (docker compose `db`, fresh DB from
`database/init.sql`):
- up: `database/vehicles_schema.sql` + `database/endorsements_schema.sql` — both
  `CREATE TABLE`, `SELECT 1 FROM vehicles/policy_endorsements LIMIT 0` succeed
  (tables exist, columns/FKs match the models — verified via `\d`).
- down: `database/migrations/EPT-13_down.sql` — both `DROP TABLE`, then
  `\dt` reports "Did not find any relation" for both. Clean, idempotent, reversible.
Raw: `logs/migration-up.log`, `logs/migration-down.log`.

### Full frontend suite
`CI=true npx react-scripts test --watchAll=false`: `Test Suites: 1 failed, 4 passed`.
The one failure is `src/App.test.js` "renders learn react link" — the stock CRA
placeholder, failing with `useToast must be used within a ToastProvider`.
Pre-existing on `main` / the RED baseline (confirmed via `git stash`), not in
EPT-13 scope, not modified, not a regression.

### Lint
pylint, repo convention non-blocking (`|| true`, mirrors `.github/workflows/pylint.yml`).
The only `E`-level findings are pre-existing `E0401 import-error` on
`celery_worker.py` and `drive_service.py` (celery / google libs intentionally not
in `requirements.txt`). The EPT-13 files produce only style findings
(missing docstrings, import order, one `consider-using-f-string`,
`too-many-branches 15/12` in `vehicle_validation.py`). No new errors.

### UI — end-to-end walkthrough via Playwright (real stack)
Backend (`uvicorn` on :8000, `DATABASE_URL` -> docker `insurance_db`) + the React
dev server on :3000. Exercised the full feature flow in a real browser:
1. Customer signs up / logs in, buys the "Private Car Comprehensive" (auto) policy.
2. Only the auto policy card shows **"Update vehicle details"** + **"Vehicle history"**
   (non-auto cards do not).
3. Modal: submitting empty shows an inline `role="alert"` error on every one of the
   5 fields and does not submit (AC-002).
4. Valid submit (Honda / Civic / 2022 / VIN / reg) -> success toast
   "Vehicle update request submitted for review"; "Vehicle history" shows the entry
   as **Pending**, "Requested 9/9/2026", old -> new diff (— -> Honda, etc.) (AC-001, AC-004).
5. DB check: one `policy_endorsements` row, status Pending, live `vehicles` row NOT
   created yet (AC-004).
6. Log out, log in as admin (`admin@example.com`). Sidebar now shows a distinct
   **"Endorsements"** entry (separate from "Admin Dashboard").
7. Admin "Policy Endorsement Requests" screen lists the pending row with policy
   number + customer email + the field diff. Click **Approve** -> toast
   "Endorsement approved", row leaves the queue, "0 pending" (AC-005).
8. DB check: endorsement status Approved, `decided_by` = admin id, `decision_date`
   set; `vehicles` row now created as Honda/Civic/2022/VIN/reg; `userpolicies.status`
   still `active` (AC-005, and AC-008 — policy status untouched).
9. Back as the customer, "Vehicle history" now shows the entry as **Approved**,
   "Requested 9/9/2026 · Decided 9/9/2026" (AC-006).
0 browser console errors across the whole flow.
Reject path and cross-customer 403 / non-admin 403 are covered by pytest
(TC-050, TC-020..023, TC-042), not repeated by hand here.
