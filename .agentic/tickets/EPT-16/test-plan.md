# EPT-16 -- Policy PDF Download -- Test Plan

One or more test cases per acceptance criterion (traceability skill). ACs
are numbered AC-001..011 in the ticket's original list, with the four
promoted edge cases appended at the end (AC-008..011) per planner
instructions. **AC-004 was descoped at Gate 1 approval (2026-09-18)** --
the agent role does not exist in this codebase, and the human confirmed
implementing the download functionality without it. AC-004 is therefore
removed from `.claude/current-scope.yaml`'s `acceptance_criteria` list and
carries no TC in this ticket; it belongs to a future ticket. It is kept
below only as a record of why it's absent.

## AC-001: Download button visible next to each policy in the list for
authorized users

- TC-001 (frontend, RTL): render `Policies` with a mix of owned and
  un-owned catalog policies for a logged-in policyholder; assert the
  "Download PDF" button is present on every owned policy card and absent
  from un-owned cards.
  `// TC-001 / AC-001 -- download button shown only for owned policies`

## AC-002: Clicking button downloads a PDF with all six required fields
formatted clearly

- TC-002 (backend, pytest): call `GET /userpolicies/{id}/pdf` as the owning
  user for a fully-populated `UserPolicies` row; assert response
  `media_type == "application/pdf"`, status 200, and that the extracted PDF
  text (e.g. via `pdfplumber`/`PyPDF2` in the test) contains the policy
  number, policyholder name, coverage type, premium amount, start date, end
  date, and the coverage summary.
  `def test_tc002_pdf_contains_all_six_fields():`

## AC-003: Policyholders can only download their own policies

- TC-003 (backend, pytest): as policyholder A, call
  `GET /userpolicies/{id}/pdf` for a `UserPolicies` row owned by policyholder
  B; assert 403 and no PDF body is returned.
  `def test_tc003_policyholder_cannot_download_others_policy():`
- TC-003b (frontend, RTL): confirm the button is hidden (not disabled) on
  a card representing a policy the current user does not own -- covered
  jointly with TC-001's rendering assertion.

## AC-004: Agents can download PDFs for their assigned policies -- DESCOPED

**Descoped at Gate 1 (2026-09-18).** No "agent" persona, role, or
policy-assignment concept exists anywhere in the current data model (see
plan.md, "Ticket contract vs. reality"). Human confirmed at approval: the
agent role does not exist yet, implement the download functionality
without it. No TC exists for this AC in this ticket -- it is not part of
this ticket's delivered scope (see plan.md "Out of scope"). A future ticket
should design the agent persona/assignment model and add coverage then.

## AC-005: Internal staff can download any policy PDF

- TC-005 (backend, pytest): as the admin user (`current_user.email ==
  ADMIN_EMAIL`), call `GET /userpolicies/{id}/pdf` for a `UserPolicies` row
  owned by a different, non-admin user; assert 200 and a valid PDF body.
  `def test_tc005_staff_can_download_any_policy():`

## AC-006: PDF filename includes policy number

- TC-006 (backend, pytest): call `GET /userpolicies/{id}/pdf` as the owner;
  assert the `Content-Disposition` response header equals
  `attachment; filename=Policy_<policy_number>.pdf` for that row's actual
  `policy_number`.
  `def test_tc006_filename_includes_policy_number():`
- TC-006b (frontend, RTL/unit): given a mocked blob response, assert the
  client sets `link.download` to `Policy_${policy_number}.pdf` before
  triggering the click.
  `// TC-006b / AC-006 -- client-side download filename`

## AC-007: Download works in Chrome, Firefox, Safari, Edge

- TC-007 (automated proxy, frontend, RTL/unit): assert the download
  mechanism used is the standard `Blob` + `<a download>` pattern (same
  helper already exercised by `AdminDashboard`'s CSV export) and not any
  browser-specific API (no `msSaveBlob`, no vendor-prefixed API). This
  proves the implementation has no known single-browser dependency; it is
  **not** a substitute for actual cross-browser execution.
  `// TC-007 / AC-007 -- uses standard Blob/<a download>, no browser-specific API`
- **Manual verification required** (no automated equivalent exists for
  real browser rendering/download-dialog behavior): a human tester
  downloads a PDF from a policy row in Chrome, Firefox, Safari, and Edge
  and confirms the file saves and opens correctly in each. This is recorded
  as a manual step in `evidence.md`, not fabricated as an automated result.

## AC-008 (promoted edge case): No end date shows "Ongoing"

- TC-008 (backend, pytest): generate a PDF for a `UserPolicies` row with
  `end_date = None` (if the column allows it) or a policy type modeled as
  perpetual; assert the rendered PDF text contains "Ongoing" rather than a
  blank or null value. **Note:** `UserPolicies.end_date` is currently
  `nullable=False` in `models.py` -- if no code path can produce a null
  end date today, this test should assert the PDF layer's handling of a
  null/missing value defensively, and the discrepancy between this edge
  case and the current NOT NULL constraint should be raised alongside the
  AC-004 open question rather than silently loosening the column.
  `def test_tc008_ongoing_policy_shows_ongoing_end_date():`

## AC-009 (promoted edge case): Missing coverage limits shows "Not
specified"

- TC-009 (backend, pytest): generate a PDF for a `UserPolicies`/`Policy`
  pair where `Policy.coverage` is `null` or `{}`; assert the rendered PDF
  text contains "Not specified" for the coverage/limits field.
  `def test_tc009_missing_coverage_shows_not_specified():`

## AC-010 (promoted edge case): No permission -> button hidden, not
disabled

- TC-010 (frontend, RTL): render the Policies grid for a user who owns
  none of the listed catalog policies; assert no "Download PDF" button
  exists in the DOM at all for those cards (not merely `disabled`).
  `// TC-010 / AC-010 -- unauthorized rows render no download button`

## AC-011 (promoted edge case): PDF generation failure shows an error, user
can retry

- TC-011 (frontend, RTL, mocked fetch): mock `apiFetchBlob` to reject
  (simulating a 500 from the backend); assert a toast error is shown via
  the existing `useToast` error path and the download button remains
  clickable afterward (i.e. no disabled/stuck state blocks a retry).
  `// TC-011 / AC-011 -- generation failure surfaces a retryable error toast`

## Coverage summary

| AC | TC(s) | Status |
|---|---|---|
| AC-001 | TC-001 | planned |
| AC-002 | TC-002 | planned |
| AC-003 | TC-003, TC-003b | planned |
| AC-004 | -- | DESCOPED -- agent role does not exist, removed from this ticket |
| AC-005 | TC-005 | planned |
| AC-006 | TC-006, TC-006b | planned |
| AC-007 | TC-007 (automated proxy) + manual cross-browser pass | planned + manual |
| AC-008 | TC-008 | planned |
| AC-009 | TC-009 | planned |
| AC-010 | TC-010 | planned |
| AC-011 | TC-011 | planned |
