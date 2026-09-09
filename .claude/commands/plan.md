---
description: Phase 3 — pull a ticket, understand it, clarify with the developer, investigate the code, plan, write the scope contract, request approval.
argument-hint: <JIRA-KEY>
allowed-tools: Read, Grep, Glob, Bash, Task, AskUserQuestion
---

Ticket: **$ARGUMENTS**

Preconditions — check before doing anything:
- `.claude/current-scope.yaml` must NOT exist. If it does, another ticket is in
  flight. Report which one and stop; the human runs `/abandon` or finishes it.
- The working tree must be clean.

## The flow

Run these steps in order. Do not jump to the plan before the developer has
answered the clarifying questions.

1. **Fetch ticket** — `jira-ticket-intake` skill. Pull description, acceptance
   criteria, comments, linked issues, and the linked Technical PRD if one
   exists. The PRD is authoritative; the description summarises it.

2. **Load project context** — read `CLAUDE.md`, the architecture notes, and any
   ticket-relevant docs. Enough to interpret the request in this codebase's
   terms.

3. **Understand the requirement** — restate what the ticket is asking for in
   your own words. What outcome does the developer/PM want?

4. **Initial interpretation** — write 2–4 sentences: "This appears to
   require…". State the mechanism you *think* is being asked for and the main
   ambiguities you can see. Show this to the developer.

5. **Developer clarification** — turn every open question into a pop-up
   multiple-choice question with the `AskUserQuestion` tool. One call, up to 4
   questions, 2–4 concrete options each; the developer picks an option or types
   their own. Do NOT ask these as blocking prose questions in the chat.
   - Ask only what changes the plan. Scope boundaries ("which fields?", "which
     states?"), behaviour on edge cases, and choice between plausible mechanisms
     are good questions. Pure implementation detail is not — decide that
     yourself.
   - If a question is really a *business* question (it changes what the feature
     does, not how it is built), stop and route it back to the requirement
     agent (reverse clarification, see `CLAUDE.md`) rather than deciding it here.
   - Record every question and the chosen answer — they go into `plan.md` under
     "Clarifications".

6. **Codebase investigation** — now, with the answers in hand, run the
   `planner` agent (Task tool). Pass it the ticket, the initial interpretation,
   and the full Q&A from step 5. It traces the real code paths, classifies
   risk, and drafts the plan.

7. **Validate / refine understanding** — if the investigation contradicts an
   answer or surfaces a new fork, go back to step 5 with another
   `AskUserQuestion` pop-up. Loop until the plan rests on no silent assumption.

8. **Final engineering plan** — the `planner` agent produces, in
   `.agentic/tickets/$ARGUMENTS/`:
   - `plan.md` — initial interpretation, Clarifications (Q&A), summary,
     detailed steps, files/APIs/schema touched, trade-offs, assumptions, open
     questions, out of scope
   - `test-plan.md` — one test case per acceptance criterion, each with a
     `TC-nnn` id mapped to its `AC-nnn` (`traceability` skill)
   - `state.json` — from `.agentic/state-template.json`, phase
     `WAITING_FOR_APPROVAL`

   and `.claude/current-scope.yaml` at the repo root.

9. **Approval** — present the initial interpretation, the clarifications, the
   plan, the test plan, and the scope contract together, then stop.

Do not create the branch and do not write application code. Gate 1 is the human
answering: **is this what we actually want?**
