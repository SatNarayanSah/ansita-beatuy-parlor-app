"""Date, time, phone, id and formatting helpers ported from the app's `src/utils`."""

import re
import secrets
import string
import time as _time
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .config import settings

TZ = ZoneInfo(settings.timezone)

# Python's date.weekday(): Monday == 0.
_WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

# ---------- Dates & times ----------


def now_local() -> datetime:
    return datetime.now(TZ)


def now_iso() -> str:
    """Same shape as JS `new Date().toISOString()`."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def today_iso() -> str:
    return now_local().date().isoformat()


def local_date_of(timestamp: str) -> str:
    """The parlour's calendar day for a stored UTC timestamp like "2026-10-31T17:38:35.464Z"."""
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(TZ).date().isoformat()


def is_valid_iso_date(value: str) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def is_valid_time(value: str) -> bool:
    return isinstance(value, str) and re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", value) is not None


def weekday_of(value: str) -> str:
    return _WEEKDAYS[date.fromisoformat(value).weekday()]


def time_to_minutes(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def minutes_to_time(total: int) -> str:
    clamped = max(0, min(total, 24 * 60 - 1))
    return f"{clamped // 60:02d}:{clamped % 60:02d}"


def add_minutes_to_time(value: str, minutes: int) -> str:
    return minutes_to_time(time_to_minutes(value) + minutes)


def time_ranges_overlap(a_start: str, a_end: str, b_start: str, b_end: str) -> bool:
    """True when [aStart, aEnd) and [bStart, bEnd) overlap."""
    return time_to_minutes(a_start) < time_to_minutes(b_end) and time_to_minutes(b_start) < time_to_minutes(a_end)


def generate_time_slots(start: str, end: str, step: int, duration: int | None = None) -> list[str]:
    duration = step if duration is None else duration
    slots: list[str] = []
    end_minutes = time_to_minutes(end)
    t = time_to_minutes(start)
    while t + duration <= end_minutes:
        slots.append(minutes_to_time(t))
        t += step
    return slots


def is_past_date_time(day: str, at: str) -> bool:
    hours, minutes = (int(part) for part in at.split(":"))
    moment = datetime.combine(date.fromisoformat(day), time(hours, minutes), tzinfo=TZ)
    return moment < now_local()


# ---------- Display formatting (used in notification messages) ----------


def format_time12(value: str) -> str:
    """"14:30" -> "2:30 PM"."""
    hours, minutes = (int(part) for part in value.split(":"))
    suffix = "AM" if hours < 12 else "PM"
    return f"{hours % 12 or 12}:{minutes:02d} {suffix}"


def format_relative_day(value: str) -> str:
    """"Today", "Tomorrow", "Yesterday" or "Mon, 3 Nov"."""
    day = date.fromisoformat(value)
    today = now_local().date()
    if day == today:
        return "Today"
    if day == today + timedelta(days=1):
        return "Tomorrow"
    if day == today - timedelta(days=1):
        return "Yesterday"
    return f"{day.strftime('%a')}, {day.day} {day.strftime('%b')}"


def _group_indian(value: int) -> str:
    """125000 -> "1,25,000" (lakh/crore grouping, as en-IN)."""
    digits = str(value)
    if len(digits) <= 3:
        return digits
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups) + "," + tail


def format_currency(amount: float) -> str:
    sign = "-" if amount < 0 else ""
    return f"{sign}Rs. {_group_indian(round(abs(amount)))}"


def format_enum_label(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split("_") if part)


def round_rating(value: float) -> float:
    return round(value * 10) / 10


# ---------- Ids ----------

_ALPHABET = string.ascii_lowercase + string.digits


def _base36(number: int) -> str:
    out = ""
    while number:
        number, rem = divmod(number, 36)
        out = "0123456789abcdefghijklmnopqrstuvwxyz"[rem] + out
    return out or "0"


def generate_id(prefix: str) -> str:
    """Id such as `apt_lq2x9k_3f8a1c`, roughly sortable by creation time."""
    return f"{prefix}_{_base36(int(_time.time() * 1000))}_{''.join(secrets.choice(_ALPHABET) for _ in range(6))}"


# ---------- Phone numbers (E.164, Nepal default) ----------

_COUNTRIES = [
    # (dial code, national number pattern)
    ("977", re.compile(r"^9[678]\d{8}$")),
    ("91", re.compile(r"^[6-9]\d{9}$")),
    ("971", re.compile(r"^5\d{8}$")),
    ("44", re.compile(r"^7\d{9}$")),
    ("1", re.compile(r"^[2-9]\d{9}$")),
    ("61", re.compile(r"^4\d{8}$")),
]
_BY_DIAL_LENGTH = sorted(_COUNTRIES, key=lambda item: len(item[0]), reverse=True)


def normalize_phone(value: str, default_dial_code: str = "977") -> str:
    """Accepts "+977 981-2345678", "9779812345678", "09812345678" or "9812345678"."""
    trimmed = (value or "").strip()
    digits = re.sub(r"\D", "", trimmed)
    if not digits:
        return ""
    if trimmed.startswith("+"):
        return f"+{digits}"
    for dial, pattern in _BY_DIAL_LENGTH:
        if digits.startswith(dial) and pattern.match(digits[len(dial):]):
            return f"+{digits}"
    return f"+{default_dial_code}{digits.lstrip('0')}"
