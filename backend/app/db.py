import json
from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

_url = settings.sqlalchemy_url
_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}

engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """One session per request. Routes call `db.commit()` themselves; anything uncommitted is rolled back."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401  (registers the tables)

    Base.metadata.create_all(bind=engine)
    _add_appointment_payments()
    _strip_upload_hosts()
    _add_payment_accounts()


def _add_payment_accounts() -> None:
    """Adds `business_settings.payment_accounts` to databases created before it existed."""
    if "payment_accounts" in {column["name"] for column in inspect(engine).get_columns("business_settings")}:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE business_settings ADD COLUMN payment_accounts JSON"))


def _strip_upload_hosts() -> None:
    """Older uploads were saved as full links (e.g. http://localhost:8000/uploads/img_x),
    which only work on the computer that made them. Keep just `/uploads/img_x`."""
    from .image_urls import to_stored

    columns = {"users": "avatar", "customers": "avatar", "staff": "avatar", "services": "image", "courses": "image", "offers": "image"}
    with engine.begin() as conn:
        for table, column in columns.items():
            rows = conn.execute(text(f"SELECT id, {column} FROM {table} WHERE {column} LIKE '%://%/uploads/%'")).all()
            for id_, value in rows:
                conn.execute(text(f"UPDATE {table} SET {column} = :value WHERE id = :id"), {"value": to_stored(value), "id": id_})
    _add_appointment_points()


def _add_appointment_points() -> None:
    """Adds the loyalty redemption columns to databases created before redemption existed."""
    existing = {column["name"] for column in inspect(engine).get_columns("appointments")}
    with engine.begin() as conn:
        for column in ("points_redeemed", "points_discount"):
            if column not in existing:
                conn.execute(text(f"ALTER TABLE appointments ADD COLUMN {column} INTEGER NOT NULL DEFAULT 0"))


def _add_appointment_payments() -> None:
    """Adds `appointments.payments` to databases created before it existed.

    Money already collected becomes one payment dated the day the row was last
    updated, which is when the admin recorded it.
    """
    from .utils import local_date_of

    if "payments" in {column["name"] for column in inspect(engine).get_columns("appointments")}:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE appointments ADD COLUMN payments JSON"))
        rows = conn.execute(text("SELECT id, amount_paid, payment_method, updated_at FROM appointments")).all()
        for id_, amount_paid, method, updated_at in rows:
            payments = (
                [{"id": f"pay_{id_}", "amount": amount_paid, "paidOn": local_date_of(str(updated_at)), "method": method or "cash"}]
                if amount_paid else []
            )
            conn.execute(text("UPDATE appointments SET payments = :payments WHERE id = :id"),
                         {"payments": json.dumps(payments), "id": id_})
