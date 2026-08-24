"""
Image Authenticity Check
=========================
Determines whether an uploaded fabric image is:
  - "original"      : a genuine camera-captured photo
  - "ai_generated"   : produced by an AI image generator (diffusion/GAN)
  - "edited"         : a real photo that has been digitally altered/spliced

Ensemble of 4 lightweight signals (no heavy model required, runs fast
on CPU alongside the existing OpenCV defect pipeline):
  1. EXIF/metadata inspection
  2. Error Level Analysis (ELA) via JPEG recompression residual
  3. FFT frequency-domain periodicity check
  4. Noise/sharpness consistency (Laplacian variance across patches)

Only the final label string is ever returned — no internal scores are
exposed to the API layer or the client.
"""
import io
import logging
from typing import Dict

import numpy as np
import cv2
from PIL import Image, ExifTags

logger = logging.getLogger("texvision.ai")

WEIGHTS = {"exif": 1.2, "ela": 1.0, "fft": 1.3, "noise": 1.0}

EDIT_SOFTWARE_KEYWORDS = ["photoshop", "gimp", "lightroom", "snapseed", "picsart", "canva"]
AI_SOFTWARE_KEYWORDS = [
    "midjourney", "dall-e", "dalle", "stable diffusion", "stability",
    "firefly", "leonardo", "runway", "nightcafe",
]


def _read_images(image_bytes: bytes):
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    np_arr = np.frombuffer(image_bytes, np.uint8)
    cv_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if cv_img is None:
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return pil_img, cv_img


def _check_exif(pil_img: Image.Image) -> Dict[str, float]:
    votes = {"original": 0.0, "ai_generated": 0.0, "edited": 0.0}
    try:
        exif_raw = pil_img._getexif()
    except Exception:
        exif_raw = None

    if not exif_raw:
        votes["ai_generated"] += 0.4
        votes["edited"] += 0.2
        return votes

    exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_raw.items()}
    software = str(exif.get("Software", "")).lower()
    make, model = exif.get("Make"), exif.get("Model")

    if any(k in software for k in AI_SOFTWARE_KEYWORDS):
        votes["ai_generated"] += 1.0
    elif any(k in software for k in EDIT_SOFTWARE_KEYWORDS):
        votes["edited"] += 1.0
    elif make and model:
        votes["original"] += 0.8
    else:
        votes["ai_generated"] += 0.2
        votes["edited"] += 0.1
    return votes


def _error_level_analysis(pil_img: Image.Image, quality: int = 90) -> Dict[str, float]:
    votes = {"original": 0.0, "ai_generated": 0.0, "edited": 0.0}
    buffer = io.BytesIO()
    pil_img.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    resaved = Image.open(buffer)

    orig_arr = np.array(pil_img).astype(np.int16)
    resaved_arr = np.array(resaved).astype(np.int16)
    ela_map = np.abs(orig_arr - resaved_arr).sum(axis=2)

    mean_err, std_err, max_err = float(ela_map.mean()), float(ela_map.std()), float(ela_map.max())
    high_err_ratio = float((ela_map > (mean_err + 2 * std_err)).sum()) / ela_map.size

    if high_err_ratio > 0.03 and max_err > (mean_err * 4):
        votes["edited"] += 1.0
    elif std_err < 1.5 and mean_err < 3.0:
        votes["ai_generated"] += 0.7
    else:
        votes["original"] += 0.6
    return votes


def _fft_periodicity_check(cv_img: np.ndarray) -> Dict[str, float]:
    votes = {"original": 0.0, "ai_generated": 0.0, "edited": 0.0}
    gray = cv2.resize(cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY), (512, 512))

    fshift = np.fft.fftshift(np.fft.fft2(gray))
    magnitude = np.log(np.abs(fshift) + 1)

    h, w = magnitude.shape
    center = magnitude[h // 2 - 20:h // 2 + 20, w // 2 - 20:w // 2 + 20]
    outer = magnitude.copy()
    outer[h // 2 - 60:h // 2 + 60, w // 2 - 60:w // 2 + 60] = 0

    center_energy = float(center.mean())
    outer_energy = float(outer[outer > 0].mean()) if (outer > 0).any() else 0.0
    ratio = outer_energy / (center_energy + 1e-6)

    if ratio > 0.55:
        votes["ai_generated"] += 0.8
    else:
        votes["original"] += 0.4
    return votes


def _noise_analysis(cv_img: np.ndarray) -> Dict[str, float]:
    votes = {"original": 0.0, "ai_generated": 0.0, "edited": 0.0}
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_64F)

    h, w = gray.shape
    patch = 64
    variances = [
        lap[y:y + patch, x:x + patch].var()
        for y in range(0, h - patch, patch)
        for x in range(0, w - patch, patch)
    ]
    if not variances:
        return votes

    variances = np.array(variances)
    mean_var, std_var = variances.mean(), variances.std()
    cv_ratio = std_var / (mean_var + 1e-6)

    if mean_var < 8.0:
        votes["ai_generated"] += 0.6
    elif cv_ratio > 1.2:
        votes["edited"] += 0.6
    else:
        votes["original"] += 0.5
    return votes


def analyze_authenticity(image_bytes: bytes) -> str:
    """
    Main entrypoint: raw image bytes in -> one of
    'original' | 'ai_generated' | 'edited' out.
    """
    try:
        pil_img, cv_img = _read_images(image_bytes)
    except Exception as e:
        logger.warning(f"Authenticity check failed to decode image: {e}")
        return "original"  # fail-open: don't block the inspection flow

    signals = {
        "exif": _check_exif(pil_img),
        "ela": _error_level_analysis(pil_img),
        "fft": _fft_periodicity_check(cv_img),
        "noise": _noise_analysis(cv_img),
    }

    final_scores = {"original": 0.0, "ai_generated": 0.0, "edited": 0.0}
    for name, votes in signals.items():
        w = WEIGHTS.get(name, 1.0)
        for label, v in votes.items():
            final_scores[label] += v * w

    best_label = max(final_scores, key=final_scores.get)
    best_score = final_scores[best_label]
    sorted_scores = sorted(final_scores.values(), reverse=True)
    second_score = sorted_scores[1] if len(sorted_scores) > 1 else 0.0

    # Fail-safe: normal camera photos should not be mislabeled as AI-generated
    # without strong evidence. If scores are close or weak, default to original.
    if best_score < 2.0 or (best_score - second_score) < 0.8:
        return "original"

    if best_label == "ai_generated" and best_score < 3.0:
        return "original"

    if best_label == "edited" and best_score < 2.2:
        return "original"

    return best_label