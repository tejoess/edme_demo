"""Shared test harness for the EPT-13 endorsement feature.

The repo had no backend tests before this ticket (see plan.md, Q4). This file
stands up:
  * an isolated in-memory SQLite database (OQ-2: SQLite + JSON variant shim,
    because the existing models use postgresql.JSONB which SQLite cannot
    compile),
  * a FastAPI TestClient with get_db overridden onto that database,
  * user / token / policy fixtures the endorsement tests build on.

Env vars are set before any application module is imported: database.py builds
its engine at import time from DATABASE_URL, and admin.py / login.py read
ADMIN_EMAIL at import time.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./_ept13_conftest.db")
os.environ.setdefault("SECRET_KEY", "ept13-test-secret-key")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")

from datetime import date, timedelta

import pytest
from sqlalchemy import JSON, Column, Integer, String, Table, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import models  # noqa: F401  (registers the ORM tables on Base.metadata)
from database import Base, get_db
from hashing import Hash
from jwt_token import create_access_token
from main import app

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]

# ---------------------------------------------------------------------------
# Test database
# ---------------------------------------------------------------------------
_test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False)

# OQ-2 shim: rewrite postgresql JSONB columns to generic JSON so the metadata
# compiles against SQLite. The implementer will make this permanent in models.py
# via .with_variant(); until then the harness does it in memory.
for _table in Base.metadata.tables.values():
    for _col in _table.columns:
        if _col.type.__class__.__name__ == "JSONB":
            _col.type = JSON()

# Policy.provider_id references providers(id) but there is no Provider model.
# Give create_all a bare providers table to satisfy the FK.
if "providers" not in Base.metadata.tables:
    Table(
        "providers",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String),
    )


@pytest.fixture(autouse=True)
def _fresh_schema():
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Identity fixtures
# ---------------------------------------------------------------------------
def _make_user(db, name, email):
    user = models.User(
        name=name,
        email=email,
        password=Hash.hash_password("password123"),
        dob=date(1990, 1, 1),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token({'sub': user.email})}"}


@pytest.fixture
def customer_a(db):
    return _make_user(db, "Customer A", "customer_a@example.com")


@pytest.fixture
def customer_b(db):
    return _make_user(db, "Customer B", "customer_b@example.com")


@pytest.fixture
def admin(db):
    return _make_user(db, "Admin", ADMIN_EMAIL)


@pytest.fixture
def headers_a(customer_a):
    return _auth(customer_a)


@pytest.fixture
def headers_b(customer_b):
    return _auth(customer_b)


@pytest.fixture
def headers_admin(admin):
    return _auth(admin)


# ---------------------------------------------------------------------------
# Policy fixtures
# ---------------------------------------------------------------------------
def _make_auto_policy(db):
    policy = models.Policy(
        policy_type="auto",
        title="Private Car Comprehensive",
        premium=7000,
        term_months=12,
        deductible=2000,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def _make_user_policy(db, user, policy, status="active", number="POL-EPT13"):
    up = models.UserPolicies(
        user_id=user.id,
        policy_id=policy.id,
        policy_number=number,
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=335),
        premium=7000,
        status=status,
    )
    db.add(up)
    db.commit()
    db.refresh(up)
    return up


@pytest.fixture
def active_policy_a(db, customer_a):
    """userpolicies row owned by customer_a, status active, auto, no vehicle row yet."""
    return _make_user_policy(db, customer_a, _make_auto_policy(db), status="active")


@pytest.fixture
def expired_policy_a(db, customer_a):
    return _make_user_policy(
        db, customer_a, _make_auto_policy(db), status="expired", number="POL-EPT13-EXP"
    )


@pytest.fixture
def valid_vehicle_payload():
    return {
        "make": "Toyota",
        "model": "Corolla",
        "year": 2020,
        "vin": "1HGCM82633A004352",
        "registration": "KA01AB1234",
    }


def seed_vehicle(db, user_policy_id, **overrides):
    """Insert a vehicles row directly. Used by tests that need a pre-existing
    live vehicle record. Relies on the vehicles table the implementer adds."""
    values = {
        "make": "Toyota",
        "model": "Corolla",
        "year": 2020,
        "vin": "1HGCM82633A004352",
        "registration": "KA01AB1234",
    }
    values.update(overrides)
    vehicle = models.Vehicle(user_policy_id=user_policy_id, **values)
    db.add(vehicle)
    db.commit()
    return vehicle


def endorsement_count(db, user_policy_id):
    return (
        db.query(models.PolicyEndorsement)
        .filter(models.PolicyEndorsement.user_policy_id == user_policy_id)
        .count()
    )
