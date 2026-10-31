from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Appointment, Customer, Review, Staff, User
from ..notify import link, notify_admins, notify_customer
from ..schemas import ReplyInput, ReviewInput
from ..security import assert_customer_access, get_current_user, require_admin
from ..serializers import to_dict
from ..utils import generate_id, round_rating

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _sync_staff_rating(db: Session, staff_id: str) -> None:
    """Keeps Staff.rating equal to the average of their reviews."""
    db.flush()
    average = db.scalar(select(func.avg(Review.rating)).where(Review.staff_id == staff_id))
    member = db.get(Staff, staff_id)
    if member is not None:
        member.rating = round_rating(float(average)) if average is not None else 0


def with_names(db: Session, reviews: list[Review]) -> list[dict]:
    """Adds the reviewer's first name, so customers can see who wrote a review without the CRM."""
    ids = {review.customer_id for review in reviews}
    names = {c.id: c.name for c in db.scalars(select(Customer).where(Customer.id.in_(ids)))} if ids else {}
    return [{**to_dict(review), "customerName": (names.get(review.customer_id) or "").split(" ")[0] or "Customer"}
            for review in reviews]


def _review(db: Session, id_: str) -> Review:
    return ensure_found(db.get(Review, id_), "Review")


@router.get("")
def list_reviews(staff_id: str | None = Query(None, alias="staffId"),
                 customer_id: str | None = Query(None, alias="customerId"),
                 _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Review)
    if staff_id:
        stmt = stmt.where(Review.staff_id == staff_id)
    elif customer_id:
        stmt = stmt.where(Review.customer_id == customer_id)
    return with_names(db, list(db.scalars(stmt.order_by(Review.created_at.desc()))))


@router.get("/by-appointment/{appointment_id}")
def get_review_for_appointment(appointment_id: str, _: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    review = db.scalar(select(Review).where(Review.appointment_id == appointment_id))
    return with_names(db, [review])[0] if review else None


@router.post("", status_code=201)
def create_review(body: ReviewInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """A customer can review each of their completed appointments once."""
    appointment = ensure_found(db.get(Appointment, body.appointment_id), "Appointment")
    assert_customer_access(user, appointment.customer_id)
    if user.role != "customer":
        raise ApiError("FORBIDDEN", "Only customers can write reviews.")
    if appointment.status != "completed":
        raise ApiError("VALIDATION", "You can review an appointment once it is completed.")
    if db.scalar(select(Review.id).where(Review.appointment_id == body.appointment_id)):
        raise ApiError("CONFLICT", "You have already reviewed this appointment.")
    review = Review(
        id=generate_id("rev"),
        customer_id=appointment.customer_id,
        appointment_id=appointment.id,
        staff_id=appointment.staff_id,
        service_ids=list(appointment.service_ids),
        rating=body.rating,
        comment=body.comment.strip(),
        reply=None,
    )
    db.add(review)
    _sync_staff_rating(db, review.staff_id)
    notify_admins(db, "system", f"New {body.rating}★ review", f"{user.name}: “{review.comment or 'No comment'}”",
                  link("appointment", appointment.id))
    db.commit()
    return with_names(db, [review])[0]


@router.post("/{id_}/reply")
def reply_to_review(id_: str, body: ReplyInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    review = _review(db, id_)
    trimmed = body.reply.strip()
    review.reply = trimmed or None
    if trimmed:
        notify_customer(db, review.customer_id, "system", "Ansita replied to your review", trimmed,
                        link("appointment", review.appointment_id))
    db.commit()
    return with_names(db, [review])[0]


@router.delete("/{id_}", status_code=204)
def delete_review(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    review = _review(db, id_)
    staff_id = review.staff_id
    db.delete(review)
    _sync_staff_rating(db, staff_id)
    db.commit()
    return Response(status_code=204)
