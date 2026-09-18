"""
Shared pytest fixtures for EPT-16 (Policy PDF Download).

Tests run against a dedicated Postgres database (insurance_test_db) on the
same docker-compose Postgres container used for local dev, so JSONB columns
and enum types behave identically to production. It is recreated from
database/init.sql at the start of the test session and truncated between
tests -- the developer's own dev data (insurance_db) is never touched.
"""
import os
import sys
from pathlib import Path

import psycopg2
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

_base_url = os.environ["DATABASE_URL"]
_base, _, _dbname = _base_url.rpartition("/")
TEST_DATABASE_URL = f"{_base}/insurance_test_db"
ADMIN_DATABASE_URL = f"{_base}/postgres"

# database.py reads DATABASE_URL at import time; set it before anything in
# the app is imported so the whole app (and its own load_dotenv, which does
# not override an already-set var) talks to the test database.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL


def _recreate_test_database():
    conn = psycopg2.connect(ADMIN_DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = 'insurance_test_db' AND pid <> pg_backend_pid();"
            )
            cur.execute("DROP DATABASE IF EXISTS insurance_test_db;")
            cur.execute("CREATE DATABASE insurance_test_db;")
    finally:
        conn.close()

    init_sql_path = REPO_ROOT / "database" / "init.sql"
    init_sql = init_sql_path.read_text(encoding="utf-8")

    conn = psycopg2.connect(TEST_DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(init_sql)
    finally:
        conn.close()


@pytest.fixture(scope="session", autouse=True)
def _test_database():
    _recreate_test_database()
    yield


@pytest.fixture()
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    # Clean slate per test. providers/policies keep the seed data from
    # init.sql (policy catalog) since nothing here mutates it.
    session.execute(
        text(
            "TRUNCATE TABLE claims, userpolicies, recommendations, "
            "adminlogs, users RESTART IDENTITY CASCADE;"
        )
    )
    session.commit()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def client(db_session):
    from database import get_db
    from main import app

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_user(db_session, *, name="Test User", email=None, password="hashed", dob="1990-01-01"):
    import uuid

    import models

    user = models.User(
        name=name,
        email=email or f"{uuid.uuid4().hex}@example.com",
        password=password,
        dob=dob,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def make_user_policy(
    db_session,
    user,
    *,
    policy_id=1,
    policy_number=None,
    start_date="2026-01-01",
    end_date="2026-12-31",
    premium=1200,
    status="active",
):
    import uuid

    import models

    user_policy = models.UserPolicies(
        user_id=user.id,
        policy_id=policy_id,
        policy_number=policy_number or f"POL-{uuid.uuid4().hex[:8].upper()}",
        start_date=start_date,
        end_date=end_date,
        premium=premium,
        status=status,
        auto_renew=False,
    )
    db_session.add(user_policy)
    db_session.commit()
    db_session.refresh(user_policy)
    return user_policy


def auth_as(app, user):
    """Override oauth2.get_current_user for the duration of a `with` block."""
    import oauth2

    class _Override:
        def __enter__(self):
            app.dependency_overrides[oauth2.get_current_user] = lambda: user
            return user

        def __exit__(self, *exc):
            app.dependency_overrides.pop(oauth2.get_current_user, None)

    return _Override()
