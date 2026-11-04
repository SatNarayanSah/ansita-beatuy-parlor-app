from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from environment variables (or a local `.env` file)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLite for local development; set a Postgres URL (e.g. Neon/Supabase) in production.
    database_url: str = "sqlite:///./ansita.db"

    # Sign the access tokens. MUST be set to a long random string in production.
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_days: int = 30

    # "Today" and "now" for bookings are evaluated in the parlour's time zone.
    timezone: str = "Asia/Kathmandu"

    # Comma-separated list of allowed browser origins ("*" for any). Native apps ignore CORS.
    cors_origins: str = "*"
    # Optional regular expression for more allowed origins (e.g. every Vercel preview URL).
    cors_origin_regex: str = ""

    # Public base URL of this API (e.g. https://ansita-api.onrender.com), used for uploaded image
    # links. Empty: taken from the request, which needs the proxy's forwarded headers to be trusted.
    public_url: str = ""

    # Dev only: while no mail provider is set up, verification and reset codes are returned
    # in the API response instead of being emailed. Ignored once email sending is configured.
    expose_reset_code: bool = True
    reset_code_ttl_minutes: int = 10

    # ---------- Email (verification codes, password reset) ----------
    # Any SMTP server, e.g. Gmail: smtp.gmail.com, port 587, your address and an App Password.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    # true: implicit TLS (usually port 465). false: STARTTLS (usually port 587).
    smtp_ssl: bool = False
    # Sender shown to customers (usually the same address as SMTP_USERNAME).
    mail_from_email: str = ""
    mail_from_name: str = "Ansita Beauty Parlour"
    # Optional, for the email template (app/email_templates): a public https link to the
    # logo, and the address customers are told to write to (default: the sender).
    mail_logo_url: str = ""
    mail_contact: str = ""
    # Look up the email's domain (MX/A records) before sending a code, so typos like
    # "gmial.com" are caught. Turn off only for tests or offline development.
    email_check_deliverability: bool = True
    # Require a code emailed to the address at sign-up and when changing the sign-in email.
    # false: skipped (the address is still checked for a real domain). Use while email can't
    # be sent, e.g. on Render's free plan, which blocks SMTP. The apps read it from /auth/options.
    email_verification_enabled: bool = True
    email_code_ttl_minutes: int = 10
    # How long a verified email stays usable for sign-up or an email change.
    email_verified_token_minutes: int = 30

    # Phone notifications through Expo's push service. Off in tests. The access token
    # is only needed if "Enhanced push security" is turned on for the Expo project.
    push_enabled: bool = True
    expo_access_token: str = ""

    # Used by `python -m app.seed` to create the first admin account. No default:
    # the seed skips the admin until both are set.
    admin_email: str = ""
    admin_password: str = ""
    admin_name: str = "Ansita Shrestha"
    admin_phone: str = "+9779854028392"

    @field_validator("jwt_secret", "database_url", "public_url", "cors_origins", "cors_origin_regex",
                     "smtp_host", "smtp_username", "smtp_password", "mail_from_email", "mail_logo_url",
                     "mail_contact", mode="before")
    @classmethod
    def _strip(cls, value):
        # Values pasted into a dashboard often carry a stray space or newline.
        return value.strip() if isinstance(value, str) else value

    @property
    def mail_configured(self) -> bool:
        return bool(self.mail_from_email and self.smtp_host)

    @property
    def sqlalchemy_url(self) -> str:
        # Render/Heroku-style URLs start with postgres://; SQLAlchemy + psycopg 3 need this form.
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
