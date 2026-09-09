"""EPT-13 — schema delivery files apply and roll back cleanly. Covers AC-004.

The repo has no migration tool (plan.md): schema ships as reviewed .sql files a
human applies. This test checks the up files create both tables and the down
file drops both. If TEST_DATABASE_URL points at a real PostgreSQL it also
applies them for real; otherwise it verifies the DDL statically.
"""

import os
import pathlib

import pytest

REPO = pathlib.Path(__file__).resolve().parents[2]
UP_FILES = [
    REPO / "database" / "vehicles_schema.sql",
    REPO / "database" / "endorsements_schema.sql",
]
DOWN_FILE = REPO / "database" / "migrations" / "EPT-13_down.sql"


@pytest.mark.tc("TC-080")
def test_tc080_schema_files_apply_and_roll_back():
    """AC-004: the vehicles + policy_endorsements schema applies and the down
    migration drops both tables."""
    for f in UP_FILES + [DOWN_FILE]:
        assert f.is_file(), f"missing schema file: {f}"

    up_sql = "\n".join(f.read_text().lower() for f in UP_FILES)
    down_sql = DOWN_FILE.read_text().lower()

    assert "create table" in up_sql and "vehicles" in up_sql
    assert "policy_endorsements" in up_sql
    assert "drop table" in down_sql
    assert "vehicles" in down_sql and "policy_endorsements" in down_sql

    db_url = os.getenv("TEST_DATABASE_URL", "")
    if not db_url.startswith("postgresql"):
        pytest.skip("no PostgreSQL TEST_DATABASE_URL; DDL verified statically")

    import sqlalchemy

    engine = sqlalchemy.create_engine(db_url)
    with engine.begin() as conn:
        for f in UP_FILES:
            conn.exec_driver_sql(f.read_text())
        for table in ("vehicles", "policy_endorsements"):
            conn.exec_driver_sql(f"SELECT 1 FROM {table} LIMIT 0")
        conn.exec_driver_sql(DOWN_FILE.read_text())
