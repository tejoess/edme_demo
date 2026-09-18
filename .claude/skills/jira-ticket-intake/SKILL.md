---
name: jira-ticket-intake
description: Pull a Jira ticket's full context — description, acceptance criteria, comments, and linked issues — via the Atlassian MCP connector, before planning starts.
---

Given a ticket key:

1. Fetch the ticket's summary, description, and acceptance criteria.
2. Fetch comments — clarifications often live there, not in the original
   description.
3. Fetch linked issues (blocks/is blocked by/relates to) — a plan that
   ignores a linked ticket is a plan built on incomplete context.
4. Read the whole description, not just the top. Tickets from the
   Requirement Agent inline three sections: the feature contract, the
   original requirement verbatim, and the clarification Q&A. All three are
   context. There are no attachments to fetch — the connector cannot
   download them, which is precisely why phase 1 inlines everything.
5. Do not proceed to planning on a ticket that's missing acceptance
   criteria entirely — flag it back on the ticket and ask, rather than
   guessing what "done" means.
6. Do not proceed on a ticket whose contract still lists unresolved
   `open_questions`. Those are product decisions the PM could not settle,
   and planning around one means inventing a requirement. Raise it back to
   Part A and wait.