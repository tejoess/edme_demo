"""EPT-13 — admin approval applies new vehicle values. Covers AC-005, AC-008, AC-009."""

import pytest

import models
from conftest import seed_vehicle

PAYLOAD = {
    "make": "Honda",
    "model": "Civic",
    "year": 2021,
    "vin": "2HGCM82633A004352",
    "registration": "KA05CD4321",
}


def _pending(client, db, headers_a, user_policy_id, make_from="Toyota"):
    seed_vehicle(db, user_policy_id, make=make_from)
    resp = client.post(
        f"/userpolicies/{user_policy_id}/endorsements", json=PAYLOAD, headers=headers_a
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.tc("TC-040")
def test_tc040_approval_applies_new_values_and_stamps_decision(
    client, db, headers_a, headers_admin, admin, active_policy_a
):
    """AC-005: after approval the vehicle row reflects the new details and the
    endorsement becomes Approved with a decision date and decider."""
    endorsement_id = _pending(client, db, headers_a, active_policy_a.id)

    resp = client.post(f"/admin/endorsements/{endorsement_id}/approve", headers=headers_admin)
    assert resp.status_code == 200, resp.text

    db.expire_all()
    vehicle = db.query(models.Vehicle).filter_by(user_policy_id=active_policy_a.id).one()
    assert vehicle.make == "Honda"

    row = db.query(models.PolicyEndorsement).get(endorsement_id)
    assert row.status == "Approved"
    assert row.decision_date is not None
    assert row.decided_by == admin.id


@pytest.mark.tc("TC-041")
def test_tc041_approval_after_policy_expired_updates_vehicle_only(
    client, db, headers_a, headers_admin, active_policy_a
):
    """AC-005 / AC-008: approving after the policy expired updates the vehicle but
    leaves the policy status expired."""
    endorsement_id = _pending(client, db, headers_a, active_policy_a.id)

    active_policy_a.status = "expired"
    db.commit()

    resp = client.post(f"/admin/endorsements/{endorsement_id}/approve", headers=headers_admin)
    assert resp.status_code == 200, resp.text

    db.expire_all()
    assert db.query(models.Vehicle).filter_by(user_policy_id=active_policy_a.id).one().make == "Honda"
    assert db.query(models.UserPolicies).get(active_policy_a.id).status == "expired"
    assert db.query(models.PolicyEndorsement).get(endorsement_id).status == "Approved"


@pytest.mark.tc("TC-042")
def test_tc042_cannot_decide_an_already_decided_endorsement(
    client, db, headers_a, headers_admin, active_policy_a
):
    """AC-009: only Pending endorsements are decidable."""
    endorsement_id = _pending(client, db, headers_a, active_policy_a.id)

    first = client.post(f"/admin/endorsements/{endorsement_id}/approve", headers=headers_admin)
    assert first.status_code == 200, first.text

    again = client.post(f"/admin/endorsements/{endorsement_id}/approve", headers=headers_admin)
    reject_after = client.post(
        f"/admin/endorsements/{endorsement_id}/reject", headers=headers_admin
    )
    assert again.status_code in (400, 409), again.text
    assert reject_after.status_code in (400, 409), reject_after.text
