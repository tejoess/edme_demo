# Plan - EPT-13: Policy Endorsement - Customer-Requested Vehicle Updates

Risk tier: HIGH (schema changes + authorization-sensitive approval workflow).
Phase: WAITING_FOR_APPROVAL. This plan plus .claude/current-scope.yaml and
test-plan.md are what Gate 1 approves. No branch yet - /implement creates it.

## Initial interpretation (as handed to the developer)

Requires a policy endorsement workflow for customer-requested vehicle detail changes
on active policies: customer submits edited vehicle fields, system validates and
creates an endorsement record (old values, new values, request date, status Pending)
without touching the live policy, admin approves or rejects, on approval the new
vehicle details become the policy active vehicle details, on rejection nothing
changes, customer can view a timeline of all endorsements. Complication: the
codebase currently has NO vehicle concept (policies has policy_type enum incl. auto
and a coverage JSONB, nothing stores make/model/year/VIN/registration), no endorsement
table, no backend test infrastructure (no pytest/conftest/tests dir; schema is raw SQL
in database/init.sql; no migration tool), and no user role model (admin = single
ADMIN_EMAIL env check in backend/routers/admin.py).

## Clarifications (asked and answered)

- Q1 Vehicle storage -> "New vehicles table, per user-policy": new vehicles table,
  one row per userpolicies row (auto policies). This ticket creates it. Existing auto
  policies get a vehicle record - created on first update if absent. Endorsement
  approval updates this row.
- Q2 Endorsement shape -> "One endorsement per request (JSON diff)": each submit =
  one endorsement row capturing changed fields as old_values / new_values JSON,
  plus request date, status, decision date.
- Q3 Stack scope -> "Full stack (backend + React UI)": endorsement model +
  submit/approve/reject/history endpoints + validation + authz + tests, PLUS the React
  UI (customer update action + form, endorsement history view, admin approval queue).
- Q4 Test harness -> "Stand up pytest harness in this ticket": add pytest + httpx +
  a test-DB conftest fixture as part of EPT-13, then write the endorsement tests
  against it.

Post-investigation forks (raised by the planner, answered by the developer):

- OQ-1 Customer UI -> Option B: no new page. Add an "Update vehicle details" modal
  (FileClaimModal-style) plus a "Vehicle history" expander on owned auto-policy cards
  in Policies.js.
- OQ-2 Test DB -> SQLite + .with_variant(JSON(), "sqlite") shims on the two existing
  JSONB columns (User.risk_profile, Policy.coverage); plain JSON for the new
  endorsement columns.
- OQ-3 Admin queue -> CHANGED from the planner default: a SEPARATE admin endorsements
  screen (its own page frontend/src/pages/AdminEndorsements.js + its own sidebar entry,
  gated by admin_only). AdminDashboard.js is NOT touched and stays claims-focused.

## Summary

Adds two tables (vehicles, policy_endorsements), a customer-facing endorsement
submit/history API, an admin approve/reject API, concrete vehicle validation, and the
React UI for all three. The live vehicle record is only mutated on admin approval;
Pending and Rejected endorsements never change it. Because the repo has no vehicle
concept, no endorsement table, no test harness, and no real role model, a meaningful
share of the work is scaffolding: the pytest harness (Q4), the vehicles baseline for
existing auto policies, and schema delivery without a migration tool. Risk is HIGH -
schema plus ownership/admin authorization on a state machine that mutates
policy-bound data. The three planner-raised forks (customer UI location, test DB
engine, admin queue placement) have all been answered by the developer and folded
into Clarifications; no open questions remain.

## Detailed plan

### Data model / schema

New vehicles table:
| column | type | notes |
|---|---|---|
| id | serial PK | |
| user_policy_id | int, UNIQUE, NOT NULL | FK userpolicies(id) ON DELETE CASCADE |
| make | varchar(50) NOT NULL | |
| model | varchar(50) NOT NULL | |
| year | int NOT NULL | |
| vin | varchar(17) NOT NULL | |
| registration | varchar(20) NOT NULL | |
| created_at / updated_at | timestamp default now | |

New policy_endorsements table:
| column | type | notes |
|---|---|---|
| id | serial PK | |
| user_policy_id | int NOT NULL | FK userpolicies(id) ON DELETE CASCADE |
| requested_by | int NOT NULL | FK users(id) |
| old_values | jsonb NOT NULL | snapshot of vehicle at request time (null-field shape if no vehicle yet) |
| new_values | jsonb NOT NULL | requested full vehicle state |
| status | varchar(20) NOT NULL default 'Pending' | Pending / Approved / Rejected |
| request_date | timestamp default now | |
| decision_date | timestamp NULL | set on approve/reject |
| decided_by | int NULL | FK users(id) |
| created_at | timestamp default now | |

