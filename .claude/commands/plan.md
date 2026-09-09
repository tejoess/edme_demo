---
description: Phase 3 — pull a ticket, reproduce if a bug, plan, write the scope contract, request approval.
argument-hint: <JIRA-KEY>
allowed-tools: Read, Grep, Glob, Bash, Task
---

Ticket: **$ARGUMENTS**

Preconditions — check before doing anything:
- `.claude/current-scope.yaml` must NOT exist. If it does, another ticket is in
  flight. Report which one and stop; the human runs `/abandon` or finishes it.
- The working tree must be clean.

Run the `planner` agent for this ticket. It must produce, in
`.agentic/tickets/$ARGUMENTS/`:

- `plan.md` — summary, detailed steps, files/APIs/schema touched, trade-offs,
  assumptions, open questions, out of scope
- `test-plan.md` — one test case per acceptance criterion, each with a `TC-nnn`
  id mapped to its `AC-nnn` (see the `traceability` skill)
- `state.json` — from `.agentic/state-template.json`, phase `WAITING_FOR_APPROVAL`

and `.claude/current-scope.yaml` at the repo root as usual.

Do not create the branch yet and do not write application code. Present the
plan, the test plan, and the scope contract together, then stop.

Gate 1 is the human answering: **is this what we actually want?**
