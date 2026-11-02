from datetime import date, timedelta

from app.db import SessionLocal
from app.models import Appointment, Customer
from app.utils import generate_id, now_local

from .conftest import register


def next_weekday(weekday: str, min_days: int = 3) -> str:
    """First date at least `min_days` ahead that falls on `weekday`."""
    names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    day = now_local().date() + timedelta(days=min_days)
    while names[day.weekday()] != weekday:
        day += timedelta(days=1)
    return day.isoformat()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_errors_use_app_shape(client, admin):
    response = client.get("/customers")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
    response = client.post("/auth/login", json={"email": "owner@test.local", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["message"] == "Invalid email or password."
    response = client.post("/services", json={"name": "x"}, headers=admin)
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION"


def test_catalog_is_seeded(client, admin):
    assert len(client.get("/categories").json()) == 4
    services = client.get("/services", headers=admin).json()
    assert len(services) == 13
    assert {"id", "categoryId", "isActive", "createdAt"} <= services[0].keys()


def test_booking_flow(client, admin):
    user, customer = register(client, "Sita Karki", "sita@example.com", "9812000001")
    _, other = register(client, "Gita Yadav", "gita@example.com", "9812000002")
    assert user["role"] == "customer" and user["customerId"]

    # Customers can't see the CRM.
    assert client.get("/customers", headers=customer).status_code == 403

    day = next_weekday("fri")  # Sarita works every day except Wednesday, 10:00-19:00
    slots = client.get("/availability/slots", params={"date": day, "staffId": "stf_sarita",
                                                      "serviceIds": "svc_hair_protein"}, headers=customer).json()
    assert slots[0] == {"time": "10:00", "available": True}

    staff = client.get("/availability/staff", params={"date": day, "serviceIds": "svc_hair_protein"},
                       headers=customer).json()
    assert {member["id"] for member in staff} >= {"stf_sarita"}

    booking = {"customerId": user["customerId"], "serviceIds": ["svc_hair_protein"], "staffId": "stf_sarita",
               "date": day, "startTime": "10:00", "notes": " first visit "}
    response = client.post("/appointments", json=booking, headers=customer)
    assert response.status_code == 201, response.text
    appointment = response.json()
    assert appointment["status"] == "pending"
    assert appointment["endTime"] == "11:30"
    assert appointment["totalPrice"] == 3500
    assert appointment["notes"] == "first visit"

    # Same stylist, overlapping time -> conflict.
    other_me = client.get("/auth/me", headers=other).json()
    clash = {**booking, "customerId": other_me["customerId"], "startTime": "11:00"}
    response = client.post("/appointments", json=clash, headers=other)
    assert response.status_code == 409
    assert "already booked" in response.json()["message"]

    # A customer can't book for somebody else.
    assert client.post("/appointments", json=booking, headers=other).status_code == 403

    # Outside the stylist's shift.
    late = {**clash, "startTime": "18:30"}
    assert client.post("/appointments", json=late, headers=other).status_code == 422

    # Slot list reflects the booking.
    slots = client.get("/availability/slots", params={"date": day, "staffId": "stf_sarita",
                                                      "serviceIds": "svc_hair_protein"}, headers=customer).json()
    assert {"time": "10:00", "available": False} in slots

    # Customers see only their own appointments.
    assert [a["id"] for a in client.get("/appointments", headers=customer).json()] == [appointment["id"]]
    assert client.get("/appointments", headers=other).json() == []
    assert client.get(f"/appointments/{appointment['id']}", headers=other).status_code == 403

    # Admin got a notification; customer can't confirm their own booking.
    titles = [n["title"] for n in client.get("/notifications", headers=admin).json()]
    assert "New booking request" in titles
    assert client.post(f"/appointments/{appointment['id']}/status", json={"status": "confirmed"},
                       headers=customer).status_code == 403

    response = client.post(f"/appointments/{appointment['id']}/status", json={"status": "confirmed"}, headers=admin)
    assert response.json()["status"] == "confirmed"

    # Payments can't exceed the balance.
    pay = f"/appointments/{appointment['id']}/payments"
    assert client.post(pay, json={"amount": 5000, "method": "cash"}, headers=admin).status_code == 422
    assert client.post(pay, json={"amount": 1000, "method": "esewa"}, headers=customer).status_code == 403
    paid = client.post(pay, json={"amount": 1000, "method": "esewa"}, headers=admin).json()
    assert paid["amountPaid"] == 1000 and paid["paymentStatus"] == "partial"

    # Holiday on a booked day is refused; staff shift that strands the booking is refused.
    assert client.post("/settings/holidays", json={"date": day, "name": "Closed"}, headers=admin).status_code == 409
    hours = [{"day": d, "isOff": d == "fri", "start": "10:00", "end": "19:00"}
             for d in ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]]
    response = client.patch("/staff/stf_sarita", json={"workingHours": hours}, headers=admin)
    assert response.status_code == 409

    # Customer reschedules -> back to pending; then cancels.
    response = client.patch(f"/appointments/{appointment['id']}", json={"startTime": "13:00"}, headers=customer)
    assert response.json()["status"] == "pending" and response.json()["startTime"] == "13:00"
    response = client.post(f"/appointments/{appointment['id']}/status",
                           json={"status": "cancelled", "reason": "Travelling"}, headers=customer)
    assert response.json()["status"] == "cancelled"
    assert response.json()["cancellationReason"] == "Travelling"


def test_completion_points_and_review(client, admin):
    user, customer = register(client, "Rita Shah", "rita@example.com", "9812000003")
    yesterday = (now_local().date() - timedelta(days=1)).isoformat()
    with SessionLocal() as db:  # a past visit, which the API (rightly) won't let us create
        appointment = Appointment(
            id=generate_id("apt"), customer_id=user["customerId"], service_ids=["svc_pedicure"],
            staff_id="stf_rojina", date=yesterday, start_time="12:00", end_time="12:50", status="confirmed",
            notes="", total_price=1680, amount_paid=0, payment_status="unpaid",
        )
        db.add(appointment)
        db.commit()
        appointment_id = appointment.id

    response = client.post(f"/appointments/{appointment_id}/status", json={"status": "completed"}, headers=admin)
    assert response.status_code == 200, response.text
    customer_row = client.get(f"/customers/{user['customerId']}", headers=customer).json()
    assert customer_row["loyaltyPoints"] == 16  # Rs. 100 per point

    review = client.post("/reviews", json={"appointmentId": appointment_id, "rating": 4, "comment": "Lovely"},
                         headers=customer)
    assert review.status_code == 201, review.text
    assert review.json()["customerName"] == "Rita"
    assert client.post("/reviews", json={"appointmentId": appointment_id, "rating": 5},
                       headers=customer).status_code == 409
    assert client.get("/staff/stf_rojina").json()["rating"] == 4

    stats = client.get(f"/customers/{user['customerId']}/stats", headers=customer).json()
    assert stats["totalVisits"] == 1 and stats["lastVisit"] == yesterday


def test_complete_early_moves_visit_to_today(client, admin):
    """A customer served before the booked slot: completing moves the visit to today, and the payment is dated today."""
    user, _ = register(client, "Asha Jha", "asha@example.com", "9812000016")
    later = (now_local().date() + timedelta(days=9)).isoformat()
    with SessionLocal() as db:
        appointment = Appointment(
            id=generate_id("apt"), customer_id=user["customerId"], service_ids=["svc_pedicure"],
            staff_id="stf_rojina", date=later, start_time="14:00", end_time="14:50", status="confirmed",
            notes="", total_price=1680, amount_paid=0, payment_status="unpaid", payments=[],
        )
        db.add(appointment)
        db.commit()
        appointment_id = appointment.id

    response = client.post(f"/appointments/{appointment_id}/status", json={"status": "completed"}, headers=admin)
    assert response.status_code == 200, response.text
    done = response.json()
    today = now_local().date().isoformat()
    assert done["status"] == "completed" and done["date"] == today

    paid = client.post(f"/appointments/{appointment_id}/payments", json={"amount": 1680, "method": "cash"},
                       headers=admin).json()
    assert paid["paymentStatus"] == "paid"
    assert [(p["amount"], p["paidOn"]) for p in paid["payments"]] == [(1680, today)]


def test_enrollment_seats(client, admin):
    start = (now_local().date() + timedelta(days=10)).isoformat()
    end = (date.fromisoformat(start) + timedelta(days=30)).isoformat()
    course = client.post("/courses/crs_nail_art/batches", json={
        "name": "Tiny Batch", "startDate": start, "endDate": end, "days": ["sun", "mon"],
        "startTime": "15:00", "endTime": "17:00", "seats": 1, "status": "upcoming",
    }, headers=admin).json()
    batch_id = course["batches"][-1]["id"]

    first, first_h = register(client, "Mina Das", "mina@example.com", "9812000004")
    second, _ = register(client, "Tara Sah", "tara@example.com", "9812000005")
    own = client.post("/enrollments", json={"studentId": first["customerId"], "courseId": "crs_nail_art",
                                            "batchId": batch_id}, headers=first_h)
    assert own.status_code == 403  # only the parlour enrolls students
    response = client.post("/enrollments", json={"studentId": first["customerId"], "courseId": "crs_nail_art",
                                                 "batchId": batch_id}, headers=admin)
    assert response.status_code == 201, response.text
    enrollment = response.json()
    assert enrollment["status"] == "pending" and enrollment["feeTotal"] == 12000

    full = client.post("/enrollments", json={"studentId": second["customerId"], "courseId": "crs_nail_art",
                                             "batchId": batch_id}, headers=admin)
    assert full.status_code == 409

    paid = client.post(f"/enrollments/{enrollment['id']}/payments", json={"amount": 12000, "method": "khalti"},
                       headers=admin).json()
    assert paid["status"] == "active" and paid["feePaid"] == 12000
    today = now_local().date().isoformat()
    marked = client.post(f"/enrollments/{enrollment['id']}/attendance", json={"date": today, "status": "present"},
                         headers=admin).json()
    assert marked["attendance"] == [{"date": today, "status": "present"}]
    assert client.post(f"/enrollments/{enrollment['id']}/certificate", headers=admin).status_code == 422
    client.post(f"/enrollments/{enrollment['id']}/status", json={"status": "completed"}, headers=admin)
    assert client.post(f"/enrollments/{enrollment['id']}/certificate", headers=admin).json()["certificateIssued"]


def test_password_reset_and_change(client):
    register(client, "Nisha Jha", "nisha@example.com", "9812000006")
    request = client.post("/auth/password-reset/request", json={"email": "NISHA@example.com"}).json()
    assert request["sentTo"].startswith("ni")
    bad = client.post("/auth/password-reset/confirm",
                      json={"email": "nisha@example.com", "code": "000000", "newPassword": "newpass1"})
    assert bad.status_code == 422
    ok = client.post("/auth/password-reset/confirm",
                     json={"email": "nisha@example.com", "code": request["demoCode"], "newPassword": "newpass1"})
    assert ok.status_code == 200
    login = client.post("/auth/login", json={"email": "nisha@example.com", "password": "newpass1"})
    assert login.status_code == 200
    token = login.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}
    changed = client.post("/auth/change-password", json={"currentPassword": "newpass1", "newPassword": "newpass2"},
                          headers=headers)
    assert changed.status_code == 200
    assert client.get("/notifications", headers=headers).status_code == 401  # old token revoked
    assert client.get("/notifications", headers={"Authorization": f"Bearer {changed.json()['token']}"}).status_code == 200


