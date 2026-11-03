"""Customers' "I've paid" requests, and the admin's verification of them.

Flow: the customer pays the parlour's eSewa/Khalti/Fonepay/bank account outside the app, then
sends the amount, method, transaction ID, date paid and (optionally) a screenshot. Admins are
notified. Nothing changes on the bill until an admin approves: approving records the payment
(dated the day the customer paid) through the same code as "Record payment"; rejecting needs
a reason. The customer is told either way and can withdraw a request while it's pending.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..business import accepts_online, get_business, payment_settings
from ..db import get_db
from ..errors import ApiError, ensure_found
from ..image_urls import to_stored
from ..models import Appointment, Course, Customer, Enrollment, PaymentRequest, User
from ..notify import link, notify_admins, notify_customer
from ..payments import (
    UNPAYABLE_APPOINTMENT,
    add_appointment_payment,
    add_enrollment_payment,
    appointment_due,
    enrollment_due,
)
from ..queries import services_by_ids
from ..schemas import PaymentApproveInput, PaymentRejectInput, PaymentRequestInput
from ..security import assert_customer_access, get_current_user, require_admin
from ..serializers import to_dict
from ..utils import format_currency, format_relative_day, generate_id, is_valid_iso_date, now_iso, today_iso

router = APIRouter(prefix="/payment-requests", tags=["payment requests"])

MAX_PENDING_PER_BILL = 3
MAX_DAYS_BACK = 60
METHOD_LABELS = {"esewa": "eSewa", "khalti": "Khalti", "fonepay": "Fonepay", "bank": "bank transfer", "cash": "cash"}


def _with_reference(request_or_method, reference: str) -> str:
    """" (ID 0ABC12)" for online payments, " (receipt 123)" for cash, or nothing."""
    if not reference:
        return ""
    return f" (receipt {reference})" if request_or_method == "cash" else f" (ID {reference})"


# ---------- Helpers ----------


def _target(db: Session, target_type: str, target_id: str, *, lock: bool = False) -> Appointment | Enrollment:
    if target_type == "appointment":
        return ensure_found(db.get(Appointment, target_id, with_for_update=lock), "Appointment")
    return ensure_found(db.get(Enrollment, target_id, with_for_update=lock), "Enrollment")


def _customer_of(target: Appointment | Enrollment) -> str:
    return target.customer_id if isinstance(target, Appointment) else target.student_id


def _due(target: Appointment | Enrollment) -> int:
    return appointment_due(target) if isinstance(target, Appointment) else enrollment_due(target)


def _payable(target: Appointment | Enrollment) -> bool:
    if isinstance(target, Appointment):
        return target.status not in UNPAYABLE_APPOINTMENT
    return target.status != "dropped"


def _pending_total(db: Session, target_id: str, *, exclude_id: str | None = None) -> tuple[int, int]:
    """(count, sum) of pending requests on one bill."""
    stmt = select(func.count(), func.coalesce(func.sum(PaymentRequest.amount), 0)).where(
        PaymentRequest.target_id == target_id, PaymentRequest.status == "pending"
    )
    if exclude_id:
        stmt = stmt.where(PaymentRequest.id != exclude_id)
    count, total = db.execute(stmt).one()
    return int(count), int(total)


def _label(db: Session, target: Appointment | Enrollment) -> str:
    """What the money is for, e.g. "Bridal Makeup on 3 Nov" or "Makeup Artistry course fee"."""
    if isinstance(target, Appointment):
        names = ", ".join(service.name for service in services_by_ids(db, target.service_ids)) or "Appointment"
        return f"{names} · {format_relative_day(target.date)}"
    course = db.get(Course, target.course_id)
    return f"{course.title if course else 'Course'} fee"


def _serialize(db: Session, request: PaymentRequest, target: Appointment | Enrollment | None = None) -> dict:
    """The request plus what the admin needs to judge it: who, what for, and the balance now."""
    target = target or db.get(Appointment if request.target_type == "appointment" else Enrollment, request.target_id)
    customer = db.get(Customer, request.customer_id)
    return {
        **to_dict(request),
        "customerName": customer.name if customer else "Customer",
        "customerPhone": customer.phone if customer else "",
        "targetLabel": _label(db, target) if target else "Removed",
        "balanceDue": _due(target) if target else 0,
    }


def _own_request(db: Session, id_: str, user: User, *, lock: bool = False) -> PaymentRequest:
    request = ensure_found(db.get(PaymentRequest, id_, with_for_update=lock), "Payment request")
    assert_customer_access(user, request.customer_id)
    return request


def _link(request: PaymentRequest) -> dict:
    # Opens the booking/enrollment itself, where the request is shown with Approve/Reject.
    return link(request.target_type, request.target_id)


# ---------- Customer ----------


@router.post("", status_code=201)
def create_request(body: PaymentRequestInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "customer" or not user.customer_id:
        raise ApiError("FORBIDDEN", "Only customers send payment requests. Admins record payments directly.")
    row = get_business(db)
    # Cash needs no account: only the master switch. Online methods must be set up in Settings.
    if body.method == "cash":
        if not payment_settings(row)["requests"]:
            raise ApiError("VALIDATION", "The parlour isn't taking payment requests right now.")
    elif not accepts_online(row, body.method):
        raise ApiError("VALIDATION", f"The parlour doesn't take {METHOD_LABELS[body.method]} payments right now.")

    target = _target(db, body.target_type, body.target_id, lock=True)
    if _customer_of(target) != user.customer_id:
        raise ApiError("FORBIDDEN")
    if not _payable(target):
        raise ApiError("VALIDATION", "This booking can't take payments any more." if body.target_type == "appointment"
                       else "This enrollment was dropped.")

    reference = " ".join(body.reference.split()).upper()
    if body.method != "cash" and len(reference) < 4:
        raise ApiError("VALIDATION", "Enter the transaction ID from your payment receipt (at least 4 characters).")
    if not is_valid_iso_date(body.paid_on):
        raise ApiError("VALIDATION", "Choose the date you paid.")
    if body.paid_on > today_iso():
        raise ApiError("VALIDATION", "The payment date can't be in the future.")
    if body.paid_on < (date.fromisoformat(today_iso()) - timedelta(days=MAX_DAYS_BACK)).isoformat():
        raise ApiError("VALIDATION", f"Payments older than {MAX_DAYS_BACK} days have to be sorted out at the parlour.")

    count, pending = _pending_total(db, target.id)
    if count >= MAX_PENDING_PER_BILL:
        raise ApiError("CONFLICT", "You already have payments waiting for confirmation. Please wait for the parlour to check them.")
    room = _due(target) - pending
    if room <= 0:
        raise ApiError("VALIDATION", "Nothing is left to pay once your pending payments are confirmed." if pending
                       else "This bill is already fully paid.")
    if body.amount <= 0:
        raise ApiError("VALIDATION", "Enter the amount you paid.")
    if body.amount > room:
        raise ApiError("VALIDATION", f"That's more than the {format_currency(room)} left to pay"
                       + (" after your pending payments." if pending else "."))

    duplicate = reference and db.scalar(select(PaymentRequest.id).where(
        PaymentRequest.method == body.method, PaymentRequest.reference == reference,
        PaymentRequest.status.in_(("pending", "approved")),
    ))
    if duplicate and body.method == "cash":
        raise ApiError("CONFLICT", "This receipt number has already been sent.")
    if duplicate:
        raise ApiError("CONFLICT", "This transaction ID has already been sent. Check the ID, or wait for the parlour to confirm it.")

    proof = to_stored(body.proof.strip()) if body.proof and body.proof.strip() else None
    if proof and not proof.startswith("/uploads/"):
        raise ApiError("VALIDATION", "Upload the screenshot through the app.")

    request = PaymentRequest(
        id=generate_id("prq"), target_type=body.target_type, target_id=target.id, customer_id=user.customer_id,
        amount=body.amount, method=body.method, reference=reference, paid_on=body.paid_on,
        note=body.note.strip(), proof=proof, status="pending",
    )
    db.add(request)
    customer = db.get(Customer, user.customer_id)
    notify_admins(
        db, "payment", "Payment to verify",
        f"{customer.name if customer else 'A customer'} says they paid {format_currency(body.amount)} by "
        f"{METHOD_LABELS[body.method]}{_with_reference(body.method, reference)} for {_label(db, target)}.",
        _link(request),
    )
    db.commit()
    return _serialize(db, request, target)


@router.post("/{id_}/cancel")
def cancel_request(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The customer withdraws a request they sent by mistake (only while it's pending)."""
    request = _own_request(db, id_, user, lock=True)
    if user.role != "customer":
        raise ApiError("FORBIDDEN", "Reject the request instead.")
    if request.status != "pending":
        raise ApiError("CONFLICT", f"This request was already {request.status}.")
    request.status = "cancelled"
    request.reviewed_at = now_iso()
    db.commit()
    return _serialize(db, request)


