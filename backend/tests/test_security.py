"""Authentication, authorization and abuse checks."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app import rate_limit
from app.config import settings
from app.db import SessionLocal
from app.models import Appointment, Enrollment, Notification, User
from app.rate_limit import AttemptLimiter
from app.security import hash_password
from app.utils import generate_id, now_local

from .conftest import ADMIN_EMAIL, ADMIN_PASSWORD, auth, register

PASSWORD = "secret123"


def _appointment(customer_id: str, *, status: str = "confirmed", days: int = 3) -> str:
    with SessionLocal() as db:
        row = Appointment(
            id=generate_id("apt"), customer_id=customer_id, service_ids=["svc_pedicure"], staff_id="stf_rojina",
            date=(now_local().date() + timedelta(days=days)).isoformat(), start_time="12:00", end_time="12:50",
            status=status, notes="", total_price=2000, amount_paid=0, payment_status="unpaid", payments=[],
        )
        db.add(row)
        db.commit()
        return row.id


def _enrollment(student_id: str) -> str:
    with SessionLocal() as db:
        row = Enrollment(id=generate_id("enr"), student_id=student_id, course_id="crs_x", batch_id="bat_x",
                         status="active", fee_total=10000, fee_paid=0, payments=[], attendance=[])
        db.add(row)
        db.commit()
        return row.id


def _token(**overrides) -> str:
    payload = {"sub": "usr_admin", "role": "admin", "ver": 0,
               "exp": datetime.now(timezone.utc) + timedelta(days=1), **overrides}
    payload = {k: v for k, v in payload.items() if v is not None}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@pytest.fixture(scope="module")
def pair(client):
    """Two customers: A (the victim) and B (trying to reach A's data)."""
    a_user, a = register(client, "Asha Victim", "asha.sec@example.com", "9813000001")
    b_user, b = register(client, "Bina Other", "bina.sec@example.com", "9813000002")
    return a_user, a, b_user, b


# ---------- Tokens ----------


def test_bad_tokens_are_rejected(client, admin):
    me = client.get("/auth/me", headers=admin).json()
    good = admin["Authorization"].split(" ", 1)[1]
    head, body, sig = good.split(".")
    flipped = sig[:-2] + ("AA" if sig[-2:] != "AA" else "BB")
    cases = {
        "tampered signature": f"{head}.{body}.{flipped}",
        "garbage": "not-a-jwt",
        "wrong secret": jwt.encode({"sub": me["id"], "ver": 0, "exp": datetime.now(timezone.utc) + timedelta(days=1)},
                                   "another-secret-that-is-long-enough!!", algorithm="HS256"),
        "alg none": jwt.encode({"sub": me["id"], "ver": 0, "exp": 9999999999}, None, algorithm="none"),
        "expired": _token(sub=me["id"], exp=datetime.now(timezone.utc) - timedelta(seconds=5)),
        "no expiry": _token(sub=me["id"], exp=None),
        "no version": _token(sub=me["id"], ver=None),
        "unknown user": _token(sub="usr_nobody"),
        "stale version": _token(sub=me["id"], ver=99),
    }
    for name, token in cases.items():
        response = client.get("/customers", headers=auth(token))
        assert response.status_code == 401, name
        assert response.json()["code"] == "UNAUTHORIZED", name
        # Even endpoints that allow anonymous users refuse a bad token instead of ignoring it.
        assert client.get("/auth/me", headers=auth(token)).status_code == 401, name


def test_role_comes_from_the_database_not_the_token(client, pair):
    a_user, _, _, _ = pair
    forged = _token(sub=a_user["id"], role="admin", ver=0)
    assert client.get("/customers", headers=auth(forged)).status_code == 403


def test_old_token_stops_working_after_password_change_and_reset(client):
    _, headers = register(client, "Token Tester", "token.sec@example.com", "9813000010")
    changed = client.post("/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": "brandnew1"},
                          headers=headers)
    assert changed.status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401
    fresh = auth(changed.json()["token"])
    assert client.get("/auth/me", headers=fresh).status_code == 200

    code = client.post("/auth/password-reset/request", json={"email": "token.sec@example.com"}).json()["demoCode"]
    assert client.post("/auth/password-reset/confirm", json={"email": "token.sec@example.com", "code": code,
                                                             "newPassword": "brandnew2"}).status_code == 200
    assert client.get("/auth/me", headers=fresh).status_code == 401
    # The code is single use.
    again = client.post("/auth/password-reset/confirm", json={"email": "token.sec@example.com", "code": code,
                                                              "newPassword": "brandnew3"})
    assert again.status_code == 422


