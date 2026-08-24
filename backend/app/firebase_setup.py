"""
Firebase Admin SDK initialization.

For the hackathon demo, if the service account JSON isn't present,
the app falls back to LOCAL FILE STORAGE and a LOCAL JSON "database"
(see app/utils/local_db.py) so the whole system still runs end-to-end
without needing a live Firebase project configured.

To go fully live with Firebase:
1. Create a Firebase project -> Firestore + Storage + Authentication (Email/Password).
2. Download the service account key JSON, save as backend/firebase-service-account.json
3. Set FIREBASE_STORAGE_BUCKET in .env to your bucket name.
"""
import os
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("texvision.firebase")

firebase_app = None
db = None
bucket = None
FIREBASE_ENABLED = False

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, storage

    if os.path.exists(settings.firebase_credentials_path):
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_app = firebase_admin.initialize_app(cred, {
            "storageBucket": settings.firebase_storage_bucket
        })
        db = firestore.client()
        bucket = storage.bucket()
        FIREBASE_ENABLED = True
        logger.info("Firebase initialized successfully.")
    else:
        logger.warning(
            "firebase-service-account.json not found. "
            "Running in LOCAL DEMO MODE (local JSON db + local file storage)."
        )
except Exception as e:
    logger.warning(f"Firebase init skipped, using local demo mode. Reason: {e}")
