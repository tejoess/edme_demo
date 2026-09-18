import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, timedelta
from io import BytesIO
import random

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

import models
from database import get_db
from oauth2 import get_current_user

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

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
# RENDER POLICY PDF (pure helper)
# ===========================
def render_policy_pdf(user, policy, user_policy) -> bytes:
    """Build a one-page PDF summarizing a single policy.

    Deliberately works with plain attribute-bearing objects (SimpleNamespace
    in tests, SQLAlchemy model instances in the real endpoint) -- only the
    named attributes are touched.
    """
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 72
    line_height = 20

    def write_line(text):
        nonlocal y
        pdf.drawString(72, y, text)
        y -= line_height

    end_date = user_policy.end_date if user_policy.end_date is not None else "Ongoing"

    coverage = getattr(policy, "coverage", None)
    if coverage:
        coverage_text = ", ".join(f"{key}: {value}" for key, value in coverage.items())
    else:
        coverage_text = "Not specified"

    pdf.setFont("Helvetica-Bold", 16)
    write_line("Policy Summary")
    y -= 10

    pdf.setFont("Helvetica", 12)
    write_line(f"Policy Number: {user_policy.policy_number}")
    write_line(f"Policyholder: {user.name}")
    write_line(f"Coverage Type: {policy.policy_type}")
    write_line(f"Premium: {user_policy.premium}")
    write_line(f"Start Date: {user_policy.start_date}")
    write_line(f"End Date: {end_date}")
    write_line(f"Coverage / Limits: {coverage_text}")

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return buffer.getvalue()


# ===========================
# DOWNLOAD POLICY PDF
# ===========================
@router.get("/{id}/pdf")
def download_policy_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_policy = db.query(models.UserPolicies).filter(
        models.UserPolicies.id == id
    ).first()

    if not user_policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    is_owner = user_policy.user_id == current_user.id
    is_admin = current_user.email == ADMIN_EMAIL
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to download this policy")

    policy = db.query(models.Policy).filter(
        models.Policy.id == user_policy.policy_id
    ).first()
    owner = db.query(models.User).filter(
        models.User.id == user_policy.user_id
    ).first()

    pdf_bytes = render_policy_pdf(owner, policy, user_policy)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Policy_{user_policy.policy_number}.pdf"
        }
    )