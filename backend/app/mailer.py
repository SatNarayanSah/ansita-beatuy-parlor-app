"""Sends transactional email (verification and password-reset codes) over SMTP.

The messages come from the editable templates in `app/email_templates/`:
`code.html` (the designed email) and `code.txt` (plain-text fallback for mail apps
that don't show HTML). Placeholders use `$name` syntax; see the README in that folder.

With no `SMTP_HOST`, `settings.mail_configured` is False and callers fall back to
showing the code in development (`EXPOSE_RESET_CODE`).
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from functools import cache
from html import escape
from pathlib import Path
from string import Template

from .config import settings
from .errors import ApiError

log = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).parent / "email_templates"
_TIMEOUT = 15
# Logo embedded in each email (replace the file to change it; ~200px square PNG).
LOGO_FILE = TEMPLATE_DIR / "logo.png"
LOGO_CID = "ansita-logo"

# Wording per kind of code; everything else lives in the template files.
_PURPOSES = {
    "verify": {
        "subject": "$code is your $brand verification code",
        "heading": "Verify your email",
        "intro": "Thanks for joining $brand! Enter this code in the app or website to confirm your email address.",
    },
    "reset": {
        "subject": "$code is your $brand password reset code",
        "heading": "Reset your password",
        "intro": "We received a request to reset your $brand password. Enter this code to choose a new one.",
    },
}


@cache
def _template(name: str) -> Template:
    return Template((TEMPLATE_DIR / name).read_text(encoding="utf-8"))


def render_code_email(code: str, purpose: str, minutes: int) -> tuple[str, str, str]:
    """(subject, text, html) for a 6-digit code email. `purpose` is "verify" or "reset"."""
    wording = _PURPOSES[purpose]
    brand = settings.mail_from_name
    base = {"brand": brand, "code": code, "minutes": str(minutes)}
    subject = Template(wording["subject"]).safe_substitute(base)
    heading = Template(wording["heading"]).safe_substitute(base)
    intro = Template(wording["intro"]).safe_substitute(base)
    contact = settings.mail_contact or settings.mail_from_email

    text = _template("code.txt").safe_substitute(base, heading=heading, intro=intro, contact=contact)
    # A public MAIL_LOGO_URL if given; otherwise the bundled logo travels inside the email.
    logo_src = settings.mail_logo_url or (f"cid:{LOGO_CID}" if LOGO_FILE.is_file() else "")
    logo = (
        f'<img src="{escape(logo_src, quote=True)}" alt="{escape(brand, quote=True)}" width="96" height="96" '
        'style="display:block;margin:0 auto 12px;border:0;outline:none;text-decoration:none">'
        if logo_src else ""
    )
    html = _template("code.html").safe_substitute(
        brand=escape(brand),
        code=escape(code),
        minutes=str(minutes),
        heading=escape(heading),
        intro=escape(intro),
        contact=escape(contact),
        logo=logo,
    )
    return subject, text, html


def send_email(to: str, subject: str, text: str, html: str) -> None:
    """Raises ApiError("NETWORK") when the mail server refuses or can't be reached."""
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.mail_from_name, settings.mail_from_email))
    message["To"] = to
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    if f"cid:{LOGO_CID}" in html:
        # Inline image referenced by the template; mail apps show it without loading anything.
        message.get_payload()[1].add_related(LOGO_FILE.read_bytes(), "image", "png", cid=f"<{LOGO_CID}>",
                                             filename="logo.png", disposition="inline")
    context = ssl.create_default_context()
    try:
        if settings.smtp_ssl:
            server: smtplib.SMTP = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=_TIMEOUT, context=context)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=_TIMEOUT)
        with server:
            if not settings.smtp_ssl:
                server.starttls(context=context)
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except smtplib.SMTPAuthenticationError as exc:
        log.error(
            "SMTP login to %s as %r was rejected (%s %s). Check SMTP_USERNAME / SMTP_PASSWORD; with two-factor "
            "sign-in on, Zoho and Gmail need an app-specific password, not the normal one. "
            "Test with: python -m app.check_email you@example.com",
            settings.smtp_host, settings.smtp_username, exc.smtp_code, exc.smtp_error.decode(errors="replace"),
        )
        raise ApiError("NETWORK", "We couldn't send the email right now. Please try again in a minute.") from exc
    except Exception as exc:  # noqa: BLE001 - any mail failure reads the same to the user
        log.exception("Sending email to %s via %s:%s failed", to, settings.smtp_host, settings.smtp_port)
        raise ApiError("NETWORK", "We couldn't send the email right now. Please try again in a minute.") from exc


def send_code_email(to: str, code: str, purpose: str, minutes: int) -> None:
    send_email(to, *render_code_email(code, purpose, minutes))