def test_responses_never_include_secrets(client, admin, pair):
    a_user, a, _, _ = pair
    login = client.post("/auth/login", json={"email": "asha.sec@example.com", "password": PASSWORD}).json()
    for user in (login["user"], client.get("/auth/me", headers=a).json(),
                 client.patch("/auth/me", json={"name": "Asha Victim"}, headers=a).json()):
        assert "passwordHash" not in user and "tokenVersion" not in user and "password_hash" not in user


# ---------- Roles ----------


ADMIN_ONLY = [
    ("get", "/customers", None),
    ("post", "/customers", {"name": "X Y", "phone": "9813009999"}),
    ("delete", "/customers/cus_x", None),
    ("post", "/services", {"name": "Hack", "categoryId": "cat_hair", "duration": 30, "price": 1}),
    ("patch", "/services/svc_pedicure", {"price": 1}),
    ("post", "/categories", {"name": "Hack", "icon": "x", "color": "#000"}),
    ("post", "/staff", {"name": "X", "role": "stylist", "specialties": [], "workingHours": []}),
    ("patch", "/staff/stf_rojina", {"phone": "1"}),
    ("get", "/staff/stf_rojina/schedule?date=2030-01-01", None),
    ("post", "/courses", {}),
    ("post", "/offers", {}),
    ("patch", "/offers/ofr_x", {"discountValue": 100}),
    ("post", "/enrollments", {"studentId": "x", "courseId": "x", "batchId": "x"}),
    ("post", "/enrollments/enr_x/status", {"status": "completed"}),
    ("post", "/enrollments/enr_x/payments", {"amount": 1, "method": "cash"}),
    ("post", "/enrollments/enr_x/certificate", None),
    ("post", "/enrollments/attendance", {"date": "2020-01-01", "entries": []}),
    ("post", "/appointments/apt_x/payments", {"amount": 1, "method": "cash"}),
    ("post", "/appointments/apt_x/redeem-points", {"points": 1}),
    ("delete", "/appointments/apt_x/offer", None),
    ("delete", "/appointments/apt_x", None),
    ("patch", "/settings/profile", {"name": "Hacked"}),
    ("patch", "/settings/loyalty", {"pointValue": 100}),
    ("patch", "/settings/payments", {"esewa": {"accountNumber": "attacker"}}),
    ("post", "/settings/holidays", {"date": "2030-01-01", "name": "x"}),
    ("post", "/reviews/rev_x/reply", {"reply": "x"}),
    ("delete", "/reviews/rev_x", None),
    ("get", "/payment-requests/pending-count", None),
    ("post", "/payment-requests/prq_x/approve", {}),
    ("post", "/payment-requests/prq_x/reject", {"reason": "nope"}),
]


def test_customers_cannot_call_admin_endpoints(client, pair):
    _, a, _, _ = pair
    for method, path, body in ADMIN_ONLY:
        kwargs = {"json": body} if body is not None else {}
        response = getattr(client, method)(path, headers=a, **kwargs) if method != "delete" else client.delete(path, headers=a)
        assert response.status_code == 403, (method, path, response.text)
        anonymous = getattr(client, method)(path, **kwargs) if method != "delete" else client.delete(path)
        assert anonymous.status_code == 401, (method, path)


# ---------- One customer vs another ----------


