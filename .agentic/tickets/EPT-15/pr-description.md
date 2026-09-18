# Draft PR — EPT-15: Policy Cancellation

> **Draft artifact only.** This repo has no git remote for this project
> (see `diff-summary.md` for why), so this cannot actually be opened via
> `gh pr create`. This file is what would be posted, for the human's
> approval and record-keeping, and to reuse verbatim once/if this project
> is ever pushed to a real remote.

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

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
