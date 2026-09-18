"""
Shared fixtures for EPT-15 (Policy Cancellation) backend tests.

There was no backend test infrastructure in this repo before this ticket
(see plan.md "Backend has zero test infrastructure"). These fixtures run
against the real dev Postgres instance the app already points at via
DATABASE_URL (docker-compose `db` service) -- there is no separate test DB
or migration runner in this repo, so tests create/clean up their own rows
directly rather than relying on fixtures/seed data being reset between runs.
"""
import os
import sys
import uuid
from datetime import date, timedelta

import pytest

# `main.py` / `database.py` / `models.py` use plain top-level imports
# (e.g. `from database import get_db`), so the backend/ directory needs to
# be on sys.path regardless of the directory pytest is invoked from.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from main import app  # noqa: E402
from database import SessionLocal  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _unique_email(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.test"


def _signup_and_login(client, name):
    email = _unique_email("ept15")
    password = "TestPass123!"

    signup_resp = client.post(
        "/signup",
        json={"name": name, "email": email, "password": password, "dob": "1990-01-01"},
    )
    assert signup_resp.status_code == 200, signup_resp.text
    user_id = signup_resp.json()["user_id"]

    login_resp = client.post("/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]

    return {"id": user_id, "email": email, "token": token}


@pytest.fixture()
def customer(db, client):
    """A logged-in customer (Owner / User A)."""
    user = _signup_and_login(client, "EPT-15 Test Customer")
    yield user
    # ON DELETE CASCADE on userpolicies.user_id -> users.id cleans up any
    # user_policy rows this test created.
    db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user["id"]})
    db.commit()


@pytest.fixture()
def other_customer(db, client):
    """A second, unrelated logged-in customer (User B / non-owner)."""
    user = _signup_and_login(client, "EPT-15 Other Customer")
    yield user
    db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user["id"]})
    db.commit()


@pytest.fixture()
def seed_policy_id(db):
    """An existing, seeded `policies.id` to attach test user-policies to."""
    row = db.execute(text("SELECT id FROM policies ORDER BY id LIMIT 1")).first()
    assert row is not None, (
        "expected at least one seeded row in policies -- check database/init.sql"
    )
    return row[0]


def make_user_policy(db, user_id, policy_id, status="active"):
    """Insert a UserPolicies row directly, bypassing the activate endpoint,
    so tests can set up an arbitrary starting status (including statuses
    like 'lapsed' that the app has no code path to produce on its own --
    see plan.md's note on inactive/expired/lapsed statuses)."""
    policy_number = f"POL-TEST-{uuid.uuid4().hex[:10]}"
    result = db.execute(
        text(
            """
            INSERT INTO userpolicies
                (user_id, policy_id, policy_number, start_date, end_date, premium, status, auto_renew)
            VALUES
                (:user_id, :policy_id, :policy_number, :start_date, :end_date, :premium, :status, false)
            RETURNING id
            """
        ),
        {
            "user_id": user_id,
            "policy_id": policy_id,
            "policy_number": policy_number,
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=365),
            "premium": 1000,
            "status": status,
        },
    )
    db.commit()
    return result.first()[0]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}
