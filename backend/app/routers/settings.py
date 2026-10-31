"""Parlour profile, holidays, loyalty rules and admin alerts. Reading is open to any signed-in user."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..business import get_business, snapshot
from ..db import get_db
from ..errors import ApiError
from ..models import Appointment, User
from ..queries import ACTIVE_STATUSES
from ..schemas import AlertsUpdate, BusinessProfileUpdate, HolidayInput, LoyaltyUpdate
from ..security import get_current_user, require_admin
from ..utils import is_valid_iso_date, is_valid_time, normalize_phone, time_to_minutes, today_iso

router = APIRouter(prefix="/settings", tags=["settings"])


def _patch(model) -> dict:
    """Only sent, non-null fields, with camelCase keys (as stored in the JSON column)."""
    return {k: v for k, v in model.model_dump(by_alias=True, exclude_unset=True).items() if v is not None}


@router.get("")
def get_settings(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = get_business(db)
    db.commit()
    return snapshot(row)


@router.patch("/profile")
def update_profile(body: BusinessProfileUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = get_business(db, lock=True)
    patch = _patch(body)
    if "name" in patch:
        patch["name"] = patch["name"].strip()
    for key in ("phone", "whatsapp"):
        if key in patch:
            patch[key] = normalize_phone(patch[key])
    merged = {**row.profile, **patch}
    if len(merged["name"].strip()) < 2:
        raise ApiError("VALIDATION", "Enter the business name.")
    if not is_valid_time(merged["openTime"]) or not is_valid_time(merged["closeTime"]):
        raise ApiError("VALIDATION", "Enter valid opening hours.")
    if time_to_minutes(merged["closeTime"]) <= time_to_minutes(merged["openTime"]):
        raise ApiError("VALIDATION", "Closing time must be after opening time.")
    row.profile = merged
    db.commit()
    return snapshot(row)


@router.post("/holidays")
def add_holiday(body: HolidayInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Closing a day that already has bookings is refused, so no customer is silently stranded."""
    row = get_business(db, lock=True)
    if not is_valid_iso_date(body.date):
        raise ApiError("VALIDATION", "Choose a valid date.")
    if body.date < today_iso():
        raise ApiError("VALIDATION", "Holidays must be today or later.")
    name = body.name.strip()
    if len(name) < 2:
        raise ApiError("VALIDATION", "Give the holiday a name.")
    if any(holiday["date"] == body.date for holiday in row.holidays):
        raise ApiError("CONFLICT", "That day is already a holiday.")
    booked = db.scalar(
        select(func.count()).select_from(Appointment)
        .where(Appointment.date == body.date, Appointment.status.in_(ACTIVE_STATUSES))
    ) or 0
    if booked:
        raise ApiError(
            "CONFLICT",
            f"{booked} booking{' is' if booked == 1 else 's are'} on that day. "
            f"Reschedule or cancel {'it' if booked == 1 else 'them'} first.",
        )
    row.holidays = sorted([*row.holidays, {"date": body.date, "name": name}], key=lambda holiday: holiday["date"])
    db.commit()
    return snapshot(row)


@router.delete("/holidays/{date}")
def remove_holiday(date: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = get_business(db, lock=True)
    row.holidays = [holiday for holiday in row.holidays if holiday["date"] != date]
    db.commit()
    return snapshot(row)


@router.patch("/loyalty")
def update_loyalty(body: LoyaltyUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = get_business(db, lock=True)
    patch = _patch(body)
    rupees = patch.get("rupeesPerPoint")
    if rupees is not None and not 1 <= rupees <= 10000:
        raise ApiError("VALIDATION", "Spend per point must be between Rs. 1 and Rs. 10,000.")
    value = patch.get("pointValue")
    if value is not None and not 0 < value <= 100:
        raise ApiError("VALIDATION", "Point value must be between Rs. 0.01 and Rs. 100.")
    row.loyalty = {**row.loyalty, **patch}
    db.commit()
    return snapshot(row)


@router.patch("/alerts")
def update_alerts(body: AlertsUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = get_business(db, lock=True)
    row.alerts = {**row.alerts, **_patch(body)}
    db.commit()
    return snapshot(row)
