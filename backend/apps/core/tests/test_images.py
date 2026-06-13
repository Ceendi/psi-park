import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.core.images import process_upload


def _image_file(fmt="PNG", size=(2000, 1500), name="photo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", size, (120, 180, 140)).save(buffer, format=fmt)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type=f"image/{fmt.lower()}")


def test_process_upload_returns_downscaled_full_and_thumbnail():
    full, thumb = process_upload(_image_file())

    full_img = Image.open(io.BytesIO(full.read()))
    thumb_img = Image.open(io.BytesIO(thumb.read()))

    assert full_img.format == "JPEG"
    assert max(full_img.size) <= 1920
    assert max(thumb_img.size) <= 640


def test_process_upload_rejects_non_image():
    bad = SimpleUploadedFile("x.png", b"definitely not an image", content_type="image/png")
    with pytest.raises(ValidationError):
        process_upload(bad)


def test_process_upload_rejects_oversized(monkeypatch):
    file = _image_file()
    monkeypatch.setattr(file, "size", 6 * 1024 * 1024)
    with pytest.raises(ValidationError):
        process_upload(file)
