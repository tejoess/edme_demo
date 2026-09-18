# Plan — EPT-15: Policy Cancellation

## Risk tier: HIGH

Derived, not read off the ticket (`risk-classification` skill). Two independent
reasons to round up:
1. **Schema change** to a live, seeded table (`userpolicies`) plus a brand-new
   audit table, applied through a codebase that has **no migration tool at
   all** (no Alembic, no versioned migration runner -- schema currently lives
   only in `database/init.sql`, applied once when the docker-compose Postgres
   container is first created).
2. **Authorization-gated state mutation** -- this endpoint changes a
   customer's policy status and must correctly reject cross-user access.

Per the skill, "probably MEDIUM but touches one shared file" rounds up to
HIGH -- here we have both a schema change and an authz-sensitive endpoint,
so HIGH is not a marginal call.

## Summary

**Leads with the migration, per policy: this ticket adds one nullable column
(`userpolicies.cancelled_at`) and one new table (`policy_status_history`).
The down-migration is only loss-free while zero cancellations have ever been
recorded -- the moment one customer cancels a policy, reverting drops that
customer's cancellation timestamp and their history row permanently.** The
feature itself adds a `PATCH /userpolicies/{id}/cancel` endpoint that
atomically flips an owned, currently-active `UserPolicies` row to
`cancelled`, records the event in a new history table, and adds a "Cancel
Policy" action on the existing Policies grid (reusing the app's existing
confirm-modal pattern rather than inventing a new routed screen).

## Ticket vs. codebase -- verified, not assumed

Read before planning: `backend/models.py`, `backend/database.py`,
`backend/oauth2.py`, `backend/routers/userpolicies.py`,
`backend/routers/policies.py`, `backend/routers/admin.py`, `backend/main.py`,
`backend/schemas.py`, `database/*.sql`, `frontend/src/pages/Policies.js`,
`frontend/src/context/ConfirmContext.js`, `frontend/src/utils/apiClient.js`,
`frontend/src/App.js`, `backend/requirements.txt`, `frontend/package.json`.

Findings that change or narrow the plan:

- **No "policy detail page" exists.** The contract's Areas of change names
  one, but the app has a single `Policies.js` grid of cards (catalog items,
  each showing an owned/not-owned state), no per-policy route. Per the
  ticket-authority rule, the contract (business intent: customer views the
  policy, can cancel it, sees the result) wins over any implied technical
  shape. This plan implements the behaviour on the existing card, not a new
  detail route -- flagging this because "Policy detail page" reads as
  PRD boilerplate rather than a real existing surface; if a dedicated detail
  page is actually wanted, that is a larger, separate scope than this ticket
  describes.
- **No "confirmation screen" pattern exists either -- there is a confirm
  modal.** `buyPolicy()` in `Policies.js` already uses `useConfirm()` (a
  promise-based modal, `ConfirmContext.js`) for the purchase flow. This plan
  reuses it for cancellation (with `tone: "danger"`) instead of building a
  new routed confirmation screen, to stay consistent with the one
  confirm-before-destructive-action pattern the app already has. This is an
  implementation-shape decision, not a change to the approved user flow: the
  customer still sees policy details and an explanation before confirming.
- **"Explicitly authorized" (non-owner) access does not exist in this
  codebase.** There is no delegation/shared-access table anywhere -- the
  only authorization primitive is `UserPolicies.user_id == current_user.id`
  (ownership), and the only other authority level is a single hardcoded
  `ADMIN_EMAIL` env var used for the admin dashboard (`admin.py`), which the
  contract's customer-facing flow never mentions. So AC-005 is implemented as
  a strict ownership check. If "explicitly authorized" was meant to cover a
  real delegation feature, that does not exist yet and is out of this
  ticket's size -- flagging as an assumption for human confirmation, not a
  silently resolved question.
- **"Inactive (expired/lapsed)" statuses are never produced anywhere in the
  code today.** `UserPolicies.status` is only ever set to `"active"` (see
  `activate_policy` in `routers/userpolicies.py`); there is no expiry job,
  no cron, nothing that transitions a policy past `end_date`. The ticket's
  edge case (cancel an inactive/expired/lapsed policy) describes a status
  value the system cannot currently reach. Rather than inventing an expiry
  mechanism (out of scope), validation is written generically -- "must equal
  `active`, else reject" -- so it already covers `expired`/`lapsed`/anything
  else the moment such a status exists, without building the thing that
  produces it.
