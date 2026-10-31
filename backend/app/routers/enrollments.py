from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Customer, Enrollment, User
from ..notify import link, notify_admins, notify_customer
from ..schemas import AttendanceInput, BatchAttendanceInput, EnrollInput, EnrollmentStatusInput, PaymentInput
from ..security import assert_customer_access, get_current_user, require_admin
from ..serializers import to_dict, to_list
from ..utils import format_currency, generate_id, is_valid_iso_date, today_iso
from .courses import find_batch, get_course, seats_taken

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


def _enrollment(db: Session, id_: str, *, lock: bool = False) -> Enrollment:
    return ensure_found(db.get(Enrollment, id_, with_for_update=lock), "Enrollment")


def _upsert_attendance(records: list[dict], date: str, status: str) -> list[dict]:
    kept = [record for record in records if record.get("date") != date]
    return sorted([*kept, {"date": date, "status": status}], key=lambda record: record["date"])


def _student_name(db: Session, student_id: str) -> str:
    customer = db.get(Customer, student_id)
    return customer.name if customer else "A student"


def _check_attendance_date(date: str) -> None:
    if not is_valid_iso_date(date):
        raise ApiError("VALIDATION", "Choose a valid date.")
    if date > today_iso():
        raise ApiError("VALIDATION", "Attendance cannot be marked for a future date.")