def test_customer_cannot_touch_another_customers_appointment(client, pair):
    a_user, a, _, b = pair
    apt = _appointment(a_user["customerId"])
    assert client.get(f"/appointments/{apt}", headers=a).status_code == 200
    assert client.get(f"/appointments/{apt}", headers=b).status_code == 403
    assert client.patch(f"/appointments/{apt}", json={"notes": "x"}, headers=b).status_code == 403
    assert client.post(f"/appointments/{apt}/status", json={"status": "cancelled"}, headers=b).status_code == 403
    assert client.post(f"/appointments/{apt}/offer", json={"code": "X"}, headers=b).status_code == 403
    assert apt not in {row["id"] for row in client.get("/appointments", headers=b).json()}
    # The customerId filter can't be used to read someone else's list.
    listed = client.get("/appointments", params={"customerId": a_user["customerId"]}, headers=b).json()
    assert all(row["customerId"] != a_user["customerId"] for row in listed)
    # Nor can a booking be made in their name.
    booking = {"customerId": a_user["customerId"], "serviceIds": ["svc_pedicure"], "staffId": "stf_rojina",
               "date": "2030-01-04", "startTime": "12:00"}
    assert client.post("/appointments", json=booking, headers=b).status_code == 403
    # Nor a review or a payment request on it.
    assert client.post("/reviews", json={"appointmentId": apt, "rating": 1, "comment": "bad"}, headers=b).status_code == 403
    claim = {"targetType": "appointment", "targetId": apt, "amount": 100, "method": "esewa",
             "reference": "REF12345", "paidOn": now_local().date().isoformat()}
    assert client.post("/payment-requests", json=claim, headers=b).status_code == 403


def test_customer_can_only_cancel_own_appointment(client, pair):
    a_user, a, _, _ = pair
    apt = _appointment(a_user["customerId"], status="pending")
    for status in ("confirmed", "completed", "no_show"):
        assert client.post(f"/appointments/{apt}/status", json={"status": status}, headers=a).status_code == 403
    assert client.post(f"/appointments/{apt}/status", json={"status": "cancelled"}, headers=a).status_code == 200


def test_customer_cannot_reach_another_customers_profile(client, pair):
    a_user, _, _, b = pair
    cid = a_user["customerId"]
    assert client.get(f"/customers/{cid}", headers=b).status_code == 403
    assert client.get(f"/customers/{cid}/stats", headers=b).status_code == 403
    assert client.patch(f"/customers/{cid}", json={"name": "Owned"}, headers=b).status_code == 403


def test_customer_cannot_read_another_customers_enrollment(client, pair):
    a_user, a, _, b = pair
    enr = _enrollment(a_user["customerId"])
    assert client.get(f"/enrollments/{enr}", headers=a).status_code == 200
    assert client.get(f"/enrollments/{enr}", headers=b).status_code == 403
    listed = client.get("/enrollments", params={"studentId": a_user["customerId"]}, headers=b).json()
    assert enr not in {row["id"] for row in listed}
    claim = {"targetType": "enrollment", "targetId": enr, "amount": 100, "method": "esewa",
             "reference": "REF54321", "paidOn": now_local().date().isoformat()}
    assert client.post("/payment-requests", json=claim, headers=b).status_code == 403


def test_customer_cannot_see_or_cancel_another_customers_payment_request(client, pair):
    a_user, a, _, b = pair
    apt = _appointment(a_user["customerId"])
    claim = {"targetType": "appointment", "targetId": apt, "amount": 500, "method": "esewa",
             "reference": "SEC-PRQ-1", "paidOn": now_local().date().isoformat()}
    created = client.post("/payment-requests", json=claim, headers=a)
    assert created.status_code == 201, created.text
    prq = created.json()["id"]
    assert client.get(f"/payment-requests/{prq}", headers=b).status_code == 403
    assert client.post(f"/payment-requests/{prq}/cancel", headers=b).status_code == 403
    assert prq not in {row["id"] for row in client.get("/payment-requests", headers=b).json()}
    assert client.get(f"/payment-requests/{prq}", headers=a).status_code == 200


