# Evidence -- EPT-15 (Policy Cancellation)

Generated 2026-09-18 by tester (Phase 5) from raw runner output. collect-evidence.sh
was not auto-run: it shells out to git diff / git rev-parse --show-toplevel, and this
working copy does not resolve to its own git repository in this environment (git
commands were also explicitly out of scope for this run per task instructions), so
this bundle was assembled by hand from the same raw logs the script would have
transcribed. No pass/fail line below is asserted without a corresponding raw log
excerpt in .agentic/tickets/EPT-15/logs/.

Raw logs: .agentic/tickets/EPT-15/logs/  --  RED baseline: red.log

## RED to GREEN (the load-bearing artifact)

red.log (captured 2026-09-17T19:42:19Z, before implementation) shows all 14 frozen
TCs failing:

- Backend (pytest backend/tests/test_userpolicies_cancel.py -v): 9 failed --
  TC-001, TC-003, TC-004, TC-006, TC-007, TC-008, TC-009, TC-010, TC-014 (all 404
  Not Found -- endpoint did not exist yet, or wrong error body for the two
  404-body tests).
- Frontend (react-scripts test src/pages/Policies.cancel.test.js): 5 failed --
  TC-002, TC-005, TC-011, TC-012, TC-013 (no Cancel Policy button/badge existed yet).

Phase 5 (this run) re-ran the exact same 14 tests, unmodified (frozen), against the
implemented code:

Backend, full suite, logs/unit-tests.log:
  test_tc001_owner_can_cancel_active_policy PASSED
  test_tc003_status_persisted_after_cancel PASSED
  test_tc004_cancellation_recorded_with_timestamp_and_history_row PASSED
  test_tc006_cancel_already_cancelled_returns_400 PASSED
  test_tc007_cancel_non_active_status_returns_400 PASSED
  test_tc008_non_owner_cannot_cancel_others_policy PASSED
  test_tc009_cancel_nonexistent_policy_returns_404 PASSED
  test_tc010_success_response_has_human_readable_message PASSED
  test_tc014_concurrent_cancel_requests_only_one_succeeds PASSED
  9 passed, 4 warnings in 21.24s

This is the entire backend/tests/ directory -- there is no other backend test file
in the repo, so this is also the full backend regression suite, not just the new
file.

Frontend, EPT-15 file, logs/frontend-tests.log:
  PASS src/pages/Policies.cancel.test.js
    TC-002 / AC-001 -- confirming cancellation in the modal calls the cancel API and updates the UI
    TC-005 / AC-003 -- a cancelled policy card shows a Cancelled badge and the cancellation date
    TC-011 / AC-006 -- successful cancellation shows a readable success toast
    TC-012 / AC-007 -- a rejected cancellation shows the backend's error detail as a toast
    TC-013 / edge case -- dismissing the confirm modal makes no API call and leaves the policy unchanged

All 14 RED tests are confirmed GREEN, unmodified.

## Verification layers

| Layer | Command actually run | Result | Log |
|---|---|---|---|
| Build (frontend) | cd frontend && CI=true npx react-scripts build | PASS -- "Compiled successfully." | logs/frontend-build.log |
| Build (backend) | no build step beyond import; exercised implicitly by every pytest run (imports main.py, database.py, models.py) | PASS (implicit) | logs/unit-tests.log |
| Lint (backend) | none run -- SKIPPED, no lint tool configured anywhere in this repo (no flake8/black/pylint in backend/requirements.txt, no .flake8/setup.cfg/pyproject.toml; pylint resolves as an importable transitive dependency only, not a configured project tool) | SKIPPED (no command configured) | -- |
| Lint (frontend) | no standalone lint script exists in package.json; CRA's built-in ESLint (eslintConfig: extends react-app, react-app/jest) runs automatically as part of react-scripts build and react-scripts test | PASS (0 warnings/errors in build output) | logs/frontend-build.log |
| Type check | not configured (Python: no mypy config; frontend: plain JS, no TS) -- per scope contract this is optional | SKIPPED (no command configured) | -- |
| Unit tests (backend) | cd backend && python -m pytest -v | PASS -- 9 passed, 0 failed | logs/unit-tests.log |
| Unit tests (frontend, RTL) | cd frontend && CI=true npx react-scripts test --watchAll=false --verbose | 1 suite failed (App.test.js, pre-existing/out of scope), EPT-15 suite (Policies.cancel.test.js) fully PASS (5/5) -- see note below | logs/frontend-tests.log |
| Integration / API tests | Same backend pytest suite as above -- this repo has no separate integration layer; the 9 backend tests hit the real FastAPI app plus real Postgres (ipm_db_demo, port 5435) through TestClient, exercising the full HTTP -> router -> ORM -> DB round trip, which is what "integration/API" means here | PASS -- 9/9 | logs/unit-tests.log |
| UI tests | Covered by the same frontend RTL suite (Policies.cancel.test.js) -- there is no separate e2e/Playwright layer in this repo or referenced by scope | PASS -- 5/5 | logs/frontend-tests.log |
| Migration up | Applied database/init.sql then database/migrations/0001_add_policy_cancellation.up.sql to a disposable throwaway postgres:16 container (ept15_disposable_pg), not the shared dev DB | PASS -- cancelled_at column and policy_status_history table (with FK + index) present after apply | logs/migration.log |
| Migration down | Applied 0001_add_policy_cancellation.down.sql to the same disposable container | PASS -- cancelled_at column dropped, policy_status_history table dropped (backslash-d confirms both gone) | logs/migration.log |

