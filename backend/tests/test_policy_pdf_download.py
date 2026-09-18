"""
RED tests for EPT-16 (Policy PDF Download) -- backend, pytest.

Covers AC-002, AC-003, AC-005, AC-006, AC-008, AC-009 via
GET /userpolicies/{id}/pdf, plus the PDF-rendering edge cases (AC-008,
AC-009) via a pure helper function -- see NOTE below.

NOTE for the implementer: TC-008 and TC-009 exercise a helper function,
`routers.userpolicies.render_policy_pdf(user, policy, user_policy) -> bytes`,
directly with lightweight stand-in objects rather than through the HTTP
endpoint. This is deliberate: `UserPolicies.end_date` is `nullable=False`
in models.py, so a real DB row with `end_date=None` cannot be constructed
to drive the "Ongoing" edge case through the API. The endpoint itself
should call this same helper to build the PDF it streams back, so
implementing it once satisfies both the API-level tests (TC-002/003/005/006)
and these two edge-case tests.
"""
import os
from datetime import date
from types import SimpleNamespace

import pytest
from pypdf import PdfReader
from io import BytesIO

from tests.conftest import auth_as, make_user, make_user_policy

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")

# Seeded by database/init.sql -- id 1 is the first policy inserted there.
SEED_POLICY_ID = 1


def _pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


# ---------------------------------------------------------------------------
# TC-002 / AC-002 -- PDF contains all six required fields
# ---------------------------------------------------------------------------
def test_tc002_pdf_contains_all_six_fields(client, db_session):
    from main import app

    user = make_user(db_session, name="Priya Sharma")
    user_policy = make_user_policy(
        db_session,
        user,
        policy_id=SEED_POLICY_ID,
        policy_number="POL-77001",
        start_date="2026-01-01",
        end_date="2026-12-31",
        premium=1500,
    )

    with auth_as(app, user):
        response = client.get(f"/userpolicies/{user_policy.id}/pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"

    text = _pdf_text(response.content)
    assert "POL-77001" in text
    assert "Priya Sharma" in text
    assert "1500" in text
    assert "2026-01-01" in text
    assert "2026-12-31" in text


# ---------------------------------------------------------------------------
# TC-003 / AC-003 -- policyholders can only download their own policies
# ---------------------------------------------------------------------------
def test_tc003_policyholder_cannot_download_others_policy(client, db_session):
    from main import app

    owner = make_user(db_session, name="Owner User")
    other = make_user(db_session, name="Other User")
    user_policy = make_user_policy(db_session, owner, policy_id=SEED_POLICY_ID)

    with auth_as(app, other):
        response = client.get(f"/userpolicies/{user_policy.id}/pdf")

    assert response.status_code == 403
    assert response.headers["content-type"] != "application/pdf"


# ---------------------------------------------------------------------------
# TC-005 / AC-005 -- internal staff can download any policy PDF
# ---------------------------------------------------------------------------
def test_tc005_staff_can_download_any_policy(client, db_session):
    from main import app

    owner = make_user(db_session, name="Owner User")
    admin = make_user(db_session, name="Admin User", email=ADMIN_EMAIL)
    user_policy = make_user_policy(db_session, owner, policy_id=SEED_POLICY_ID)

    with auth_as(app, admin):
        response = client.get(f"/userpolicies/{user_policy.id}/pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


# ---------------------------------------------------------------------------
# TC-006 / AC-006 -- PDF filename includes policy number
# ---------------------------------------------------------------------------
def test_tc006_filename_includes_policy_number(client, db_session):
    from main import app

    user = make_user(db_session)
    user_policy = make_user_policy(db_session, user, policy_id=SEED_POLICY_ID, policy_number="POL-99887")

    with auth_as(app, user):
        response = client.get(f"/userpolicies/{user_policy.id}/pdf")

    assert response.status_code == 200
    assert response.headers["content-disposition"] == "attachment; filename=Policy_POL-99887.pdf"


# ---------------------------------------------------------------------------
# TC-008 / AC-008 -- no end date shows "Ongoing"
# ---------------------------------------------------------------------------
def test_tc008_ongoing_policy_shows_ongoing_end_date():
    from routers.userpolicies import render_policy_pdf

    user = SimpleNamespace(name="Ongoing Holder")
    policy = SimpleNamespace(policy_type="health", title="Health Basic", coverage={"opd": True})
    user_policy = SimpleNamespace(
        policy_number="POL-ONGOING",
        start_date=date(2026, 1, 1),
        end_date=None,
        premium=1000,
        status="active",
    )

    pdf_bytes = render_policy_pdf(user, policy, user_policy)
    text = _pdf_text(pdf_bytes)

    assert "Ongoing" in text


# ---------------------------------------------------------------------------
# TC-009 / AC-009 -- missing coverage limits shows "Not specified"
# ---------------------------------------------------------------------------
def test_tc009_missing_coverage_shows_not_specified():
    from routers.userpolicies import render_policy_pdf

    user = SimpleNamespace(name="No Coverage Holder")
    policy = SimpleNamespace(policy_type="travel", title="Travel Basic", coverage=None)
    user_policy = SimpleNamespace(
        policy_number="POL-NOCOVER",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        premium=800,
        status="active",
    )

    pdf_bytes = render_policy_pdf(user, policy, user_policy)
    text = _pdf_text(pdf_bytes)

    assert "Not specified" in text
