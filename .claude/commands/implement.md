---
description: Phase 4+5 — branch, RED, implement, verify, bounded fix loop, evidence.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, Task
---

Precondition: `.agentic/tickets/<KEY>/state.json` must show `plan_approved: true`.
If it does not, stop — Gate 1 has not been passed. Do not implement.

Run this sequence. Do not skip step 2.

1. **Branch and checkpoint.** `git checkout -b feature/<KEY>` (or the repo's
   convention from CLAUDE.md), then an empty checkpoint commit. Record the
   checkpoint SHA in `state.json` — `/abandon` resets to it.

2. **RED.** Write the tests from `test-plan.md` — all of them, tagged with their
   `TC-nnn` / `AC-nnn` ids per the `traceability` skill. Run them. Capture the
   failing output to `.agentic/tickets/<KEY>/red.log`. Commit the tests alone,
   message `test(<KEY>): failing tests for AC-001..n`.
   If a test passes at this point, the test is wrong or the behaviour already
   exists — stop and report, do not proceed.

3. **Freeze.** Add every test file you just wrote to `frozen_tests` in
   `.claude/current-scope.yaml`. From here the frozen-tests hook blocks edits to
   them. If you later believe a test is wrong, that is an escalation to the
   human, not a fix you make.

4. **Implement.** Run the `implementer` agent inside `allowed_paths`.

5. **Verify.** Run the `tester` agent — the full `verify` skill. Evidence is
   produced by `.claude/scripts/collect-evidence.sh`, not narrated by you.

6. **Bounded fix loop.** On failure, diagnose and fix, then re-verify. Increment
   `attempt` in `state.json` each time. At `attempt` 3, stop and escalate with
   what you tried and what still fails. Never edit a frozen test to pass.

7. On green, set phase `EVIDENCE` and tell the human to run `/review`.