Delivery (no migration tool in repo):
- Append both CREATE TABLE statements to database/init.sql (fresh docker installs).
- Add standalone database/vehicles_schema.sql and database/endorsements_schema.sql
  (idempotent CREATE TABLE IF NOT EXISTS) for existing databases, consistent with the
  existing per-table *_schema.sql convention.
- Add database/migrations/EPT-13_up.sql (same DDL) and database/migrations/EPT-13_down.sql
  (DROP TABLE IF EXISTS policy_endorsements; DROP TABLE IF EXISTS vehicles;).
- A human runs them; forbidden_operations keeps "migration" (we are not introducing Alembic).
- Add SQLAlchemy models Vehicle and PolicyEndorsement to backend/models.py.

### Backend

New router backend/routers/endorsements.py (prefix /userpolicies, mounted in
backend/main.py), mirroring the ownership-check pattern in claims.py:

- POST /userpolicies/{user_policy_id}/endorsements - get_current_user; 403 if the
  userpolicies row is not owned by the caller; 400 if status != active; validates
  the payload; computes diff vs current vehicles row (or null baseline); 400 if
  nothing changed; inserts policy_endorsements row status Pending. Returns 201.
- GET /userpolicies/{user_policy_id}/endorsements - owner-only; timeline newest-first.

backend/routers/admin.py (existing admin_only dependency = ADMIN_EMAIL check):
- GET /admin/endorsements?status=pending - list with policy + requester context.
- POST /admin/endorsements/{id}/approve - 409/400 if not Pending; upserts the vehicles
  row from new_values; sets status Approved, decision_date=now(), decided_by=admin.id.
  Does NOT change userpolicies.status.
- POST /admin/endorsements/{id}/reject - 409/400 if not Pending; sets status Rejected,
  decision_date, decided_by; vehicle untouched.

Validation (backend/vehicle_validation.py, called by the router; mirrored in
frontend/src/utils/validation.js). Proposed rules - stated as assumptions, developer
may veto:
- make, model: required, trimmed non-empty, <= 50 chars.
- year: required int, 1900 <= year <= currentYear + 1.
- vin: required, exactly 17 chars, [A-HJ-NPR-Z0-9] (alphanumeric excluding I/O/Q),
  upper-cased before store.
- registration: required, trimmed non-empty, <= 20 chars, [A-Z0-9 -] case-insensitive.
- Payload carries the full vehicle state; a payload equal to current values is rejected.
- Pydantic schemas in backend/schemas.py: VehicleFields, EndorsementResponse.

Explicit business rules (year range, VIN format, no-op, wrong policy status) raise
HTTPException(400) with a readable detail, consistent with apiClient.js error handling.

"Preserves original vehicle details": old_values is snapshotted at request time and
never rewritten; the live vehicles row changes only in the approve path.

Trade-off (multiple pending endorsements): approve applies that endorsement new_values
wholesale onto the current vehicles row, and old_values reflects the vehicle state at
request time, not at approval time. Approving endorsement A then B means B overwrites A
and B recorded old_values may look stale. Matches the PM "multiple pending allowed"
default; documented, not solved, in this ticket.

### Test harness (Q4)

- Add pytest, httpx to backend/requirements.txt; add backend/pytest.ini.
- backend/conftest.py: test engine + Base.metadata.create_all, get_db override, the
  fixtures listed in test-plan.md, ADMIN_EMAIL set via monkeypatch.
- Engine choice is Open question 2 - depends on the JSONB decision.
- Tests under backend/tests/ split unit/ (validation), api/ (endpoint behaviour via
  httpx), integration/ (submit -> approve/reject -> history end to end).

### Frontend

Resolved per OQ-1 (Option B, no new customer route) and OQ-3 (separate admin screen).
- Policies.js: for an owned auto policy, add an "Update vehicle details" button (owned
  cards already carry _userPolicyId logic like openClaimModal) opening a new
  VehicleEndorsementModal (built on FormField, mirroring FileClaimModal), plus a
  "Vehicle history" toggle rendering EndorsementHistory.
- frontend/src/pages/AdminEndorsements.js (+ .css): a NEW standalone admin screen
  (not part of AdminDashboard.js). Lists pending endorsements from
  GET /admin/endorsements?status=pending with Approve / Reject actions, reusing the
  useConfirm + toast + skeleton/empty-state patterns from AdminDashboard.js.
- frontend/src/components/Sidebar.js: add an admin-only sidebar entry
  ("Endorsements", key "admin-endorsements") alongside the existing "Admin Dashboard"
  entry (the isAdmin branch of LINKS).