def test_settings_and_offers(client, admin):
    _, customer = register(client, "Laxmi Mahato", "laxmi@example.com", "9812000007")
    settings = client.get("/settings", headers=customer).json()
    assert settings["loyalty"]["rupeesPerPoint"] == 100
    assert client.patch("/settings/loyalty", json={"rupeesPerPoint": 50}, headers=customer).status_code == 403
    assert client.patch("/settings/loyalty", json={"rupeesPerPoint": 50}, headers=admin).json()["loyalty"] == {
        "enabled": True, "rupeesPerPoint": 50, "pointValue": 1, "minRedeemPoints": 500}

    today = now_local().date()
    offer = {"title": "Tihar Glow", "discountType": "percent", "discountValue": 20, "code": " tihar20 ",
             "validFrom": today.isoformat(), "validTo": (today + timedelta(days=10)).isoformat()}
    created = client.post("/offers", json=offer, headers=admin)
    assert created.status_code == 201 and created.json()["code"] == "TIHAR20"
    assert client.post("/offers", json=offer, headers=admin).status_code == 409
    draft = {**offer, "code": None, "isActive": False}
    client.post("/offers", json=draft, headers=admin)
    assert [o["title"] for o in client.get("/offers", headers=customer).json()] == ["Tihar Glow"]