def test_customer_cannot_touch_another_users_notification(client, pair):
    a_user, a, _, b = pair
    mine = client.get("/notifications", headers=a).json()
    assert mine, "registration sends a welcome notification"
    nid = mine[0]["id"]
    assert client.post(f"/notifications/{nid}/read", headers=b).status_code == 403
    assert client.delete(f"/notifications/{nid}", headers=b).status_code == 403
    assert nid not in {row["id"] for row in client.get("/notifications", headers=b).json()}
    with SessionLocal() as db:
        assert db.get(Notification, nid) is not None


def test_customer_account_without_profile_sees_nothing(client):
    """A customer login not linked to a customer profile must not fall back to "everything"."""
    with SessionLocal() as db:
        db.add(User(id=generate_id("usr"), role="customer", name="Orphan", email="orphan.sec@example.com", phone="",
                    customer_id=None, password_hash=hash_password(PASSWORD), token_version=0))
        db.commit()
    token = client.post("/auth/login", json={"email": "orphan.sec@example.com", "password": PASSWORD}).json()["token"]
    headers = auth(token)
    _appointment("cus_someone_else")
    assert client.get("/appointments", headers=headers).json() == []
    assert client.get("/enrollments", headers=headers).json() == []
    assert client.get("/payment-requests", headers=headers).json() == []


# ---------- Mass assignment ----------


def test_profile_update_ignores_role_and_links(client, pair):
    a_user, a, b_user, _ = pair
    response = client.patch("/auth/me", json={"role": "admin", "customerId": b_user["customerId"], "customer_id": "x",
                                              "tokenVersion": 5, "passwordHash": "x"}, headers=a)
    assert response.status_code == 200
    me = response.json()
    assert me["role"] == "customer" and me["customerId"] == a_user["customerId"]
    assert client.get("/auth/me", headers=a).status_code == 200  # token version untouched
    # Can't take another account's email.
    taken = client.patch("/auth/me", json={"email": "BINA.SEC@example.com"}, headers=a)
    assert taken.status_code == 409
    # Nor another customer's phone number.
    assert client.patch("/auth/me", json={"phone": "9813000002"}, headers=a).status_code == 409


def test_customer_cannot_set_own_points_tags_or_notes(client, admin, pair):
    a_user, a, _, _ = pair
    cid = a_user["customerId"]
    before = client.get(f"/customers/{cid}", headers=admin).json()
    response = client.patch(f"/customers/{cid}", json={"loyaltyPoints": 99999, "tags": ["vip"], "notes": "free stuff",
                                                       "id": "cus_other", "joinedAt": "2000-01-01"}, headers=a)
    assert response.status_code == 200
    after = client.get(f"/customers/{cid}", headers=admin).json()
    for key in ("loyaltyPoints", "tags", "notes", "id", "joinedAt"):
        assert after[key] == before[key], key


def test_customer_booking_ignores_status_and_price(client, pair):
    a_user, a, _, _ = pair
    day = now_local().date() + timedelta(days=5)
    while day.strftime("%a").lower()[:3] == "wed":
        day += timedelta(days=1)
    booking = {"customerId": a_user["customerId"], "serviceIds": ["svc_pedicure"], "staffId": "stf_rojina",
               "date": day.isoformat(), "startTime": "15:00", "status": "completed", "totalPrice": 1,
               "amountPaid": 5000, "paymentStatus": "paid", "offerDiscount": 5000}
    response = client.post("/appointments", json=booking, headers=a)
    if response.status_code != 201:
        pytest.skip(f"slot not bookable in this environment: {response.text}")
    body = response.json()
    assert body["status"] == "pending" and body["amountPaid"] == 0 and body["paymentStatus"] == "unpaid"
    assert body["totalPrice"] > 1 and body["offerDiscount"] < 5000


# ---------- Numbers and lengths ----------


