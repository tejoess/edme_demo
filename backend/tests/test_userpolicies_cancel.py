"""
EPT-15 -- Policy Cancellation: backend/API test cases.

RED phase (red-first skill): these assert the behaviour described in
.agentic/tickets/EPT-15/plan.md and test-plan.md against the CURRENT,
unimplemented codebase. `PATCH /userpolicies/{id}/cancel` does not exist
yet, `userpolicies.cancelled_at` and the `policy_status_history` table do
not exist yet -- every test here is expected to fail for exactly those
reasons until the feature is implemented.

TC ids are carried in the test names themselves per the `traceability`
skill; see test-plan.md for the full AC -> TC mapping.
"""
from sqlalchemy import text

from conftest import make_user_policy, auth_headers


def test_tc001_owner_can_cancel_active_policy(client, customer, seed_policy_id, db):
    """TC-001 / AC-001 -- an authorized customer can cancel their own active policy."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="active")

    resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(customer["token"])
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled"


def test_tc003_status_persisted_after_cancel(client, customer, seed_policy_id, db):
    """TC-003 / AC-002 -- the cancelled status is persisted, not just returned."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="active")

    cancel_resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(customer["token"])
    )
    assert cancel_resp.status_code == 200, cancel_resp.text

    get_resp = client.get("/userpolicies/", headers=auth_headers(customer["token"]))
    assert get_resp.status_code == 200, get_resp.text

    row = next((p for p in get_resp.json() if p["id"] == up_id), None)
    assert row is not None, "expected the cancelled user_policy to still be listed"
    assert row["status"] == "cancelled"


def test_tc004_cancellation_recorded_with_timestamp_and_history_row(
    client, customer, seed_policy_id, db
):
    """TC-004 / AC-003 -- cancelled_at is set and exactly one history row is created."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="active")

    cancel_resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(customer["token"])
    )
    assert cancel_resp.status_code == 200, cancel_resp.text

    row = db.execute(
        text("SELECT cancelled_at FROM userpolicies WHERE id = :id"), {"id": up_id}
    ).first()
    assert row is not None
    assert row[0] is not None, "cancelled_at should be set to a non-null timestamp"

    history = db.execute(
        text(
            "SELECT previous_status, new_status, changed_at "
            "FROM policy_status_history WHERE user_policy_id = :id"
        ),
        {"id": up_id},
    ).fetchall()
    assert len(history) == 1, f"expected exactly one history row, got {len(history)}"
    assert history[0][0] == "active"
    assert history[0][1] == "cancelled"
    assert history[0][2] is not None


def test_tc006_cancel_already_cancelled_returns_400(client, customer, seed_policy_id, db):
    """TC-006 / AC-004 -- cancelling an already-cancelled policy is rejected."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="cancelled")

    resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(customer["token"])
    )

    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "This policy has already been cancelled"

    history_count = db.execute(
        text("SELECT count(*) FROM policy_status_history WHERE user_policy_id = :id"),
        {"id": up_id},
    ).scalar()
    assert history_count == 0, "no history row should be created on a rejected cancel"


def test_tc007_cancel_non_active_status_returns_400(client, customer, seed_policy_id, db):
    """TC-007 / AC-004 -- a non-active, non-cancelled status (e.g. 'lapsed') is rejected."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="lapsed")

    resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(customer["token"])
    )

    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Only active policies can be cancelled"


def test_tc008_non_owner_cannot_cancel_others_policy(
    client, customer, other_customer, seed_policy_id, db
):
    """TC-008 / AC-005 -- User B cannot cancel User A's policy; A's row is unchanged."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="active")

    resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(other_customer["token"])
    )

    assert resp.status_code == 404, resp.text
    assert resp.json()["detail"] == "Policy not found"

    row = db.execute(
        text("SELECT status FROM userpolicies WHERE id = :id"), {"id": up_id}
    ).first()
    assert row[0] == "active", "owner's policy must remain untouched"

    history_count = db.execute(
        text("SELECT count(*) FROM policy_status_history WHERE user_policy_id = :id"),
        {"id": up_id},
    ).scalar()
    assert history_count == 0


def test_tc009_cancel_nonexistent_policy_returns_404(client, customer):
    """TC-009 / AC-005 -- cancelling a non-existent user_policy_id returns a clear 404."""
    nonexistent_id = 999_999_999

    resp = client.patch(
        f"/userpolicies/{nonexistent_id}/cancel", headers=auth_headers(customer["token"])
    )

    assert resp.status_code == 404, resp.text
    assert resp.json()["detail"] == "Policy not found"


def test_tc010_success_response_has_human_readable_message(
    client, customer, seed_policy_id, db
):
    """TC-010 / AC-006 -- the success response includes a human-readable message."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="active")

    resp = client.patch(
        f"/userpolicies/{up_id}/cancel", headers=auth_headers(customer["token"])
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["message"] == "Policy cancelled successfully"


def test_tc014_concurrent_cancel_requests_only_one_succeeds(
    client, customer, seed_policy_id, db
):
    """TC-014 / AC-004 -- race condition: only one of two back-to-back cancel
    requests for the same user_policy_id succeeds; the DB-level conditional
    UPDATE must make the check-then-act atomic."""
    up_id = make_user_policy(db, customer["id"], seed_policy_id, status="active")
    headers = auth_headers(customer["token"])

    responses = [
        client.patch(f"/userpolicies/{up_id}/cancel", headers=headers) for _ in range(2)
    ]

    status_codes = sorted(r.status_code for r in responses)
    assert status_codes == [200, 400], [r.text for r in responses]

    success_resp = next(r for r in responses if r.status_code == 200)
    failure_resp = next(r for r in responses if r.status_code == 400)
    assert success_resp.json()["status"] == "cancelled"
    assert failure_resp.json()["detail"] == "This policy has already been cancelled"

    history_count = db.execute(
        text("SELECT count(*) FROM policy_status_history WHERE user_policy_id = :id"),
        {"id": up_id},
    ).scalar()
    assert history_count == 1, "exactly one history row should be created"
