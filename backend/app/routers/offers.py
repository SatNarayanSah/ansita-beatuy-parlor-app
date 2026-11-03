"""Promotions. Customers see only live offers; admins see drafts and expired ones too."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import offer_pricing
from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Offer, User
from ..queries import resolve_services
from ..schemas import ActiveInput, OfferInput, OfferQuoteInput, OfferUpdate
from ..security import get_optional_user, require_admin
from ..serializers import apply, changes, to_dict, to_list
from ..utils import generate_id, is_valid_iso_date, today_iso

router = APIRouter(prefix="/offers", tags=["offers"])

_NULLABLE = {"code", "max_discount", "image"}


def _offer(db: Session, id_: str) -> Offer:
    return ensure_found(db.get(Offer, id_), "Offer")


def _normalize_code(code: str | None) -> str | None:
    return (code or "").strip().upper() or None


def _validate(db: Session, merged: dict, current_id: str | None = None) -> None:
    if merged["discount_value"] <= 0:
        raise ApiError("VALIDATION", "Discount must be more than zero.")
    if merged["discount_type"] == "percent" and merged["discount_value"] > 100:
        raise ApiError("VALIDATION", "A percentage discount cannot exceed 100%.")
    if not is_valid_iso_date(merged["valid_from"]) or not is_valid_iso_date(merged["valid_to"]):
        raise ApiError("VALIDATION", "Choose valid dates.")
    if merged["valid_to"] < merged["valid_from"]:
        raise ApiError("VALIDATION", "The end date must be on or after the start date.")
    code = merged.get("code")
    if code:
        stmt = select(Offer.id).where(func.upper(Offer.code) == code)
        if current_id:
            stmt = stmt.where(Offer.id != current_id)
        if db.scalar(stmt.limit(1)):
            raise ApiError("CONFLICT", "Another offer already uses this code.")


@router.get("")
def list_offers(user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    """Public. Visitors and customers see only offers that are live today."""
    if user is None or user.role == "customer":
        today = today_iso()
        stmt = (select(Offer).where(Offer.is_active.is_(True), Offer.valid_from <= today, Offer.valid_to >= today)
                .order_by(Offer.valid_to))
    else:
        stmt = select(Offer).order_by(Offer.valid_from.desc())
    return to_list(list(db.scalars(stmt)))


@router.post("/quote")
def quote_offer(body: OfferQuoteInput, db: Session = Depends(get_db)):
    """What a booking would get: the entered code (an error explains why it can't be used),
    or the best automatic offer. `offer` is null when nothing applies."""
    services = resolve_services(db, body.service_ids)
    total = sum(s.price for s in services)
    result = offer_pricing.resolve(db, body.code, services, body.date)
    if result is None:
        return {"offer": None, "discount": 0, "total": total, "payable": total, "automatic": False}
    return {"offer": to_dict(result.offer), "discount": result.discount, "total": total,
            "payable": total - result.discount, "automatic": not result.offer.code}


@router.get("/{id_}")
def get_offer(id_: str, db: Session = Depends(get_db)):
    return to_dict(_offer(db, id_))


@router.post("", status_code=201)
def create_offer(body: OfferInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    values = {**body.model_dump(), "title": body.title.strip(), "code": _normalize_code(body.code)}
    _validate(db, values)
    offer = Offer(id=generate_id("ofr"), **values)
    db.add(offer)
    db.commit()
    return to_dict(offer)


@router.patch("/{id_}")
def update_offer(id_: str, body: OfferUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    offer = _offer(db, id_)
    values = {k: v for k, v in changes(body).items() if v is not None or k in _NULLABLE}
    if "code" in values:
        values["code"] = _normalize_code(values["code"])
    if "title" in values:
        values["title"] = values["title"].strip()
    current = {column.key: getattr(offer, column.key) for column in Offer.__table__.columns}
    _validate(db, {**current, **values}, current_id=id_)
    apply(offer, values)
    db.commit()
    return to_dict(offer)


@router.post("/{id_}/active")
def set_offer_active(id_: str, body: ActiveInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    offer = _offer(db, id_)
    offer.is_active = body.is_active
    db.commit()
    return to_dict(offer)


@router.delete("/{id_}", status_code=204)
def delete_offer(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    db.delete(_offer(db, id_))
    db.commit()
    return Response(status_code=204)
