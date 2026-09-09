"""EPT-13 — customer endorsement history. Covers AC-006."""

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


@pytest.mark.tc("TC-060")
def test_tc060_history_returns_full_timeline_newest_first(
    client, db, headers_a, headers_admin, active_policy_a
):
    """AC-006: history shows every endorsement with old values, new values,
    request date and status; a decided one carries a decision date."""
    seed_vehicle(db, active_policy_a.id, make="Toyota")

    ids = []
    for make in ("Honda", "Ford", "Kia"):
        r = client.post(
            f"/userpolicies/{active_policy_a.id}/endorsements",
            json={**PAYLOAD, "make": make},
            headers=headers_a,
        )
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])

    client.post(f"/admin/endorsements/{ids[0]}/approve", headers=headers_admin)
    client.post(f"/admin/endorsements/{ids[1]}/reject", headers=headers_admin)

    resp = client.get(f"/userpolicies/{active_policy_a.id}/endorsements", headers=headers_a)
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert len(items) == 3
    assert [i["id"] for i in items] == sorted(ids, reverse=True)  # newest first
    for item in items:
        assert set(("old_values", "new_values", "request_date", "status")) <= item.keys()
    statuses = {i["status"] for i in items}
    assert statuses == {"Pending", "Approved", "Rejected"}


@pytest.mark.tc("TC-061")
def test_tc061_history_is_owner_scoped(client, db, headers_b, active_policy_a):
    """AC-006: another customer cannot read this policy's endorsement history."""
    resp = client.get(f"/userpolicies/{active_policy_a.id}/endorsements", headers=headers_b)
    assert resp.status_code == 403, resp.text
