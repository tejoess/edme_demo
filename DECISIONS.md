# Decisions

Episodic memory: what was decided, and why, tied to specific tickets — not
just the general facts about the system (that's `CLAUDE.md`). Appended to
by `pr-reviewer` after each ticket is approved. Don't hand-wave entries —
"fixed the bug" is not a decision record.

Format per entry:

```
## <TICKET-KEY> — <one-line title>
Date: YYYY-MM-DD
Risk tier: LOW | MEDIUM | HIGH | CRITICAL
Decision: what was actually decided or changed, in plain language.
Against acceptance criteria: which ones this satisfies, verbatim from
  the scope contract, not paraphrased.
Notes: anything a future ticket touching this area should know —
  trade-offs taken, things deliberately left out of scope, alternatives
  considered and rejected and why.
```

---

<!-- Entries below this line, most recent first -->

## EPT-15 — Policy Cancellation (Gate 2 / PR opened)
Date: 2026-09-18
Risk tier: HIGH
Decision: Gate 2 review passed (pr-reviewer's own risk findings: race
  condition genuinely closed at the DB level, authorization verified real
  not decorative, no regression in the buy-policy flow). Human approved
  and directed connecting this previously ungitted folder to
  https://github.com/tejoess/edme_demo.git as branch `feature/EPT-15`,
  based on `origin/policy-management` (the branch the sibling
  Insurance-Policy-Management folder also tracks). Branch pushed
  (2 commits: an environment-isolation chore -- separate Docker
  container/ports/CORS so this Demo instance doesn't collide with the
  sibling app -- plus the EPT-15 feature commit). PR could not be opened
  programmatically (`gh` CLI not installed, no API token available in the
  agent environment) -- draft PR title/body is ready in
  `.agentic/tickets/EPT-15/pr-description.md`, to be opened manually at
  https://github.com/tejoess/edme_demo/pull/new/feature/EPT-15 as a draft.
  Jira EPT-15 transitioned to "In Progress" (not "Done" -- PR isn't merged
  yet) with the evidence link and open items commented.
Against acceptance criteria: AC-001 through AC-007, all covered and
  passing per `.agentic/tickets/EPT-15/evidence.md`.
Notes: Two non-blocking items flagged at review, carried into the PR
  description for the merge decision: `policy_status_history.changed_by`
  uses `ON DELETE SET NULL` (a plan deviation, reasonable but should be
  explicitly blessed); and `backend/routers/claims.py` (untouched, out of
  scope) never checked policy status, so a customer can now file a claim
  against an already-cancelled policy -- recommend a fast-follow ticket.
  Local pipeline-tooling drift (`.claude/agents/*`, `.claude/commands/
  update-plan.md`, `.claude/skills/jira-ticket-intake/SKILL.md`,
  `CLAUDE.md`, `audit-log.md`) was deliberately left uncommitted: Claude
  Code's own self-modification guard blocks committing changes to its own
  agent/command/skill definitions from within a session, so that sync was
  not attempted here.

## EPT-15 — Policy Cancellation
Date: 2026-09-18
Risk tier: HIGH
Decision: Plan approved at Gate 1. Adds `PATCH /userpolicies/{id}/cancel`
  (atomic conditional `UPDATE ... WHERE id=:id AND user_id=:uid AND
  status='active'`), a new `policy_status_history` table, and
  `userpolicies.cancelled_at`. Frontend reuses the existing `useConfirm()`
  modal pattern and adds a Cancel action / Cancelled badge to the existing
  `Policies.js` card grid — no new routed detail/confirmation page. Approved
  with these assumptions explicitly signed off (none were PM-flagged open
  questions; all are net-new judgment calls surfaced during planning):
  1. "Explicitly authorized" (non-owner) access is implemented as strict
     owner-only — no delegation mechanism exists in the codebase.
  2. "Inactive/expired/lapsed" is handled generically as `status != "active"`
     — no code path currently produces those statuses.
  3. The contract's "confirmation screen" is the existing confirm-modal
     component, not a new routed page.
  4. Admin-initiated cancellation on a customer's behalf is out of scope.
Against acceptance criteria: AC-001 through AC-007 (see
  `.claude/current-scope.yaml` for verbatim text) — all covered by
  TC-001 through TC-014 in `.agentic/tickets/EPT-15/test-plan.md`.
Notes: Migration does not reverse cleanly once any cancellation has
  happened — the down-migration drops `cancelled_at` and the entire
  `policy_status_history` table unconditionally. No migration runner exists
  in this repo; applying the migration to a non-fresh DB is a manual `psql`
  step. `dependency_install` was removed from `forbidden_operations` because
  the backend has zero test infrastructure today (no pytest/httpx) — this is
  itself a signal, not routine. Latent, untouched bug surfaced during
  planning: `activate_policy` blocks repurchase of any policy the user has
  ever had a row for regardless of status, so a customer currently has no
  way to rebuy a policy after cancelling it — worth a follow-up ticket.
  This project has no project-scoped git repo of its own (nearest `.git` is
  several directories up at the Desktop level, and this folder is untracked
  there); the human opted to proceed with planning only and will handle git
  setup separately before `/implement` creates the `feature/EPT-15` branch.