Pre-existing, out-of-scope failure noted, not fixed: frontend/src/App.test.js (CRAs
default boilerplate test) fails with "useToast must be used within a ToastProvider".
App.js and context/ToastContext.js were both last modified 2026-09-10/11, before
EPT-15 branch work started (2026-09-18), and neither file is in EPT-15 allowed_paths.
This is a pre-existing defect unrelated to this ticket scope; it is not one of the
14 frozen TCs and was not touched by this ticket or by this verification run.
Flagging for the review gate rather than silently ignoring it.

Migration verification method (per task instruction -- shared dev DB was not
touched): ipm_db_demo (the shared dev Postgres, port 5435) already had the up
migration applied by the implementer (verified via backslash-d userpolicies and
backslash-d policy_status_history showing cancelled_at and the new table present --
see logs/migration.log) and was NOT modified further by this verification run.
Instead, a separate disposable postgres:16 container was started fresh,
database/init.sql was applied to build the base schema, then the up-migration was
applied and verified, then the down-migration was applied and verified, then the
container was removed (docker rm -f ept15_disposable_pg). ipm_db_demo cancelled_at
column was re-checked afterward and confirmed still present and untouched.

## AC to TC coverage

| AC | TC(s) | In test suite | Result |
|---|---|---|---|
| AC-001 | TC-001 (backend), TC-002 (frontend) | yes | PASS / PASS |
| AC-002 | TC-003 (backend) | yes | PASS |
| AC-003 | TC-004 (backend), TC-005 (frontend) | yes | PASS / PASS |
| AC-004 | TC-006, TC-007, TC-014 (backend) | yes | PASS / PASS / PASS |
| AC-005 | TC-008, TC-009 (backend) | yes | PASS / PASS |
| AC-006 | TC-010 (backend), TC-011 (frontend) | yes | PASS / PASS |
| AC-007 | TC-012 (frontend) | yes | PASS |
| (edge case, no AC id) | TC-013 (frontend) | yes | PASS |

All 7 acceptance criteria have at least one passing TC. No MISSING rows -- all 14 TC
ids from test-plan.md were found in the actual test files (grep for TC- ids against
backend/tests/test_userpolicies_cancel.py and
frontend/src/pages/Policies.cancel.test.js) and all resolved PASS in this run logs.

## Risk inputs

- Risk tier: HIGH (per plan.md / .claude/current-scope.yaml -- schema change plus
  authz-gated state mutation)
- Frozen tests touched: none (backend/tests/conftest.py,
  backend/tests/test_userpolicies_cancel.py,
  frontend/src/pages/Policies.cancel.test.js were read-only in this run)
- Migration: irreversible once any cancellation is recorded (per plan.md) -- both
  directions mechanically verified against a disposable DB in this run; not
  exercised against data with real cancellations, which the destructive
  down-migration doc already discloses as its stated limitation
- Public interface changed: new endpoint PATCH /userpolicies/{id}/cancel; new
  response schema CancelPolicyResponse -- reviewer to confirm scope from diff
- No overall risk rating is asserted here. These are the inputs; the pr-reviewer
  agent and the human draw the conclusion.
