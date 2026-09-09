# Test Plan - EPT-13 Policy Endorsement: Customer-Requested Vehicle Updates

Every AC in `.claude/current-scope.yaml` has at least one TC. Backend cases run under
the new pytest harness (Q4) with `pytest.mark.tc("TC-nnn")` and the AC id in the
docstring. Frontend cases run under `react-scripts test` (Jest + RTL) with the id in
the `it(...)` / `describe(...)` title: `it("TC-nnn / AC-nnn - ...")`.

## Fixtures (conftest)
- `client` - httpx client bound to the FastAPI app with an overridden `get_db`.
- `db` - session against the test database (SQLite file, tables via `Base.metadata.create_all`).
- `customer_a`, `customer_b` - two users with valid bearer tokens.
- `admin` - user whose email equals `ADMIN_EMAIL` (env set by the fixture), with token.
- `active_policy_a` - `userpolicies` row owned by `customer_a`, status `active`, auto policy_type, no `vehicles` row yet.
- `expired_policy_a` - like above but status `expired`, with an existing `vehicles` row.
- `valid_vehicle_payload` / `invalid_vehicle_payload` helpers.

---

## Backend - customer submit

### TC-001 / AC-001 - Customer submits an update for their own active policy
POST `/userpolicies/{active_policy_a.id}/endorsements` as `customer_a` with a valid,
changed vehicle payload -> 201; response body has `status == "Pending"`, an `id`,
`request_date`, `old_values`, `new_values`. One `policy_endorsements` row now exists
for that policy.

### TC-002 / AC-001 / AC-004 - First-ever update creates the vehicle baseline snapshot
Given `active_policy_a` has no `vehicles` row, submit a valid endorsement -> 201.
`old_values` in the stored endorsement is the empty/null baseline (documented shape,
e.g. all-null fields) and a `vehicles` row is NOT created yet (created only on approval).

### TC-003 / AC-004 - Pending endorsement does not touch live vehicle details
Seed a `vehicles` row (make="Toyota"). Submit an endorsement changing make to "Honda"
-> 201. GET the vehicle state (via history endpoint current-values or DB) still shows
make == "Toyota". Endorsement `new_values.make == "Honda"`, `old_values.make == "Toyota"`.

### TC-004 / AC-010 - Multiple pending endorsements allowed
Submit two valid endorsements back-to-back for `active_policy_a` -> both 201, two
`Pending` rows exist, no 409/400 on the second.

---

## Backend - validation (AC-002)

### TC-010 / AC-002 - Missing required field rejected, no endorsement created
POST with `make` omitted -> 422 (or 400) with a message naming the field. Row count
in `policy_endorsements` for the policy is unchanged (still 0).

### TC-011 / AC-002 - Year out of range rejected
`year = 1800` and separately `year = <current year + 2>` -> 400 with a clear
"year must be between 1900 and <cur+1>" message; no row created.

### TC-012 / AC-002 - Invalid VIN rejected
`vin = "SHORT"` (not 17 chars) and `vin` containing `I/O/Q` -> 400 with a VIN-format
message; no row created.

### TC-013 / AC-002 - Empty registration rejected
`registration = ""` / whitespace -> 400; no row created.

### TC-014 / AC-002 - No-op update rejected
Payload identical to the current vehicle values -> 400 "no changes to apply"; no row created.

### TC-015 / AC-002 (frontend) - Modal blocks submit and shows inline errors
Render `VehicleEndorsementModal`, submit with blank make + bad year -> `onSubmit` not
called, inline error text rendered for both fields.

---

## Backend - authorization

### TC-020 / AC-003 - Cannot submit against another customer's policy
POST `/userpolicies/{active_policy_a.id}/endorsements` as `customer_b` -> 403; no row created.

### TC-021 / AC-003 - Unauthenticated submit blocked
POST with no bearer token -> 401.

### TC-022 / AC-009 - Non-admin cannot approve or reject
POST `/admin/endorsements/{id}/approve` and `/reject` as `customer_a` -> 403; endorsement
stays `Pending`.

### TC-023 / AC-009 - Customer cannot list the admin endorsement queue
GET `/admin/endorsements?status=pending` as `customer_a` -> 403.

---

## Backend - policy state (AC-008)

### TC-030 / AC-008 - Expired policy cannot be endorsed
POST endorsement for `expired_policy_a` as its owner -> 400/409 "only active policies
can be updated"; no row created.

### TC-031 / AC-008 - Cancelled and pending policies rejected
Parametrised over status in {cancelled, pending} -> same rejection.

---

## Backend - admin approval (AC-005)

### TC-040 / AC-005 - Approval applies new values and stamps decision
Create a Pending endorsement (make Toyota -> Honda). POST `/admin/endorsements/{id}/approve`
as `admin` -> 200. `vehicles` row make == "Honda" (row created if it was absent);
endorsement `status == "Approved"`, `decision_date` set, `decided_by == admin.id`.

### TC-041 / AC-005 / AC-008 - Approving after the policy expired updates vehicle, policy stays expired
Create Pending endorsement while active; flip policy to `expired`; approve -> 200;
vehicle updated, `userpolicies.status` still `expired`, endorsement `Approved`.

### TC-042 / AC-009 - Cannot approve an already-decided endorsement
Approve once -> 200; approve again -> 409/400 "endorsement is not Pending".
Same for reject-after-approve.

---

## Backend - admin rejection (AC-007)

### TC-050 / AC-007 - Rejection leaves vehicle unchanged, stamps decision
Seed vehicle make "Toyota", Pending endorsement to "Honda". POST
`/admin/endorsements/{id}/reject` as `admin` -> 200. `vehicles` make still "Toyota";
endorsement `status == "Rejected"`, `decision_date` set, `decided_by == admin.id`.

---

## Backend - history (AC-006)

### TC-060 / AC-006 - History returns full timeline for owner
Create 3 endorsements (leave 1 Pending, approve 1, reject 1). GET
`/userpolicies/{id}/endorsements` as `customer_a` -> 200, list length 3, newest first,
each item has `old_values`, `new_values`, `request_date`, `status`, and `decision_date`
(null for the Pending one).

### TC-061 / AC-006 - History is owner-scoped
GET `/userpolicies/{active_policy_a.id}/endorsements` as `customer_b` -> 403.

### TC-062 / AC-006 (frontend) - History view renders old vs new vs status
Render `EndorsementHistory` with a mock list -> a row per endorsement showing changed
fields old -> new, the request date, and a status badge (Pending/Approved/Rejected).

---

## Frontend - flow wiring

### TC-070 / AC-001 (frontend) - "Update vehicle details" action on an owned auto policy
In `Policies.js`, an owned auto policy card exposes an "Update vehicle details" button
that opens `VehicleEndorsementModal`; a successful submit calls
`POST /userpolicies/:id/endorsements` and shows a success toast.

### TC-071 / AC-005 / AC-007 (frontend) - Admin endorsement screen approve/reject
Render the new standalone `AdminEndorsements.js` page: it lists pending endorsements
from `GET /admin/endorsements?status=pending`; Approve calls the approve endpoint,
Reject calls the reject endpoint, and the row leaves the pending list on success.
(Separate screen with its own admin-only sidebar entry; `AdminDashboard.js` is not
involved.)

---

## Migration

### TC-080 / AC-004 (migration_up/down) - Schema applies and rolls back cleanly
Apply `database/vehicles_schema.sql` + `database/endorsements_schema.sql` to a scratch
database -> both tables exist with expected columns and FKs. Apply
`database/migrations/EPT-13_down.sql` -> both tables gone, no error. (Run manually /
scripted; captured in evidence as migration_up / migration_down.)