def test_public_website_reads(client, admin):
    """Visitors (no token) can browse the catalogue, but only what customers would see."""
    services = client.get("/services")
    assert services.status_code == 200 and services.json()
    assert all(s["isActive"] for s in services.json())
    assert client.get("/courses").status_code == 200
    assert client.get("/offers").status_code == 200
    staff = client.get("/staff").json()
    assert staff and all(member["phone"] == "" and member["email"] == "" for member in staff)
    public = client.get("/settings/public").json()
    assert set(public) == {"profile", "holidays", "loyalty"} and "alerts" not in public
    assert client.get("/reviews/featured").status_code == 200
    # Admin-only data stays private.
    assert client.get("/customers").status_code == 401
    assert client.get("/settings").status_code == 401


def test_contact_form_notifies_admins(client, admin):
    response = client.post("/contact", json={"name": "Visitor", "message": "Do you do bridal trials?"})
    assert response.status_code == 422  # needs a phone or email
    response = client.post("/contact", json={"name": "Visitor", "phone": "9800001111", "subject": "Bridal",
                                             "message": "Do you do bridal trials?"})
    assert response.status_code == 201
    titles = [n["title"] for n in client.get("/notifications", headers=admin).json()]
    assert "New enquiry: Bridal" in titles


def test_push_devices(client, monkeypatch):
    from app import push
    from app.notify import notify_user

    user, headers = register(client, "Puja Yadav", "puja.push@example.com", "9812000017")
    token = "ExponentPushToken[test-device-1]"
    assert client.post("/notifications/devices", json={"token": token, "platform": "android", "offerAlerts": False},
                       headers=headers).status_code == 204

    sent: list[dict] = []
    monkeypatch.setattr(push, "_post", lambda messages: sent.extend(messages) or [])
    push._deliver([
        {"user_id": user["id"], "type": "payment", "title": "Payment received", "body": "Thanks", "data": {}},
        {"user_id": user["id"], "type": "promotion", "title": "Offer", "body": "20% off", "data": {}},
    ])
    assert [(m["to"], m["title"]) for m in sent] == [(token, "Payment received")]  # offer alerts are off

    # Queued on the session, dropped if the change is rolled back.
    with SessionLocal() as db:
        notify_user(db, user["id"], "system", "Hello", "There")
        assert len(db.info["pushes"]) == 1
        db.rollback()
        assert "pushes" not in db.info

    assert client.post("/notifications/devices/remove", json={"token": token}, headers=headers).status_code == 204
    sent.clear()
    push._deliver([{"user_id": user["id"], "type": "payment", "title": "Again", "body": "", "data": {}}])
    assert sent == []


