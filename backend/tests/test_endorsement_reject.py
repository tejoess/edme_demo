"""EPT-13 — admin rejection leaves the vehicle unchanged. Covers AC-007."""

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


@pytest.mark.tc("TC-050")
def test_tc050_rejection_leaves_vehicle_unchanged_and_stamps_decision(
    client, db, headers_a, headers_admin, admin, active_policy_a
):
    """AC-007: after rejection the vehicle details are unchanged and the
    endorsement status is Rejected with a decision date."""
    seed_vehicle(db, active_policy_a.id, make="Toyota")
    created = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements", json=PAYLOAD, headers=headers_a
    )
    assert created.status_code == 201, created.text
    endorsement_id = created.json()["id"]

    resp = client.post(f"/admin/endorsements/{endorsement_id}/reject", headers=headers_admin)
    assert resp.status_code == 200, resp.text

    db.expire_all()
    assert db.query(models.Vehicle).filter_by(user_policy_id=active_policy_a.id).one().make == "Toyota"

    row = db.query(models.PolicyEndorsement).get(endorsement_id)
    assert row.status == "Rejected"
    assert row.decision_date is not None
    assert row.decided_by == admin.id
