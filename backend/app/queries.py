"""Small shared lookups used by several routers."""

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from .errors import ApiError, ensure_found
from .models import Appointment, Service, Staff

# Statuses that still occupy a time slot.
ACTIVE_STATUSES = ("pending", "confirmed")


def upcoming_appointments(db: Session, today: str, *, staff_id: str | None = None, customer_id: str | None = None,
                          date: str | None = None) -> list[Appointment]:
    """Pending/confirmed bookings from `today` onwards (or on `date`)."""
    stmt = select(Appointment).where(Appointment.status.in_(ACTIVE_STATUSES))
    stmt = stmt.where(Appointment.date == date) if date else stmt.where(Appointment.date >= today)
    if staff_id:
        stmt = stmt.where(Appointment.staff_id == staff_id)
    if customer_id:
        stmt = stmt.where(Appointment.customer_id == customer_id)
    return list(db.scalars(stmt.order_by(Appointment.date, Appointment.start_time)))


def services_by_ids(db: Session, ids: Iterable[str]) -> list[Service]:
    """Services in the order requested; missing ids are dropped."""
    ids = list(ids)
    if not ids:
        return []
    found = {service.id: service for service in db.scalars(select(Service).where(Service.id.in_(ids)))}
    return [found[id_] for id_ in ids if id_ in found]


def resolve_services(db: Session, ids: list[str]) -> list[Service]:
    if not ids:
        raise ApiError("VALIDATION", "Select at least one service.")
    if len(set(ids)) != len(ids):
        raise ApiError("VALIDATION", "A service was selected twice.")
    services = services_by_ids(db, ids)
    if len(services) != len(ids):
        raise ApiError("NOT_FOUND", "One or more selected services no longer exist.")
    inactive = next((service for service in services if not service.is_active), None)
    if inactive is not None:
        raise ApiError("VALIDATION", f"{inactive.name} is currently unavailable.")
    return services


def resolve_staff(db: Session, staff_id: str, *, lock: bool = False) -> Staff:
    member = ensure_found(db.get(Staff, staff_id, with_for_update=lock), "Staff member")
    if not member.is_active:
        raise ApiError("VALIDATION", f"{member.name} is not taking bookings.")
    return member


def working_hours_on(member: Staff, weekday: str) -> dict | None:
    return next((hours for hours in member.working_hours if hours.get("day") == weekday), None)


def parse_id_list(values: list[str] | None) -> list[str]:
    """Accepts `?ids=a&ids=b` as well as `?ids=a,b`."""
    out: list[str] = []
    for value in values or []:
        out.extend(part.strip() for part in value.split(",") if part.strip())
    return out
