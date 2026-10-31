from typing import Literal, TypeVar

ApiErrorCode = Literal["NETWORK", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT"]

STATUS_BY_CODE: dict[str, int] = {
    "UNAUTHORIZED": 401,
    "FORBIDDEN": 403,
    "NOT_FOUND": 404,
    "CONFLICT": 409,
    "VALIDATION": 422,
    "NETWORK": 503,
}

DEFAULT_MESSAGES: dict[str, str] = {
    "NETWORK": "Network error. Please check your connection and try again.",
    "UNAUTHORIZED": "Your session has expired. Please sign in again.",
    "FORBIDDEN": "You do not have permission to do that.",
    "NOT_FOUND": "The requested item could not be found.",
    "VALIDATION": "Some of the details are invalid.",
    "CONFLICT": "This action conflicts with existing data.",
}


class ApiError(Exception):
    """Mirrors the app's ApiError: the JSON body is {"code", "message"}."""

    def __init__(self, code: ApiErrorCode, message: str | None = None):
        self.code = code
        self.message = message or DEFAULT_MESSAGES[code]
        super().__init__(self.message)

    @property
    def status_code(self) -> int:
        return STATUS_BY_CODE[self.code]


T = TypeVar("T")


def ensure_found(value: T | None, entity_name: str) -> T:
    if value is None:
        raise ApiError("NOT_FOUND", f"{entity_name} not found.")
    return value
