"""Notifications for the signed-in user only."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Notification, PushDevice, User
from ..schemas import PushDeviceInput, PushDeviceRemove
from ..security import get_current_user
from ..serializers import to_dict, to_list
from ..utils import generate_id

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _own(db: Session, id_: str, user: User) -> Notification:
    notification = ensure_found(db.get(Notification, id_), "Notification")
    if notification.user_id != user.id:
        raise ApiError("FORBIDDEN")
    return notification


@router.get("")
def list_mine(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    return to_list(list(db.scalars(stmt)))


@router.get("/unread-count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.is_read.is_(False))
    return {"count": db.scalar(stmt) or 0}


@router.post("/devices", status_code=204)
def register_device(body: PushDeviceInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Called after sign-in. A phone that changes hands moves to the new user."""
    device = db.scalar(select(PushDevice).where(PushDevice.token == body.token))
    if device is None:
        device = PushDevice(id=generate_id("dev"), token=body.token)
        db.add(device)
    device.user_id = user.id
    device.platform = body.platform
    device.offer_alerts = body.offer_alerts
    db.commit()
    return Response(status_code=204)


@router.post("/devices/remove", status_code=204)
def remove_device(body: PushDeviceRemove, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Called on sign-out, so the phone stops getting this user's notifications."""
    db.execute(delete(PushDevice).where(PushDevice.token == body.token, PushDevice.user_id == user.id))
    db.commit()
    return Response(status_code=204)


@router.post("/read-all", status_code=204)
def mark_all_as_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(is_read=True))
    db.commit()
    return Response(status_code=204)


@router.post("/{id_}/read")
def mark_as_read(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = _own(db, id_, user)
    notification.is_read = True
    db.commit()
    return to_dict(notification)


@router.delete("/{id_}", status_code=204)
def delete_notification(id_: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_own(db, id_, user))
    db.commit()
    return Response(status_code=204)


@router.delete("", status_code=204)
def clear_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(delete(Notification).where(Notification.user_id == user.id))
    db.commit()
    return Response(status_code=204)
