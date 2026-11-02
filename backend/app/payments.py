"""Recording money against a bill. Used by the admin's "Record payment" and by approving a
customer's "I've paid" request, so both follow exactly the same rules."""

from typing import Any

from .errors import ApiError
from .models import Appointment, Enrollment
from .utils import format_currency, generate_id, today_iso

UNPAYABLE_APPOINTMENT = ("cancelled", "no_show")


def appointment_due(appointment: Appointment) -> int:
    """What is still owed: the bill minus money paid and any loyalty discount."""
    return max(0, appointment.total_price - appointment.amount_paid - appointment.points_discount)


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
    settled = appointment.amount_paid + appointment.points_discount
    appointment.payment_status = "unpaid" if settled <= 0 else "paid" if settled >= appointment.total_price else "partial"
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
