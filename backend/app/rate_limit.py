"""A small in-memory limit on repeated attempts (sign-in, password reset, sign-up, contact form).

Each limiter counts attempts per key (e.g. "ip|email") in a sliding window. Counts live in
this process only: they reset on restart and are not shared between workers, which is fine
for the single-instance deployment this API runs as. No extra dependencies.
"""

import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import Request

from .errors import ApiError

_MAX_KEYS = 10_000  # bound memory if someone sprays random emails


class AttemptLimiter:
    def __init__(self, max_attempts: int, window_seconds: float, message: str,
                 clock: Callable[[], float] = time.monotonic):
        self.max_attempts = max_attempts
        self.window = window_seconds
        self.message = message
        self.clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        hits = self._hits.get(key)
        if hits is None:
            return deque()
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if not hits:
            del self._hits[key]
        return hits

    def blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key, self.clock())) >= self.max_attempts

    def check(self, key: str) -> None:
        """Raises 429 while `key` has used up its attempts."""
        if self.blocked(key):
            raise ApiError("VALIDATION", self.message, status_code=429)

    def hit(self, key: str) -> None:
        with self._lock:
            now = self.clock()
            if len(self._hits) >= _MAX_KEYS:
                for stale in [k for k, v in self._hits.items() if not v or v[-1] <= now - self.window]:
                    del self._hits[stale]
                if len(self._hits) >= _MAX_KEYS:  # still full: drop the oldest entries
                    for oldest in list(self._hits)[: _MAX_KEYS // 10]:
                        del self._hits[oldest]
            self._recent(key, now)
            self._hits.setdefault(key, deque()).append(now)

    def check_and_hit(self, key: str) -> None:
        self.check(key)
        self.hit(key)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


_WAIT = "Too many attempts. Please wait a few minutes and try again."

# Failed sign-ins: per address+email, plus a looser per-email cap so rotating addresses
# can't brute-force one account (kept high so nobody can easily lock the owner out).
login_failures = AttemptLimiter(10, 15 * 60, _WAIT)
login_failures_per_email = AttemptLimiter(50, 15 * 60, _WAIT)
# Reset codes: requests per address and per email; wrong codes per email (across new codes).
reset_requests = AttemptLimiter(20, 60 * 60, _WAIT)
reset_requests_per_email = AttemptLimiter(5, 60 * 60, _WAIT)
reset_failures_per_email = AttemptLimiter(10, 60 * 60, _WAIT)
registrations = AttemptLimiter(10, 60 * 60, _WAIT)
contact_messages = AttemptLimiter(5, 10 * 60, "You've sent several messages already. Please wait a little before sending another.")

ALL = (login_failures, login_failures_per_email, reset_requests, reset_requests_per_email,
       reset_failures_per_email, registrations, contact_messages)


def clear_all() -> None:
    for limiter in ALL:
        limiter.clear()
