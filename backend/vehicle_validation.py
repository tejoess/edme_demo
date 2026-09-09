"""EPT-13 vehicle payload validation (plan A-1).

Used by the endorsement submit endpoint. Raises fastapi.HTTPException(400) with a
readable ``detail`` on the first failure; otherwise returns the normalized payload
(trimmed strings, upper-cased VIN, int year).
"""

import datetime
import re

from fastapi import HTTPException

REQUIRED_FIELDS = ("make", "model", "year", "vin", "registration")
_VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")


def _bad(message: str):
    raise HTTPException(status_code=400, detail=message)


def validate_vehicle_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        _bad("Invalid vehicle payload.")

    for field in REQUIRED_FIELDS:
        if field not in payload or payload[field] is None:
            _bad(f"Missing required vehicle field: {field}.")
        if isinstance(payload[field], str) and not payload[field].strip():
            _bad(f"Missing required vehicle field: {field}.")

    normalized = {}

    for field in ("make", "model"):
        value = payload[field]
        if not isinstance(value, str):
            _bad(f"{field} must be text.")
        value = value.strip()
        if not value:
            _bad(f"{field} is required.")
        if len(value) > 50:
            _bad(f"{field} must be 50 characters or fewer.")
        normalized[field] = value

    current_year = datetime.date.today().year
    try:
        year = int(payload["year"])
    except (TypeError, ValueError):
        _bad("year must be a number between 1900 and %d." % (current_year + 1))
    if year < 1900 or year > current_year + 1:
        _bad(f"year must be between 1900 and {current_year + 1}.")
    normalized["year"] = year

    vin = payload["vin"]
    if not isinstance(vin, str):
        _bad("vin must be text.")
    vin = vin.strip().upper()
    if not _VIN_RE.match(vin):
        _bad("vin must be exactly 17 characters using A-Z (no I, O, Q) and 0-9.")
    normalized["vin"] = vin

    registration = payload["registration"]
    if not isinstance(registration, str):
        _bad("registration must be text.")
    registration = registration.strip()
    if not registration:
        _bad("registration is required.")
    if len(registration) > 20:
        _bad("registration must be 20 characters or fewer.")
    normalized["registration"] = registration

    return normalized
