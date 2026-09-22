# Test Plan -- EPT-25: Policy Search & Filtering

Traceability: every TC-nnn below names the AC-nnn it covers (from
.claude/current-scope.yaml). TC ids will be carried inside the test
code itself once the implementer writes RED (e.g. Jest:
it("TC-001 / AC-001 ...") , or a test name containing tc001).

Scope note: TC-002, TC-005, TC-011, TC-014 below reflect the catalog-tab
schema gap in plan.md (Policies catalog tab has no policy_number/status
fields in the schema) -- resolved at Gate 1 as option (a): catalog tab
keeps title search + type-only filtering, no schema changes.

## AC-001 -- search by policy number (partial match), both tabs

- TC-001 (My Policies): given owned policies with policy_number values
  including "POL-12345", typing "123" into the search box leaves only
  policies whose policy_number contains "123" (case-insensitive),
  visible in the My Policies grid.
- TC-002 (Policies catalog, per ASSUMPTION-1): given catalog policies
  with titles including "Health Shield Plan", typing "health" into the
  search box leaves only policies whose title contains "health"
  (case-insensitive), visible in the Policies grid.

## AC-002 -- filter by policy status and policy type, both tabs

- TC-003 (My Policies, status): selecting the "active" status filter
  leaves only owned policies with status === "active" visible.
- TC-004 (My Policies, type): selecting the "health" type filter leaves
  only owned policies with policy_type === "health" visible.
- TC-005 (Policies catalog, type only, per ASSUMPTION-1): the shared
  PolicySearchFilter control bar is rendered on this tab (asserted via
  the presence of its accessible search textbox, getByRole("textbox",
  { name: /search/i }) -- the old standalone single-select FILTERS
  button row does not carry this control, so this fails until the new
  component ships); within that bar, selecting the "auto" type filter
  leaves only catalog policies with policy_type === "auto" visible; no
  status filter control is rendered on this tab. (Revised post-RED:
  the original wording only asserted "a type filter exists and
  filters," which the pre-existing single-select FILTERS bar already
  satisfied -- see red.log / DECISIONS.md note for EPT-25.)

## AC-003 -- search and multiple filters combine (AND, independent of
## each other against the full list)

- TC-006 (My Policies): with search "12", status "active", and type
  "health" all applied simultaneously, only policies satisfying all
  three simultaneously remain -- verified against a fixture where some
  policies match a subset of the criteria but not all, and one policy
  matches all three.
- TC-007 (Policies catalog): with search "shield" and type "health"
  applied together, only catalog policies satisfying both remain.

## AC-004 -- results scoped to criteria and to the active tab

- TC-008 (My Policies): the visible list after filtering never includes
  a policy the current user does not own (existing /userpolicies/
  authorization boundary preserved -- filtering must not introduce a
  client-side merge with the catalog list).
- TC-009 (Policies catalog): the visible list after filtering never
  includes fields or rows sourced from /userpolicies/ (e.g. no
  policy_number or per-user status leaking into catalog cards).
- TC-018 (both tabs): navigating from Policies to My Policies (or back)
  resets search and filter state on the destination tab -- entering a
  search/filter on one tab, navigating away and back does not leave
  stale criteria applied (covers the "switches tabs" edge case using
  the independent-state default from plan.md, confirmed at Gate 1).

## AC-005 -- empty state with clear button when nothing matches

- TC-010 (My Policies): search/filter combination that matches nothing
  (e.g. search "zzz") shows the "no policies match" empty state with a
  visible Clear button, distinct from the "no policies owned yet"
  empty state.
- TC-011 (Policies catalog): search/filter combination that matches
  nothing shows the "no policies match" empty state with a visible
  Clear button.
- TC-012 (My Policies): a user with zero owned policies and no
  search/filter applied sees the existing "no policies yet" empty
  state (unchanged copy, no Clear button implying filters are active),
  not the "no results" variant -- covers the ticket's explicit edge
  case distinguishing the two empty states.

## AC-006 -- clearing restores the full list for the active tab

- TC-013 (My Policies): with search and filters applied and the list
  narrowed, clicking Clear resets the search input to empty, deselects
  all filters, and the grid shows the full owned-policies list again.
- TC-014 (Policies catalog): with search and type filter applied and
  the list narrowed, clicking Clear resets the search input to empty,
  deselects the filter, and the grid shows the full catalog again.

## AC-007 -- controls are aligned, consistently spaced, and visually
## integrated with the existing UI

- TC-015 (RTL, both pages): PolicySearchFilter renders a search input
  and filter controls with accessible roles/labels
  (getByRole("textbox", { name: /search/i }) and equivalent for
  filters) on both Policies and MyPolicies -- verifies correct wiring,
  not layout (jsdom has no real CSS box model, per definition-of-done
  skill).
- TC-016 (Playwright, both pages): navigate to each tab, take a
  screenshot of the search/filter bar region, and assert no horizontal
  overflow/wrapping regressions against the existing page shell
  (`.page-content` width) -- this is the real alignment/spacing check
  the RTL test above cannot make.
- TC-017 (Playwright, both pages): end-to-end flow -- type a search
  term, select a filter, confirm the grid updates, click Clear, confirm
  the full list returns -- exercised once per tab as a smoke path over
  the whole feature.

## Coverage summary

| AC | TCs |
|---|---|
| AC-001 | TC-001, TC-002 |
| AC-002 | TC-003, TC-004, TC-005 |
| AC-003 | TC-006, TC-007 |
| AC-004 | TC-008, TC-009, TC-018 |
| AC-005 | TC-010, TC-011, TC-012 |
| AC-006 | TC-013, TC-014 |
| AC-007 | TC-015, TC-016, TC-017 |
