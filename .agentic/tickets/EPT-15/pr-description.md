# Draft PR — EPT-15: Policy Cancellation

> Branch `feature/EPT-15` is pushed to
> https://github.com/tejoess/edme_demo.git (base `policy-management`).
> `gh` CLI is not installed in this environment and no API token was
> available, so the PR itself could not be opened programmatically. Open it
> at https://github.com/tejoess/edme_demo/pull/new/feature/EPT-15 and paste
> this file's Title/body — it is otherwise ready to post as-is, as a
> **draft** PR (never mark ready for review or merge automatically).

## Title
`EPT-15: Add policy cancellation (PATCH /userpolicies/{id}/cancel)`

## Summary
Adds a customer-facing "Cancel Policy" action: a new
`PATCH /userpolicies/{id}/cancel` endpoint atomically flips an owned,
`active` `UserPolicies` row to `cancelled`, records the transition in a new
`policy_status_history` audit table, and surfaces the action (plus the
resulting cancelled state) on the existing Policies grid, reusing the
app's existing confirm-modal pattern rather than introducing a new routed
screen.

Linked ticket: **EPT-15**

## What changed
- **Backend**: new `PATCH /userpolicies/{id}/cancel` route
  (`backend/routers/userpolicies.py`); race-condition-safe via a single
  conditional `UPDATE ... WHERE status='active'`; new `cancelled_at`
  column and `policy_status_history` table/model
  (`backend/models.py`); new typed response schema
  (`backend/schemas.py`); `pytest`/`httpx` added as dependencies
  (`backend/requirements.txt`) to support the new backend test suite
  (`backend/tests/`, none existed before this ticket).
- **Database**: new migration pair
  (`database/migrations/0001_add_policy_cancellation.{up,down}.sql`),
  schema docs updated (`database/userPolicies_schema.sql`,
  `database/policyStatusHistory_schema.sql`), `database/init.sql` updated
  so a fresh dev DB has both from the start.
- **Frontend**: "Cancel Policy" button + "Cancelled" badge/date on the
  existing Policies card (`frontend/src/pages/Policies.js`,
  `frontend/src/pages/Policies.css`), reusing the existing `useConfirm()`
  modal with `tone: "danger"`.

## Test plan
All 7 ACs covered by 14 frozen TCs (9 backend, 5 frontend), RED→GREEN
confirmed unmodified. Full evidence, AC→TC coverage table, and raw runner
logs: **`.agentic/tickets/EPT-15/evidence.md`**
(logs under `.agentic/tickets/EPT-15/logs/`).

## Migration note
`0001_add_policy_cancellation` adds a nullable `userpolicies.cancelled_at`
column and a new `policy_status_history` table (up-migration is
loss-free/idempotent). **The down-migration is destructive**: it drops the
column and the table unconditionally, so reverting after even one
cancellation has been recorded permanently deletes that customer's
cancellation timestamp and history. No migration runner exists in this
repo — applying either file to a running (non-fresh) database is a manual
`psql -f` step. Verified mechanically (up then down) against a disposable
container, not against a database with real cancellation data — see
`evidence.md`.

## Out of scope (unchanged from ticket)
Refund/payment processing, external insurer integrations, multi-step admin
approval workflows, undo/reverse cancellation, notifications, partial
cancellation/modification of policy terms.

## Assumptions still unconfirmed (signed off at Gate 1, restate for the merge decision)
1. "Explicitly authorized" (non-owner) access implemented as strict
   ownership-only — no delegation mechanism exists in this codebase.
2. "Inactive/expired/lapsed" handled generically (`status != "active"`
   rejected) — no code path produces those statuses today.
3. "Confirmation screen" implemented as the existing confirm-modal, not a
   new routed page.
4. Admin-initiated cancellation on a customer's behalf is out of scope.

## Flagged by review, not blockers, but need a decision
- `changed_by` on `policy_status_history` uses `ON DELETE SET NULL`
  (deviates from plan.md's plain FK) — reasonable, but means "who
  cancelled this" can become `NULL` if that user's account is later
  deleted. No account-deletion endpoint exists yet, so currently
  theoretical.
- `backend/routers/claims.py` never checked policy status before this
  ticket (harmless, since every owned policy was implicitly active).
  After this ships, a customer can file a new claim against an
  already-cancelled policy — `claims.py` is untouched and out of this
  ticket's scope. Recommend a fast-follow ticket.

This branch also carries one pre-ticket commit
(`chore: isolate demo environment from Insurance-Policy-Management`)
needed so this Demo instance doesn't collide with the sibling app's
Docker/port setup — unrelated to EPT-15's feature work, included because
this was the first push connecting this folder to a real remote.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