def test_image_upload(client, admin):
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    # Signed-in users only.
    assert client.post("/uploads", content=png, headers={"Content-Type": "image/png"}).status_code == 401
    response = client.post("/uploads", content=png, headers={**admin, "Content-Type": "image/png"})
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["contentType"] == "image/png" and body["url"].endswith(f"/uploads/{body['id']}")
    served = client.get(f"/uploads/{body['id']}")
    assert served.status_code == 200 and served.content == png
    assert served.headers["content-type"] == "image/png"
    # Not an image (e.g. an SVG or HTML file renamed .png) is refused.
    bad = client.post("/uploads", content=b"<svg onload=alert(1)>", headers={**admin, "Content-Type": "image/png"})
    assert bad.status_code == 422 or bad.json()["code"] == "VALIDATION"
    too_big = client.post("/uploads", content=b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024), headers={**admin, "Content-Type": "image/jpeg"})
    assert too_big.json()["code"] == "VALIDATION"
    assert client.get("/uploads/img_missing").status_code == 404


def test_customer_profile_photo(client, admin):
    user, headers = register(client, "Photo Kumari", "photo@example.com", "9812000021")
    jpg = b"\xff\xd8\xff\xe0" + b"\x00" * 64
    # A customer can upload their own photo; the saved link is what admins see.
    uploaded = client.post("/uploads", content=jpg, headers={**headers, "Content-Type": "image/jpeg"})
    assert uploaded.status_code == 201, uploaded.text
    url = uploaded.json()["url"]
    assert client.patch("/auth/me", json={"avatar": url}, headers=headers).json()["avatar"] == url
    assert client.get(f"/customers/{user['customerId']}", headers=admin).json()["avatar"] == url
    # A path on the phone would only ever work on that phone.
    local = client.patch("/auth/me", json={"avatar": "file:///data/user/0/cache/photo.jpg"}, headers=headers)
    assert local.status_code == 422
    assert client.patch("/auth/me", json={"avatar": None}, headers=headers).json()["avatar"] is None


