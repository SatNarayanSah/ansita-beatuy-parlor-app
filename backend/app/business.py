"""Parlour-wide settings (single row) and the rules derived from them."""

from typing import Any

from sqlalchemy.orm import Session

from .models import BusinessSettingsRow

DEFAULT_SETTINGS: dict[str, Any] = {
    "profile": {
        "name": "Ansita Beauty Parlour",
        "tagline": "Beauty Parlour & Training Centre",
        "phone": "+9779854028392",
        "whatsapp": "+9779766323138",
        "email": "support@ansitabeautyparlor.com",
        "address": "Ramanand Chowk, Janakpur-8, Dhanusha 45600",
        "openTime": "10:00",
        "closeTime": "19:00",
    },
    "holidays": [],
    "loyalty": {"enabled": True, "rupeesPerPoint": 100, "pointValue": 1, "minRedeemPoints": 500},
    "alerts": {"newBookings": True, "cancellations": True, "payments": True, "enrollments": True},
}


ONLINE_METHODS = ("esewa", "khalti", "fonepay", "bank")

_EMPTY_ACCOUNT = {"enabled": False, "accountName": "", "accountNumber": "", "bankName": "", "qr": None, "instructions": ""}


def payment_settings(row: "BusinessSettingsRow") -> dict[str, Any]:
    """Online payment accounts with every key present. QR images get a full link for this request."""
    from .image_urls import to_public

    stored = row.payment_accounts or {}
    accounts = {}
    for method in ONLINE_METHODS:
        account = {**_EMPTY_ACCOUNT, **(stored.get(method) or {})}
        account["qr"] = to_public(account.get("qr"))
        accounts[method] = account
    return {"requests": bool(stored.get("requests", True)), **accounts}


def online_methods(row: "BusinessSettingsRow") -> list[str]:
    """Methods customers can send "I've paid" for. Until the parlour sets up any account,
    all of them are allowed, so customers who paid a number they already know can say so."""
    settings = payment_settings(row)
    if not settings["requests"]:
        return []
    enabled = [method for method in ONLINE_METHODS if settings[method]["enabled"]]
    return enabled or list(ONLINE_METHODS)


def accepts_online(row: "BusinessSettingsRow", method: str) -> bool:
    return method in online_methods(row)


def get_business(db: Session, *, lock: bool = False) -> BusinessSettingsRow:
    row = db.get(BusinessSettingsRow, 1, with_for_update=lock)
    if row is None:
        row = BusinessSettingsRow(id=1, **{key: _copy(value) for key, value in DEFAULT_SETTINGS.items()})
        db.add(row)
        db.flush()
    return row


def _copy(value: Any) -> Any:
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, list):
        return list(value)
    return value


def snapshot(row: BusinessSettingsRow) -> dict[str, Any]:
    loyalty = {"minRedeemPoints": DEFAULT_SETTINGS["loyalty"]["minRedeemPoints"], **row.loyalty}
    return {"profile": row.profile, "holidays": row.holidays, "loyalty": loyalty, "alerts": row.alerts,
            "payments": payment_settings(row)}


def holiday_on(row: BusinessSettingsRow, date: str) -> dict[str, Any] | None:
    return next((holiday for holiday in row.holidays if holiday.get("date") == date), None)


def points_for(row: BusinessSettingsRow, amount: int) -> int:
    loyalty = row.loyalty
    if not loyalty.get("enabled"):
        return 0
    return amount // max(1, int(loyalty.get("rupeesPerPoint") or 1))


def min_redeem_points(row: BusinessSettingsRow) -> int:
    """Points a customer must have before any can be used as a discount."""
    return int(row.loyalty.get("minRedeemPoints", DEFAULT_SETTINGS["loyalty"]["minRedeemPoints"]))


def points_worth(row: BusinessSettingsRow, points: int) -> int:
    """Rupees off the bill for `points`, rounded down to whole rupees."""
    return int(points * float(row.loyalty.get("pointValue") or 0))


def alert_enabled(row: BusinessSettingsRow, notification_type: str) -> bool:
    key = {
        "appointment_booked": "newBookings",
        "appointment_cancelled": "cancellations",
        "payment": "payments",
        "enrollment": "enrollments",
    }.get(notification_type)
    return True if key is None else bool(row.alerts.get(key, True))
