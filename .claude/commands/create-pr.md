---
description: Open the draft PR, update Jira, record the decision, clear the scope contract.
allowed-tools: Read, Bash, Grep, Glob
---

Precondition: phase is `APPROVED`. If Gate 2 has not been passed, stop.

1. Push the branch.
2. Open the PR **as a draft**. You never merge, and you never mark it ready for
   review on your own — a human does both.
3. PR description: what changed, why, the Jira key, a link to
   `.agentic/tickets/<KEY>/evidence.md`, and any assumptions still unconfirmed.
4. Transition the Jira ticket and comment with the evidence link.
5. Append to `DECISIONS.md`: what was decided, against which acceptance criteria,
   and the ticket key as the source.
6. Archive `.claude/current-scope.yaml` to `.agentic/tickets/<KEY>/` so the
   guards fall back to "no ticket in flight".
7. Set phase `PR`. Tell the human the functionality is complete and awaiting
   their merge.