# ---------- Both ----------


@router.get("")
def list_requests(
    status: str | None = None,
    target_type: str | None = Query(None, alias="targetType"),
    target_id: str | None = Query(None, alias="targetId"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Newest first; pending ones first of all. Customers only ever get their own."""
    stmt = select(PaymentRequest)
    if user.role != "admin":
        stmt = stmt.where(PaymentRequest.customer_id == user.customer_id)
    if status:
        stmt = stmt.where(PaymentRequest.status == status)
    if target_type:
        stmt = stmt.where(PaymentRequest.target_type == target_type)
    if target_id:
        stmt = stmt.where(PaymentRequest.target_id == target_id)
    rows = list(db.scalars(stmt.order_by(PaymentRequest.created_at.desc()).limit(300)))
    rows.sort(key=lambda r: r.status != "pending")  # stable: keeps newest-first inside each group
    return [_serialize(db, row) for row in rows]


@router.get("/pending-count")
def pending_count(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(PaymentRequest).where(PaymentRequest.status == "pending")) or 0
    return {"count": count}


@router.get("/{id_}")
def get_request(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _serialize(db, _own_request(db, id_, user))


# ---------- Admin ----------


@router.post("/{id_}/approve")
def approve_request(id_: str, body: PaymentApproveInput, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    request = ensure_found(db.get(PaymentRequest, id_, with_for_update=True), "Payment request")
    if request.status != "pending":
        raise ApiError("CONFLICT", f"This request was already {request.status}.")
    target = _target(db, request.target_type, request.target_id, lock=True)
    amount = body.amount if body.amount is not None else request.amount
    due = _due(target)
    if amount > due:
        # E.g. the customer also paid cash at the counter, which was recorded meanwhile.
        raise ApiError("VALIDATION", f"Only {format_currency(due)} is due now. Approve a smaller amount or reject this request.")

    extra = {"reference": request.reference, "requestId": request.id}
    if isinstance(target, Appointment):
        entry = add_appointment_payment(target, amount, request.method, paid_on=request.paid_on, extra=extra)
    else:
        entry = add_enrollment_payment(target, amount, request.method, paid_on=request.paid_on, extra=extra)

    request.status = "approved"
    request.approved_amount = amount
    request.payment_id = entry["id"]
    request.review_note = body.note.strip()
    request.reviewed_by = admin.id
    request.reviewed_at = now_iso()
    adjusted = f" (we received {format_currency(amount)})" if amount != request.amount else ""
    notify_customer(
        db, request.customer_id, "payment", "Payment confirmed",
        f"Thank you! Your {METHOD_LABELS[request.method]} payment of {format_currency(request.amount)} for "
        f"{_label(db, target)} is confirmed{adjusted}.",
        _link(request),
    )
    db.commit()
    return _serialize(db, request, target)


@router.post("/{id_}/reject")
def reject_request(id_: str, body: PaymentRejectInput, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    request = ensure_found(db.get(PaymentRequest, id_, with_for_update=True), "Payment request")
    if request.status != "pending":
        raise ApiError("CONFLICT", f"This request was already {request.status}.")
    request.status = "rejected"
    request.review_note = body.reason.strip()
    request.reviewed_by = admin.id
    request.reviewed_at = now_iso()
    target = db.get(Appointment if request.target_type == "appointment" else Enrollment, request.target_id)
    notify_customer(
        db, request.customer_id, "payment", "Payment not confirmed",
        f"We couldn't confirm your {METHOD_LABELS[request.method]} payment of "
        f"{format_currency(request.amount)}{_with_reference(request.method, request.reference)}: {request.review_note}",
        _link(request),
    )
    db.commit()
    return _serialize(db, request, target)
