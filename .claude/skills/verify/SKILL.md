---
name: verify
description: Run the deterministic verification pyramid for a ticket — lint/type checks, unit tests, then integration/API and optional UI checks — and produce the evidence bundle the human review gate reads. Used by the tester agent.
---

The agent is never the authority on whether its own work is correct.
Deterministic tools are. This skill runs them, in order, and stops
climbing the pyramid the moment one layer fails.

```
Layer 5: Migration up + down      ← if the ticket touches schema
Layer 4: Integration / API / UI   ← Playwright MCP, Postman/Newman if configured
Layer 3: Unit tests               ← project test runner
Layer 2: Lint + type checks       ← project linter/type checker
Layer 1: Compilation / build      ← project build command
```

Steps:

1. Read `.claude/current-scope.yaml` for this ticket's `verification`
   block — it tells you which layers are required vs. optional.
2. Run build/compile first. If it fails, stop here and report — nothing
   above this layer is meaningful yet.
3. Run lint + type checks. Failures here go back to the implementer the
   same way a test failure would.
4. Run unit tests scoped to the changed area first, then the broader
   suite if the project's conventions call for it.
5. If `integration_tests` or `api_tests` are required, run them. If a
   Postman collection exists for the touched endpoints, run it via
   Newman; if not and the ticket adds/changes an endpoint, generate a
   minimal collection covering the new behavior.
6. If `ui_tests` is required, drive the relevant flow via the Playwright
   MCP server (accessibility-tree based, not screenshots) and capture
   pass/fail plus a short description of what was exercised.
7. If the ticket includes a migration, run it up AND down. `migration_down`
   is required whenever `migration_up` is — an irreversible migration is a
   release risk the review gate should see now.
8. Confirm the RED tests from `red.log` now pass — the same tests, not just a
   green suite.
9. Produce the evidence bundle by running
   `.claude/scripts/collect-evidence.sh <TICKET-KEY>` (see the
   `evidence-bundle` skill). It transcribes raw runner output and derives the
   AC→TC coverage table by grepping the test sources for their ids. Do not
   hand-write pass/fail lines — if a result is not in a log file, it is not a
   result.
10. Any failure at any layer routes back to the implementer, not straight
   to a human — see implementer.md's bounded retry loop.
