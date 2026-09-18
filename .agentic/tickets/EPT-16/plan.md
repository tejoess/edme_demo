# EPT-16 -- Policy PDF Download -- Plan

## Risk tier: MEDIUM

Rationale (risk-classification skill): this adds a new API endpoint that
returns another person's PII (name, premium, dates, policy number) gated by
an authorization check, and it exposes that data to three different personas
(policyholder / agent / staff). It does not touch schema, auth framework, or
infra, so it is not HIGH, but it is more than "isolated feature code" because
a bug in the permission check is a direct data-exposure (IDOR) risk, and it
reuses/extends a shared router (userpolicies.py, admin.py). Rounding up from
LOW to MEDIUM per the skill's guidance. The scope contract removes
dependency_install from forbidden operations (a new PDF library is
required) -- per definition-of-done, that removal is itself a signal the
reviewer should double check the tier at Gate 1, so it is called out here
explicitly rather than left for the diff to reveal.

## Ticket contract vs. reality -- flagged disagreements

The feature contract says the persona set is policyholder / agent / internal
staff, and AC-4 requires "agents can download PDFs for policies where they
are the assigned agent." Reading the actual codebase surfaced that no such
concept exists anywhere:

- backend/models.py User has no role column and no agent flag.
- Access control today is exactly one hardcoded check:
  current_user.email == ADMIN_EMAIL (backend/routers/login.py,
  backend/routers/admin.py). There is no third tier between "any
  authenticated user" and "the one admin email."
- UserPolicies (the only table with policy_number/dates/premium -- the six
  required PDF fields) has no agent_id / assigned-agent relationship of any
  kind, and neither does Policy.

This is a business decision (do agent accounts exist yet, how are they
assigned to policies, what does "assigned" even mean here) that phase 1 did
not resolve and that cannot be invented in the planning phase per project
rules. **Resolved at Gate 1 (2026-09-18): the agent role does not exist yet.
AC-4 is descoped from this ticket** rather than left blocked -- it is moved
to "Out of scope" below. Implementing agent-scoped download access is a
follow-up (or amended) ticket once an agent persona and policy-assignment
model are actually designed and approved; nothing here should be read as
having decided that design. This does not affect AC-1, 2, 3, 5, 6, which the
plan below implements in full.