def test_redeem_loyalty_points(client, admin):
    user, customer = register(client, "Mala Das", "mala@example.com", "9812000022")
    customer_id = user["customerId"]
    later = (now_local().date() + timedelta(days=5)).isoformat()
    with SessionLocal() as db:
        ids = []
        for start in ("11:00", "15:00"):
            appointment = Appointment(
                id=generate_id("apt"), customer_id=customer_id, service_ids=["svc_pedicure"],
                staff_id="stf_rojina", date=later, start_time=start, end_time=start[:2] + ":50", status="confirmed",
                notes="", total_price=1680, amount_paid=0, payment_status="unpaid", payments=[],
            )
            db.add(appointment)
            ids.append(appointment.id)
        db.get(Customer, customer_id).loyalty_points = 499
        db.commit()
    first, second = ids

    def points() -> int:
        return client.get(f"/customers/{customer_id}", headers=admin).json()["loyaltyPoints"]

    # Below the 500 minimum: nothing can be used yet. Customers can't redeem for themselves.
    assert client.post(f"/appointments/{first}/redeem-points", json={"points": 100}, headers=admin).json()["code"] == "VALIDATION"
    with SessionLocal() as db:
        db.get(Customer, customer_id).loyalty_points = 2000
        db.commit()
    assert client.post(f"/appointments/{first}/redeem-points", json={"points": 100}, headers=customer).status_code == 403
    # Never more than the customer has, or worth more than the bill.
    assert client.post(f"/appointments/{first}/redeem-points", json={"points": 2001}, headers=admin).status_code == 422
    assert client.post(f"/appointments/{first}/redeem-points", json={"points": 1700}, headers=admin).status_code == 422

    used = client.post(f"/appointments/{first}/redeem-points", json={"points": 500}, headers=admin)
    assert used.status_code == 200, used.text
    assert used.json()["pointsRedeemed"] == 500 and used.json()["pointsDiscount"] == 500
    assert used.json()["paymentStatus"] == "partial" and points() == 1500
    assert client.post(f"/appointments/{first}/redeem-points", json={"points": 10}, headers=admin).status_code == 409
    # Only the rest is left to pay; the visit earns points on that part only.
    assert client.post(f"/appointments/{first}/payments", json={"amount": 1181, "method": "cash"}, headers=admin).status_code == 422
    paid = client.post(f"/appointments/{first}/payments", json={"amount": 1180, "method": "cash"}, headers=admin)
    assert paid.json()["paymentStatus"] == "paid" and paid.json()["amountPaid"] == 1180
    with SessionLocal() as db:  # back-date it so it can be completed normally
        db.get(Appointment, first).date = (now_local().date() - timedelta(days=1)).isoformat()
        db.commit()
    rate = client.get("/settings", headers=admin).json()["loyalty"]["rupeesPerPoint"]
    client.post(f"/appointments/{first}/status", json={"status": "completed"}, headers=admin)
    earned = 1180 // rate
    assert points() == 1500 + earned

    # Removing the discount, or cancelling the booking, gives the points back.
    client.post(f"/appointments/{second}/redeem-points", json={"points": 600}, headers=admin)
    assert points() == 900 + earned
    removed = client.delete(f"/appointments/{second}/redeem-points", headers=admin).json()
    assert removed["pointsRedeemed"] == 0 and removed["paymentStatus"] == "unpaid" and points() == 1500 + earned
    client.post(f"/appointments/{second}/redeem-points", json={"points": 600}, headers=admin)
    client.post(f"/appointments/{second}/status", json={"status": "cancelled"}, headers=admin)
    assert points() == 1500 + earned

    # The minimum is a setting.
    assert client.patch("/settings/loyalty", json={"minRedeemPoints": 2000}, headers=admin).json()["loyalty"]["minRedeemPoints"] == 2000
    client.patch("/settings/loyalty", json={"minRedeemPoints": 500}, headers=admin)


