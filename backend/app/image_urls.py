"""Links to uploaded images that work from any device.

The database keeps an uploaded image as `/uploads/<id>`, never with a host. A link built
from the host the website used (e.g. `http://localhost:8000` on the office computer) means
"this device" on a phone, so the photo never loaded in the app. Each response turns the path
back into a full link on the address that client itself used to reach the API (or
`PUBLIC_URL` when set). Links to other sites are left alone.
"""

import re
from contextvars import ContextVar

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator
from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from .config import settings

_UPLOAD = re.compile(r"^(?:https?://[^/]+)?(/uploads/[A-Za-z0-9_-]+)/?$")
_base_url: ContextVar[str] = ContextVar("api_base_url", default="")


def to_stored(value: str | None) -> str | None:
    """`http://any-host/uploads/img_x` -> `/uploads/img_x`; anything else unchanged."""
    if not value:
        return value
    match = _UPLOAD.match(value.strip())
    return match.group(1) if match else value


def to_public(value: str | None) -> str | None:
    """`/uploads/img_x` -> `<base>/uploads/img_x` for the current request."""
    if not value:
        return value
    match = _UPLOAD.match(value)
    if not match:
        return value
    base = settings.public_url.rstrip("/") or _base_url.get()
    return base + match.group(1) if base else match.group(1)


class ImageUrl(TypeDecorator):
    """Text column for `image`/`avatar`: stores upload links without a host (see module doc)."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return to_stored(value)

    def process_result_value(self, value, dialect):
        return to_public(value)


class BaseUrlMiddleware:
    """Remembers, per request, the address the client used to reach the API."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        token = _base_url.set(str(Request(scope).base_url).rstrip("/"))
        try:
            await self.app(scope, receive, send)
        finally:
            _base_url.reset(token)
