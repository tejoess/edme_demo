# Test Plan -- EPT-15: Policy Cancellation

Every AC has at least one TC. IDs are carried inside the test code itself
per the `traceability` skill (e.g. pytest `def test_tc001_...`, Jest
`it("TC-002 / AC-001 -- ...")`), not maintained only in this document.

## AC-001: An authorized customer can successfully cancel their own active policy

- **TC-001** (backend, API) -- Given a logged-in customer who owns an
  `active` `UserPolicies` row, `PATCH /userpolicies/{id}/cancel` returns
  `200` and the response `status` is `"cancelled"`.
- **TC-002** (frontend, RTL) -- Customer clicks "Cancel Policy" on an owned
  active policy card, confirms in the modal; the API call fires and the UI
  updates to show the cancelled state.

## AC-002: Policy status changes to 'Cancelled' after successful cancellation

- **TC-003** (backend, API) -- After a successful cancel call, re-fetching
  the `UserPolicies` row (e.g. via `GET /userpolicies/`) shows
  `status == "cancelled"` persisted in the database, not just in the
  response body.

## AC-003: Cancellation date is recorded and visible in policy history

- **TC-004** (backend, API/DB) -- After a successful cancel call,
  `UserPolicies.cancelled_at` is set to a non-null timestamp, and exactly
  one `PolicyStatusHistory` row exists for that `user_policy_id` with
  `previous_status="active"`, `new_status="cancelled"`, and a `changed_at`
  timestamp.
- **TC-005** (frontend, RTL) -- After a successful cancellation, the policy
  card displays a "Cancelled" badge and the cancellation date returned by
  the API.

## AC-004: Customer cannot cancel a policy that is already cancelled or inactive

- **TC-006** (backend, API) -- Calling cancel a second time on an already-
  `cancelled` policy returns `400` with detail
  `"This policy has already been cancelled"`, and no new history row is
  created.
- **TC-007** (backend, API) -- Calling cancel on a `UserPolicies` row whose
  `status` is anything other than `"active"` or `"cancelled"` (e.g. a row
  manually set to `"lapsed"` in the test fixture, standing in for a status
  the app cannot yet produce on its own -- see plan.md's note on
  expired/lapsed) returns `400` with detail
  `"Only active policies can be cancelled"`.

## AC-005: Customer cannot cancel a policy they are not authorized to access

- **TC-008** (backend, API) -- User B calls cancel on a `UserPolicies` row
  owned by User A; response is `404`, and User A's row is unchanged
  (`status` still `"active"`, no history row created).
- **TC-009** (backend, API) -- Calling cancel with a `user_policy_id` that
  does not exist at all returns `404` with a clear detail message.

## AC-006: Customer receives clear success message after cancellation

- **TC-010** (backend, API) -- The `200` response body's `message` field is
  a human-readable success string (e.g. `"Policy cancelled successfully"`).
- **TC-011** (frontend, RTL) -- On successful cancellation, a success toast
  is shown to the user with readable text (not a raw status code).

## AC-007: Customer receives clear error message when cancellation is not allowed

- **TC-012** (frontend, RTL) -- When the API rejects a cancellation (already
  cancelled, not owned, or not active), the UI shows an error toast whose
  text matches the backend's `detail` message, not a generic failure string.

## Edge cases promoted to acceptance-level behaviour

- **TC-013** (frontend, RTL) -- Customer opens the cancel confirmation modal
  and dismisses it (clicks "Cancel"/backdrop) without confirming: no API
  call is made, and the policy's status/UI is unchanged.
- **TC-014** (backend, API) -- Race condition: simulate the policy's status
  changing between "view" and "confirm" by issuing two cancel requests for
  the same `user_policy_id` back-to-back (or by flipping the row's status in
  the DB directly between the read and the second call in the test). Exactly
  one request succeeds (`200`, `status="cancelled"`); the other receives
  `400 "This policy has already been cancelled"`. Only one
  `PolicyStatusHistory` row is created -- proves the server-side conditional
  `UPDATE` is atomic and not a check-then-act race.