def test_photo_fields_need_uploaded_links(client, admin):
    local = "file:///data/user/0/cache/photo.jpg"
    assert client.patch("/staff/stf_rojina", json={"avatar": local}, headers=admin).status_code == 422
    assert client.patch("/services/svc_pedicure", json={"image": local}, headers=admin).status_code == 422
    uploaded = client.post("/uploads", content=b"\xff\xd8\xff\xe0" + b"\x00" * 32, headers={**admin, "Content-Type": "image/jpeg"}).json()["url"]
    assert client.patch("/services/svc_pedicure", json={"image": uploaded}, headers=admin).json()["image"] == uploaded
    assert client.patch("/services/svc_pedicure", json={"image": None}, headers=admin).json()["image"] is None


def test_upload_links_follow_the_callers_host(client, admin):
    """A photo uploaded from one computer must load on every phone: no host is stored."""
    png = b"\x89PNG\r\n\x1a\n" + b"\x01" * 32
    uploaded = client.post("/uploads", content=png, headers={**admin, "Content-Type": "image/png"}).json()
    staff_id = client.get("/staff", headers=admin).json()[0]["id"]
    # Saved through the website running on the office computer.
    office_link = f"http://localhost:8000/uploads/{uploaded['id']}"
    assert client.patch(f"/staff/{staff_id}", json={"avatar": office_link}, headers=admin).status_code == 200

    from app.db import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        stored = conn.execute(text("SELECT avatar FROM staff WHERE id = :id"), {"id": staff_id}).scalar_one()
    assert stored == f"/uploads/{uploaded['id']}"

    # A phone on the Wi-Fi reaches the API at the computer's LAN address, and gets a link it can open.
    phone = client.get("/staff", headers={"host": "192.168.1.20:8000"}).json()
    avatar = next(s["avatar"] for s in phone if s["id"] == staff_id)
    assert avatar == f"http://192.168.1.20:8000/uploads/{uploaded['id']}"
    assert client.get(avatar.replace("http://192.168.1.20:8000", "")).content == png

    # Links to other sites are kept as they are.
    external = "https://images.example.com/stylist.jpg"
    client.patch(f"/staff/{staff_id}", json={"avatar": external}, headers=admin)
    assert client.get(f"/staff/{staff_id}", headers=admin).json()["avatar"] == external


