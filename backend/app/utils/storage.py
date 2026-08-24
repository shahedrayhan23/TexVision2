"""
Image storage abstraction.
Uses Firebase Storage if configured, otherwise saves to local disk
under LOCAL_STORAGE_DIR and serves via a static route (see main.py).
"""
import os
import uuid
from app.config import get_settings
from app.firebase_setup import FIREBASE_ENABLED, bucket

settings = get_settings()
os.makedirs(settings.local_storage_dir, exist_ok=True)


def save_image(file_bytes: bytes, filename_hint: str = "fabric") -> str:
    """Saves image, returns a publicly accessible URL (or local path)."""
    ext = os.path.splitext(filename_hint)[1] or ".jpg"
    unique_name = f"{filename_hint.split('.')[0]}_{uuid.uuid4().hex[:8]}{ext}"

    if FIREBASE_ENABLED and bucket is not None:
        blob = bucket.blob(f"inspections/{unique_name}")
        blob.upload_from_string(file_bytes, content_type="image/jpeg")
        blob.make_public()
        return blob.public_url

    local_path = os.path.join(settings.local_storage_dir, unique_name)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return f"/static/uploads/{unique_name}"
