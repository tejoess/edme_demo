"""EPT-13 — only active policies can be endorsed. Covers AC-008."""

import pytest

import models
from conftest import _make_auto_policy, _make_user_policy, endorsement_count

PAYLOAD = {
    "make": "Honda",
    "model": "Civic",
    "year": 2021,
    "vin": "2HGCM82633A004352",
    "registration": "KA05CD4321",
}


@pytest.mark.tc("TC-030")
def test_tc030_expired_policy_cannot_be_endorsed(client, db, headers_a, expired_policy_a):
    """AC-008: an endorsement against an expired policy is rejected, none created."""
    resp = client.post(
        f"/userpolicies/{expired_policy_a.id}/endorsements", json=PAYLOAD, headers=headers_a
    )
    assert resp.status_code in (400, 409), resp.text
    assert endorsement_count(db, expired_policy_a.id) == 0


@pytest.mark.tc("TC-031")
@pytest.mark.parametrize("status", ["cancelled", "pending"])
def test_tc031_non_active_policies_rejected(client, db, customer_a, headers_a, status):
    """AC-008: cancelled and pending policies are rejected the same way."""
    policy = _make_auto_policy(db)
    up = _make_user_policy(db, customer_a, policy, status=status, number=f"POL-{status}")
    resp = client.post(
        f"/userpolicies/{up.id}/endorsements", json=PAYLOAD, headers=headers_a
    )
    assert resp.status_code in (400, 409), resp.text
    assert endorsement_count(db, up.id) == 0
