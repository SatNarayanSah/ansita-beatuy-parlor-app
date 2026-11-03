import hashlib
import hmac
import secrets
import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import rate_limit
from ..config import settings
from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Customer, PasswordReset, User
from ..notify import link, notify_admins, notify_user
from ..schemas import (
    ChangePasswordInput,
    LoginInput,
    PasswordResetRequestInput,
    ProfileInput,
    RegisterInput,
    ResetPasswordInput,
)
from ..security import create_access_token, get_current_user, get_optional_user, hash_password, verify_password
from ..serializers import to_dict
from ..utils import generate_id, normalize_phone, now_iso

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_RESET_ATTEMPTS = 5

# Checked when the email is unknown, so a wrong email takes as long as a wrong password.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _session(user: User) -> dict:
    """Login/register response: the user plus a bearer token for later requests."""
    return {"user": to_dict(user), "token": create_access_token(user)}


def _find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email))


def _assert_email_available(db: Session, email: str, except_user_id: str | None = None) -> None:
    existing = _find_user_by_email(db, email)
    if existing is not None and existing.id != except_user_id:
        raise ApiError("CONFLICT", "An account with this email already exists.")


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:2]}{'•' * max(3, len(local) - 2)}@{domain}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(f"{settings.jwt_secret}:{code}".encode()).hexdigest()


@router.post("/login")
def login(body: LoginInput, request: Request, db: Session = Depends(get_db)):
    email = _normalize_email(body.email)
    key = f"{rate_limit.client_ip(request)}|{email}"
    rate_limit.login_failures.check(key)
    rate_limit.login_failures_per_email.check(email)
    user = _find_user_by_email(db, email)
    valid = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
    if user is None or not valid:
        rate_limit.login_failures.hit(key)
        rate_limit.login_failures_per_email.hit(email)
        raise ApiError("UNAUTHORIZED", "Invalid email or password.")
    rate_limit.login_failures.reset(key)
    return _session(user)


@router.post("/register")
def register(body: RegisterInput, request: Request, db: Session = Depends(get_db)):
    """Creates a customer profile plus an app account and signs the user in."""
    rate_limit.registrations.check_and_hit(rate_limit.client_ip(request))
    email = _normalize_email(body.email)
    phone = normalize_phone(body.phone)
    name = body.name.strip()
    _assert_email_available(db, email)

    # Walk-in customers who later download the app keep their history.
    customer = db.scalar(select(Customer).where(Customer.phone == phone)) if phone else None
    if customer is not None:
        if db.scalar(select(User).where(User.customer_id == customer.id)) is not None:
            raise ApiError("CONFLICT", "An account with this phone number already exists.")
        customer.name = name
        customer.email = email
    else:
        customer = Customer(
            id=generate_id("cus"),
            name=name,
            phone=phone,
            email=email,
            gender="female",
            dob=None,
            address={"line1": "", "line2": "", "city": "", "province": "", "postalCode": ""},
            notes="",
            loyalty_points=0,
            joined_at=now_iso(),
            avatar=None,
            tags=["new"],
        )
        db.add(customer)

    user = User(
        id=generate_id("usr"),
        role="customer",
        name=name,
        email=email,
        phone=phone,
        avatar=None,
        customer_id=customer.id,
        staff_id=None,
        password_hash=hash_password(body.password),
        token_version=0,
    )
    db.add(user)
    db.flush()

    notify_user(db, user.id, "system", "Welcome to Ansita!", "Book your first appointment or explore our beauty courses.")
    notify_admins(
        db,
        "system",
        "New customer signed up",
        f"{user.name} created an account in the app.",
        link("customer", customer.id),
    )
    db.commit()
    return _session(user)


@router.get("/me")
def get_current(user: User | None = Depends(get_optional_user)):
    """The signed-in user, or null when no token was sent."""
    return to_dict(user) if user else None


@router.post("/logout")
def logout():
    """Tokens are stateless; the app just forgets its token. Kept for symmetry with the app's service."""
    return None


@router.patch("/me")
def update_profile(body: ProfileInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Updates the account and, for customers, mirrors the change onto the customer profile."""
    patch: dict = {}
    if "name" in body.model_fields_set and body.name is not None:
        patch["name"] = body.name.strip()
    if "email" in body.model_fields_set and body.email is not None:
        email = _normalize_email(body.email)
        _assert_email_available(db, email, user.id)
        patch["email"] = email
    if "phone" in body.model_fields_set and body.phone is not None:
        patch["phone"] = normalize_phone(body.phone)
    if "avatar" in body.model_fields_set:
        patch["avatar"] = body.avatar

    for key, value in patch.items():
        setattr(user, key, value)
    if user.customer_id:
        customer = db.get(Customer, user.customer_id)
        if customer is not None:
            if "phone" in patch:
                clash = db.scalar(select(Customer).where(Customer.phone == patch["phone"], Customer.id != customer.id))
                if clash is not None:
                    raise ApiError("CONFLICT", "A customer with this phone number already exists.")
            for key, value in patch.items():
                setattr(customer, key, value)
    db.commit()
    return to_dict(user)


@router.post("/change-password")
def change_password(body: ChangePasswordInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns a fresh token: older tokens stop working after a password change."""
    if not verify_password(body.current_password, user.password_hash):
        raise ApiError("VALIDATION", "Current password is incorrect.")
    if body.current_password == body.new_password:
        raise ApiError("VALIDATION", "New password must be different from the current one.")
    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    db.commit()
    return {"token": create_access_token(user)}


@router.post("/password-reset/request")
def request_password_reset(body: PasswordResetRequestInput, request: Request, db: Session = Depends(get_db)):
    """Step 1 of "Forgot password": issues a 6-digit code valid for 10 minutes."""
    email = _normalize_email(body.email)
    rate_limit.reset_requests.check_and_hit(rate_limit.client_ip(request))
    rate_limit.reset_requests_per_email.check_and_hit(email)
    user = _find_user_by_email(db, email)
    if user is None:
        raise ApiError("NOT_FOUND", "No account found with this email.")
    code = f"{secrets.randbelow(900000) + 100000}"
    row = db.get(PasswordReset, email) or PasswordReset(email=email)
    row.code_hash = _hash_code(code)
    row.expires_at = time.time() + settings.reset_code_ttl_minutes * 60
    row.attempts = 0
    db.add(row)
    db.commit()
    # TODO: send `code` by email/SMS (e.g. Sparrow SMS). Until then it is returned when allowed.
    # Never for an admin: anyone who knows the owner's email could take over the whole business.
    expose = settings.expose_reset_code and user.role != "admin"
    return {"sentTo": _mask_email(email), "demoCode": code if expose else ""}


@router.post("/password-reset/confirm")
def reset_password(body: ResetPasswordInput, db: Session = Depends(get_db)):
    """Step 2 of "Forgot password": checks the code and sets the new password. Does not sign in."""
    email = _normalize_email(body.email)
    rate_limit.reset_failures_per_email.check(email)
    pending = db.get(PasswordReset, email)
    if pending is None or pending.expires_at < time.time() or pending.attempts >= MAX_RESET_ATTEMPTS:
        if pending is not None:
            db.delete(pending)
            db.commit()
        raise ApiError("VALIDATION", "This code has expired. Request a new one.")
    if not hmac.compare_digest(pending.code_hash, _hash_code(body.code.strip())):
        pending.attempts += 1
        db.commit()
        rate_limit.reset_failures_per_email.hit(email)
        raise ApiError("VALIDATION", "Incorrect code. Check it and try again.")
    user = ensure_found(_find_user_by_email(db, email), "Account")
    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    db.delete(pending)
    db.commit()
    return None
