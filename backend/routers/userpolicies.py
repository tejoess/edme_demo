from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, timedelta, datetime
import random

import models
import schemas
from database import get_db
from oauth2 import get_current_user

router = APIRouter(
    prefix="/userpolicies",
    tags=["User Policies"]
)

# ===========================
# ACTIVATE POLICY (BUY)
# ===========================
@router.post("/{policy_id}")
def activate_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if policy exists
    policy = db.query(models.Policy).filter(models.Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Check if already activated
    existing = db.query(models.UserPolicies).filter(
        models.UserPolicies.user_id == current_user.id,
        models.UserPolicies.policy_id == policy_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Policy already activated")

    policy_number = f"POL-{random.randint(10000,99999)}"

    new_user_policy = models.UserPolicies(
        user_id=current_user.id,
        policy_id=policy_id,
        policy_number=policy_number,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        premium=policy.premium,
        status="active",
        auto_renew=True
    )

    db.add(new_user_policy)
    db.commit()
    db.refresh(new_user_policy)

    return {"message": "Policy activated successfully"}


# ===========================
# GET USER POLICIES
# ===========================
@router.get("/")
def get_user_policies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    policies = db.query(models.UserPolicies).filter(
        models.UserPolicies.user_id == current_user.id
    ).all()

    return policies


# ===========================
# CANCEL POLICY
# ===========================
@router.patch("/{user_policy_id}/cancel", response_model=schemas.CancelPolicyResponse)
def cancel_policy(
    user_policy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_policy = db.query(models.UserPolicies).filter(
        models.UserPolicies.id == user_policy_id,
        models.UserPolicies.user_id == current_user.id
    ).first()

    if not user_policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Atomic conditional UPDATE -- the status check and the write happen in a
    # single DB statement so a status change between "view" and "confirm"
    # cannot race with this request (see plan.md's TC-014 fix).
    result = db.execute(
        text(
            """
            UPDATE userpolicies
            SET status = 'cancelled', cancelled_at = now()
            WHERE id = :id AND user_id = :user_id AND status = 'active'
            RETURNING cancelled_at
            """
        ),
        {"id": user_policy_id, "user_id": current_user.id},
    )
    row = result.first()

    if row is None:
        db.rollback()
        current_status = db.query(models.UserPolicies.status).filter(
            models.UserPolicies.id == user_policy_id
        ).scalar()
        if current_status == "cancelled":
            raise HTTPException(status_code=400, detail="This policy has already been cancelled")
        raise HTTPException(status_code=400, detail="Only active policies can be cancelled")

    cancelled_at = row[0]

    history = models.PolicyStatusHistory(
        user_policy_id=user_policy_id,
        previous_status="active",
        new_status="cancelled",
        changed_by=current_user.id,
    )
    db.add(history)
    db.commit()

    return schemas.CancelPolicyResponse(
        message="Policy cancelled successfully",
        status="cancelled",
        cancelled_at=cancelled_at,
    )