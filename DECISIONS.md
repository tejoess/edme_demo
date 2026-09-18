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

## EPT-16 — Policy PDF Download — plan approved
Date: 2026-09-18
Risk tier: MEDIUM
Decision: Approved the plan to add a "Download PDF" button on owned policy
  rows (customer Policies page) and a new "All Policies" table on
  AdminDashboard (staff), backed by a new `GET /userpolicies/{id}/pdf`
  endpoint (owner-or-admin authorization, reportlab-generated PDF) and a
  new `GET /admin/policies` listing endpoint. AC-4 ("agents can download
  PDFs for their assigned policies") is descoped from this ticket: the
  human confirmed at approval that the agent role does not exist yet in
  the codebase, and to implement the download functionality without it.
Against acceptance criteria: AC-001, AC-002, AC-003, AC-005, AC-006,
  AC-007, AC-008, AC-009, AC-010, AC-011 (verbatim list in
  `.claude/current-scope.yaml`). AC-004 removed from this ticket's scope.
Notes: "Coverage limits" has no dedicated schema field (`Policy.coverage`
  is a freeform JSONB blob) — rendered as a formatted key/value list,
  falling back to "Not specified". The customer-facing button is shown
  only on owned policy cards, since `Policies.js` is a catalog of all
  buyable policies, not a list of owned ones. A future ticket should
  design an agent persona and policy-assignment model before building
  AC-4-equivalent functionality — do not invent that model when picking
  this back up.
  Human note: agent role does not exists yet, just implement the download
  functionality
