from functools import lru_cache

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

    # Until email/SMS is wired up, the reset code can be returned in the response (dev only).
    expose_reset_code: bool = True
    reset_code_ttl_minutes: int = 10

    # Used by `python -m app.seed` to create the first admin account.
    admin_email: str = "admin@ansita.com"
    admin_password: str = "admin123"
    admin_name: str = "Ansita Shrestha"
    admin_phone: str = "+9779841500100"

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
