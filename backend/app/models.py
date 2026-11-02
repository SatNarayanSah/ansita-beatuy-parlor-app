"""Database tables. Shapes follow `src/types` in the app; nested lists are JSON columns.

Dates are stored as `yyyy-MM-dd` strings and times as `HH:mm`, exactly like the app,
so string comparison gives chronological order. Timestamps are ISO-8601 UTC strings.
"""

from typing import Any

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .image_urls import ImageUrl
from .utils import now_iso


class EntityMixin:
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[str] = mapped_column(String(32), default=now_iso)
    updated_at: Mapped[str] = mapped_column(String(32), default=now_iso, onupdate=now_iso)


class User(EntityMixin, Base):
    __tablename__ = "users"

    role: Mapped[str] = mapped_column(String(16))  # admin | customer
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(32), default="")
    avatar: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    staff_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    # Bumped on password change/reset so older tokens stop working.
    token_version: Mapped[int] = mapped_column(Integer, default=0)


class PushDevice(EntityMixin, Base):
    """A phone that receives push notifications for the signed-in user."""

    __tablename__ = "push_devices"

    user_id: Mapped[str] = mapped_column(String(64), index=True)
    # Expo push token, e.g. "ExponentPushToken[xxxx]". One row per phone.
    token: Mapped[str] = mapped_column(String(255), unique=True)
    platform: Mapped[str] = mapped_column(String(16), default="android")
    offer_alerts: Mapped[bool] = mapped_column(Boolean, default=True)


class PasswordReset(Base):
    __tablename__ = "password_resets"

    email: Mapped[str] = mapped_column(String(254), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[float] = mapped_column(Float)
    attempts: Mapped[int] = mapped_column(Integer, default=0)


class Customer(EntityMixin, Base):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32), index=True, default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    gender: Mapped[str] = mapped_column(String(16), default="female")
    dob: Mapped[str | None] = mapped_column(String(10), nullable=True)
    address: Mapped[dict[str, Any]] = mapped_column(JSON)
    notes: Mapped[str] = mapped_column(Text, default="")
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)
    joined_at: Mapped[str] = mapped_column(String(32), default=now_iso)
    avatar: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)


class ServiceCategory(EntityMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(64))
    color: Mapped[str] = mapped_column(String(16))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Service(EntityMixin, Base):
    __tablename__ = "services"

    name: Mapped[str] = mapped_column(String(120))
    category_id: Mapped[str] = mapped_column(String(64), ForeignKey("categories.id"), index=True)
    duration: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, default="")
    image: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Staff(EntityMixin, Base):
    __tablename__ = "staff"

    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(32))
    phone: Mapped[str] = mapped_column(String(32), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    specialties: Mapped[list[str]] = mapped_column(JSON, default=list)
    working_hours: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    avatar: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Appointment(EntityMixin, Base):
    __tablename__ = "appointments"

    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    service_ids: Mapped[list[str]] = mapped_column(JSON)
    staff_id: Mapped[str] = mapped_column(String(64), index=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    start_time: Mapped[str] = mapped_column(String(5))
    end_time: Mapped[str] = mapped_column(String(5))
    status: Mapped[str] = mapped_column(String(16), index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    total_price: Mapped[int] = mapped_column(Integer)
    amount_paid: Mapped[int] = mapped_column(Integer, default=0)
    # Loyalty points the customer spent on this bill, and the rupees they took off it.
    points_redeemed: Mapped[int] = mapped_column(Integer, default=0)
    points_discount: Mapped[int] = mapped_column(Integer, default=0)
    # Each payment with the day it was received; revenue is counted on that day.
    payments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    payment_status: Mapped[str] = mapped_column(String(16), default="unpaid")
    payment_method: Mapped[str | None] = mapped_column(String(16), nullable=True)
    preferred_payment_method: Mapped[str | None] = mapped_column(String(16), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class Course(EntityMixin, Base):
    __tablename__ = "courses"

    title: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(16))
    description: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[str] = mapped_column(String(64))
    fee: Mapped[int] = mapped_column(Integer)
    level: Mapped[str] = mapped_column(String(16))
    syllabus: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    instructor: Mapped[str] = mapped_column(String(64))
    batches: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    seats: Mapped[int] = mapped_column(Integer)
    image: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    certificate: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Enrollment(EntityMixin, Base):
    __tablename__ = "enrollments"

    student_id: Mapped[str] = mapped_column(String(64), index=True)
    course_id: Mapped[str] = mapped_column(String(64), index=True)
    batch_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16))
    fee_paid: Mapped[int] = mapped_column(Integer, default=0)
    fee_total: Mapped[int] = mapped_column(Integer)
    payments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    attendance: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)


class Notification(EntityMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(String(64), index=True)
    type: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)


class Review(EntityMixin, Base):
    __tablename__ = "reviews"

    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    appointment_id: Mapped[str] = mapped_column(String(64), unique=True)
    staff_id: Mapped[str] = mapped_column(String(64), index=True)
    service_ids: Mapped[list[str]] = mapped_column(JSON)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)


class Offer(EntityMixin, Base):
    __tablename__ = "offers"

    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    discount_type: Mapped[str] = mapped_column(String(16))
    discount_value: Mapped[float] = mapped_column(Float)
    max_discount: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_spend: Mapped[float] = mapped_column(Float, default=0)
    category_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    valid_from: Mapped[str] = mapped_column(String(10))
    valid_to: Mapped[str] = mapped_column(String(10))
    terms: Mapped[list[str]] = mapped_column(JSON, default=list)
    image: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class BusinessSettingsRow(Base):
    """Single row (id = 1) holding the parlour-wide settings."""

    __tablename__ = "business_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    profile: Mapped[dict[str, Any]] = mapped_column(JSON)
    holidays: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    loyalty: Mapped[dict[str, Any]] = mapped_column(JSON)
    alerts: Mapped[dict[str, Any]] = mapped_column(JSON)
    # Where customers can pay online (eSewa, Khalti, Fonepay, bank) and whether they may
    # send "I've paid" requests. Empty until an admin fills it in; see business.payment_settings.
    payment_accounts: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)


class Upload(EntityMixin, Base):
    """An image uploaded from the admin website (service, offer, course or staff photo).

    Kept in the database rather than on disk: the API host's disk is wiped on every deploy.
    Served by `GET /uploads/{id}`, whose absolute URL is what goes in the `image`/`avatar` field.
    """

    __tablename__ = "uploads"

    content_type: Mapped[str] = mapped_column(String(32))
    size: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    uploaded_by: Mapped[str | None] = mapped_column(String(64), nullable=True)


class PaymentRequest(EntityMixin, Base):
    """A customer's "I've paid" message for an appointment or a course fee.

    It changes no balance by itself: an admin checks the transaction and approves it (which
    records the payment, dated `paid_on`) or rejects it with a reason.
    """

    __tablename__ = "payment_requests"

    target_type: Mapped[str] = mapped_column(String(16))  # appointment | enrollment
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(16))
    reference: Mapped[str] = mapped_column(String(64))
    paid_on: Mapped[str] = mapped_column(String(10))
    note: Mapped[str] = mapped_column(Text, default="")
    proof: Mapped[str | None] = mapped_column(ImageUrl, nullable=True)
    status: Mapped[str] = mapped_column(String(16), index=True, default="pending")  # pending | approved | rejected | cancelled
    approved_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default="")
    reviewed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(String(32), nullable=True)
