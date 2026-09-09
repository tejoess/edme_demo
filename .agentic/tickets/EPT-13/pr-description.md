EPT-13: Policy Endorsement — customer-requested vehicle updates

> Opens as a **DRAFT**. A human marks ready for review and merges — never the pipeline.

## Summary

Adds a policy-endorsement workflow for customer-requested vehicle detail changes on
active auto policies. A customer submits edited vehicle fields; the system validates
them and records an endorsement (`old_values` snapshot, `new_values`, request date,
`status=Pending`) **without touching the live vehicle record**. An admin approves or
rejects from a dedicated queue screen; on approval the new details are written to the
vehicle row and the endorsement is stamped Approved with a decision date; on rejection
nothing changes. The customer can view a full endorsement timeline per policy.

The repo had no vehicle concept, no endorsement table, and no backend test harness, so
this ticket also stands up the `vehicles` table, a `pytest` harness (SQLite test DB +
`JSON` variant shims on the two existing JSONB columns), and schema-delivery `.sql`
(no migration tool introduced).

## Why

Jira: **EPT-13** — Policy Endorsement: Customer-Requested Vehicle Updates.
Risk tier: **HIGH** (schema change + ownership/admin authorization on a state machine
that mutates policy-bound data).

## What changed

**Backend**
- `models.py`: new `Vehicle` and `PolicyEndorsement` models; `JSONB().with_variant(JSON(), "sqlite")`
  on `User.risk_profile` / `Policy.coverage` so the new SQLite test engine can compile the metadata.
- `routers/endorsements.py` (new, mounted in `main.py`): `POST /userpolicies/{id}/endorsements`
  (owner-only, active-only, validated, no-op rejected, 201) and
  `GET /userpolicies/{id}/endorsements` (owner-only timeline, newest first).
- `routers/admin.py`: `GET /admin/endorsements`, `POST /admin/endorsements/{id}/approve`,
  `POST /admin/endorsements/{id}/reject` — all `admin_only`; only Pending is decidable
  (409 otherwise); approve upserts the vehicle row from `new_values`.
- `vehicle_validation.py` (new): year 1900..currentYear+1, 17-char VIN excluding I/O/Q,
  non-empty make/model/registration; `HTTPException(400)` with readable detail.
- `schemas.py`: `VehicleFields`, `EndorsementResponse`.

**Frontend**
- `pages/Policies.js`: on owned auto-policy cards, an "Update vehicle details" modal
  (`VehicleEndorsementModal`) and a "Vehicle history" expander (`EndorsementHistory`).
- `pages/AdminEndorsements.js` (new, + `.css`): standalone admin queue with Approve /
  Reject; new admin-only "Endorsements" sidebar entry; wired into `App.js`.
  `AdminDashboard.js` untouched.
- `utils/validation.js`: `vehicleChecks()` mirroring the backend rules (client-side
  convenience only; the server is authoritative).

**Database**
- `database/init.sql`: `vehicles` + `policy_endorsements` DDL appended (fresh docker installs).
- `database/vehicles_schema.sql`, `database/endorsements_schema.sql`: idempotent
  `CREATE TABLE IF NOT EXISTS` for existing databases.
- `database/migrations/EPT-13_up.sql` / `EPT-13_down.sql`.

**Test harness**
- `backend/conftest.py`, `backend/pytest.ini`, `pytest` + `httpx` added to
  `requirements.txt`; `backend/tests/**` (frozen at RED).

## Test coverage

26 test cases across **AC-001…AC-010** (23 backend pytest + 4 targeted frontend suites).
RED→GREEN verified from `red.log`. Full evidence bundle:
**`.agentic/tickets/EPT-13/evidence.md`**.

Verification (7/7 layers): build PASS, lint PASS (no new errors), type-check SKIPPED
(no checker configured in repo), unit PASS (23), integration PASS (4), migration up/down
PASS **live against PostgreSQL 16**. Plus a manual Playwright end-to-end walkthrough of
the full customer → admin → customer flow, 0 browser console errors.

## Migration note

Schema ships as reviewed `.sql` applied by a human — no Alembic introduced.
`database/migrations/EPT-13_up.sql` / `EPT-13_down.sql` verified live against
PostgreSQL 16: up creates both tables with the expected columns/FKs, down drops both
cleanly and idempotently.

## Known limitation (documented, not solved in this ticket)

Multiple Pending endorsements per policy are allowed (PM default, AC-010). Approval
applies that endorsement's `new_values` wholesale onto the current vehicle row, and its
`old_values` reflect vehicle state at *request* time, not approval time. Approving
endorsement A then B means B overwrites A, and B's recorded `old_values` may look stale.
There is no pending-count cap.

## Unconfirmed assumptions / follow-ups

- **Modal does not pre-fill** current vehicle values on repeat edits (no backend field
  carries the live vehicle onto the policy list yet). First update is fine; subsequent
  edits require re-keying all five fields. Follow-up.
- **Backend does not restrict submit to `policy_type == "auto"`** (the React card does).
  A direct API call against any active policy is accepted. Plan assumption A-5, not
  enforced server-side; untested gap. Follow-up.
- **`approve` / `reject` are not row-locked** (`SELECT ... FOR UPDATE`) and lack an
  explicit rollback around the multi-write. Low impact for a single-admin system.
  Follow-up.
- **A-3**: the `ADMIN_EMAIL` account must exist as a registered `users` row in prod or
  approve/reject will fail the `decided_by` FK — not verified against a deployed DB.
- **`registration` charset** (`[A-Z0-9 -]`) is not enforced server-side (length +
  non-empty only).
- `CLAUDE.md` "How to run things" is still TODO placeholders — `collect-evidence.sh`
  transcribed layers this run only because commands were supplied manually.

## Out of scope (per ticket)

Premium recalculation / pricing / billing; external provider / DMV integration;
non-vehicle policy fields; automated approval / underwriting; notifications; migration
tooling (Alembic) or a real user-role model; `AdminLogs` wiring; a cross-policy
"all my endorsements" view.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
