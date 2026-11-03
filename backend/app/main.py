from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .db import init_db
from .errors import ApiError
from .image_urls import BaseUrlMiddleware
from .routers import (
    appointments,
    auth,
    catalog,
    contact,
    courses,
    customers,
    enrollments,
    notifications,
    offers,
    payment_requests,
    reviews,
    staff,
    uploads,
)
from .routers import settings as settings_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.database_url.startswith("sqlite"):
        secret = settings.jwt_secret
        if secret == "change-me-in-production":
            raise RuntimeError(
                "JWT_SECRET is not set for this service. Add an environment variable named exactly JWT_SECRET "
                "(32+ random characters) and redeploy."
            )
        if len(secret) < 32:
            raise RuntimeError(f"JWT_SECRET is only {len(secret)} characters long; use 32 or more random characters.")
        if settings.jwt_algorithm not in ("HS256", "HS384", "HS512"):
            raise RuntimeError("JWT_ALGORITHM must be HS256, HS384 or HS512.")
    init_db()
    yield


app = FastAPI(title="Ansita Beauty Parlour API", version="1.0.0", lifespan=lifespan)

# Browsers send the origin as scheme://host[:port] with no path, so a pasted
# "https://site.vercel.app/" (trailing slash) or stray spaces would never match.
origins = [origin.strip().rstrip("/") for origin in settings.cors_origins.split(",") if origin.strip().rstrip("/")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    # Optional, e.g. Vercel preview deployments: ^https://ansita-[a-z0-9-]+\.vercel\.app$
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(BaseUrlMiddleware)


# Every error has the same body as the app's ApiError: {"code": ..., "message": ...}.


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return JSONResponse(status_code=exc.status_code, content={"code": exc.code, "message": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", ())[1:]) or "request"
    message = f"{field}: {first.get('msg', 'is invalid')}" if first else "Some of the details are invalid."
    return JSONResponse(status_code=422, content={"code": "VALIDATION", "message": message})


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_: Request, exc: StarletteHTTPException):
    code = {401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT"}.get(exc.status_code, "VALIDATION")
    return JSONResponse(status_code=exc.status_code, content={"code": code, "message": str(exc.detail)})


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


for module in (auth, appointments, catalog, contact, staff, customers, courses, enrollments, reviews, notifications, offers,
               settings_router, uploads, payment_requests):
    app.include_router(module.router)
