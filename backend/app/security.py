"""Password hashing, access tokens and the auth dependencies used by every route."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .errors import ApiError
from .models import User


def _bytes(password: str) -> bytes:
    return password.encode("utf-8")[:72]  # bcrypt only uses the first 72 bytes


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_bytes(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_bytes(password), hashed.encode("ascii"))
    except ValueError:
        return False


def create_access_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "ver": user.token_version,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.access_token_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


_bearer = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise ApiError("UNAUTHORIZED") from exc
    user = db.get(User, payload.get("sub"))
    if user is None or payload.get("ver") != user.token_version:
        raise ApiError("UNAUTHORIZED")
    return user


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if user is None:
        raise ApiError("UNAUTHORIZED")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise ApiError("FORBIDDEN")
    return user


def assert_customer_access(user: User, customer_id: str) -> None:
    """Admins may act on any customer; customers only on themselves."""
    if user.role == "customer" and user.customer_id != customer_id:
        raise ApiError("FORBIDDEN")
