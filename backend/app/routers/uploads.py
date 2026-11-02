"""Image uploads: pictures from the admin website and profile photos from the app.

`POST /uploads` takes the raw image bytes as the request body (Content-Type image/jpeg, png,
webp or gif) and returns the absolute URL to store in a record's `image` or `avatar` field.
The type is checked from the file's first bytes, not just the header; SVG is refused because
it can carry scripts. Admins can upload any picture; other signed-in users upload their
own profile photo.
"""

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import ApiError, ensure_found
from ..models import Upload, User
from ..security import get_current_user
from ..image_urls import to_public
from ..utils import generate_id

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_BYTES = 5 * 1024 * 1024


def _sniff(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


@router.post("", status_code=201)
async def upload_image(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BYTES:
        raise ApiError("VALIDATION", "Images can be at most 5 MB.")
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_BYTES:
            raise ApiError("VALIDATION", "Images can be at most 5 MB.")
    if not data:
        raise ApiError("VALIDATION", "Choose an image to upload.")
    content_type = _sniff(bytes(data[:16]))
    if content_type is None:
        raise ApiError("VALIDATION", "Upload a JPG, PNG, WebP or GIF image.")

    upload = Upload(id=generate_id("img"), content_type=content_type, size=len(data), data=bytes(data), uploaded_by=user.id)
    db.add(upload)
    db.commit()
    # Full link for an immediate preview; it's saved without the host (see image_urls.py).
    url = to_public(request.app.url_path_for("get_upload", upload_id=upload.id))
    return {"id": upload.id, "url": url, "contentType": content_type, "size": upload.size}


@router.get("/{upload_id}", name="get_upload")
def get_upload(upload_id: str, db: Session = Depends(get_db)):
    upload = ensure_found(db.get(Upload, upload_id), "Image")
    return Response(
        content=upload.data,
        media_type=upload.content_type,
        # Uploads never change (a new image gets a new id), so browsers and the app can cache them for good.
        headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"},
    )