def test_payment_requests(client, admin):
    """Customer: "I've paid" by eSewa → admins notified → approve records it; reject needs a reason."""
    user, customer = register(client, "Kiran Sah", "kiran.pay@example.com", "9812000031")
    _, stranger = register(client, "Other Person", "other.pay@example.com", "9812000032")
    customer_id = user["customerId"]
    day = (now_local().date() + timedelta(days=3)).isoformat()
    today = now_local().date().isoformat()
    with SessionLocal() as db:
        appointment = Appointment(
            id=generate_id("apt"), customer_id=customer_id, service_ids=["svc_pedicure"], staff_id="stf_rojina",
            date=day, start_time="12:00", end_time="12:50", status="confirmed", notes="",
            total_price=2000, amount_paid=0, payment_status="unpaid", payments=[],
        )
        db.add(appointment)
        db.commit()
        apt_id = appointment.id
    claim = {"targetType": "appointment", "targetId": apt_id, "amount": 1500, "method": "esewa",
             "reference": "  0abc 123x ", "paidOn": today}

    # With no account set up, every online method is offered; once one is, only those.
    assert set(client.get("/settings", headers=customer).json()["payments"]) >= {"esewa", "khalti", "fonepay", "bank"}
    off = client.patch("/settings/payments", json={"esewa": {"enabled": True}}, headers=admin)
    assert off.json()["code"] == "VALIDATION"  # needs an ID or QR first
    on = client.patch("/settings/payments", json={"esewa": {"enabled": True, "accountName": "Ansita", "accountNumber": "9841500100"}}, headers=admin)
    assert on.status_code == 200 and on.json()["payments"]["esewa"]["accountNumber"] == "9841500100"
    assert client.get("/settings", headers=customer).json()["payments"]["esewa"]["enabled"] is True
    assert client.post("/payment-requests", json={**claim, "method": "khalti"}, headers=customer).json()["code"] == "VALIDATION"

    # Only the owner, only online methods, only up to what's due, not in the future.
    assert client.post("/payment-requests", json=claim, headers=stranger).status_code == 403
    assert client.post("/payment-requests", json={**claim, "method": "cash"}, headers=customer).status_code == 422
    assert client.post("/payment-requests", json={**claim, "amount": 2500}, headers=customer).json()["code"] == "VALIDATION"
    future = (now_local().date() + timedelta(days=1)).isoformat()
    assert client.post("/payment-requests", json={**claim, "paidOn": future}, headers=customer).json()["code"] == "VALIDATION"
    assert client.post("/payment-requests", json=claim, headers=admin).status_code == 403

    before = client.get("/notifications/unread-count", headers=admin).json()["count"]
    created = client.post("/payment-requests", json=claim, headers=customer)
    assert created.status_code == 201, created.text
    request = created.json()
    assert request["status"] == "pending" and request["reference"] == "0ABC 123X" and request["balanceDue"] == 2000
    assert client.get("/notifications/unread-count", headers=admin).json()["count"] == before + 1
    # The bill is unchanged until verified.
    assert client.get(f"/appointments/{apt_id}", headers=customer).json()["amountPaid"] == 0
    # Same transaction twice, or more than is left after pending ones, is refused.
    assert client.post("/payment-requests", json={**claim, "amount": 100}, headers=customer).json()["code"] == "CONFLICT"
    over = client.post("/payment-requests", json={**claim, "amount": 600, "reference": "SECOND-1"}, headers=customer)
    assert over.json()["code"] == "VALIDATION"
    assert client.get("/payment-requests/pending-count", headers=admin).json()["count"] >= 1
    assert client.get("/payment-requests/pending-count", headers=customer).status_code == 403
    assert [r["id"] for r in client.get("/payment-requests", headers=stranger).json()] == []

    # Approve a different amount than reported (only 1200 arrived).
    approved = client.post(f"/payment-requests/{request['id']}/approve", json={"amount": 1200}, headers=admin)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved" and approved.json()["approvedAmount"] == 1200
    bill = client.get(f"/appointments/{apt_id}", headers=customer).json()
    assert bill["amountPaid"] == 1200 and bill["paymentStatus"] == "partial"
    assert bill["payments"][-1]["reference"] == "0ABC 123X" and bill["payments"][-1]["paidOn"] == today
    assert client.post(f"/payment-requests/{request['id']}/approve", json={}, headers=admin).json()["code"] == "CONFLICT"
    titles = [n["title"] for n in client.get("/notifications", headers=customer).json()]
    assert "Payment confirmed" in titles

    # Second request: rejected with a reason; a third is withdrawn by the customer.
    second = client.post("/payment-requests", json={**claim, "amount": 800, "reference": "SECOND-1"}, headers=customer).json()
    assert client.post(f"/payment-requests/{second['id']}/reject", json={"reason": ""}, headers=admin).status_code == 422
    rejected = client.post(f"/payment-requests/{second['id']}/reject", json={"reason": "No such transaction in eSewa"}, headers=admin)
    assert rejected.json()["status"] == "rejected"
    assert client.get(f"/appointments/{apt_id}", headers=admin).json()["amountPaid"] == 1200
    third = client.post("/payment-requests", json={**claim, "amount": 800, "reference": "THIRD-1"}, headers=customer).json()
    assert client.post(f"/payment-requests/{third['id']}/cancel", headers=stranger).status_code == 403
    assert client.post(f"/payment-requests/{third['id']}/cancel", headers=customer).json()["status"] == "cancelled"

    # Cash recorded at the counter meanwhile: approving more than is now due is refused.
    fourth = client.post("/payment-requests", json={**claim, "amount": 800, "reference": "FOURTH-1"}, headers=customer).json()
    client.post(f"/appointments/{apt_id}/payments", json={"amount": 500, "method": "cash"}, headers=admin)
    assert client.post(f"/payment-requests/{fourth['id']}/approve", json={}, headers=admin).json()["code"] == "VALIDATION"
    assert client.post(f"/payment-requests/{fourth['id']}/approve", json={"amount": 300}, headers=admin).status_code == 200
    assert client.get(f"/appointments/{apt_id}", headers=admin).json()["paymentStatus"] == "paid"

    # Customers can upload a screenshot; links that aren't uploads are refused as proof.
    png = b"\x89PNG\r\n\x1a\n" + b"\x02" * 16
    assert client.post("/uploads", content=png, headers={**customer, "Content-Type": "image/png"}).status_code == 201
    assert client.patch("/settings/payments", json={"khalti": {"qr": "https://evil.example/qr.png"}}, headers=admin).json()["code"] == "VALIDATION"



