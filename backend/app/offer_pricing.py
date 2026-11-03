"""How offers turn into a discount on a booking.

One offer per booking. A promo code the customer (or the desk) enters wins; with no code the
best automatic offer (one without a code) is applied. An offer counts when:
  - it is active and the visit date is between its valid-from and valid-to dates,
  - the bill reaches its minimum spend,
  - at least one booked service is in its categories (no categories = every service).
The discount is worked out on the eligible services only: a percentage (capped at
`max_discount` when set) or a flat amount, never more than those services cost, in whole rupees.
"""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .errors import ApiError
from .models import Appointment, Offer, Service
from .utils import format_currency, formatted_date


@dataclass
class Quote:
    offer: Offer
    discount: int
    eligible_total: int


def normalize_code(code: str | None) -> str:
    return "".join((code or "").split()).upper()


def _problem(offer: Offer, services: list[Service], date: str) -> str | None:
    """Why `offer` can't be used for these services on `date`, or None if it can."""
    if not offer.is_active:
        return "This offer has ended."
    if date < offer.valid_from:
        return f"This offer starts on {formatted_date(offer.valid_from)}. Book a visit from then to use it."
    if date > offer.valid_to:
        return f"This offer was valid until {formatted_date(offer.valid_to)}, before your visit date."
    eligible = [s for s in services if not offer.category_ids or s.category_id in offer.category_ids]
    if not eligible:
        return "This code doesn't cover the services you picked."
    total = sum(s.price for s in services)
    if total < (offer.min_spend or 0):
        return f"This offer needs a bill of at least {format_currency(int(offer.min_spend))}."
    return None


def quote(offer: Offer, services: list[Service], date: str) -> Quote | None:
    """The discount `offer` gives, or None when it doesn't apply."""
    if _problem(offer, services, date):
        return None
    eligible_total = sum(s.price for s in services if not offer.category_ids or s.category_id in offer.category_ids)
    if offer.discount_type == "percent":
        discount = int(eligible_total * offer.discount_value / 100)
        if offer.max_discount is not None:
            discount = min(discount, int(offer.max_discount))
    else:
        discount = int(offer.discount_value)
    discount = max(0, min(discount, eligible_total))
    return Quote(offer, discount, eligible_total) if discount > 0 else None


def find_by_code(db: Session, code: str) -> Offer | None:
    return db.scalar(select(Offer).where(func.upper(Offer.code) == normalize_code(code)))


def best_automatic(db: Session, services: list[Service], date: str) -> Quote | None:
    """The biggest discount among live offers that need no code."""
    offers = db.scalars(select(Offer).where(Offer.is_active.is_(True), (Offer.code.is_(None)) | (Offer.code == "")))
    quotes = [q for q in (quote(o, services, date) for o in offers) if q]
    return max(quotes, key=lambda q: q.discount, default=None)


def resolve(db: Session, code: str | None, services: list[Service], date: str) -> Quote | None:
    """Offer for a booking: the entered code (refused with the reason if it can't be used),
    otherwise the best automatic offer, otherwise none."""
    if normalize_code(code):
        offer = find_by_code(db, code)
        if offer is None:
            raise ApiError("VALIDATION", "That promo code doesn't exist. Check the spelling.")
        problem = _problem(offer, services, date)
        if problem:
            raise ApiError("VALIDATION", problem)
        result = quote(offer, services, date)
        if result is None:
            raise ApiError("VALIDATION", "This code gives no discount on the services you picked.")
        return result
    return best_automatic(db, services, date)


def apply(appointment: Appointment, result: Quote | None) -> None:
    """Puts the offer on the bill (or clears it). Never takes the bill below what's already
    settled by payments and loyalty points."""
    if result is None:
        appointment.offer_id = appointment.offer_code = appointment.offer_title = None
        appointment.offer_discount = 0
        return
    room = max(0, appointment.total_price - appointment.amount_paid - appointment.points_discount)
    appointment.offer_id = result.offer.id
    appointment.offer_code = result.offer.code or None
    appointment.offer_title = result.offer.title
    appointment.offer_discount = min(result.discount, room)
