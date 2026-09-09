"""EPT-13 — customer submits a vehicle endorsement. Covers AC-001, AC-004, AC-010."""

import pytest

import models
from conftest import endorsement_count, seed_vehicle


@pytest.mark.tc("TC-001")
def test_tc001_customer_submits_update_for_own_active_policy(
    client, db, headers_a, active_policy_a, valid_vehicle_payload
):
    """AC-001: a customer can submit a vehicle detail update for their own active policy."""
    changed = {**valid_vehicle_payload, "make": "Honda"}
    resp = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements",
        json=changed,
        headers=headers_a,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "Pending"
    assert "id" in body
    assert "request_date" in body
    assert "old_values" in body and "new_values" in body
    assert endorsement_count(db, active_policy_a.id) == 1


@pytest.mark.tc("TC-002")
def test_tc002_first_update_snapshots_null_baseline_and_creates_no_vehicle_row(
    client, db, headers_a, active_policy_a, valid_vehicle_payload
):
    """AC-001 / AC-004: first-ever update snapshots an empty baseline; the vehicles
    row is created only on approval, not at submit time."""
    resp = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements",
        json=valid_vehicle_payload,
        headers=headers_a,
    )
    assert resp.status_code == 201, resp.text
    old_values = resp.json()["old_values"]
    # baseline shape: every field null / empty because there is no vehicle yet
    assert all(not old_values.get(f) for f in ("make", "model", "year", "vin", "registration"))
    assert db.query(models.Vehicle).filter_by(user_policy_id=active_policy_a.id).count() == 0


@pytest.mark.tc("TC-003")
def test_tc003_pending_endorsement_does_not_touch_live_vehicle(
    client, db, headers_a, active_policy_a, valid_vehicle_payload
):
    """AC-004: a Pending endorsement does not change the live vehicle details."""
    seed_vehicle(db, active_policy_a.id, make="Toyota")
    resp = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements",
        json={**valid_vehicle_payload, "make": "Honda"},
        headers=headers_a,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["new_values"]["make"] == "Honda"
    assert body["old_values"]["make"] == "Toyota"
    db.expire_all()
    live = db.query(models.Vehicle).filter_by(user_policy_id=active_policy_a.id).one()
    assert live.make == "Toyota"


@pytest.mark.tc("TC-004")
def test_tc004_multiple_pending_endorsements_allowed(
    client, db, headers_a, active_policy_a, valid_vehicle_payload
):
    """AC-010: multiple Pending endorsements for the same policy are allowed."""
    first = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements",
        json={**valid_vehicle_payload, "make": "Honda"},
        headers=headers_a,
    )
    second = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements",
        json={**valid_vehicle_payload, "make": "Ford"},
        headers=headers_a,
    )
    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert endorsement_count(db, active_policy_a.id) == 2
