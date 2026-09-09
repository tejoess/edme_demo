"""EPT-13 — vehicle payload validation at submit time. Covers AC-002.

Every case asserts the endorsement is NOT created when validation fails.
"""

import datetime

import pytest

from conftest import endorsement_count

BASE = {
    "make": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "vin": "1HGCM82633A004352",
    "registration": "KA01AB1234",
}


def _submit(client, headers, policy_id, **overrides):
    payload = {**BASE, **overrides}
    for k, v in list(overrides.items()):
        if v is _MISSING:
            payload.pop(k, None)
    return client.post(f"/userpolicies/{policy_id}/endorsements", json=payload, headers=headers)


_MISSING = object()


@pytest.mark.tc("TC-010")
def test_tc010_missing_required_field_rejected(client, db, headers_a, active_policy_a):
    """AC-002: a missing required field is rejected and no endorsement is created."""
    resp = _submit(client, headers_a, active_policy_a.id, make=_MISSING)
    assert resp.status_code in (400, 422), resp.text
    assert endorsement_count(db, active_policy_a.id) == 0


@pytest.mark.tc("TC-011")
def test_tc011_year_out_of_range_rejected(client, db, headers_a, active_policy_a):
    """AC-002: a year before 1900 or after next year is rejected with a clear error."""
    too_old = _submit(client, headers_a, active_policy_a.id, year=1800)
    too_new = _submit(
        client, headers_a, active_policy_a.id, year=datetime.date.today().year + 2
    )
    assert too_old.status_code == 400, too_old.text
    assert too_new.status_code == 400, too_new.text
    assert "year" in (too_old.json().get("detail") or "").lower()
    assert endorsement_count(db, active_policy_a.id) == 0


@pytest.mark.tc("TC-012")
def test_tc012_invalid_vin_rejected(client, db, headers_a, active_policy_a):
    """AC-002: a VIN that is not 17 valid characters is rejected."""
    short = _submit(client, headers_a, active_policy_a.id, vin="SHORT")
    illegal = _submit(client, headers_a, active_policy_a.id, vin="1HGCM82633A0043IO")
    assert short.status_code == 400, short.text
    assert illegal.status_code == 400, illegal.text
    assert "vin" in (short.json().get("detail") or "").lower()
    assert endorsement_count(db, active_policy_a.id) == 0


@pytest.mark.tc("TC-013")
def test_tc013_empty_registration_rejected(client, db, headers_a, active_policy_a):
    """AC-002: a blank registration is rejected."""
    resp = _submit(client, headers_a, active_policy_a.id, registration="   ")
    assert resp.status_code == 400, resp.text
    assert endorsement_count(db, active_policy_a.id) == 0


@pytest.mark.tc("TC-014")
def test_tc014_no_op_update_rejected(client, db, headers_a, active_policy_a):
    """AC-002: a payload identical to the current vehicle values is rejected."""
    from conftest import seed_vehicle

    seed_vehicle(db, active_policy_a.id, **BASE)
    resp = client.post(
        f"/userpolicies/{active_policy_a.id}/endorsements", json=dict(BASE), headers=headers_a
    )
    assert resp.status_code == 400, resp.text
    assert endorsement_count(db, active_policy_a.id) == 0
