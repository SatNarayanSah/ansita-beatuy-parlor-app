from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Appointment, Course, Review, Staff, User
from .reviews import with_names
from ..queries import upcoming_appointments
from ..schemas import ActiveInput, StaffInput, StaffUpdate
from ..security import require_admin
from ..serializers import apply, changes, to_dict, to_list
from ..utils import (
    format_enum_label,
    generate_id,
    is_valid_iso_date,
    is_valid_time,
    normalize_phone,
    time_to_minutes,
    today_iso,
    weekday_of,
)

router = APIRouter(prefix="/staff", tags=["staff"])


def _staff(db: Session, id_: str) -> Staff:
    return ensure_found(db.get(Staff, id_), "Staff member")


def _validate_hours(hours: list[dict]) -> None:
    for day in hours:
        if not is_valid_time(day["start"]) or not is_valid_time(day["end"]):
            raise ApiError("VALIDATION", f"Enter valid shift times for {format_enum_label(day['day'])}.")
        if not day["isOff"] and time_to_minutes(day["end"]) <= time_to_minutes(day["start"]):
            raise ApiError("VALIDATION", f"Shift on {format_enum_label(day['day'])} must end after it starts.")
    if all(day["isOff"] for day in hours):
        raise ApiError("VALIDATION", "Set at least one working day.")


def _bookings_outside(db: Session, staff_id: str, hours: list[dict]) -> list[Appointment]:
    """Upcoming active bookings that would fall outside these hours (or on a day off)."""
    stranded = []
    for appointment in upcoming_appointments(db, today_iso(), staff_id=staff_id):
        day = next((entry for entry in hours if entry["day"] == weekday_of(appointment.date)), None)
        if (
            day is None
            or day["isOff"]
            or time_to_minutes(appointment.start_time) < time_to_minutes(day["start"])
            or time_to_minutes(appointment.end_time) > time_to_minutes(day["end"])
        ):
            stranded.append(appointment)
    return stranded


@router.get("")
def list_staff(query: str = "", active_only: bool = Query(False, alias="activeOnly"), db: Session = Depends(get_db)):
    stmt = select(Staff)
    if active_only:
        stmt = stmt.where(Staff.is_active.is_(True))
    if query.strip():
        needle = f"%{query.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Staff.name).like(needle), Staff.phone.like(needle),
                              func.lower(Staff.email).like(needle)))
    return to_list(list(db.scalars(stmt.order_by(Staff.name))))


@router.get("/{id_}")
def get_staff(id_: str, db: Session = Depends(get_db)):
    return to_dict(_staff(db, id_))


@router.post("", status_code=201)
def create_staff(body: StaffInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    values = changes(body) | {"name": body.name.strip(), "phone": normalize_phone(body.phone)}
    if len(values["name"]) < 2:
        raise ApiError("VALIDATION", "Enter the staff member’s name.")
    if not body.specialties:
        raise ApiError("VALIDATION", "Choose at least one specialty.")
    _validate_hours(values["working_hours"])
    member = Staff(id=generate_id("stf"), rating=0, **{**body.model_dump(), **values})
    db.add(member)
    db.commit()
    return to_dict(member)


@router.patch("/{id_}")
def update_staff(id_: str, body: StaffUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    member = _staff(db, id_)
    values = {k: v for k, v in changes(body).items() if v is not None or k == "avatar"}
    if "specialties" in values and not values["specialties"]:
        raise ApiError("VALIDATION", "Choose at least one specialty.")
    if "working_hours" in values:
        _validate_hours(values["working_hours"])
        stranded = _bookings_outside(db, id_, values["working_hours"])
        if stranded:
            n = len(stranded)
            raise ApiError(
                "CONFLICT",
                f"{n} upcoming booking{' falls' if n == 1 else 's fall'} outside the new hours "
                f"(first on {stranded[0].date}). Reschedule {'it' if n == 1 else 'them'} first.",
            )
    if values.get("is_active") is False:
        _assert_can_deactivate(db, id_)
    if "phone" in values:
        values["phone"] = normalize_phone(values["phone"])
    if "name" in values:
        values["name"] = values["name"].strip()
    apply(member, values)
    db.commit()
    return to_dict(member)


def _assert_can_deactivate(db: Session, staff_id: str) -> None:
    upcoming = upcoming_appointments(db, today_iso(), staff_id=staff_id)
    if upcoming:
        n = len(upcoming)
        raise ApiError("CONFLICT", f"Reassign or cancel {n} upcoming booking{'' if n == 1 else 's'} before deactivating.")


@router.post("/{id_}/active")
def set_staff_active(id_: str, body: ActiveInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Deactivating is refused while the member has upcoming bookings."""
    member = _staff(db, id_)
    if not body.is_active:
        _assert_can_deactivate(db, id_)
    member.is_active = body.is_active
    db.commit()
    return to_dict(member)


@router.delete("/{id_}", status_code=204)
def delete_staff(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Blocked while the member has upcoming bookings or leads a course."""
    member = _staff(db, id_)
    if upcoming_appointments(db, today_iso(), staff_id=id_):
        raise ApiError("CONFLICT", "Reassign this staff member’s upcoming appointments first.")
    if db.scalar(select(Course.id).where(Course.instructor == id_).limit(1)):
        raise ApiError("CONFLICT", "This staff member is the instructor of a course.")
    db.delete(member)
    db.commit()
    return Response(status_code=204)


@router.get("/{id_}/schedule")
def get_schedule(id_: str, date: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """All of a staff member's appointments on a given date."""
    if not is_valid_iso_date(date):
        raise ApiError("VALIDATION", "Choose a valid date.")
    stmt = (select(Appointment).where(Appointment.staff_id == id_, Appointment.date == date)
            .order_by(Appointment.start_time))
    return to_list(list(db.scalars(stmt)))


@router.get("/{id_}/reviews")
def get_reviews(id_: str, db: Session = Depends(get_db)):
    stmt = select(Review).where(Review.staff_id == id_).order_by(Review.created_at.desc())
    return with_names(db, list(db.scalars(stmt)))
