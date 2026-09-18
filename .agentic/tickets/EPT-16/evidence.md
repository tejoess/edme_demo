# Evidence — EPT-16

_Generated 2026-09-18T05:11:42Z by collect-evidence.sh from runner output._
_Raw logs: `.agentic/tickets/EPT-16/logs/` · RED baseline: `red.log`_

## Verification

| Layer | Result |
|---|---|
| Build | PASS |
| Lint | SKIPPED (no command configured) |
| Type check | SKIPPED (no command configured) |
| Unit tests | PASS |
| Integration | PASS |
| Migration up | SKIPPED (no command configured) |
| Migration down | SKIPPED (no command configured) |

## Requirement coverage

| AC | TC | In test suite | Result |
|---|---|---|---|
| AC-001 | TC-001 | yes | see logs |
| AC-006 | TC-006 | yes | see logs |
| AC-007 | TC-007 | yes | see logs |
| AC-010 | TC-010 | yes | see logs |
| AC-011 | TC-011 | yes | see logs |
| AC-001 | TC-001 | yes | see logs |
| AC-002 | TC-002 | yes | see logs |
| AC-003 | TC-003 | yes | see logs |
| AC-005 | TC-005 | yes | see logs |
| AC-006 | TC-006 | yes | see logs |
| AC-007 | TC-007 | yes | see logs |
| AC-008 | TC-008 | yes | see logs |
| AC-009 | TC-009 | yes | see logs |
| AC-010 | TC-010 | yes | see logs |
| AC-011 | TC-011 | yes | see logs |

## Changes

```
 .agentic/tickets/EPT-16/frozen.lock       |   3 +
 .agentic/tickets/EPT-16/red.log           | 766 ++++++++++++++++++++++++++++++
 .agentic/tickets/EPT-16/state.json        |   6 +-
 .claude/current-scope.yaml                |   5 +-
 backend/requirements.txt                  |   6 +
 backend/routers/admin.py                  |  27 ++
 backend/routers/userpolicies.py           |  99 +++-
 backend/tests/__init__.py                 |   0
 backend/tests/conftest.py                 | 165 +++++++
 backend/tests/test_policy_pdf_download.py | 161 +++++++
 frontend/src/pages/AdminDashboard.css     |  25 +
 frontend/src/pages/AdminDashboard.js      | 102 +++-
 frontend/src/pages/Policies.js            |  36 +-
 frontend/src/pages/Policies.test.js       | 165 +++++++
 14 files changed, 1559 insertions(+), 7 deletions(-)
```

## Risk inputs

- Risk tier: MEDIUM
- Files changed: 1
- Migration touched: no
- Public interface changed: reviewer to confirm from diff.patch

_No overall risk rating is asserted here. These are the inputs; the
pr-reviewer agent and the human draw the conclusion._

## Tester notes (not computed by collect-evidence.sh)

- AC-007 cross-browser check is a required MANUAL step, not automated.
  TC-007 (automated proxy, passing above) only confirms the implementation
  uses the standard Blob plus anchor-download-attribute mechanism, with no
  browser-specific API ("msSaveBlob", vendor-prefixed calls, etc.) -- the
  same pattern already exercised by AdminDashboard's CSV export. It does
  NOT exercise real browser rendering or the OS download dialog. A human
  tester must still download a PDF from a policy row in Chrome, Firefox,
  Safari, and Edge and confirm it saves and opens correctly in each, per
  plan.md/test-plan.md. This is recorded here as PENDING MANUAL
  VERIFICATION for the review gate -- it is not claimed as passed.
- frontend/src/App.test.js (pre-existing, unrelated to this ticket) is
  currently FAILING ("useToast must be used within a ToastProvider" --
  App is rendered without wrapping it in ToastProvider in that test).
  This is out of scope for EPT-16 per the scope contract's allowed_paths
  and frozen_tests; it was not touched and is noted here only so the
  reviewer isn't surprised by it. It was excluded from the layers above,
  which target only Policies.test.js (this ticket's frozen suite).
- Command mapping used for the four required-per-scope-contract test
  categories (unit_tests, integration_tests, api_tests, ui_tests), since
  collect-evidence.sh only exposes Unit tests / Integration layers:
  backend pytest (backend/tests/test_policy_pdf_download.py, covers unit
  and API -- TC-002/003/005/006/008/009) was run as Unit tests; frontend
  RTL (frontend/src/pages/Policies.test.js, covers integration and UI --
  TC-001/003b/006b/007/010/011) was run as Integration. Both suites are
  this ticket's frozen tests and both are green.
- Lint and Type check are correctly SKIPPED: this repo has no ESLint
  config beyond CRA's built-in react-app / react-app-jest presets (no
  separate lint script) and no TypeScript/mypy configured for either
  frontend or backend. No command was fabricated for either layer.
- Migration up/down are correctly SKIPPED: plan.md records "Database
  changes: none" for this ticket, and forbidden_operations in
  .claude/current-scope.yaml excludes migration.
- RED confirmed reversed to GREEN: the same 6 backend tests that failed
  in .agentic/tickets/EPT-16/red.log with a 404 (route not yet
  implemented) -- test_tc002_pdf_contains_all_six_fields,
  test_tc003_policyholder_cannot_download_others_policy,
  test_tc005_staff_can_download_any_policy,
  test_tc006_filename_includes_policy_number,
  test_tc008_ongoing_policy_shows_ongoing_end_date,
  test_tc009_missing_coverage_shows_not_specified -- all pass now (see
  logs/unit-tests.log). No fix-loop iterations were needed; this is
  attempt 1 of max_attempts: 3.
- Coverage table above shows every delivered AC (AC-001, 002, 003, 005,
  006, 007, 008, 009, 010, 011) with its TC found ("yes", no MISSING
  rows). AC-004 is absent from the table by design -- it was descoped at
  Gate 1 and is not in current-scope.yaml's acceptance_criteria list or
  test-plan.md's delivered scope. The table lists some AC/TC pairs
  twice; that's a cosmetic artifact of the script's bidirectional regex
  over test-plan.md (it matches both orderings of AC-xxx and TC-xxx
  mentions), not a coverage gap -- each pair still correctly resolves to
  "yes", not MISSING.
