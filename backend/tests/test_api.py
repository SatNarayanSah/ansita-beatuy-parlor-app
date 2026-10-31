from datetime import date, timedelta

from app.db import SessionLocal
from app.models import Appointment
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
    response = client.post("/auth/login", json={"email": "admin@ansita.com", "password": "wrong"})
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
    response = client.post(f"/appointments/{appointment['id']}/status", json={"status": "completed"}, headers=admin)
    assert response.status_code == 422  # not started yet

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
    assert client.post("/reviews", json={"appointmentId": appointment_id, "rating": 5},
                       headers=customer).status_code == 409
    assert client.get("/staff/stf_rojina").json()["rating"] == 4

    stats = client.get(f"/customers/{user['customerId']}/stats", headers=customer).json()
    assert stats["totalVisits"] == 1 and stats["lastVisit"] == yesterday


def test_enrollment_seats(client, admin):
    start = (now_local().date() + timedelta(days=10)).isoformat()
    end = (date.fromisoformat(start) + timedelta(days=30)).isoformat()
    course = client.post("/courses/crs_nail_art/batches", json={
        "name": "Tiny Batch", "startDate": start, "endDate": end, "days": ["sun", "mon"],
        "startTime": "15:00", "endTime": "17:00", "seats": 1, "status": "upcoming",
    }, headers=admin).json()
    batch_id = course["batches"][-1]["id"]

    first, first_h = register(client, "Mina Das", "mina@example.com", "9812000004")
    second, second_h = register(client, "Tara Sah", "tara@example.com", "9812000005")
    response = client.post("/enrollments", json={"studentId": first["customerId"], "courseId": "crs_nail_art",
                                                 "batchId": batch_id}, headers=first_h)
    assert response.status_code == 201, response.text
    enrollment = response.json()
    assert enrollment["status"] == "pending" and enrollment["feeTotal"] == 12000

    full = client.post("/enrollments", json={"studentId": second["customerId"], "courseId": "crs_nail_art",
                                             "batchId": batch_id}, headers=second_h)
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
        "enabled": True, "rupeesPerPoint": 50, "pointValue": 1}

    today = now_local().date()
    offer = {"title": "Tihar Glow", "discountType": "percent", "discountValue": 20, "code": " tihar20 ",
             "validFrom": today.isoformat(), "validTo": (today + timedelta(days=10)).isoformat()}
    created = client.post("/offers", json=offer, headers=admin)
    assert created.status_code == 201 and created.json()["code"] == "TIHAR20"
    assert client.post("/offers", json=offer, headers=admin).status_code == 409
    draft = {**offer, "code": None, "isActive": False}
    client.post("/offers", json=draft, headers=admin)
    assert [o["title"] for o in client.get("/offers", headers=customer).json()] == ["Tihar Glow"]