- **Backend has zero test infrastructure.** `requirements.txt` has no
  `pytest`, no `httpx`, no test runner of any kind; there is no
  `backend/tests/` directory. The NFR "add automated tests for successful
  and unsuccessful cancellation" cannot be met without adding `pytest` and
  `httpx` (for FastAPI's `TestClient`) as dependencies. This means
  `dependency_install` has to come out of `forbidden_operations` for this
  ticket -- flagged explicitly per the DoD skill's own instruction that
  doing so is itself a signal (consistent with the HIGH tier already
  assigned). Frontend already has Jest + React Testing Library via CRA
  (`react-scripts test`), so no new frontend dependency is needed.
- **Existing latent limitation, not touched by this ticket:**
  `activate_policy` blocks re-purchase of a policy the user already has a
  `UserPolicies` row for, regardless of status. That means once a policy is
  cancelled, the current codebase has no way for that customer to buy it
  again -- undo/reverse cancellation and repurchase-after-cancel are both
  explicitly out of scope for EPT-15, so this is left alone, but a human
  should know it exists because it will surface as a follow-on ticket.

## Database changes

**Not reversible without data loss once any cancellation has occurred** --
the down-migration drops the column and table holding every cancellation
timestamp and history event recorded up to that point. Reversible without
loss only against a database where no cancellation has ever happened.

Schema:
- `userpolicies.cancelled_at TIMESTAMP NULL DEFAULT NULL` -- set once, at
  cancellation time; existing rows backfill to `NULL` implicitly (no
  backfill script needed -- `NULL` correctly means "not cancelled").
- New table `policy_status_history`:
  ```sql
  CREATE TABLE policy_status_history (
      id SERIAL PRIMARY KEY,
      user_policy_id INTEGER NOT NULL
          REFERENCES userpolicies(id) ON DELETE CASCADE,
      previous_status VARCHAR(20) NOT NULL,
      new_status VARCHAR(20) NOT NULL,
      changed_by INTEGER REFERENCES users(id),
      changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_policy_status_history_user_policy_id
      ON policy_status_history(user_policy_id);
  -- index supports "show this policy's history" -- the query the
  -- detail/history view runs, one row per lifecycle event going forward.
  ```
  `ON DELETE CASCADE` matches the existing convention used by
  `userpolicies` -> `claims` and `users`/`policies` -> `userpolicies`.
  No backfill: existing policies get no retroactive history rows (there is
  no reliable prior-status data to backfill from) -- history starts
  recording from the first cancellation after this ships. That is an
  accepted gap for this ticket, not silently glossed over.
- No changes to `policy_type_enum`, `policies`, `claims`, or any other table.

Files (new migration convention -- none exists in this repo today, so this
introduces one; flagging it as a new convention, not an existing one being
followed):
- `database/migrations/0001_add_policy_cancellation.up.sql`
- `database/migrations/0001_add_policy_cancellation.down.sql`
- `database/userPolicies_schema.sql` -- updated to document `cancelled_at`
- `database/policyStatusHistory_schema.sql` -- new, documents the new table
- `database/init.sql` -- appended so a fresh `docker-compose up` dev DB has
  both from the start

Down migration (`0001_add_policy_cancellation.down.sql`):
```sql
DROP TABLE IF EXISTS policy_status_history;
ALTER TABLE userpolicies DROP COLUMN IF EXISTS cancelled_at;
```
This is the destructive direction referenced above -- it deletes every
cancellation date and every history row ever recorded, unconditionally.

Because there is no migration runner in this repo, applying either file to a
running (non-fresh) database is a manual `psql -f` step -- that gap is
pre-existing and out of this ticket's scope to fix, but a human running the
migration should know `init.sql` alone does not update an already-running
container.

## Detailed steps

Backend:
1. `backend/models.py` -- add `cancelled_at = Column(DateTime, nullable=True)`
   to `UserPolicies`; add a new `PolicyStatusHistory` model mirroring the DDL
   above.
2. `backend/schemas.py` -- add a `CancelPolicyResponse` pydantic model
   (`message: str`, `status: str`, `cancelled_at: datetime`) for a typed,
   consistent response shape (existing claim endpoints use response schemas;
   `userpolicies.py` currently returns raw dicts/ORM objects -- moving the
   new endpoint to a typed schema is a small, contained improvement, not a
   refactor of the existing endpoints).
3. `backend/routers/userpolicies.py` -- add:
   `PATCH /userpolicies/{user_policy_id}/cancel`
   - `Depends(get_current_user)` (existing auth dependency, unchanged).
   - Fetch the `UserPolicies` row by `id == user_policy_id`. If it does not
     exist or `user_id != current_user.id`, return `404 Policy not found`
     (matches the existing `activate_policy` 404 phrasing, and avoids
     revealing whether the record exists to a non-owner -- a stricter
     equivalent of AC-005).
   - Race-condition-safe update: run a single conditional
     `UPDATE userpolicies SET status='cancelled', cancelled_at=now()
     WHERE id=:id AND user_id=:uid AND status='active'` (via the ORM) inside
     one transaction. This is the concrete fix for the ticket's flagged race
     condition: the status check and the write happen atomically at the DB
     level, so a status change between "customer views" and "customer
     confirms" cannot both pass validation and get overwritten -- whichever
     request's `UPDATE` matches zero rows loses and takes the error path.
   - If the conditional `UPDATE` affects 0 rows, re-read the row's current
     status to build the right message: `status == "cancelled"` gives
     `400 "This policy has already been cancelled"`; anything else gives
     `400 "Only active policies can be cancelled"`.
   - On success, insert a `PolicyStatusHistory` row (`previous_status=
     "active"`, `new_status="cancelled"`, `changed_by=current_user.id`),
     commit, return `{"message": "Policy cancelled successfully",
     "status": "cancelled", "cancelled_at": <timestamp>}`.
4. `backend/requirements.txt` -- add `pytest` and `httpx` (needed for
   `fastapi.testclient.TestClient` / `httpx.AsyncClient`).
5. `backend/tests/test_userpolicies_cancel.py` (new) -- API tests, see
   `test-plan.md` for the TC list.

Frontend:
6. `frontend/src/pages/Policies.js`:
   - Change `isOwned` usage to also expose the owned `UserPolicies` record
     (not just a boolean), so status/id/cancelled_at are available per card.
   - For an owned card with `status === "active"`: render a "Cancel Policy"
     button next to the existing "Purchased" indicator.
   - Clicking it opens the existing `useConfirm()` modal (`tone: "danger"`,
     message includes policy title, policy number, premium, and a one-line
     explanation that cancellation is final and history is retained) --
     mirrors `buyPolicy()`'s existing pattern.
   - On confirm: `apiFetch('/userpolicies/{id}/cancel', {method: "PATCH"})`,
     `toast.success(...)` on 200, `await fetchData()` to refresh state so the
     card re-renders as cancelled; `toast.error(err.message)` on failure
     (the existing `apiClient.js` already surfaces the backend's `detail`
     string, so AC-007's "clear error message" requires no new plumbing).
   - For an owned card with `status === "cancelled"`: render a "Cancelled"
     badge plus the formatted `cancelled_at` date instead of the purchase/
     cancel actions (satisfies AC-002/AC-003 on the UI side).
7. `frontend/src/pages/Policies.css` -- minor styling for the cancelled
   badge and the cancel button, following existing badge/button class
   conventions already in the file.
8. `frontend/src/pages/Policies.cancel.test.js` (new) -- RTL/Jest tests
   using the existing `react-scripts test` setup, no new dependency.

## Trade-offs / caveats

- Reusing the existing confirm-modal instead of a dedicated routed
  confirmation screen is a smaller, more consistent change, but it means the
  "confirmation screen" language in the contract's Areas of change is
  satisfied by a modal, not a full page. Flagging for Gate 1 sign-off.
- 404 (not 403) for both "not found" and "not yours" narrows information
  disclosure but means the frontend cannot distinguish the two cases in
  copy -- acceptable given AC-005 only requires a clear rejection, not a
  specific wording per case.
- `policy_status_history` starts empty for existing policies; no retroactive
  backfill. Acceptable for this ticket; flagged rather than hidden.
- No migration runner exists in this repo -- the up/down SQL files are
  produced per the DoD skill's requirement, but actually applying them to a
  non-fresh database is a manual step this ticket does not automate.
- `type_check` is not a configured layer anywhere in this repo (Python has no
  mypy config, frontend is plain JS, not TS) -- set to `optional` in the
  scope contract rather than invented as `required`.

## Assumptions requiring human sign-off before Gate 1

1. "Explicitly authorized" (non-owner) access in AC-005/business rules is
   implemented as owner-only because no delegation mechanism exists in this
   codebase. If a real "authorized third party" feature is intended, that is
   materially larger than this ticket and should go back to Part A.
2. "Inactive (expired/lapsed)" is handled generically (`status != "active"`)
   because no code path currently produces those specific status values.
3. The "confirmation screen" is implemented as the existing confirm-modal
   pattern, not a new routed page (see Trade-offs).
4. Admin-initiated cancellation on behalf of a customer is not in scope --
   the contract's persona is "customer," and multi-step admin workflows are
   explicitly out of scope.

## Out of scope (carried verbatim from the ticket)

Refund/payment processing; external insurer integrations; multi-step admin
approval workflows; undo/reverse cancellation; notifications (email/SMS);
partial cancellation/modification of policy terms.

## Open questions

The ticket's Clarifications section is empty and the contract has no
`open_questions` -- nothing was left unresolved by the requirement agent.
The four assumptions above are net-new judgment calls made during planning
because the contract is silent on them, not open questions the PM already
flagged; they still need explicit sign-off at Gate 1 since answering them
changes what "authorized" and "confirmation" mean in the shipped feature.
