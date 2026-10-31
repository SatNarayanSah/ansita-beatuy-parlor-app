from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Appointment, Customer, Enrollment, User
from ..queries import ACTIVE_STATUSES, upcoming_appointments
from ..schemas import CustomerInput, CustomerUpdate, PointsInput
from ..security import assert_customer_access, get_current_user, require_admin
from ..serializers import apply, changes, to_dict
from ..utils import generate_id, now_iso, normalize_phone, today_iso

router = APIRouter(prefix="/customers", tags=["customers"])

# Fields that may be cleared to null by sending null.
_NULLABLE = {"dob", "avatar"}


def _customer(db: Session, id_: str) -> Customer:
    return ensure_found(db.get(Customer, id_), "Customer")


def _assert_phone_available(db: Session, phone: str, except_id: str | None = None) -> None:
    if not phone:
        return
    stmt = select(Customer.id).where(Customer.phone == phone)
    if except_id:
        stmt = stmt.where(Customer.id != except_id)
    if db.scalar(stmt.limit(1)):
        raise ApiError("CONFLICT", "A customer with this phone number already exists.")


def _normalize(values: dict) -> dict:
    if values.get("name") is not None:
        values["name"] = values["name"].strip()
    if values.get("email") is not None:
        values["email"] = values["email"].strip().lower()
    if values.get("phone") is not None:
        values["phone"] = normalize_phone(values["phone"])
    return values


@router.get("")
def list_customers(query: str = "", tag: str | None = None, _: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    stmt = select(Customer)
    if query.strip():
        needle = f"%{query.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Customer.name).like(needle), Customer.phone.like(needle),
                              func.lower(Customer.email).like(needle)))
    customers = list(db.scalars(stmt.order_by(Customer.name)))
    if tag:  # tags is a JSON list; filtered here so it works on SQLite and Postgres alike
        customers = [customer for customer in customers if tag in (customer.tags or [])]
    return [to_dict(customer) for customer in customers]


@router.get("/{id_}")
def get_customer(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assert_customer_access(user, id_)
    return to_dict(_customer(db, id_))


@router.post("", status_code=201)
def create_customer(body: CustomerInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    values = _normalize({**body.model_dump(), **changes(body), "address": body.address.model_dump(by_alias=True)})
    if not values["phone"]:
        raise ApiError("VALIDATION", "Enter a phone number.")
    _assert_phone_available(db, values["phone"])
    customer = Customer(id=generate_id("cus"), loyalty_points=0, joined_at=now_iso(), **values)
    db.add(customer)
    db.commit()
    return to_dict(customer)


@router.patch("/{id_}")
def update_customer(id_: str, body: CustomerUpdate, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Admins can edit anyone; customers can edit their own profile (tags/notes are admin-only)."""
    assert_customer_access(user, id_)
    customer = _customer(db, id_)
    values = _normalize({k: v for k, v in changes(body).items() if v is not None or k in _NULLABLE})
    if user.role != "admin":
        values.pop("tags", None)
        values.pop("notes", None)
    if "phone" in values:
        _assert_phone_available(db, values["phone"], id_)
    apply(customer, values)

    # Keep the linked app account in sync.
    linked = db.scalar(select(User).where(User.customer_id == id_))
    if linked is not None:
        for key in ("name", "phone", "avatar"):
            if key in values:
                setattr(linked, key, values[key])
    db.commit()
    return to_dict(customer)


@router.delete("/{id_}", status_code=204)
def delete_customer(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Blocked while the customer has upcoming bookings or an ongoing course."""
    customer = _customer(db, id_)
    if upcoming_appointments(db, today_iso(), customer_id=id_):
        raise ApiError("CONFLICT", "Cancel this customer’s upcoming appointments first.")
    ongoing = select(Enrollment.id).where(Enrollment.student_id == id_, Enrollment.status.in_(("active", "pending")))
    if db.scalar(ongoing.limit(1)):
        raise ApiError("CONFLICT", "This customer is enrolled in an ongoing course.")
    linked = db.scalar(select(User).where(User.customer_id == id_))
    if linked is not None:
        db.delete(linked)
    db.delete(customer)
    db.commit()
    return Response(status_code=204)


@router.post("/{id_}/points")
def adjust_loyalty_points(id_: str, body: PointsInput, _: User = Depends(require_admin),
                          db: Session = Depends(get_db)):
    customer = ensure_found(db.get(Customer, id_, with_for_update=True), "Customer")
    customer.loyalty_points = max(0, customer.loyalty_points + body.delta)
    db.commit()
    return to_dict(customer)


@router.get("/{id_}/stats")
def get_customer_stats(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assert_customer_access(user, id_)
    today = today_iso()
    appointments = list(db.scalars(select(Appointment).where(Appointment.customer_id == id_)))
    completed = [a for a in appointments if a.status == "completed"]
    active_enrollments = db.scalar(
        select(func.count()).select_from(Enrollment).where(Enrollment.student_id == id_, Enrollment.status == "active")
    )
    return {
        "totalVisits": len(completed),
        "totalSpent": sum(a.amount_paid for a in appointments),
        "lastVisit": max((a.date for a in completed), default=None),
        "upcomingCount": sum(1 for a in appointments if a.date >= today and a.status in ACTIVE_STATUSES),
        "cancelledCount": sum(1 for a in appointments if a.status == "cancelled"),
        "activeEnrollments": active_enrollments or 0,
    }
