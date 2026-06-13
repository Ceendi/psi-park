"""Image processing for user uploads.

Single responsibility for the whole project (PLAN 6.1): validate, normalise
orientation, downscale and re-encode to JPEG. Returns Django-ready file contents
for both a full-size image (max 1920 px) and a thumbnail (max 640 px).
"""

from __future__ import annotations

import io

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
FULL_MAX_EDGE = 1920
THUMB_MAX_EDGE = 640
JPEG_QUALITY = 82


def _load_validated(file) -> Image.Image:
    if file.size > MAX_UPLOAD_BYTES:
        raise ValidationError("Plik jest za duży (maksymalnie 5 MB).")
    try:
        file.seek(0)
        image = Image.open(file)
        image.verify()  # detect truncated / non-image payloads
        file.seek(0)
        image = Image.open(file)
    except Exception as exc:  # noqa: BLE001 - any decode failure is a bad upload
        raise ValidationError("Nieprawidłowy plik obrazu.") from exc

    if image.format not in ALLOWED_FORMATS:
        raise ValidationError("Dozwolone formaty: JPEG, PNG, WEBP.")
    return ImageOps.exif_transpose(image).convert("RGB")


def _encode(image: Image.Image, max_edge: int) -> ContentFile:
    resized = image.copy()
    resized.thumbnail((max_edge, max_edge), Image.LANCZOS)
    buffer = io.BytesIO()
    resized.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return ContentFile(buffer.getvalue())


def process_upload(file) -> tuple[ContentFile, ContentFile]:
    """Return ``(full_image, thumbnail)`` as JPEG ``ContentFile`` objects.

    Raises:
        ValidationError: when the file is too large, not an image, or an unsupported format.
    """
    image = _load_validated(file)
    return _encode(image, FULL_MAX_EDGE), _encode(image, THUMB_MAX_EDGE)