Second, smaller disagreement worth flagging: the contract's "Areas of
change" says the button goes on "the policy list/dashboard view," but the
existing Policies.js page is a catalog of all policies available to buy
(health/life/travel/auto/home), not a list of the user's owned policies.
Un-owned catalog entries have no policy number, no policyholder, and no
start/end dates -- the very fields the PDF requires -- so they structurally
cannot produce a valid PDF. Resolution used in this plan: the button is
shown only on cards where isOwned(policy.id) is true (i.e. the policyholder
already holds that policy), which is consistent with the contract's own
business rule ("policyholders can only download PDFs for their own
policies") and edge case ("if user lacks permission... button is hidden").
This is an implementation clarification, not a business-scope change, so it
is treated as an assumption rather than an open question -- but it is called
out for reviewer awareness.

Third: for internal staff (admin), there is currently no page that lists
individual policies at all -- AdminDashboard.js only shows claims, dashboard
summary stats, and a claims CSV export. To give staff a place to click
"download," this plan adds a small new table to AdminDashboard.js listing
all UserPolicies rows (owner name, policy number, status) with a download
button per row. This is new UI, but it is exactly what AC-1 + AC-5 require
for the staff persona, so it is in scope rather than an expansion of it.

## Open questions

None remaining. The one blocking question (does an "agent" role exist as a
product concept, and if so how is an agent assigned to a policy/policyholder)
was raised and answered at Gate 1 on 2026-09-18: **no, the agent role does
not exist yet.** AC-4 is descoped from this ticket as a result -- see "Out
of scope" below. A future ticket should design the agent persona and
policy-assignment model before AC-4-equivalent functionality is built.

## Assumptions (non-blocking, stated for reviewer visibility)

- "Coverage type" maps to Policy.policy_type (health/life/travel/auto/home
  enum) -- the closest existing field to the contract's wording.
- "Coverage limits" has no dedicated column; Policy.coverage is a freeform
  JSONB blob with inconsistent keys across seed data (e.g.
  {"hospitalization": true, "opd": false}). The PDF will render this as a
  simple formatted key/value list, or "Not specified" if the object is empty
  or null. If product intends a distinct numeric "limits" concept, that is a
  data-model change outside this ticket.
- The download button is shown only for owned policies on the customer
  Policies page (see disagreement #2 above).
- Filename is built client-side as Policy_[PolicyNumber].pdf using the
  policy_number already present in the /userpolicies/ response -- no new
  header-parsing needed, consistent with Content-Disposition: attachment
  already used for CSV export.

## Files / APIs touched

Backend:
- backend/requirements.txt -- add a PDF generation library (reportlab,
  pure-Python, no native build step beyond what's already vendored for
  psycopg2-binary/bcrypt). No PDF library is currently present in this
  codebase; this is a new dependency.
- backend/routers/userpolicies.py -- new endpoint GET /userpolicies/{id}/pdf:
  - loads the UserPolicies row (404 if missing), joins Policy (for
    title/policy_type/coverage) and User (for policyholder name).
  - permission: allow if current_user.id == userpolicy.user_id
    (policyholder), or current_user.email == ADMIN_EMAIL (internal staff).
    Otherwise 403. (Agent branch intentionally omitted -- AC-4 descoped,
    see "Out of scope".)
  - builds the PDF in-memory (reportlab canvas / SimpleDocTemplate into a
    BytesIO), returns StreamingResponse with media_type="application/pdf"
    and Content-Disposition: attachment; filename=Policy_<policy_number>.pdf,
    mirroring the existing export_claims CSV pattern in admin.py.
  - on any generation error, returns a 500 with a JSON detail message
    (caught by the existing apiFetch/apiFetchBlob error handling, which
    already surfaces err.message via toast) -- satisfies the "generation
    fails -> user sees error, can retry" edge case with no new frontend
    plumbing.
- backend/routers/admin.py -- new endpoint GET /admin/policies (admin-only,
  via the existing admin_only dependency): returns all UserPolicies rows
  joined with User.name and Policy.title / policy_type, for the new admin
  table to enumerate ids to download.

Frontend:
- frontend/src/pages/Policies.js -- add a "Download PDF" button inside
  card-actions, visible only when owned is true, calling
  apiFetchBlob(/userpolicies/${owned.id}/pdf) and triggering download via
  the existing anchor-download blob pattern (same as AdminDashboard.js's
  exportCSV), named Policy_${owned.policy_number}.pdf.
- frontend/src/pages/Policies.css -- minor styling for the new button
  (reuse existing .btn / .btn-secondary classes if visually sufficient --
  no new classes unless needed).
- frontend/src/pages/AdminDashboard.js -- new "All Policies" table section
  fetching GET /admin/policies, with a per-row download button using the
  same blob pattern against GET /userpolicies/{id}/pdf.
- frontend/src/pages/AdminDashboard.css -- styling for the new table.
- frontend/src/utils/apiClient.js -- no change expected; apiFetchBlob
  already exists and is generic enough to reuse as-is.

## Database changes: none

No table, column, index, or migration is added or altered. UserPolicies
already has every field the PDF needs except the freeform coverage blob's
shape (see assumptions). The PDF is generated on-demand from existing rows,
per the contract's explicit "not pre-stored" requirement.

## Ordered implementation steps

1. Add reportlab to backend/requirements.txt.
2. Implement GET /userpolicies/{id}/pdf in backend/routers/userpolicies.py
   with the permission check and PDF body described above.
3. Implement GET /admin/policies in backend/routers/admin.py.
4. Add the download button + blob-download handler to Policies.js
   (owned-only), with try/catch -> toast error on failure (retry = click
   again, no special retry UI needed -- consistent with existing
   buyPolicy/exportCSV error handling already in this codebase).
5. Add the "All Policies" table + download button to AdminDashboard.js.
6. Manual verification pass in Chrome, Firefox, Safari, Edge for AC-7 (see
   test plan -- this AC has no meaningful automated equivalent beyond
   confirming the mechanism used is the standard <a download> + Blob API,
   which every evergreen browser supports identically; there is no
   browser-specific API in this design).

## Trade-offs / caveats

- Reusing reportlab for a one-page detail PDF is heavier than strictly
  necessary but avoids introducing two different PDF-adjacent libraries; it
  is a pure-Python wheel so it should not complicate the existing
  requirements.txt install story.
- The new GET /admin/policies listing endpoint is not explicitly requested
  by the ticket text, but is the minimum needed to give internal staff
  something to click "download" from, per the areas-of-change / AC-1 / AC-5
  combination -- flagged above as an assumption, not silently added.
## Out of scope

Carried verbatim from the ticket:
- Downloading multiple policies at once (bulk download)
- Customizing which fields appear in the PDF
- Email or share functionality for the PDF
- PDF preview before download
- Download history or audit log of who downloaded what
- Downloading from policy detail page (only from list view)

Descoped at Gate 1 (2026-09-18):
- **AC-4 ("Agents can download PDFs for their assigned policies")** --
  the agent role does not exist yet in this codebase (no `role` column, no
  agent-to-policy assignment). Human confirmed at approval: implement the
  download functionality without it. Removed from this ticket's acceptance
  criteria and scope contract; belongs to a future ticket once an agent
  persona/assignment model is designed.
