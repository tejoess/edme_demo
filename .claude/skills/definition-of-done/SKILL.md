---
name: definition-of-done
description: Convert a ticket's natural-language acceptance criteria into the machine-readable scope contract (current-scope.yaml) that later phases verify against instead of re-reading prose.
---

Natural-language acceptance criteria are fine for humans and not enough as
a contract an agent (or a hook) can check mechanically. This skill turns
one into the other.

Steps:

1. Copy `.claude/current-scope-template.yaml` to `.claude/current-scope.yaml`
   if it doesn't already exist for this ticket.
2. Fill in `ticket`, `risk` (from the risk-classification skill — run that
   first if it hasn't run yet), and `acceptance_criteria` as short, plain,
   checkable statements — not a paraphrase of the whole ticket description.
3. Fill in `allowed_paths` — be as narrow as the change genuinely allows.
   This isn't a formality; `guard-scope-edit.sh` enforces it on every file
   edit for the rest of the ticket's lifetime.
4. Fill in `forbidden_operations` — start from the template's defaults
   (dependency_install, migration, deploy) and only remove one if the
   ticket genuinely requires it, which should itself be a signal to
   double-check the risk tier.
5. Set the `verification` block based on what this ticket actually needs —
   don't mark `ui_tests: required` for a backend-only change, and don't
   leave `api_tests` off for one that adds or changes an endpoint.
6. Present the completed contract alongside the plan for human approval —
   it's part of what's being approved, not a hidden implementation detail.
7. Once the ticket's PR merges, delete or archive `current-scope.yaml` so
   the guard hooks fall back to "no ticket in flight."
