# Diff summary — EPT-15 (Policy Cancellation)

No `diff.patch` is included. This project folder has no project-scoped git
repository of its own — the nearest `.git` is several directories up
(`C:\Users\Tejas\Desktop`), is an unrelated repo mixed with many other
personal projects, and this whole project folder is untracked there. Git
was deliberately bypassed for this entire ticket at the human's explicit
direction: no branch was created and no commits exist to diff against, in
any phase. `git diff` therefore has nothing to compare against. This file
is a hand-assembled, by-file summary of every change, organized the way a
diff would be, produced by reading each changed file directly (same
constraint and same workaround the tester already used for `evidence.md`).

All paths below are within `.claude/current-scope.yaml`'s `allowed_paths`.

---

## Backend

### MODIFIED — `backend/models.py`
- `UserPolicies`: added `cancelled_at = Column(DateTime, nullable=True)`.
- New model `PolicyStatusHistory` (table `policy_status_history`):
  `id`, `user_policy_id` (FK → `userpolicies.id`, `ON DELETE CASCADE`),
  `previous_status`, `new_status`, `changed_by` (FK → `users.id`,
  **`ON DELETE SET NULL`** — deviates from plan.md's plain
  `REFERENCES users(id)`, see Risk Findings), `changed_at`
  (`server_default=func.now()`), plus a `user_policy` relationship.
- No other model touched.

### MODIFIED — `backend/schemas.py`
- Added `CancelPolicyResponse(BaseModel)`: `message: str`, `status: str`,
  `cancelled_at: datetime`, `class Config: from_attributes = True`.
- No existing schema changed.

### MODIFIED — `backend/routers/userpolicies.py`
- Before: two endpoints — `POST /{policy_id}` (activate/buy) and
  `GET /` (list). Neither touched.
- New: `PATCH /{user_policy_id}/cancel`, `response_model=CancelPolicyResponse`,
  `Depends(get_current_user)` (existing dependency, unchanged import).
  - Ownership lookup: `UserPolicies.id == user_policy_id AND user_id ==
    current_user.id`; not found → `404 "Policy not found"`.
  - Atomic conditional `UPDATE ... WHERE id=:id AND user_id=:user_id AND
    status='active' RETURNING cancelled_at` via raw SQL `text()` in the
    same session/transaction as the ownership lookup.
  - 0 rows affected → `db.rollback()`, re-read current status, then
    `400 "This policy has already been cancelled"` or
    `400 "Only active policies can be cancelled"`.
  - Success → insert `PolicyStatusHistory` row
    (`previous_status="active"`, `new_status="cancelled"`,
    `changed_by=current_user.id`), single `db.commit()` covering both the
    UPDATE and the INSERT, return typed `CancelPolicyResponse`.

### MODIFIED — `backend/requirements.txt`
- Added `pytest`, `httpx` (net-new; nothing removed). Consistent with
  scope contract's note that `dependency_install` was removed from
  `forbidden_operations` for this ticket.

### NEW — `backend/tests/conftest.py` (frozen)
Shared fixtures: `client`, `db`, `customer`/`other_customer` (signup+login,
cleaned up via `DELETE FROM users` relying on `ON DELETE CASCADE`),
`seed_policy_id`, `make_user_policy()` helper (inserts a `UserPolicies` row
with an arbitrary status, bypassing the activate endpoint), `auth_headers()`.

### NEW — `backend/tests/test_userpolicies_cancel.py` (frozen)
9 tests, TC-001/003/004/006/007/008/009/010/014 — see test-plan.md.

---

## Database

### NEW — `database/migrations/0001_add_policy_cancellation.up.sql`
`ALTER TABLE userpolicies ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP
NULL DEFAULT NULL;` + `CREATE TABLE IF NOT EXISTS policy_status_history`
(same shape as models.py) + supporting index. Idempotent
(`IF NOT EXISTS` throughout).

### NEW — `database/migrations/0001_add_policy_cancellation.down.sql`
```sql
DROP TABLE IF EXISTS policy_status_history;
ALTER TABLE userpolicies DROP COLUMN IF EXISTS cancelled_at;
```
Unconditionally destructive — see "Migration — restated plainly" below.

### MODIFIED — `database/userPolicies_schema.sql`
Added `cancelled_at TIMESTAMP NULL DEFAULT NULL` column with an inline
comment, to the documentation-only `CREATE TABLE UserPolicies` block.
No other column changed.

### NEW — `database/policyStatusHistory_schema.sql`
Documents the new table; `changed_by INTEGER REFERENCES users(id) ON
DELETE SET NULL` (matches models.py, deviates from plan.md).

### MODIFIED — `database/init.sql`
- `userpolicies` table DDL: added `cancelled_at TIMESTAMP NULL DEFAULT
  NULL` in place, so a fresh `docker-compose up` gets it from the start.
- Appended the full `policy_status_history` table + index (same shape as
  the migration file), inserted after `adminlogs` and before the seed
  `INSERT`s.
- Seed data (`providers`, `policies` inserts) unchanged.

---

## Frontend

### MODIFIED — `frontend/src/pages/Policies.js`
- Added `getOwnedUserPolicy(policyId)` helper alongside the existing
  `isOwned(policyId)` (both kept — `isOwned` still used as before, nothing
  that reads it was changed).
- Added `formatDate(value)` helper (ISO date formatting for
  `cancelled_at`).
- Added `cancelPolicy(policy, userPolicy)`, structured identically to the
  existing `buyPolicy(policy)`: same `useConfirm()` call shape, same
  `busyPolicyId` busy-state variable (**shared with `buyPolicy` — see Risk
  Findings**), same `toast.success`/`toast.error` + `fetchData()` refresh
  pattern.
- Render: each card now computes `ownedUserPolicy` and `isCancelled =
  owned && ownedUserPolicy?.status === "cancelled"`.
  - `isCancelled` → renders a `.cancelled-info` block (badge + formatted
    date) instead of the buy/purchased actions.
  - `owned && !isCancelled` → existing disabled "✓ Purchased" button
    **plus** new "Cancel Policy" button (`btn btn-danger`,
    `onClick={() => cancelPolicy(policy, ownedUserPolicy)}`,
    `disabled={isBusy}`).
  - `!owned` branch (Buy Policy button) — untouched.
  - "File Claim" button — untouched, still rendered unconditionally
    regardless of `isCancelled` (see Risk Findings, item 5).
- No changes to `toggleSelect`, `fetchData`, `openClaimModal`,
  `submitClaim`, filter logic, or the comparison-selection flow.

### MODIFIED — `frontend/src/pages/Policies.css`
Additive only: `.cancelled-info` and `.cancelled-date` rule blocks appended
at the end of the file. No existing selector edited or removed.

### NEW — `frontend/src/pages/Policies.cancel.test.js` (frozen)
5 RTL tests, TC-002/005/011/012/013 — see test-plan.md.