def test_negative_and_oversized_amounts_are_refused(client, admin, pair):
    a_user, a, _, _ = pair
    apt = _appointment(a_user["customerId"])
    for amount in (0, -500, 10**9):
        assert client.post(f"/appointments/{apt}/payments", json={"amount": amount, "method": "cash"},
                           headers=admin).status_code == 422, amount
        claim = {"targetType": "appointment", "targetId": apt, "amount": amount, "method": "esewa",
                 "reference": f"NEG{amount}X", "paidOn": now_local().date().isoformat()}
        assert client.post("/payment-requests", json=claim, headers=a).status_code == 422, amount
    assert client.post(f"/appointments/{apt}/redeem-points", json={"points": -100}, headers=admin).status_code == 422
    assert client.patch("/services/svc_pedicure", json={"price": -1}, headers=admin).status_code == 422
    assert client.post("/reviews", json={"appointmentId": apt, "rating": 6}, headers=a).status_code == 422


def test_free_text_lengths_are_capped(client, pair):
    a_user, a, _, _ = pair
    apt = _appointment(a_user["customerId"])
    assert client.patch(f"/appointments/{apt}", json={"notes": "x" * 1001}, headers=a).status_code == 422
    assert client.post(f"/appointments/{apt}/status", json={"status": "cancelled", "reason": "x" * 301},
                       headers=a).status_code == 422
    assert client.patch("/auth/me", json={"phone": "9" * 40}, headers=a).status_code == 422


# ---------- Brute force ----------


def test_login_attempts_are_limited(client):
    register(client, "Brute Target", "brute.sec@example.com", "9813000020")
    wrong = {"email": "brute.sec@example.com", "password": "nope-nope"}
    for _ in range(rate_limit.login_failures.max_attempts):
        assert client.post("/auth/login", json=wrong).status_code == 401
    blocked = client.post("/auth/login", json=wrong)
    assert blocked.status_code == 429 and blocked.json()["code"] == "VALIDATION"
    # Even the right password waits until the window passes.
    assert client.post("/auth/login", json={**wrong, "password": PASSWORD}).status_code == 429
    # Other accounts from the same address are unaffected.
    assert client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).status_code == 200


def test_successful_login_resets_the_count(client):
    register(client, "Forgetful", "forgetful.sec@example.com", "9813000021")
    wrong = {"email": "forgetful.sec@example.com", "password": "nope-nope"}
    for _ in range(3):
        for _ in range(rate_limit.login_failures.max_attempts - 1):
            client.post("/auth/login", json=wrong)
        assert client.post("/auth/login", json={**wrong, "password": PASSWORD}).status_code == 200


def test_unknown_email_still_checks_a_password(client, monkeypatch):
    """Same work for a wrong email as for a wrong password, so timing doesn't reveal accounts."""
    from app.routers import auth as auth_router

    calls = []
    real = auth_router.verify_password
    monkeypatch.setattr(auth_router, "verify_password", lambda p, h: calls.append(h) or real(p, h))
    response = client.post("/auth/login", json={"email": "nobody.sec@example.com", "password": "whatever"})
    assert response.status_code == 401 and response.json()["message"] == "Invalid email or password."
    assert calls == [auth_router._DUMMY_HASH]


def test_reset_codes_cannot_be_brute_forced(client):
    register(client, "Reset Target", "reset.sec@example.com", "9813000022")
    email = "reset.sec@example.com"
    guesses = 0
    # Asking for a new code resets that code's own 5 tries, but wrong guesses still add up per email.
    for _ in range(3):
        assert client.post("/auth/password-reset/request", json={"email": email}).status_code == 200
        for _ in range(4):
            response = client.post("/auth/password-reset/confirm",
                                   json={"email": email, "code": "000000", "newPassword": "hacked123"})
            guesses += 1
            if response.status_code == 429:
                break
        if response.status_code == 429:
            break
    assert response.status_code == 429
    assert guesses == rate_limit.reset_failures_per_email.max_attempts + 1
    # Further requests for codes are limited too.
    statuses = [client.post("/auth/password-reset/request", json={"email": email}).status_code for _ in range(5)]
    assert 429 in statuses


