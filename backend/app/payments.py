"""Recording money against a bill. Used by the admin's "Record payment" and by approving a
customer's "I've paid" request, so both follow exactly the same rules."""

from typing import Any

from .errors import ApiError
from .models import Appointment, Enrollment
from .utils import format_currency, generate_id, today_iso

UNPAYABLE_APPOINTMENT = ("cancelled", "no_show")


def appointment_due(appointment: Appointment) -> int:
    """What is still owed: the bill minus money paid, the offer discount and loyalty points."""
    return max(0, appointment.total_price - settled_amount(appointment))


def settled_amount(appointment: Appointment) -> int:
    """Money paid plus discounts: what no longer has to be paid."""
    return appointment.amount_paid + appointment.points_discount + (appointment.offer_discount or 0)


def refresh_payment_status(appointment: Appointment) -> None:
    """paid: nothing left to pay (money plus discounts cover it). partial: some money paid.
    unpaid: no money yet; a discount alone doesn't make a bill "partly paid"."""
    if settled_amount(appointment) >= appointment.total_price:
        appointment.payment_status = "paid"
    elif appointment.amount_paid > 0:
        appointment.payment_status = "partial"
    else:
        appointment.payment_status = "unpaid"


def enrollment_due(enrollment: Enrollment) -> int:
    return max(0, enrollment.fee_total - enrollment.fee_paid)


def _entry(amount: int, method: str, paid_on: str | None, extra: dict[str, Any] | None) -> dict[str, Any]:
    return {"id": generate_id("pay"), "amount": amount, "paidOn": paid_on or today_iso(), "method": method, **(extra or {})}


def _check_amount(amount: int, due: int) -> None:
    if amount <= 0:
        raise ApiError("VALIDATION", "Enter a valid amount.")
    if amount > due:
        raise ApiError("VALIDATION", f"Amount exceeds the balance due ({format_currency(due)}).")


def add_appointment_payment(appointment: Appointment, amount: int, method: str, *, paid_on: str | None = None,
                            extra: dict[str, Any] | None = None) -> dict[str, Any]:
    """Adds a payment; the payment status follows from the running total. Returns the entry."""
    if appointment.status in UNPAYABLE_APPOINTMENT:
        raise ApiError("VALIDATION", "Payments cannot be recorded for this appointment.")
    _check_amount(amount, appointment_due(appointment))
    entry = _entry(amount, method, paid_on, extra)
    appointment.amount_paid += amount
    appointment.payments = [*(appointment.payments or []), entry]
    appointment.payment_method = method
    refresh_payment_status(appointment)
    return entry


def add_enrollment_payment(enrollment: Enrollment, amount: int, method: str, *, paid_on: str | None = None,
                           extra: dict[str, Any] | None = None) -> dict[str, Any]:
    """Adds a fee payment; any payment makes a pending enrollment active. Returns the entry."""
    if enrollment.status == "dropped":
        raise ApiError("VALIDATION", "This enrollment was dropped.")
    _check_amount(amount, enrollment_due(enrollment))
    entry = _entry(amount, method, paid_on, extra)
    enrollment.fee_paid += amount
    enrollment.payments = [*(enrollment.payments or []), entry]
    if enrollment.status == "pending":
        enrollment.status = "active"
    return entry
