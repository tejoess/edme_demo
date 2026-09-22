# Plan — EPT-25: Policy Search & Filtering

## Database changes: none

No schema, migration, or API endpoint changes are proposed. Search and
filtering are implemented client-side in React against data already
returned in full by the existing GET /policies and GET /userpolicies/
endpoints (confirmed by reading backend/routers/policies.py and
backend/routers/userpolicies.py -- both already fetch full result sets
with no pagination or filtering, so no backend change is required to
serve the necessary rows).

---

## RESOLVED at Gate 1 (human decision, 2026-09-21)

- ASSUMPTION-1: option (a) confirmed -- catalog tab keeps title search +
  type-only filtering; no policy_number/status concepts added to the
  catalog Policy model. See details below.
- Tab-state persistence: current plan's default confirmed -- independent
  per-tab state, resets on navigation between Policies and My Policies.
- Policies.js's single-select FILTERS bar -> multi-select type filter:
  confirmed as an intended, not incidental, behavior change.

---

## Schema note -- Policies (catalog) tab has no policy_number/status

Read directly from backend/models.py:

- Policy (the catalog / marketplace table, /policies): id, provider_id,
  policy_type, title, coverage, premium, term_months, deductible,
  tnc_url, created_at. No policy_number field. No status field.
- UserPolicies (a customer's purchased policies, /userpolicies/): has
  policy_number (assigned at purchase time, e.g. POL-12345, see
  backend/routers/userpolicies.py line 40) and status
  (active/expired/cancelled/pending).

The ticket's AC-001 and AC-002 (below) ask for policy-number search and
status filtering "in both tabs," but the Policies catalog tab has
neither concept in the data model today -- a catalog product has no
purchase-assigned number and no lifecycle status; those only exist once
a policy is bought. This matches a known category of PRD/schema drift
on this project (fields a PRD assumes that do not exist in the real
schema).
This is a business question, not an implementation detail, so it is not
being resolved silently here. Two ways to close it:

- (a) Descope: policy-number search and status filtering apply to My
  Policies only; the Policies catalog tab keeps type filtering (already
  partially implemented) and gets a search box against the nearest
  available identifying field.
- (b) Add real policy_number/status concepts to the catalog Policy model
  (a product SKU/catalog code, and something like available/discontinued)
  -- this would be a schema migration and a new business decision about
  what "status" means for an unpurchased product, currently undefined
  anywhere in the PRD or ticket.
Option (a) confirmed at Gate 1 (see "RESOLVED at Gate 1" above). Concretely:

| Tab | Search | Status filter | Type filter |
|---|---|---|---|
| My Policies | by policy_number, partial match | yes (active/expired/cancelled/pending) | yes (policy_type) |
| Policies (catalog) | by title, partial match (no policy_number exists) | not implemented -- no status concept exists for catalog products | yes (policy_type, already partially present as the single-select FILTERS buttons, extended to combine with search) |

Option (b) was not chosen -- no migration, no new catalog status concept.

---

## Risk tier: MEDIUM

Per risk-classification skill: this is UI/logic work with no auth,
schema, or infra involved, which argues LOW. Rounding up per the skill's
"when in doubt, round up" rule because:
- It modifies two existing, already-live pages (Policies.js,
  MyPolicies.js) that carry purchase/claims flows, not just isolated
  new code.
- AC-007 makes visual alignment an explicit acceptance criterion, which
  per definition-of-done requires real Playwright/screenshot
  verification, not just jsdom component tests -- this is not a
  "unit-tested internal logic" change even though it touches no backend.

## Summary

Add a shared search box (partial-match) and filter controls (status,
type) to the Policies catalog and My Policies pages, evaluated
independently against each tab's full list (search AND all filters, per
the PM's recorded clarification), with a clear action and a distinct
empty-state message when nothing matches vs. when the tab has no data
at all. No backend or schema changes. See the "RESOLVED at Gate 1"
section above for the PRD/schema gap this plan works around, confirmed
by the human rather than inventing a status field for catalog products.

## Files / APIs touched

- frontend/src/pages/Policies.js -- add search input + status/type
  filter controls (extends existing activeFilter/FILTERS single-select
  into a combinable filter set); wire to a new shared filtering helper.
- frontend/src/pages/Policies.css -- new styles for the search/filter
  bar, reusing existing tokens (--gray-200, --color-primary, etc.
  already used by .filter-tabs).
- frontend/src/pages/MyPolicies.js -- add search input + status/type
  filter controls (new; MyPolicies currently has no filtering at all).
- frontend/src/pages/MyPolicies.css -- matching styles.
- frontend/src/components/PolicySearchFilter.js (new) -- shared,
  presentational search+filter bar component used by both pages, so
  AC-007 ("identical controls on both tabs," "consistent with existing
  application design") is satisfied by construction rather than by two
  independently-styled implementations drifting apart.
- frontend/src/components/PolicySearchFilter.css (new) -- its styles.
- frontend/src/utils/policyFilter.js (new) -- small pure function(s)
  implementing the substring-match + AND-combination logic, unit-tested
  directly (this is the part carrying the real behavioral risk, so it is
  isolated from the component tree for cheap, fast test coverage).
- No files under backend/ are touched.

No new API endpoints, no new request params -- both /policies and
/userpolicies/ already return the full list; filtering is client-side
against data already in memory, consistent with the existing
activeFilter pattern in Policies.js.

## Ordered steps

1. Write frontend/src/utils/policyFilter.js: pure functions
   matchesSearch(item, query, field) (case-insensitive substring) and
   applyFilters(items, { search, searchField, status, type }) that AND
   search with every selected filter, evaluated independently against
   the full input list (per PM clarification -- not sequential
   narrowing).
2. Write frontend/src/components/PolicySearchFilter.js: controlled
   search input, status multi-select, type multi-select (reusing
   existing button/select styling primitives already in the CSS rather
   than introducing a new design pattern), and a "Clear" action. Emits
   { search, status, type } up to the parent; takes
   statusOptions/typeOptions as props so the two pages can pass
   different option sets (catalog has no status options under
   ASSUMPTION-1).
3. Wire MyPolicies.js: add local state for search/statusFilter/
   typeFilter, derive visiblePolicies via applyFilters, render
   PolicySearchFilter above the grid, and split the existing empty
   state into two variants -- "no policies owned yet" (current
   behavior, unchanged, shown when the unfiltered list is empty) vs.
   "no policies match your search/filters" (new, shown when the
   unfiltered list is non-empty but the filtered list is empty;
   includes the Clear button per AC-005).
4. Wire Policies.js: replace the single-select FILTERS bar with
   PolicySearchFilter (type-only options under ASSUMPTION-1, search by
   title), combine with the existing filteredPolicies derivation, and
   apply the same empty-state split as step 3.
5. Style pass in both .css files for alignment/spacing (AC-007),
   reusing existing tokens.
6. Tests: unit tests for policyFilter.js, RTL tests for
   PolicySearchFilter and both pages, Playwright spec covering the
   end-to-end search+filter+clear flow and a screenshot check for
   alignment on both tabs.

## Trade-offs / caveats

- The catalog-tab schema gap (see "RESOLVED at Gate 1") changes what
  "filter by status" and "search by policy number" mean on the catalog
  tab -- confirmed as option (a) at Gate 1.
- The PM's ticket left tab-state persistence as "Needs discussion" (see
  ticket Clarifications). Reading frontend/src/App.js, Policies and My
  Policies are already separate pages that mount/unmount via a simple
  page-state switch, not tabs sharing one component -- so independent
  per-tab state (each resets on navigation) is what happens with zero
  extra plumbing. Confirmed at Gate 1: independent state, no persistence
  across navigation.
- Introducing a new shared PolicySearchFilter component is slightly
  more surface area than inlining the controls twice, but avoids the
  two tabs' controls drifting apart, which AC-007 explicitly cares
  about.
- Policies.js's existing single-select category filter (FILTERS
  buttons: all/health/life/travel/auto/home) is being replaced by a
  multi-select type filter inside PolicySearchFilter to satisfy "filter
  by policy type" as a combinable filter alongside search -- this is a
  visible behavior change to existing UI (single overall category tabs
  -> multi-select filter chips), confirmed as intended at Gate 1.

## Out of scope (per ticket)

- Editing/creating policies, full-text search of descriptions, cross-tab
  authorized-data leakage, persisting search/filter state across browser
  sessions, sorting by relevance.
- (This plan) Catalog-tab status filtering and true policy-number
  search -- confirmed out of scope at Gate 1 (option (a)).

## Bug reproduction artifact

Not applicable -- EPT-25 is a feature ticket (Jira issue type: Task),
not a bug. reproduce-bug skill was not run per the pipeline's bug-only
branch.
