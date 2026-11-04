"""Checks the SMTP settings by signing in and sending a sample code email.

    python -m app.check_email you@example.com

Prints the mail server's real answer, which the app hides from customers.
"""

import smtplib
import ssl
import sys

from .config import settings
from .mailer import render_code_email


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m app.check_email you@example.com")
        return 2
    to = sys.argv[1]
    print(f"Server : {settings.smtp_host}:{settings.smtp_port} ({'SSL' if settings.smtp_ssl else 'STARTTLS'})")
    print(f"Login  : {settings.smtp_username!r} (password: {len(settings.smtp_password)} characters)")
    print(f"From   : {settings.mail_from_name} <{settings.mail_from_email}>")
    if not settings.mail_configured:
        print("\nSMTP_HOST and MAIL_FROM_EMAIL must both be set.")
        return 1

    from .mailer import send_email

    try:
        context = ssl.create_default_context()
        server_cls = smtplib.SMTP_SSL if settings.smtp_ssl else smtplib.SMTP
        kwargs = {"context": context} if settings.smtp_ssl else {}
        with server_cls(settings.smtp_host, settings.smtp_port, timeout=15, **kwargs) as server:
            if not settings.smtp_ssl:
                server.starttls(context=context)
            server.login(settings.smtp_username, settings.smtp_password)
        print("\nLogin  : OK")
    except smtplib.SMTPAuthenticationError as exc:
        print(f"\nLogin REJECTED: {exc.smtp_code} {exc.smtp_error.decode(errors='replace')}")
        print("- Re-check SMTP_USERNAME (the full address) and SMTP_PASSWORD.")
        print("- With two-factor sign-in on, use an app-specific password:")
        print("  Zoho: accounts.zoho.com > Security > App Passwords. Gmail: myaccount.google.com/apppasswords")
        print("- Zoho accounts in India use smtp.zoho.in (and smtppro.zoho.in for paid/custom-domain plans).")
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"\nCould not connect: {type(exc).__name__}: {exc}")
        print("- Check SMTP_HOST/SMTP_PORT. Some hosts (e.g. Render's free plan) block outgoing SMTP.")
        return 1

    send_email(to, *render_code_email("123456", "verify", 10))
    print(f"Sent   : sample verification email to {to}. Check the inbox (and spam).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
