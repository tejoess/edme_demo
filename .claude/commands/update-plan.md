---
description: Revise the plan, test plan, and scope contract together from developer feedback, then re-present for Gate 1.
argument-hint: <what to change>
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, Task
---

Requested change: **$ARGUMENTS**

Preconditions — refuse and stop if either fails:

- `.claude/current-scope.yaml` and `.agentic/tickets/<KEY>/plan.md` both exist.
  Nothing to revise otherwise; the human wants `/plan`.
- Phase is `WAITING_FOR_APPROVAL`, `IMPLEMENTATION`, `VERIFICATION`, `FIX` or
  `REVIEW`. Any other phase means a revision would leave the plan and the work
  out of step — report the phase and stop.

## First, classify the change

Before touching anything, decide which of these it is and say so:

**Technical revision** — a different approach, a missing file, an edge case, a
test that should exist. Yours to make. Proceed.

**Product decision** — it changes what the feature *does*: who may do it, when
it takes effect, what happens to related records. **Not yours to make.** Stop
and say it belongs in Part A, because deciding it here means inventing a
requirement and the Jira ticket will no longer describe what gets built. Name
the specific question that needs answering.

**Scope expansion** — the change adds work the ticket did not cover. This is the
common case when a guard hook has blocked a write. Proceed, but say plainly what
it adds and re-run `risk-classification`. If the tier moves up — a migration
appears, a public interface changes, auth is touched — say so prominently: the
human is about to approve a different-sized ticket than they thought.

## Then revise all three together

Never partially revise. `plan.md`, `test-plan.md` and `.claude/current-scope.yaml`
are one package, and a contract that no longer matches its plan is how scope
drift starts.

1. `plan.md` — apply the change. Append to a `## Revisions` section at the
   bottom: the date, what was asked for verbatim, and what you changed. Do not
   rewrite the original text; a plan that quietly becomes a different plan is
   not reviewable.
2. `test-plan.md` — add, amend or remove `TC-nnn` cases. Every `AC-nnn` must
   still have at least one TC. New behaviour needs a new AC **and** a new TC —
   widening scope without adding a test gives you code the coverage table
   cannot flag, because there is no criterion for it to be missing against.
   That is the single most important thing this command does.
3. `.claude/current-scope.yaml` — update `acceptance_criteria`, `allowed_paths`,
   `forbidden_operations`, `risk` and `verification` to match. A path added here
   must correspond to a change described in `plan.md`; never widen
   `allowed_paths` on its own.
4. `state.json` — set `plan_approved: false` and phase `WAITING_FOR_APPROVAL`.
   A revised plan is unapproved by definition, even if the previous version was
   approved thirty seconds ago.

## If work already exists on the branch

Implementation is now built against a superseded plan. Before anything else, say
explicitly what is stale:

- which frozen tests no longer match the revised test plan
- which committed code falls outside the revised `allowed_paths`
- whether `red.log` is still valid, or whether the new TCs need their own RED
  capture appended to it

New test cases added here have **not** been through RED. After re-approval,
`/implement` must write them, confirm they fail, append to `red.log` and add
them to `frozen.lock` before implementing them — the same sequence as a fresh
ticket, for the new cases only.

Then recommend one of two paths, and say which and why rather than leaving the
choice open:

- **Keep the branch** — the existing work still fits and the change is additive.
- **`/abandon` and start clean** — the change is structural enough that most of
  the existing work no longer applies. Reconciling costs more than redoing.

Frozen tests stay frozen until the human approves this revision. Do not edit
them here.

## Finally

Re-present the three documents as a package, with a short summary of what
changed and what it means for size and risk. Then stop. The human runs
`/approve-plan`.