@router.get("")
def list_enrollments(
    course_id: str | None = Query(None, alias="courseId"),
    batch_id: str | None = Query(None, alias="batchId"),
    student_id: str | None = Query(None, alias="studentId"),
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customers only ever receive their own enrollments."""
    if user.role == "customer":
        student_id = user.customer_id
    stmt = select(Enrollment)
    if course_id:
        stmt = stmt.where(Enrollment.course_id == course_id)
    if batch_id:
        stmt = stmt.where(Enrollment.batch_id == batch_id)
    if student_id:
        stmt = stmt.where(Enrollment.student_id == student_id)
    if status:
        stmt = stmt.where(Enrollment.status == status)
    return to_list(list(db.scalars(stmt.order_by(Enrollment.created_at.desc()))))


@router.get("/{id_}")
def get_enrollment(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enrollment = _enrollment(db, id_)
    assert_customer_access(user, enrollment.student_id)
    return to_dict(enrollment)


@router.post("", status_code=201)
def enroll(body: EnrollInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Reserves a seat. Without a payment the enrollment is "pending"; any payment makes it "active"."""
    assert_customer_access(user, body.student_id)
    if body.initial_payment and user.role != "admin":
        raise ApiError("FORBIDDEN")
    student = ensure_found(db.get(Customer, body.student_id), "Student")

    # Locking the course row serialises enrollments, so the last seat can't be sold twice.
    course = get_course(db, body.course_id, lock=True)
    batch = ensure_found(find_batch(course, body.batch_id), "Batch")
    if not course.is_active:
        raise ApiError("VALIDATION", "This course is not accepting enrollments.")
    if batch["status"] == "completed":
        raise ApiError("VALIDATION", "This batch has already finished.")
    if seats_taken(db, batch["id"]) >= batch["seats"]:
        raise ApiError("CONFLICT", "This batch is full. Please choose another batch.")
    duplicate = select(Enrollment.id).where(
        Enrollment.student_id == body.student_id,
        Enrollment.course_id == body.course_id,
        Enrollment.status.in_(("pending", "active")),
    )
    if db.scalar(duplicate.limit(1)):
        raise ApiError("CONFLICT", "Already enrolled in this course.")

    payment = body.initial_payment
    if payment and payment.amount <= 0:
        raise ApiError("VALIDATION", "Enter a valid payment amount.")
    paid = min(payment.amount, course.fee) if payment else 0

    enrollment = Enrollment(
        id=generate_id("enr"),
        student_id=body.student_id,
        course_id=body.course_id,
        batch_id=body.batch_id,
        status="active" if paid > 0 else "pending",
        fee_total=course.fee,
        fee_paid=paid,
        payments=[{"id": generate_id("pay"), "amount": paid, "paidOn": today_iso(), "method": payment.method}]
        if payment else [],
        attendance=[],
        certificate_issued=False,
    )
    db.add(enrollment)
    # Students are tagged so they can be filtered in the customer list.
    if "student" not in (student.tags or []):
        student.tags = [*(student.tags or []), "student"]
    db.flush()

    lnk = link("enrollment", enrollment.id)
    active = enrollment.status == "active"
    notify_customer(
        db, body.student_id, "enrollment",
        "Enrollment confirmed" if active else "Enrollment received",
        f"You are enrolled in {course.title} ({batch['name']})." if active
        else f"We reserved your seat in {course.title} ({batch['name']}). Pay the fee at the front desk to confirm.",
        lnk,
    )
    notify_admins(db, "enrollment", "New course enrollment",
                  f"{_student_name(db, body.student_id)} enrolled in {course.title} ({batch['name']}).", lnk,
                  except_user_id=user.id if user.role == "admin" else None)
    db.commit()
    return to_dict(enrollment)


@router.post("/attendance")
def mark_batch_attendance(body: BatchAttendanceInput, _: User = Depends(require_admin),
                          db: Session = Depends(get_db)):
    """Marks one class for many students at once; inactive enrollments are skipped."""
    _check_attendance_date(body.date)
    updated = []
    for entry in body.entries:
        enrollment = db.get(Enrollment, entry.enrollment_id)
        if enrollment is None or enrollment.status != "active":
            continue
        enrollment.attendance = _upsert_attendance(enrollment.attendance, body.date, entry.status)
        updated.append(enrollment)
    db.commit()
    return to_list(updated)


@router.post("/{id_}/status")
def update_status(id_: str, body: EnrollmentStatusInput, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Students may drop their own pending/active enrollment; other changes are admin-only."""
    enrollment = _enrollment(db, id_)
    assert_customer_access(user, enrollment.student_id)
    if user.role == "customer" and body.status != "dropped":
        raise ApiError("FORBIDDEN")
    if enrollment.status == body.status:
        return to_dict(enrollment)
    if enrollment.status in ("completed", "dropped"):
        raise ApiError("VALIDATION", f"This enrollment is already {enrollment.status}.")
    enrollment.status = body.status
    if user.role == "customer":
        notify_admins(db, "enrollment", "Student dropped a course",
                      f"{_student_name(db, enrollment.student_id)} dropped out of an enrollment.",
                      link("enrollment", id_))
    db.commit()
    return to_dict(enrollment)


@router.post("/{id_}/payments")
def record_fee_payment(id_: str, body: PaymentInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollment = _enrollment(db, id_, lock=True)
    if enrollment.status == "dropped":
        raise ApiError("VALIDATION", "This enrollment was dropped.")
    due = enrollment.fee_total - enrollment.fee_paid
    if body.amount <= 0:
        raise ApiError("VALIDATION", "Enter a valid amount.")
    if body.amount > due:
        raise ApiError("VALIDATION", f"Amount exceeds the balance due ({format_currency(due)}).")
    enrollment.fee_paid += body.amount
    enrollment.payments = [
        *enrollment.payments,
        {"id": generate_id("pay"), "amount": body.amount, "paidOn": today_iso(), "method": body.method},
    ]
    if enrollment.status == "pending":
        enrollment.status = "active"
    notify_customer(db, enrollment.student_id, "payment", "Fee received",
                    f"Thank you! {format_currency(body.amount)} received towards your course fee.",
                    link("enrollment", id_))
    db.commit()
    return to_dict(enrollment)


@router.post("/{id_}/attendance")
def mark_attendance(id_: str, body: AttendanceInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    _check_attendance_date(body.date)
    enrollment = _enrollment(db, id_)
    if enrollment.status != "active":
        raise ApiError("VALIDATION", "Attendance can only be marked for active students.")
    enrollment.attendance = _upsert_attendance(enrollment.attendance, body.date, body.status)
    db.commit()
    return to_dict(enrollment)


@router.post("/{id_}/certificate")
def issue_certificate(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollment = _enrollment(db, id_)
    course = get_course(db, enrollment.course_id)
    if not course.certificate:
        raise ApiError("VALIDATION", "This course does not award a certificate.")
    if enrollment.status != "completed":
        raise ApiError("VALIDATION", "Mark the enrollment as completed before issuing a certificate.")
    if enrollment.fee_paid < enrollment.fee_total:
        raise ApiError("VALIDATION", "Clear the pending fee before issuing a certificate.")
    enrollment.certificate_issued = True
    notify_customer(db, enrollment.student_id, "enrollment", "Certificate issued 🎓",
                    f"Congratulations! Your {course.title} certificate is ready to collect.",
                    link("enrollment", id_))
    db.commit()
    return to_dict(enrollment)
