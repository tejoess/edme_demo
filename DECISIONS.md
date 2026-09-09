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

## EPT-13 — Policy Endorsement: Customer-Requested Vehicle Updates
Date: 2026-09-09
Risk tier: HIGH
Decision: Plan, test plan, and scope contract approved at Gate 1. Adds two tables
  (vehicles, policy_endorsements), a customer endorsement submit/history API, an
  admin approve/reject API, concrete vehicle validation (backend + mirrored
  frontend), and React UI — a VehicleEndorsementModal + history expander on owned
  auto-policy cards in Policies.js, plus a new standalone AdminEndorsements.js
  admin screen. The live vehicle row is mutated only on admin approval; Pending
  and Rejected endorsements never change it. Also stands up the backend pytest
  harness (SQLite test DB + JSON variant shims on the two existing JSONB columns).
Against acceptance criteria: AC-001 "A customer can submit a vehicle detail update
  for their own ACTIVE policy; a new endorsement is created.", AC-002 "Invalid
  vehicle information is rejected with a clear validation error and NO endorsement
  is created.", AC-003 "A customer cannot submit an endorsement against a policy
  they do not own - the attempt is blocked (403).", AC-004 "Submitting an update
  creates an endorsement with status=Pending, snapshots old_values, and does NOT
  change the live vehicle details.", AC-005 "After an admin approves, the vehicle
  row reflects the new details and the endorsement status becomes Approved with a
  decision date.", AC-006 "The customer can view endorsement history for a policy
  showing old values, new values, request date and status for each change.",
  AC-007 "After an admin rejects, the vehicle details remain unchanged and the
  endorsement status becomes Rejected with a decision date.", AC-008 "Endorsements
  can only be submitted against policies in 'active' status (expired/cancelled/
  pending are rejected).", AC-009 "Approving/rejecting an endorsement is
  admin-only; non-admin callers get 403. Only Pending endorsements are
  decidable.", AC-010 "Multiple Pending endorsements for the same policy are
  allowed (no conflict error at submit time)."
Notes:
  - Human-passed note on approval: none.
  - No vehicle concept existed in the codebase before this ticket; vehicles table
    is new and its rows are created lazily on first approval, not at submit time.
    Auto policies only — non-auto submit returns 400.
  - Multiple pending endorsements allowed per PM default: approve applies
    new_values wholesale onto the current vehicle row, so approving A then B means
    B overwrites A and B's recorded old_values may look stale relative to approval
    time. Documented, not solved, in this ticket.
  - AdminLogs wiring deliberately out of scope — that model is dead code today;
    traceability is satisfied by policy_endorsements.decided_by + decision_date +
    the history endpoint.
  - Schema ships as reviewed .sql (init.sql append, standalone *_schema.sql,
    database/migrations/EPT-13_up.sql / _down.sql) applied by a human — no Alembic
    introduced; "migration" stays in forbidden_operations.
  - AdminDashboard.js intentionally NOT touched — the endorsement queue is a
    separate screen (developer changed this from the planner's default).
  - CLAUDE.md "How to run things" is still TODO placeholders; collect-evidence.sh
    will report SKIPPED layers until a human fills in the commands proposed in
    plan.md.
  - Blocker flagged at approval time: .claude/hooks/guard-scope-edit.sh has a
    Windows path-normalization bug (backslash file_path vs forward-slash repo
    root) that blocks ALL Edit/Write ops while current-scope.yaml exists. This
    approval's state.json / DECISIONS.md writes were made via Bash on explicit
    repeated human approval. The hook MUST be fixed before /implement — the
    implementer agent relies on Edit/Write.

## EPT-13 — Policy Endorsement: shipped (Gate 2 approved, draft PR)
Date: 2026-09-10
Risk tier: HIGH
Decision: Implemented and verified the customer-requested vehicle-endorsement
  workflow per the approved plan. New `vehicles` and `policy_endorsements` tables;
  customer submit/history API (`POST`/`GET /userpolicies/{id}/endorsements`,
  owner-scoped, active-policy-only); admin queue + decision API
  (`GET /admin/endorsements`, `POST /admin/endorsements/{id}/approve|reject`,
  admin-only, Pending-only). Live vehicle row is written only on admin approval;
  Pending and Rejected endorsements never change it. Standalone
  `AdminEndorsements` React screen (AdminDashboard.js left untouched);
  "Update vehicle details" modal + "Vehicle history" expander on owned auto-policy
  cards. Stood up the backend pytest harness (SQLite + JSON variant shims).
  Schema ships as reviewed `.sql` applied by a human — no Alembic. 26 test cases,
  RED->GREEN; 7/7 verification layers incl. live PostgreSQL 16 migration up/down
  and a Playwright end-to-end walkthrough.
Against acceptance criteria: satisfies AC-001..AC-010 as written in
  `.claude/current-scope.yaml` (archived to `.agentic/tickets/EPT-13/`) — customer
  submits update for own active policy (AC-001); invalid data rejected, no
  endorsement created (AC-002); non-owner blocked 403 (AC-003); submit creates a
  Pending endorsement and snapshots old_values without changing the live vehicle
  (AC-004); admin approval applies new details and stamps Approved + decision date
  (AC-005); customer sees the per-policy history with old/new/date/status (AC-006);
  admin rejection leaves the vehicle unchanged, status Rejected (AC-007);
  only active policies are endorsable (AC-008); approve/reject is admin-only and
  only Pending is decidable (AC-009); multiple Pending endorsements allowed (AC-010).
Notes:
  - Accepted as follow-up tickets (not merge blockers, human decision at Gate 2):
    (1) the update modal does not pre-fill current vehicle values on repeat edits
    — no backend field carries the live vehicle onto the policy list yet;
    (2) backend does not restrict submit to `policy_type == "auto"` (the UI does)
    — plan assumption A-5 not enforced server-side, untested gap;
    (3) approve/reject are not row-locked (`SELECT ... FOR UPDATE`) and lack an
    explicit rollback around the multi-write — low impact on a single-admin system.
  - Documented trade-off (per approved plan, PM default "multiple pending allowed"):
    approval applies new_values wholesale; approving A then B lets B overwrite A and
    B's old_values may look stale; no pending-count cap. Not a re-plan trigger; a
    new ticket if it later proves unacceptable.
  - `PolicyEndorsement.old_values/new_values` use `Column(JSON)` while the DDL uses
    `jsonb` — inert (prod tables built from raw `.sql`; `create_all` only hits the
    SQLite test engine). Aligning to `.with_variant` would remove the trap.
  - `AdminLogs` wiring deliberately out of scope (dead code today); traceability is
    `policy_endorsements.decided_by` + `decision_date` + the history endpoint.
  - The uncommitted `.claude/` hook + settings changes in the working tree are the
    repo owner's separate mid-session fix for a Windows path-normalization bug in
    guard-scope-edit.sh; they are NOT part of the EPT-13 branch and must be reviewed
    and committed on their own — they must not ride along in the EPT-13 PR.
  - `gh` CLI is not installed in this environment, so the draft PR could not be
    opened by the pipeline; the branch was pushed and a compare URL handed to the
    human to open the draft PR (body pre-written at
    `.agentic/tickets/EPT-13/pr-description.md`).
