"""Convert ORM rows to the camelCase JSON the app's TypeScript types expect."""

from typing import Any

from pydantic import BaseModel

from .db import Base

_HIDDEN = {"password_hash", "token_version"}


def to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.capitalize() for part in rest)


def to_dict(row: Base) -> dict[str, Any]:
    return {
        to_camel(column.key): getattr(row, column.key)
        for column in row.__table__.columns  # type: ignore[attr-defined]
        if column.key not in _HIDDEN
    }


def to_list(rows: list[Any]) -> list[dict[str, Any]]:
    return [to_dict(row) for row in rows]


def _plain(value: Any) -> Any:
    """Nested pydantic models become camelCase dicts, as stored in JSON columns."""
    if isinstance(value, BaseModel):
        return value.model_dump(by_alias=True)
    if isinstance(value, list):
        return [_plain(item) for item in value]
    return value


def changes(model: BaseModel) -> dict[str, Any]:
    """Only the fields the client actually sent, keyed by snake_case attribute name."""
    return {name: _plain(getattr(model, name)) for name in model.model_fields_set}


def apply(row: Base, values: dict[str, Any]) -> None:
    for key, value in values.items():
        setattr(row, key, value)