- frontend/src/App.js: register the new page in the renderPage() switch and activeKey
  handling (prop-based navigation, mirroring the "admin" case).
- AdminDashboard.js is intentionally NOT modified.
- frontend/src/utils/validation.js: add vehicleChecks(payload) mirroring backend rules.
- Frontend tests as *.test.js next to components (Jest + RTL, already available).

### Ordered steps

1. Backend: models + schemas + validation module (no behaviour yet).
2. Schema SQL files + init.sql append + migrations up/down.
3. Test harness: requirements, pytest.ini, conftest, fixtures.
4. RED: write test-plan.md cases as failing tests, capture red.log, freeze.
5. Backend: endorsements.py router (submit + history), wire into main.py.
6. Backend: admin approve/reject/list endpoints in admin.py.
7. Frontend: VehicleEndorsementModal, EndorsementHistory, Policies.js wiring.
8. Frontend: new AdminEndorsements.js page + Sidebar.js entry + App.js wiring.
9. Frontend validation helper + frontend tests.
10. Full verification pass (pytest, react-scripts test, npm build, pylint, migration up/down).

### Backend / frontend / tests split

- Backend: models.py, schemas.py, main.py, routers/endorsements.py, routers/admin.py,
  vehicle_validation.py, SQL files.
- Frontend: Policies.js, App.js, Sidebar.js, AdminEndorsements.js (+ css),
  VehicleEndorsementModal.js, EndorsementHistory.js (+ css), utils/validation.js.
  (AdminDashboard.js is NOT touched.)
- Tests: backend/conftest.py, backend/pytest.ini, backend/tests/**, frontend *.test.js.

### CLAUDE.md

The "How to run things" block is still TODO placeholders, so collect-evidence.sh will
report layers SKIPPED. Proposed real commands (a human should fill these in):
- Build: npm --prefix frontend run build
- Lint: pylint $(git ls-files 'backend/*.py')
- Type check: none configured
- Unit tests: cd backend && python -m pytest tests/unit -q
- Integration tests: cd backend && python -m pytest tests/api tests/integration -q
- Frontend tests: CI=true npm --prefix frontend test
- Migration up: psql "$DATABASE_URL" -f database/migrations/EPT-13_up.sql
- Migration down: psql "$DATABASE_URL" -f database/migrations/EPT-13_down.sql

## Assumptions

- A-1: Vehicle validation rules as listed above (year 1900..cur+1, 17-char VIN excluding
  I/O/Q, non-empty make/model/registration). Decidable implementation detail; developer
  may veto specific bounds.
- A-2: The endorsement submit payload carries the full desired vehicle state; the server
  computes the diff. A payload identical to current values is rejected.
- A-3: decided_by / requested_by are users.id FKs. The admin has a real users row (the
  account whose email == ADMIN_EMAIL).
- A-4: No AdminLogs row is written for endorsement decisions. AdminLogs exists in
  models.py but is NOT written by any current code path (confirmed by grep); traceability
  is satisfied by policy_endorsements.decided_by + decision_date + the history endpoint.
  Adding AdminLogs wiring is out of scope.
- A-5: Only policy_type == auto userpolicies get vehicles / endorsements; the UI only
  shows the action for auto policies. Non-auto submit -> 400.
- A-6: The vehicles row is created lazily - on first approval if absent, not at submit time.
- A-7: Status strings are Pending / Approved / Rejected (matches the ticket text).
  Frontend badge styling reuses existing badge-* classes.
- A-8: Endorsement history is per userpolicies id and owner-scoped; there is no
  cross-policy "all my endorsements" view in this ticket.

## Open questions

All three planner-raised forks have been answered by the developer (recorded in
Clarifications above); none remain open.

- OQ-1 (customer UI location) -> RESOLVED: Option B, modal + history expander on owned
  auto-policy cards in Policies.js, no new page.
- OQ-2 (test DB engine) -> RESOLVED: SQLite + .with_variant(JSON(), "sqlite") on the two
  existing JSONB columns, plain JSON for new columns.
- OQ-3 (admin queue placement) -> RESOLVED: a separate standalone AdminEndorsements
  screen with its own sidebar entry; AdminDashboard.js untouched.

## Out of scope (from ticket, confirmed)

- Premium recalculation / pricing; payment / billing.
- External provider / DMV integration.
- Updating non-vehicle policy fields (coverage, deductibles, address).
- Automated approval / underwriting logic.
- Notifications (email / SMS).
- Introducing a migration tool (Alembic) or a real user-role model.
- AdminLogs wiring (see A-4).
- A cross-policy "all my endorsements" view.

## Reproduction artifact

N/A - feature ticket, not a bug. reproduce-bug skipped per task instruction.
