import os
import sys
import tempfile
from pathlib import Path

import pytest

# Point the app at a throwaway SQLite file before anything imports it.
_tmp = tempfile.mkdtemp(prefix="ansita-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp) / 'test.db'}"
os.environ["JWT_SECRET"] = "test-secret-that-is-long-enough-for-hs256"
os.environ["EXPOSE_RESET_CODE"] = "true"
os.environ["PUSH_ENABLED"] = "false"
# No DNS lookups in tests; no mail provider, so codes come back as `demoCode`.
os.environ["EMAIL_CHECK_DELIVERABILITY"] = "false"
# Off in production for now, but the code-by-email flow stays tested.
os.environ["EMAIL_VERIFICATION_ENABLED"] = "true"
for _key in ("SMTP_HOST", "MAIL_FROM_EMAIL"):
    os.environ[_key] = ""
os.environ["ADMIN_EMAIL"] = ADMIN_EMAIL = "owner@test.local"
os.environ["ADMIN_PASSWORD"] = ADMIN_PASSWORD = "test-admin-pass"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        seed()
        yield test_client


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin(client):
    response = client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert response.status_code == 200, response.text
    return auth(response.json()["token"])


def verify_email(client, email: str, headers: dict | None = None) -> str:
    """Runs the email code flow and returns the verification token."""
    sent = client.post("/auth/email/send-code", json={"email": email}, headers=headers or {})
    assert sent.status_code == 200, sent.text
    verified = client.post("/auth/email/verify", json={"email": email, "code": sent.json()["demoCode"]})
    assert verified.status_code == 200, verified.text
    return verified.json()["verificationToken"]


def register(client, name: str, email: str, phone: str) -> tuple[dict, dict]:
    token = verify_email(client, email)
    response = client.post("/auth/register", json={"name": name, "email": email, "phone": phone, "password": "secret123",
                                                   "emailVerificationToken": token})
    assert response.status_code == 200, response.text
    body = response.json()
    return body["user"], auth(body["token"])


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Every test starts with fresh attempt counters (they are per-process, in memory)."""
    from app import rate_limit

    rate_limit.clear_all()
    yield
    rate_limit.clear_all()
