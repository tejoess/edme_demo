"""EPT-13 — authorization on submit and on the admin decision endpoints.
Covers AC-003 and AC-009.
"""

import pytest

import models
from conftest import endorsement_count, seed_vehicle

PAYLOAD = {
    "make": "Honda",
    "model": "Civic",
    "year": 2021,
    "vin": "2HGCM82633A004352",
    "registration": "KA05CD4321",
}


def _create_pending(client, db, headers, user_policy_id):
    seed_vehicle(db, user_policy_id, make="Toyota")
    resp = client.post(
        f"/userpolicies/{user_policy_id}/endorsements", json=PAYLOAD, headers=headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.tc("TC-020")
def test_tc020_cannot_submit_against_another_customers_policy(
    client, db, headers_b, active_policy_a
):
    """AC-003: customer B cannot submit an endorsement on customer A's policy."""
    resp = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements", json=PAYLOAD, headers=headers_b
    )
    assert resp.status_code == 403, resp.text
    assert endorsement_count(db, active_policy_a.id) == 0


@pytest.mark.tc("TC-021")
def test_tc021_unauthenticated_submit_blocked(client, db, active_policy_a):
    """AC-003: an unauthenticated submit is rejected."""
    resp = client.post(f"/userpolicies/{active_policy_a.id}/endorsements", json=PAYLOAD)
    assert resp.status_code == 401, resp.text
    assert endorsement_count(db, active_policy_a.id) == 0


@pytest.mark.tc("TC-022")
def test_tc022_non_admin_cannot_approve_or_reject(
    client, db, headers_a, active_policy_a
):
    """AC-009: a non-admin caller cannot approve or reject; the endorsement stays Pending."""
    endorsement_id = _create_pending(client, db, headers_a, active_policy_a.id)

    approve = client.post(f"/admin/endorsements/{endorsement_id}/approve", headers=headers_a)
    reject = client.post(f"/admin/endorsements/{endorsement_id}/reject", headers=headers_a)
    assert approve.status_code == 403, approve.text
    assert reject.status_code == 403, reject.text

    row = db.query(models.PolicyEndorsement).get(endorsement_id)
    assert row.status == "Pending"


@pytest.mark.tc("TC-023")
def test_tc023_customer_cannot_list_admin_queue(client, headers_a):
    """AC-009: a customer cannot read the admin endorsement queue."""
    resp = client.get("/admin/endorsements?status=pending", headers=headers_a)
    assert resp.status_code == 403, resp.text
