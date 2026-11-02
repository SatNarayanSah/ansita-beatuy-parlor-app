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
