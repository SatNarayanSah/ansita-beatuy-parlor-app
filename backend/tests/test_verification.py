"""Email codes for sign-up / email changes, and Nepali (NTC/Ncell) mobile numbers."""

import pytest

from app.utils import mobile_error, nepal_operator

from .conftest import register, verify_email


def _body(email: str, phone: str, token: str = "") -> dict:
    return {"name": "Test Person", "email": email, "phone": phone, "password": "secret123", "emailVerificationToken": token}


@pytest.mark.parametrize(("number", "operator"), [
    ("+9779841234567", "NTC"), ("+9779851234567", "NTC"), ("+9779861234567", "NTC"),
    ("+9779741234567", "NTC"), ("+9779751234567", "NTC"), ("+9779761234567", "NTC"),
    ("+9779801234567", "Ncell"), ("+9779811234567", "Ncell"), ("+9779821234567", "Ncell"),
    ("+9779701234567", "Ncell"), ("+9779711234567", "Ncell"),
])
def test_ntc_and_ncell_numbers_are_accepted(number, operator):
    assert nepal_operator(number) == operator
    assert mobile_error(number) is None


@pytest.mark.parametrize("number", ["+9779611234567", "+9779881234567", "+9779721234567", "+977981234567",
                                    "+97798123456789", "+9771234567890", ""])
def test_other_nepali_numbers_are_rejected(number):
    assert nepal_operator(number) is None
    assert mobile_error(number)


def test_foreign_numbers_keep_working():
    assert mobile_error("+919876543210") is None
    assert mobile_error("+91123") is not None


def test_register_needs_a_verified_email(client):
    assert client.post("/auth/register", json=_body("noverify@example.com", "9841000101")).status_code == 422
    assert client.post("/auth/register", json=_body("noverify@example.com", "9841000101", "forged")).status_code == 422
    # A token for a different address does not count.
    other = verify_email(client, "someone.else@example.com")
    assert client.post("/auth/register", json=_body("noverify@example.com", "9841000101", other)).status_code == 422
    token = verify_email(client, "noverify@example.com")
    assert client.post("/auth/register", json=_body("noverify@example.com", "9841000101", token)).status_code == 200


def test_register_rejects_numbers_outside_ntc_and_ncell(client):
    token = verify_email(client, "smartcell@example.com")
    response = client.post("/auth/register", json=_body("smartcell@example.com", "9611234567", token))
    assert response.status_code == 422
    assert "NTC" in response.json()["message"]
    assert client.post("/auth/register", json=_body("smartcell@example.com", "9761234567", token)).status_code == 200


def test_email_code_checks(client):
    assert client.post("/auth/email/send-code", json={"email": "not-an-email"}).status_code == 422
    sent = client.post("/auth/email/send-code", json={"email": "Code.Check@Example.com"}).json()
    assert sent["email"] == "code.check@example.com" and len(sent["demoCode"]) == 6
    wrong = "000000" if sent["demoCode"] != "000000" else "111111"
    assert client.post("/auth/email/verify", json={"email": "code.check@example.com", "code": wrong}).status_code == 422
    ok = client.post("/auth/email/verify", json={"email": "code.check@example.com", "code": sent["demoCode"]})
    assert ok.status_code == 200
    # Each code works once.
    assert client.post("/auth/email/verify", json={"email": "code.check@example.com", "code": sent["demoCode"]}).status_code == 422


def test_email_code_locks_after_too_many_wrong_guesses(client):
    sent = client.post("/auth/email/send-code", json={"email": "guess@example.com"}).json()
    wrong = "000000" if sent["demoCode"] != "000000" else "111111"
    for _ in range(5):
        client.post("/auth/email/verify", json={"email": "guess@example.com", "code": wrong})
    assert client.post("/auth/email/verify", json={"email": "guess@example.com", "code": sent["demoCode"]}).status_code == 422


def test_no_code_for_an_email_that_is_already_registered(client):
    register(client, "Taken Email", "taken.code@example.com", "9841000102")
    assert client.post("/auth/email/send-code", json={"email": "taken.code@example.com"}).status_code == 409


def test_email_token_is_not_a_sign_in_token(client):
    token = verify_email(client, "token.misuse@example.com")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_changing_email_needs_verification(client):
    _, headers = register(client, "Email Changer", "changer@example.com", "9841000103")
    assert client.patch("/auth/me", json={"email": "changer.new@example.com"}, headers=headers).status_code == 422
    # Re-sending the same email (e.g. saving other fields) needs nothing.
    assert client.patch("/auth/me", json={"email": "Changer@example.com", "name": "Email Changer"}, headers=headers).status_code == 200
    token = verify_email(client, "changer.new@example.com", headers)
    updated = client.patch("/auth/me", json={"email": "changer.new@example.com", "emailVerificationToken": token}, headers=headers)
    assert updated.status_code == 200 and updated.json()["email"] == "changer.new@example.com"


def test_profile_phone_must_be_ntc_or_ncell(client):
    _, headers = register(client, "Phone Changer", "phone.changer@example.com", "9841000104")
    assert client.patch("/auth/me", json={"phone": "9881234567"}, headers=headers).status_code == 422
    assert client.patch("/auth/me", json={"phone": "9701234567"}, headers=headers).status_code == 200


def test_admin_cannot_add_a_customer_with_an_unknown_operator(client, admin):
    assert client.post("/customers", json={"name": "Walk In", "phone": "9621234567"}, headers=admin).status_code == 422
    assert client.post("/customers", json={"name": "Walk In", "phone": "9851234599"}, headers=admin).status_code == 201


def test_code_email_template_renders():
    from app.mailer import render_code_email

    subject, text, html = render_code_email("482913", "verify", 10)
    assert "482913" in subject and "482913" in text and "482913" in html
    assert "Verify your email" in html and "10 minutes" in html
    assert "$" not in html.replace("$$", "")  # every placeholder filled
    _, _, reset_html = render_code_email("111222", "reset", 10)
    assert "Reset your password" in reset_html


def test_codes_are_emailed_over_smtp_and_not_shown(client, monkeypatch):
    from app import mailer
    from app.routers import auth as auth_router

    sent: list = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            assert (host, port) == ("smtp.test.local", 587)

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def starttls(self, context):
            pass

        def login(self, username, password):
            assert (username, password) == ("parlour@test.local", "app-password")

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)
    # Patch the settings objects the code holds (another test swaps `app.config.settings`).
    for settings in {id(s): s for s in (mailer.settings, auth_router.settings)}.values():
        for key, value in {"smtp_host": "smtp.test.local", "smtp_username": "parlour@test.local",
                           "smtp_password": "app-password", "mail_from_email": "parlour@test.local"}.items():
            monkeypatch.setattr(settings, key, value)

    response = client.post("/auth/email/send-code", json={"email": "mailed@example.com"})
    assert response.status_code == 200 and response.json()["demoCode"] == ""
    assert len(sent) == 1 and sent[0]["To"] == "mailed@example.com"
    code = sent[0]["Subject"].split()[0]
    html = sent[0].get_body(("html",)).get_content()
    assert code in html and len(code) == 6
    logo = [part for part in sent[0].walk() if part.get_content_type() == "image/png"]
    assert len(logo) == 1 and logo[0]["Content-ID"] == "<ansita-logo>" and "cid:ansita-logo" in html
    assert client.post("/auth/email/verify", json={"email": "mailed@example.com", "code": code}).status_code == 200
