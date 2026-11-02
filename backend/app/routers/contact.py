"""Enquiries from the public website's contact form. Each one becomes an admin notification."""

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError
from ..notify import notify_admins
from ..schemas import CamelModel
from ..utils import normalize_phone

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactInput(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(default="", max_length=32)
    email: str = Field(default="", max_length=254)
    subject: str = Field(default="General enquiry", max_length=120)
    message: str = Field(min_length=5, max_length=2000)


@router.post("", status_code=201)
def send_enquiry(body: ContactInput, db: Session = Depends(get_db)):
    phone = normalize_phone(body.phone) if body.phone.strip() else ""
    email = body.email.strip().lower()
    if not phone and not email:
        raise ApiError("VALIDATION", "Add a phone number or email so we can reply.")
    reach = " · ".join(part for part in (phone, email) if part)
    notify_admins(
        db,
        "system",
        f"New enquiry: {body.subject.strip() or 'General enquiry'}",
        f"{body.name.strip()} ({reach}) wrote: {body.message.strip()}",
    )
    db.commit()
    return {"ok": True}
