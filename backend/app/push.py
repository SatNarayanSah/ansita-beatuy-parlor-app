"""Phone notifications through Expo's push service.

`notify_user` queues a push on the database session; it is sent only after that
session commits, so a rolled-back change never reaches anyone's phone. Sending
runs on a background thread and never fails the request.
"""

import json
import logging
import threading
import urllib.request
from typing import Any

from sqlalchemy import delete, event, func, select
from sqlalchemy.orm import Session

from .config import settings

log = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_BATCH = 100  # Expo accepts up to 100 messages per request

# Notification types a customer can switch off ("Offer alerts" in the app).
_OFFER_TYPES = {"promotion"}


def queue_push(db: Session, user_id: str, type_: str, title: str, body: str, data: dict[str, Any]) -> None:
    db.info.setdefault("pushes", []).append(
        {"user_id": user_id, "type": type_, "title": title, "body": body, "data": data})


@event.listens_for(Session, "after_commit")
def _send_after_commit(session: Session) -> None:
    pushes = session.info.pop("pushes", None)
    if pushes and settings.push_enabled:
        threading.Thread(target=_deliver, args=(pushes,), daemon=True).start()


@event.listens_for(Session, "after_rollback")
def _drop_on_rollback(session: Session) -> None:
    session.info.pop("pushes", None)


def _deliver(pushes: list[dict[str, Any]]) -> None:
    from .db import SessionLocal
    from .models import Notification, PushDevice

    try:
        with SessionLocal() as db:
            messages: list[dict[str, Any]] = []
            for push in pushes:
                devices = list(db.scalars(select(PushDevice).where(PushDevice.user_id == push["user_id"])))
                if not devices:
                    continue
                unread = db.scalar(select(func.count()).select_from(Notification).where(
                    Notification.user_id == push["user_id"], Notification.is_read.is_(False))) or 0
                for device in devices:
                    if push["type"] in _OFFER_TYPES and not device.offer_alerts:
                        continue
                    messages.append({
                        "to": device.token,
                        "title": push["title"],
                        "body": push["body"],
                        "data": push["data"],
                        "sound": "default",
                        "priority": "high",
                        "channelId": "default",
                        "badge": unread,
                    })
            dead = [token for start in range(0, len(messages), _BATCH) for token in _post(messages[start:start + _BATCH])]
            if dead:
                db.execute(delete(PushDevice).where(PushDevice.token.in_(dead)))
                db.commit()
    except Exception:  # noqa: BLE001  (a failed push must never affect the app)
        log.exception("Push delivery failed")


def _post(messages: list[dict[str, Any]]) -> list[str]:
    """Sends one batch; returns tokens Expo reports as no longer registered (app uninstalled)."""
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"
    request = urllib.request.Request(EXPO_PUSH_URL, data=json.dumps(messages).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=15) as response:
        tickets = json.loads(response.read()).get("data", [])
    return [
        message["to"]
        for message, ticket in zip(messages, tickets)
        if ticket.get("status") == "error" and (ticket.get("details") or {}).get("error") == "DeviceNotRegistered"
    ]
