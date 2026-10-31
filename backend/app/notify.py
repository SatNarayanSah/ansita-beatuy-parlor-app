"""Server-side notifications, created alongside the change that triggers them."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .business import alert_enabled, get_business
from .models import Notification, User
from .utils import generate_id


def link(kind: str, id_: str) -> dict[str, Any]:
    return {"kind": kind, "id": id_}


def notify_user(db: Session, user_id: str, type_: str, title: str, message: str, link_: dict | None = None) -> None:
    db.add(
        Notification(
            id=generate_id("ntf"),
            user_id=user_id,
            type=type_,
            title=title,
            message=message,
            is_read=False,
            link=link_,
        )
    )


def notify_customer(db: Session, customer_id: str, type_: str, title: str, message: str, link_: dict | None = None) -> None:
    """Notifies the app account linked to a customer, if that customer has one."""
    user = db.scalar(select(User).where(User.customer_id == customer_id))
    if user is not None:
        notify_user(db, user.id, type_, title, message, link_)


def notify_admins(
    db: Session,
    type_: str,
    title: str,
    message: str,
    link_: dict | None = None,
    except_user_id: str | None = None,
) -> None:
    """Skipped when the parlour has switched off alerts of this type in Settings."""
    if not alert_enabled(get_business(db), type_):
        return
    for admin in db.scalars(select(User).where(User.role == "admin")):
        if admin.id != except_user_id:
            notify_user(db, admin.id, type_, title, message, link_)
