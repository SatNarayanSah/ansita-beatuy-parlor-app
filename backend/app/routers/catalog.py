"""Parlour services ("catalog") and their categories."""

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Service, ServiceCategory, User
from ..queries import upcoming_appointments
from ..schemas import ActiveInput, CategoryInput, CategoryUpdate, ServiceInput, ServiceUpdate
from ..security import get_optional_user, require_admin
from ..serializers import apply, changes, to_dict, to_list
from ..utils import generate_id, today_iso

router = APIRouter(tags=["catalog"])


def _category(db: Session, id_: str) -> ServiceCategory:
    return ensure_found(db.get(ServiceCategory, id_), "Category")


def _service(db: Session, id_: str) -> Service:
    return ensure_found(db.get(Service, id_), "Service")


# ---------- Categories ----------


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return to_list(list(db.scalars(select(ServiceCategory).order_by(ServiceCategory.sort_order))))


@router.post("/categories", status_code=201)
def create_category(body: CategoryInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    name = body.name.strip()
    if db.scalar(select(ServiceCategory).where(func.lower(ServiceCategory.name) == name.lower())):
        raise ApiError("CONFLICT", "A category with this name already exists.")
    max_order = db.scalar(select(func.max(ServiceCategory.sort_order))) or 0
    category = ServiceCategory(id=generate_id("cat"), name=name, icon=body.icon, color=body.color,
                               sort_order=max_order + 1)
    db.add(category)
    db.commit()
    return to_dict(category)


@router.patch("/categories/{id_}")
def update_category(id_: str, body: CategoryUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    category = _category(db, id_)
    values = changes(body)
    if values.get("name"):
        values["name"] = values["name"].strip()
        clash = db.scalar(select(ServiceCategory).where(
            func.lower(ServiceCategory.name) == values["name"].lower(), ServiceCategory.id != id_))
        if clash:
            raise ApiError("CONFLICT", "A category with this name already exists.")
    apply(category, {k: v for k, v in values.items() if v is not None})
    db.commit()
    return to_dict(category)


@router.delete("/categories/{id_}", status_code=204)
def delete_category(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    category = _category(db, id_)
    if db.scalar(select(Service.id).where(Service.category_id == id_).limit(1)):
        raise ApiError("CONFLICT", "Move or delete the services in this category first.")
    db.delete(category)
    db.commit()
    return Response(status_code=204)


# ---------- Services ----------


@router.get("/services")
def list_services(
    query: str = "",
    category_id: str | None = Query(None, alias="categoryId"),
    active_only: bool = Query(False, alias="activeOnly"),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Public. Visitors and customers only ever see active services."""
    stmt = select(Service)
    if user is None or user.role == "customer" or active_only:
        stmt = stmt.where(Service.is_active.is_(True))
    if category_id:
        stmt = stmt.where(Service.category_id == category_id)
    if query.strip():
        needle = f"%{query.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Service.name).like(needle), func.lower(Service.description).like(needle)))
    return to_list(list(db.scalars(stmt.order_by(Service.name))))


@router.get("/services/{id_}")
def get_service(id_: str, db: Session = Depends(get_db)):
    return to_dict(_service(db, id_))


@router.post("/services", status_code=201)
def create_service(body: ServiceInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    _category(db, body.category_id)
    service = Service(id=generate_id("svc"), **{**body.model_dump(), "name": body.name.strip()})
    db.add(service)
    db.commit()
    return to_dict(service)


@router.patch("/services/{id_}")
def update_service(id_: str, body: ServiceUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    service = _service(db, id_)
    values = changes(body)
    if values.get("category_id"):
        _category(db, values["category_id"])
    if values.get("name"):
        values["name"] = values["name"].strip()
    # Only `image` may be cleared to null; other nulls mean "unchanged".
    apply(service, {k: v for k, v in values.items() if v is not None or k == "image"})
    db.commit()
    return to_dict(service)


@router.post("/services/{id_}/active")
def set_service_active(id_: str, body: ActiveInput, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    service = _service(db, id_)
    service.is_active = body.is_active
    db.commit()
    return to_dict(service)


@router.delete("/services/{id_}", status_code=204)
def delete_service(id_: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Past appointments keep their snapshot price; upcoming bookings block deletion."""
    service = _service(db, id_)
    if any(id_ in appointment.service_ids for appointment in upcoming_appointments(db, today_iso())):
        raise ApiError(
            "CONFLICT",
            "This service has upcoming bookings. Deactivate it instead, or reschedule those bookings first.",
        )
    db.delete(service)
    db.commit()
    return Response(status_code=204)