def test_reset_code_is_never_shown_for_the_admin(client):
    response = client.post("/auth/password-reset/request", json={"email": ADMIN_EMAIL})
    assert response.status_code == 200
    assert response.json()["demoCode"] == ""


def test_registrations_and_contact_messages_are_limited(client):
    for i in range(rate_limit.registrations.max_attempts):
        register(client, f"Bulk {i}", f"bulk{i}.sec@example.com", f"98130001{i:02d}")
    extra = client.post("/auth/register", json={"name": "Bulk X", "email": "bulkx.sec@example.com",
                                                "phone": "9813000199", "password": PASSWORD})
    assert extra.status_code == 429

    message = {"name": "Spammer", "phone": "9813000300", "message": "Hello there, please call me."}
    for _ in range(rate_limit.contact_messages.max_attempts):
        assert client.post("/contact", json=message).status_code == 201
    assert client.post("/contact", json=message).status_code == 429


def test_attempt_limiter_window():
    now = [1000.0]
    limiter = AttemptLimiter(2, 60, "wait", clock=lambda: now[0])
    limiter.hit("k")
    limiter.hit("k")
    assert limiter.blocked("k") and not limiter.blocked("other")
    now[0] += 61
    assert not limiter.blocked("k")
    limiter.hit("k")
    limiter.reset("k")
    assert not limiter.blocked("k")


# ---------- Public data ----------


def test_visitors_never_see_staff_contact_details(client, admin):
    listed = client.get("/staff").json()
    assert listed and all(row["phone"] == "" and row["email"] == "" for row in listed)
    one = client.get(f"/staff/{listed[0]['id']}").json()
    assert one["phone"] == "" and one["email"] == ""
    assert client.get(f"/staff/{listed[0]['id']}", headers=admin).json()["phone"]


def test_customer_upload_limit_and_types(client, monkeypatch):
    from app.routers import uploads

    _, headers = register(client, "Uploader", "uploader.sec@example.com", "9813000040")
    monkeypatch.setattr(uploads, "CUSTOMER_DAILY_LIMIT", 2)
    jpg = {**headers, "Content-Type": "image/jpeg"}
    assert client.post("/uploads", content=b"<svg onload=alert(1)>", headers={**headers, "Content-Type": "image/svg+xml"}).status_code == 422
    assert client.post("/uploads", content=b"<html><script>alert(1)</script>", headers=jpg).status_code == 422
    for _ in range(2):
        assert client.post("/uploads", content=b"\xff\xd8\xff\xe0" + b"\x00" * 32, headers=jpg).status_code == 201
    assert client.post("/uploads", content=b"\xff\xd8\xff\xe0" + b"\x00" * 32, headers=jpg).status_code == 409


def test_cors_origins_tolerate_trailing_slash():
    """CORS_ORIGINS pasted with a trailing slash still matches the browser's Origin."""
    import importlib
    import os

    from fastapi.testclient import TestClient

    import app.config as config
    import app.main as main

    old = os.environ.get("CORS_ORIGINS")
    os.environ["CORS_ORIGINS"] = " https://ansita.vercel.app/ , https://www.ansita.com "
    try:
        config.get_settings.cache_clear()
        config.settings = config.get_settings()
        importlib.reload(main)
        with TestClient(main.app) as c:
            ok = c.options("/auth/register", headers={"Origin": "https://ansita.vercel.app", "Access-Control-Request-Method": "POST"})
            assert ok.status_code == 200 and ok.headers["access-control-allow-origin"] == "https://ansita.vercel.app"
            bad = c.options("/auth/register", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
            assert bad.status_code == 400
    finally:
        if old is None:
            os.environ.pop("CORS_ORIGINS", None)
        else:
            os.environ["CORS_ORIGINS"] = old
        config.get_settings.cache_clear()
        config.settings = config.get_settings()
        importlib.reload(main)