def test_payment_request_before_any_account_is_set_up(client, admin):
    """Customers who paid a number the parlour gave them can still say so."""
    from app.business import get_business

    with SessionLocal() as db:
        row = get_business(db)
        saved = row.payment_accounts
        row.payment_accounts = None
        db.commit()
    try:
        user, customer = register(client, "Gita Yadav", "gita.pay@example.com", "9812000077")
        with SessionLocal() as db:
            appointment = Appointment(
                id=generate_id("apt"), customer_id=user["customerId"], service_ids=["svc_pedicure"], staff_id="stf_rojina",
                date=now_local().date().isoformat(), start_time="09:00", end_time="09:50", status="confirmed", notes="",
                total_price=700, amount_paid=200, payment_status="partial", payments=[],
            )
            db.add(appointment)
            db.commit()
        claim = {"targetType": "appointment", "targetId": appointment.id, "amount": 500, "method": "khalti",
                 "reference": "KH12345", "paidOn": now_local().date().isoformat()}
        sent = client.post("/payment-requests", json=claim, headers=customer)
        assert sent.status_code in (200, 201), sent.text
        # Switching requests off still stops them.
        client.patch("/settings/payments", json={"requests": False}, headers=admin)
        again = client.post("/payment-requests", json={**claim, "amount": 100, "reference": "KH999"}, headers=customer)
        assert again.status_code == 422 or again.json().get("code") == "VALIDATION"
    finally:
        with SessionLocal() as db:
            get_business(db).payment_accounts = saved
            db.commit()


def test_service_benefits(client, admin):
    seeded = client.get("/services/svc_pedicure").json()
    assert len(seeded["benefits"]) == 4  # starter benefits for the seeded services
    created = client.post("/services", json={"name": "Threading", "categoryId": "cat_skin", "duration": 15, "price": 100,
                                              "benefits": ["  Neat  brows ", "", "neat brows", "Quick"]}, headers=admin)
    assert created.status_code == 201 and created.json()["benefits"] == ["Neat brows", "Quick"]
    sid = created.json()["id"]
    assert client.patch(f"/services/{sid}", json={"benefits": ["x" * 121]}, headers=admin).status_code == 422
    assert client.patch(f"/services/{sid}", json={"benefits": [str(i) for i in range(9)]}, headers=admin).status_code == 422
    assert client.patch(f"/services/{sid}", json={"price": 150}, headers=admin).json()["benefits"] == ["Neat brows", "Quick"]
    assert client.patch(f"/services/{sid}", json={"benefits": []}, headers=admin).json()["benefits"] == []
