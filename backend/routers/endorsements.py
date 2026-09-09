"""EPT-13 — customer-facing policy endorsement (vehicle detail update) API."""

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from oauth2 import get_current_user
from vehicle_validation import REQUIRED_FIELDS, validate_vehicle_payload

router = APIRouter(prefix="/userpolicies", tags=["Endorsements"])


def _load_owned_policy(db: Session, user_policy_id: int, current_user: models.User):
    row = (
        db.query(models.UserPolicies)
        .filter(models.UserPolicies.id == user_policy_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")
    if row.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your policy")
    return row


def _vehicle_snapshot(vehicle) -> dict:
    if vehicle is None:
        return {f: None for f in REQUIRED_FIELDS}
    return {
        "make": vehicle.make,
        "model": vehicle.model,
        "year": vehicle.year,
        "vin": vehicle.vin,
        "registration": vehicle.registration,
    }


def _serialize(endorsement: models.PolicyEndorsement) -> dict:
    return {
        "id": endorsement.id,
        "user_policy_id": endorsement.user_policy_id,
        "status": endorsement.status,
        "request_date": endorsement.request_date.isoformat()
        if endorsement.request_date
        else None,
        "decision_date": endorsement.decision_date.isoformat()
        if endorsement.decision_date
        else None,
        "old_values": endorsement.old_values,
        "new_values": endorsement.new_values,
    }


@router.post("/{user_policy_id}/endorsements", status_code=201)
def submit_endorsement(
    user_policy_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    policy = _load_owned_policy(db, user_policy_id, current_user)

    if policy.status != "active":
        raise HTTPException(
            status_code=400, detail="Only active policies can be updated."
        )

    new_values = validate_vehicle_payload(payload)

    vehicle = (
        db.query(models.Vehicle)
        .filter(models.Vehicle.user_policy_id == user_policy_id)
        .first()
    )
    old_values = _vehicle_snapshot(vehicle)

    if all(old_values.get(f) == new_values.get(f) for f in REQUIRED_FIELDS):
        raise HTTPException(status_code=400, detail="No changes to apply.")

    endorsement = models.PolicyEndorsement(
        user_policy_id=user_policy_id,
        requested_by=current_user.id,
        old_values=old_values,
        new_values=new_values,
        status="Pending",
    )
    db.add(endorsement)
    db.commit()
    db.refresh(endorsement)

    return _serialize(endorsement)


@router.get("/{user_policy_id}/endorsements")
def list_endorsements(
    user_policy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _load_owned_policy(db, user_policy_id, current_user)

    rows = (
        db.query(models.PolicyEndorsement)
        .filter(models.PolicyEndorsement.user_policy_id == user_policy_id)
        .order_by(models.PolicyEndorsement.id.desc())
        .all()
    )
    return [_serialize(r) for r in rows]
