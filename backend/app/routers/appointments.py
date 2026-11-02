from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..business import get_business, holiday_on, min_redeem_points, points_for, points_worth
from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Appointment, Customer, Staff, User
from ..notify import link, notify_admins, notify_customer
from ..payments import add_appointment_payment
from ..queries import (
    ACTIVE_STATUSES,
    parse_id_list,
    resolve_services,
    resolve_staff,
    services_by_ids,
    upcoming_appointments,
    working_hours_on,
)
from ..schemas import AppointmentInput, AppointmentUpdate, PaymentInput, RedeemPointsInput, StatusInput
from ..security import assert_customer_access, get_current_user, require_admin
from ..serializers import to_dict, to_list
from ..utils import (
    add_minutes_to_time,
    format_currency,
    format_enum_label,
    format_relative_day,
    format_time12,
    generate_id,
    generate_time_slots,
    is_past_date_time,
    minutes_to_time,
    now_local,
    today_iso,
    is_valid_iso_date,
    is_valid_time,
    time_ranges_overlap,
    time_to_minutes,
    weekday_of,
)

router = APIRouter(tags=["appointments"])

SLOT_INTERVAL_MINUTES = 30

ALLOWED_STATUS_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "pending": ("confirmed", "cancelled"),
    "confirmed": ("completed", "cancelled", "no_show"),
    "completed": (),
    "cancelled": (),
    "no_show": (),
}


# ---------- Helpers ----------


def _payment_status(amount_paid: int, total: int) -> str:
    if amount_paid <= 0:
        return "unpaid"
    if amount_paid >= total:
        return "paid"
    return "partial"


def _settled(appointment: Appointment) -> int:
    """Money paid plus the loyalty discount: what no longer has to be paid."""
    return appointment.amount_paid + appointment.points_discount


def _refresh_payment_status(appointment: Appointment) -> None:
    appointment.payment_status = _payment_status(_settled(appointment), appointment.total_price)


def _refund_points(db: Session, appointment: Appointment) -> int:
    """Gives back points used on this bill (booking cancelled, or the discount removed)."""
    points = appointment.points_redeemed
    if points > 0:
        customer = db.get(Customer, appointment.customer_id, with_for_update=True)
        if customer is not None:
            customer.loyalty_points += points
    appointment.points_redeemed = 0
    appointment.points_discount = 0
    return points


def _busy(db: Session, date: str, *, staff_id: str | None = None, customer_id: str | None = None,
          exclude_id: str | None = None) -> list[Appointment]:
    return [
        appointment
        for appointment in upcoming_appointments(db, date, date=date, staff_id=staff_id, customer_id=customer_id)
        if appointment.id != exclude_id
    ]


def _validate_booking(db: Session, data: dict, exclude_id: str | None = None) -> tuple[str, int]:
    """Full validation of a booking. Returns (endTime, totalPrice).

    The staff row is locked (SELECT ... FOR UPDATE on Postgres) so two simultaneous
    bookings for the same stylist are checked one after the other.
    """
    date, start = data["date"], data["start_time"]
    if not is_valid_iso_date(date):
        raise ApiError("VALIDATION", "Choose a valid date.")
    if not is_valid_time(start):
        raise ApiError("VALIDATION", "Choose a valid time.")
    if is_past_date_time(date, start):
        raise ApiError("VALIDATION", "This time has already passed. Pick a later slot.")
    ensure_found(db.get(Customer, data["customer_id"]), "Customer")
    holiday = holiday_on(get_business(db), date)
    if holiday:
        raise ApiError("VALIDATION", f"The parlour is closed on this day ({holiday['name']}).")

    services = resolve_services(db, data["service_ids"])
    price = sum(service.price for service in services)
    duration = sum(service.duration for service in services)
    end = add_minutes_to_time(start, duration)
    if time_to_minutes(start) + duration > 24 * 60 - 1:
        raise ApiError("VALIDATION", "The booking must finish on the same day.")

    member = resolve_staff(db, data["staff_id"], lock=True)
    hours = working_hours_on(member, weekday_of(date))
    if not hours or hours.get("isOff"):
        raise ApiError("VALIDATION", f"{member.name} is not working on this day.")
    if time_to_minutes(start) < time_to_minutes(hours["start"]) or time_to_minutes(end) > time_to_minutes(hours["end"]):
        raise ApiError(
            "VALIDATION",
            f"{member.name} works {format_time12(hours['start'])} - {format_time12(hours['end'])}. "
            "The booking must fit within these hours.",
        )

    staff_clash = next(
        (a for a in _busy(db, date, staff_id=member.id, exclude_id=exclude_id)
         if time_ranges_overlap(start, end, a.start_time, a.end_time)),
        None,
    )
    if staff_clash is not None:
        raise ApiError(
            "CONFLICT",
            f"{member.name} is already booked from {format_time12(staff_clash.start_time)} "
            f"to {format_time12(staff_clash.end_time)}.",
        )
    customer_clash = any(
        time_ranges_overlap(start, end, a.start_time, a.end_time)
        for a in _busy(db, date, customer_id=data["customer_id"], exclude_id=exclude_id)
    )
    if customer_clash:
        raise ApiError("CONFLICT", "This customer already has another appointment at that time.")
    return end, price


def _get_accessible(db: Session, id_: str, user: User) -> Appointment:
    appointment = ensure_found(db.get(Appointment, id_), "Appointment")
    assert_customer_access(user, appointment.customer_id)
    return appointment


def _describe(db: Session, appointment: Appointment) -> str:
    names = ", ".join(service.name for service in services_by_ids(db, appointment.service_ids))
    return (
        f"{names or 'Your appointment'} on {format_relative_day(appointment.date)} "
        f"at {format_time12(appointment.start_time)}"
    )


def _customer_name(db: Session, customer_id: str) -> str:
    customer = db.get(Customer, customer_id)
    return customer.name if customer else "A customer"


# ---------- Routes ----------


@router.get("/appointments")
def list_appointments(
    status: str | None = None,
    customer_id: str | None = Query(None, alias="customerId"),
    staff_id: str | None = Query(None, alias="staffId"),
    date: str | None = None,
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customers only ever receive their own appointments."""
    if user.role == "customer":
        customer_id = user.customer_id
    stmt = select(Appointment)
    if status:
        stmt = stmt.where(Appointment.status == status)
    if customer_id:
        stmt = stmt.where(Appointment.customer_id == customer_id)
    if staff_id:
        stmt = stmt.where(Appointment.staff_id == staff_id)
    if date:
        stmt = stmt.where(Appointment.date == date)
    if from_:
        stmt = stmt.where(Appointment.date >= from_)
    if to:
        stmt = stmt.where(Appointment.date <= to)
    return to_list(list(db.scalars(stmt.order_by(Appointment.date, Appointment.start_time))))


@router.get("/appointments/{id_}")
def get_appointment(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_dict(_get_accessible(db, id_, user))


@router.get("/availability/staff")
def available_staff(
    date: str,
    service_ids: list[str] = Query(alias="serviceIds"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Active staff who can perform every selected service and work on that date."""
    if not is_valid_iso_date(date):
        raise ApiError("VALIDATION", "Choose a valid date.")
    if holiday_on(get_business(db), date):
        return []
    category_ids = {service.category_id for service in resolve_services(db, parse_id_list(service_ids))}
    weekday = weekday_of(date)
    result = []
    for member in db.scalars(select(Staff).where(Staff.is_active.is_(True)).order_by(Staff.name)):
        hours = working_hours_on(member, weekday)
        if hours and not hours.get("isOff") and category_ids.issubset(member.specialties):
            result.append(to_dict(member))
    return result


@router.get("/availability/slots")
def available_slots(
    date: str,
    staff_id: str = Query(alias="staffId"),
    service_ids: list[str] = Query(alias="serviceIds"),
    exclude_appointment_id: str | None = Query(None, alias="excludeAppointmentId"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Every 30-minute start time in the staff member's hours, flagged as available or not."""
    if not is_valid_iso_date(date):
        raise ApiError("VALIDATION", "Choose a valid date.")
    member = resolve_staff(db, staff_id)
    hours = working_hours_on(member, weekday_of(date))
    if not hours or hours.get("isOff") or holiday_on(get_business(db), date):
        return []
    duration = sum(service.duration for service in resolve_services(db, parse_id_list(service_ids)))
    busy = _busy(db, date, staff_id=staff_id, exclude_id=exclude_appointment_id)
    slots = []
    for slot in generate_time_slots(hours["start"], hours["end"], SLOT_INTERVAL_MINUTES, duration):
        end = add_minutes_to_time(slot, duration)
        clashes = any(time_ranges_overlap(slot, end, a.start_time, a.end_time) for a in busy)
        slots.append({"time": slot, "available": not clashes and not is_past_date_time(date, slot)})
    return slots


@router.post("/appointments", status_code=201)
def create_appointment(body: AppointmentInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Admin bookings are confirmed immediately; customer requests start as pending."""
    assert_customer_access(user, body.customer_id)
    data = body.model_dump()
    end, total = _validate_booking(db, data)
    appointment = Appointment(
        id=generate_id("apt"),
        customer_id=body.customer_id,
        service_ids=list(body.service_ids),
        staff_id=body.staff_id,
        date=body.date,
        start_time=body.start_time,
        end_time=end,
        status="confirmed" if user.role == "admin" else "pending",
        notes=body.notes.strip(),
        total_price=total,
        amount_paid=0,
        points_redeemed=0,
        points_discount=0,
        payments=[],
        payment_status="unpaid",
        payment_method=None,
        preferred_payment_method=body.preferred_payment_method,
        cancellation_reason=None,
    )
    db.add(appointment)
    db.flush()

    lnk = link("appointment", appointment.id)
    described = _describe(db, appointment)
    if user.role == "admin":
        notify_customer(db, appointment.customer_id, "appointment_confirmed", "Appointment booked",
                        f"{described} is confirmed.", lnk)
        notify_admins(db, "appointment_booked", "New appointment",
                      f"{user.name} booked {_customer_name(db, appointment.customer_id)}: {described}.", lnk,
                      except_user_id=user.id)
    else:
        notify_admins(db, "appointment_booked", "New booking request",
                      f"{_customer_name(db, appointment.customer_id)} requested {described}.", lnk)
        notify_customer(db, appointment.customer_id, "appointment_booked", "Booking request sent",
                        f"We received your request for {described}. We’ll confirm it shortly.", lnk)
    db.commit()
    return to_dict(appointment)


@router.patch("/appointments/{id_}")
def update_appointment(id_: str, body: AppointmentUpdate, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Change services, staff, date or time. A customer's change goes back to "pending" for re-confirmation."""
    appointment = _get_accessible(db, id_, user)
    if appointment.status not in ACTIVE_STATUSES:
        raise ApiError("VALIDATION", "Only pending or confirmed appointments can be changed.")
    data = {
        "customer_id": appointment.customer_id,
        "service_ids": body.service_ids if body.service_ids is not None else appointment.service_ids,
        "staff_id": body.staff_id or appointment.staff_id,
        "date": body.date or appointment.date,
        "start_time": body.start_time or appointment.start_time,
        "notes": body.notes if body.notes is not None else appointment.notes,
    }
    end, total = _validate_booking(db, data, exclude_id=id_)
    if appointment.points_discount > total:
        raise ApiError("VALIDATION", "The loyalty discount is more than the new total. Remove the points discount first.")
    appointment.service_ids = list(data["service_ids"])
    appointment.staff_id = data["staff_id"]
    appointment.date = data["date"]
    appointment.start_time = data["start_time"]
    appointment.notes = data["notes"].strip()
    appointment.end_time = end
    appointment.total_price = total
    if user.role != "admin":
        appointment.status = "pending"
    _refresh_payment_status(appointment)
    db.flush()

    lnk = link("appointment", id_)
    described = _describe(db, appointment)
    if user.role == "admin":
        notify_customer(db, appointment.customer_id, "appointment_confirmed", "Appointment updated",
                        f"Your booking was updated: {described}.", lnk)
    else:
        notify_admins(db, "appointment_booked", "Reschedule request",
                      f"{_customer_name(db, appointment.customer_id)} changed their booking to {described}.", lnk)
    db.commit()
    return to_dict(appointment)


@router.post("/appointments/{id_}/status")
def update_status(id_: str, body: StatusInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Customers may only cancel their own bookings; everything else is admin-only."""
    appointment = _get_accessible(db, id_, user)
    status = body.status
    if user.role == "customer" and status != "cancelled":
        raise ApiError("FORBIDDEN")
    if status not in ALLOWED_STATUS_TRANSITIONS[appointment.status]:
        raise ApiError(
            "VALIDATION",
            f"A {format_enum_label(appointment.status)} appointment cannot be marked {format_enum_label(status)}.",
        )
    if status == "completed" and not is_past_date_time(appointment.date, appointment.start_time):
        # Served ahead of the booked slot (e.g. the customer came in early): the visit
        # happened now, so it moves to today, ending now, for the calendar and reports.
        duration = time_to_minutes(appointment.end_time) - time_to_minutes(appointment.start_time)
        now = now_local()
        end = now.hour * 60 + now.minute
        appointment.date = today_iso()
        appointment.start_time = minutes_to_time(max(0, end - duration))
        appointment.end_time = minutes_to_time(end)

    appointment.status = status
    if status == "cancelled":
        appointment.cancellation_reason = (body.reason or "").strip() or None
    refunded = _refund_points(db, appointment) if status in ("cancelled", "no_show") else 0
    if refunded:
        _refresh_payment_status(appointment)
    db.flush()

    lnk = link("appointment", id_)
    if status == "completed":
        # Earned on what the customer pays, not on the part covered by points.
        points = points_for(get_business(db), appointment.total_price - appointment.points_discount)
        if points > 0:
            customer = db.get(Customer, appointment.customer_id)
            if customer is not None:
                customer.loyalty_points = max(0, customer.loyalty_points + points)
        notify_customer(
            db, appointment.customer_id, "system", "Thanks for visiting!",
            f"You earned {points} loyalty points. We’d love your review." if points > 0
            else "We’d love to hear how your visit went.",
            lnk,
        )
    elif status == "confirmed":
        notify_customer(db, appointment.customer_id, "appointment_confirmed", "Appointment confirmed",
                        f"{_describe(db, appointment)} is confirmed. See you soon!", lnk)
    elif status == "cancelled":
        if refunded:
            notify_customer(db, appointment.customer_id, "system", "Points returned",
                            f"{refunded} loyalty points are back in your account.", lnk)
        if user.role == "admin":
            reason = appointment.cancellation_reason
            notify_customer(db, appointment.customer_id, "appointment_cancelled", "Appointment cancelled",
                            f"{_describe(db, appointment)} was cancelled{f': {reason}' if reason else '.'}", lnk)
        else:
            notify_admins(db, "appointment_cancelled", "Appointment cancelled",
                          f"{_customer_name(db, appointment.customer_id)} cancelled {_describe(db, appointment)}.", lnk)
    db.commit()
    return to_dict(appointment)


@router.post("/appointments/{id_}/payments")
def record_payment(id_: str, body: PaymentInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Adds a payment; the payment status is derived from the running total."""
    appointment = ensure_found(db.get(Appointment, id_, with_for_update=True), "Appointment")
    add_appointment_payment(appointment, body.amount, body.method)
    notify_customer(db, appointment.customer_id, "payment", "Payment received",
                    f"Thank you! {format_currency(body.amount)} received for {_describe(db, appointment)}.",
                    link("appointment", id_))
    db.commit()
    return to_dict(appointment)


@router.post("/appointments/{id_}/redeem-points")
def redeem_points(id_: str, body: RedeemPointsInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Uses the customer's loyalty points as a discount on this bill.

    Only once the customer has at least the minimum set in Settings (500 by default), and
    never for more than the balance due. Points used here earn no new points.
    """
    appointment = ensure_found(db.get(Appointment, id_, with_for_update=True), "Appointment")
    if appointment.status in ("cancelled", "no_show"):
        raise ApiError("VALIDATION", "Points can't be used on a cancelled or missed booking.")
    if appointment.points_redeemed > 0:
        raise ApiError("CONFLICT", "Points are already used on this booking. Remove that discount to change it.")
    business = get_business(db)
    if not business.loyalty.get("enabled"):
        raise ApiError("VALIDATION", "Loyalty points are switched off in Settings.")
    customer = ensure_found(db.get(Customer, appointment.customer_id, with_for_update=True), "Customer")
    minimum = min_redeem_points(business)
    if customer.loyalty_points < minimum:
        raise ApiError("VALIDATION", f"Points can be used once the customer has {minimum} or more. They have {customer.loyalty_points}.")
    if body.points <= 0:
        raise ApiError("VALIDATION", "Enter how many points to use.")
    if body.points > customer.loyalty_points:
        raise ApiError("VALIDATION", f"The customer has only {customer.loyalty_points} points.")
    discount = points_worth(business, body.points)
    due = appointment.total_price - _settled(appointment)
    if discount <= 0:
        raise ApiError("VALIDATION", "That many points isn't worth a whole rupee yet.")
    if discount > due:
        raise ApiError("VALIDATION", f"That's {format_currency(discount)} off, more than the balance due ({format_currency(due)}).")

    customer.loyalty_points -= body.points
    appointment.points_redeemed = body.points
    appointment.points_discount = discount
    _refresh_payment_status(appointment)
    notify_customer(db, appointment.customer_id, "system", "Loyalty points used",
                    f"You used {body.points} points: {format_currency(discount)} off {_describe(db, appointment)}.",
                    link("appointment", id_))
    db.commit()
    return to_dict(appointment)


@router.delete("/appointments/{id_}/redeem-points")
def remove_points_discount(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Takes the loyalty discount off this bill and gives the points back."""
    appointment = ensure_found(db.get(Appointment, id_, with_for_update=True), "Appointment")
    refunded = _refund_points(db, appointment)
    if refunded == 0:
        raise ApiError("VALIDATION", "No points are used on this booking.")
    _refresh_payment_status(appointment)
    notify_customer(db, appointment.customer_id, "system", "Points returned",
                    f"{refunded} loyalty points are back in your account.", link("appointment", id_))
    db.commit()
    return to_dict(appointment)


@router.delete("/appointments/{id_}", status_code=204)
def delete_appointment(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Hard delete, for removing bookings entered by mistake."""
    db.delete(ensure_found(db.get(Appointment, id_), "Appointment"))
    db.commit()
    return Response(status_code=204)

