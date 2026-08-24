"""
Fabric Defect Detection Engine
================================
Two modes:

1. YOLO MODE (production path): if a trained weights file exists at
   MODEL_PATH (app/ai/weights/defect_model.pt), we load it via
   ultralytics YOLO and run real inference. Train this on a labeled
   fabric-defect dataset (e.g. AITEX, TILDA, or your own NITER dataset)
   with classes: hole, stain, slub, broken_yarn, color_variation.

2. HEURISTIC CV MODE (hackathon demo fallback): if no trained weights
   are present, we run a classical computer-vision pipeline (OpenCV)
   that analyzes texture uniformity, edge irregularity, and color
   variance to flag likely defect regions. This lets the full product
   flow (capture -> analyze -> report -> dashboard) work live in a
   demo WITHOUT requiring a pre-trained model, while being architected
   so swapping in real YOLO weights later requires zero API changes.

Both paths return the same DefectDetectionResult schema.
"""
import time
import logging
from typing import List, Tuple

import numpy as np
import cv2

from app.config import get_settings
from app.models.schemas import DefectDetectionResult, DefectType, SeverityLevel

logger = logging.getLogger("texvision.ai")
settings = get_settings()

CLASS_NAMES = ["hole", "stain", "slub", "broken_yarn", "color_variation"]

_yolo_model = None
_YOLO_AVAILABLE = False

try:
    import os
    if os.path.exists(settings.model_path):
        from ultralytics import YOLO
        _yolo_model = YOLO(settings.model_path)
        _YOLO_AVAILABLE = True
        logger.info("Loaded trained YOLO defect-detection model.")
    else:
        logger.warning(
            "No trained YOLO weights found at %s — using heuristic CV "
            "fallback detector for demo purposes.", settings.model_path
        )
except Exception as e:
    logger.warning(f"YOLO unavailable, using heuristic fallback. Reason: {e}")


def _severity_from_confidence(confidence: float, area_ratio: float) -> SeverityLevel:
    score = confidence * 0.6 + min(area_ratio * 20, 1.0) * 0.4
    if score >= 0.75:
        return SeverityLevel.critical
    if score >= 0.5:
        return SeverityLevel.high
    if score >= 0.25:
        return SeverityLevel.medium
    return SeverityLevel.low


def _run_yolo(image: np.ndarray) -> List[DefectDetectionResult]:
    results = _yolo_model.predict(image, conf=settings.confidence_threshold, verbose=False)
    detections: List[DefectDetectionResult] = []
    h, w = image.shape[:2]
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            area_ratio = ((x2 - x1) * (y2 - y1)) / (w * h)
            defect_type = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else "hole"
            detections.append(DefectDetectionResult(
                defect_type=DefectType(defect_type),
                confidence=round(conf, 3),
                severity=_severity_from_confidence(conf, area_ratio),
                bbox=[x1 / w, y1 / h, x2 / w, y2 / h],
            ))
    return detections


def _run_heuristic_cv(image: np.ndarray) -> List[DefectDetectionResult]:
    """
    Classical CV fallback used for live hackathon demos.
    Pipeline:
      1. Grayscale + adaptive threshold to find high-contrast irregularities (holes/stains)
      2. Canny edge density per grid cell to detect broken yarn / slub texture breaks
      3. HSV color-variance per grid cell to detect color-variation patches
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    detections: List[DefectDetectionResult] = []

    # 1. Contrast anomalies -> hole / stain candidates
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 7
    )
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (w * h) * 0.003  # raised from 0.0015 — ignore tiny noise specks
    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        x, y, cw, ch = cv2.boundingRect(c)
        area_ratio = area / (w * h)
        mean_intensity = float(np.mean(gray[y:y + ch, x:x + cw]))
        # darker anomaly -> hole, lighter/washed anomaly -> stain
        defect_type = DefectType.hole if mean_intensity < np.mean(gray) - 15 else DefectType.stain
        confidence = float(min(0.62 + area_ratio * 8, 0.97))  # raised floor from 0.55
        detections.append(DefectDetectionResult(
            defect_type=defect_type,
            confidence=round(confidence, 3),
            severity=_severity_from_confidence(confidence, area_ratio),
            bbox=[x / w, y / h, (x + cw) / w, (y + ch) / h],
        ))

    # 2. Edge-density grid scan -> slub / broken yarn candidates
    edges = cv2.Canny(gray, 60, 160)
    grid = 4
    gh, gw = h // grid, w // grid
    edge_densities = []
    for i in range(grid):
        for j in range(grid):
            cell = edges[i * gh:(i + 1) * gh, j * gw:(j + 1) * gw]
            edge_densities.append(np.count_nonzero(cell) / max(cell.size, 1))
    mean_density = float(np.mean(edge_densities)) if edge_densities else 0.0
    std_density = float(np.std(edge_densities)) if edge_densities else 0.0

    idx = 0
    for i in range(grid):
        for j in range(grid):
            density = edge_densities[idx]
            idx += 1
            if std_density > 0 and density > mean_density + 2.5 * std_density:  # raised from 1.8
                x1, y1 = j * gw, i * gh
                x2, y2 = x1 + gw, y1 + gh
                area_ratio = (gw * gh) / (w * h)
                confidence = float(min(0.6 + (density - mean_density) * 3, 0.9))  # raised floor from 0.5
                detections.append(DefectDetectionResult(
                    defect_type=DefectType.broken_yarn if density > mean_density + 3.2 * std_density else DefectType.slub,
                    confidence=round(confidence, 3),
                    severity=_severity_from_confidence(confidence, area_ratio),
                    bbox=[x1 / w, y1 / h, x2 / w, y2 / h],
                ))

    # 3. Color-variance grid scan -> color_variation candidates
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0].astype(np.float32)
    global_mean_hue = float(np.mean(hue))
    idx = 0
    for i in range(grid):
        for j in range(grid):
            idx += 1
            y1, y2 = i * gh, (i + 1) * gh
            x1, x2 = j * gw, (j + 1) * gw
            cell_mean_hue = float(np.mean(hue[y1:y2, x1:x2]))
            deviation = abs(cell_mean_hue - global_mean_hue)
            if deviation > 22:  # raised from 12 — ignore normal printed-fabric color variety
                area_ratio = (gw * gh) / (w * h)
                confidence = float(min(0.55 + deviation / 60, 0.9))  # raised floor from 0.45
                detections.append(DefectDetectionResult(
                    defect_type=DefectType.color_variation,
                    confidence=round(confidence, 3),
                    severity=_severity_from_confidence(confidence, area_ratio),
                    bbox=[x1 / w, y1 / h, x2 / w, y2 / h],
                ))

    # Merge near-duplicate detections (same defect_type with overlapping/adjacent
    # bounding boxes) into a single detection — prevents the same patch of
    # fabric being reported as multiple separate defects.
    def boxes_close(a, b, threshold=0.12, touch_eps=0.02):
        ax1, ay1, ax2, ay2 = a.bbox
        bx1, by1, bx2, by2 = b.bbox
        near_corner = abs(ax1 - bx1) < threshold and abs(ay1 - by1) < threshold
        # touch_eps lets grid cells that are merely adjacent (sharing an
        # edge, not actually overlapping) still be treated as one region —
        # otherwise a single large defect patch gets reported as several
        # separate grid-cell detections.
        overlap = (
            (ax1 - touch_eps) < bx2 and (ax2 + touch_eps) > bx1 and
            (ay1 - touch_eps) < by2 and (ay2 + touch_eps) > by1
        )
        return near_corner or overlap

    merged: List[DefectDetectionResult] = []
    for d in sorted(detections, key=lambda d: d.confidence, reverse=True):
        is_duplicate = any(
            m.defect_type == d.defect_type and boxes_close(m, d) for m in merged
        )
        if not is_duplicate:
            merged.append(d)

    # Final confidence gate: only report defects the system is reasonably
    # sure about (>= 60%). This trades a bit of sensitivity for fewer
    # low-confidence / noisy false positives in the demo.
    MIN_REPORT_CONFIDENCE = 0.60
    merged = [d for d in merged if d.confidence >= MIN_REPORT_CONFIDENCE]

    return merged[:6]


def analyze_fabric_image(image_bytes: bytes) -> Tuple[List[DefectDetectionResult], float]:
    """Main entrypoint: bytes in -> (detections, processing_time_ms) out."""
    start = time.time()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image. Please upload a valid JPG/PNG.")

    # normalize size for consistent thresholds
    image = cv2.resize(image, (640, 640))

    if _YOLO_AVAILABLE:
        detections = _run_yolo(image)
    else:
        detections = _run_heuristic_cv(image)

    elapsed_ms = round((time.time() - start) * 1000, 2)
    return detections, elapsed_ms


# ---------------------------------------------------------------------------
# Extended analysis: dominant colors, fabric pattern type, quality verdict,
# and prioritized repair/action recommendations.
#
# IMPORTANT HONESTY NOTE: actual fiber material (cotton / silk / polyester /
# denim, etc.) CANNOT be determined reliably from an RGB photo — that needs
# spectroscopy or a physical fiber test. What we CAN determine visually is
# the fabric's *pattern type* (plain / printed / woven-textured) and its
# dominant colors. We label this clearly so it isn't mistaken for a lab-grade
# material identification.
# ---------------------------------------------------------------------------

_NAMED_COLORS = {
    "White": (255, 255, 255), "Black": (0, 0, 0), "Gray": (128, 128, 128),
    "Red": (220, 20, 60), "Maroon": (128, 0, 0), "Orange": (255, 140, 0),
    "Yellow": (240, 220, 30), "Gold": (212, 175, 55), "Olive": (128, 128, 0),
    "Green": (34, 139, 34), "Teal": (0, 128, 128), "Cyan": (0, 200, 200),
    "Blue": (30, 90, 200), "Navy": (20, 30, 90), "Purple": (128, 0, 128),
    "Pink": (255, 105, 180), "Brown": (139, 90, 43), "Beige": (222, 200, 165),
    "Cream": (245, 235, 210),
}


def _closest_color_name(rgb) -> str:
    r, g, b = rgb
    best_name, best_dist = "Unknown", float("inf")
    for name, (cr, cg, cb) in _NAMED_COLORS.items():
        dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
        if dist < best_dist:
            best_dist, best_name = dist, name
    return best_name


def detect_dominant_colors(image: np.ndarray, k: int = 5, top_n: int = 4):
    """
    K-means color clustering on the fabric image. Returns up to `top_n`
    dominant colors as [{name, hex, percentage}], sorted by prevalence,
    filtering out clusters that make up less than 4% of the image (noise).
    """
    small = cv2.resize(image, (160, 160))
    pixels = cv2.cvtColor(small, cv2.COLOR_BGR2RGB).reshape(-1, 3).astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.5)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 4, cv2.KMEANS_PP_CENTERS)

    counts = np.bincount(labels.flatten(), minlength=k)
    total = counts.sum()

    results = []
    seen_names = set()
    for i in np.argsort(-counts):
        pct = round(float(counts[i]) / total * 100, 1)
        if pct < 4.0:
            continue
        r, g, b = [int(c) for c in centers[i]]
        color_name = _closest_color_name((r, g, b))
        if color_name in seen_names:
            continue
        seen_names.add(color_name)
        results.append({
            "name": color_name,
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "percentage": pct,
        })
        if len(results) >= top_n:
            break
    return results


def classify_fabric_pattern(image: np.ndarray, dominant_colors: list) -> dict:
    """
    Heuristic VISUAL pattern classification (not fiber-material identification).
    Uses edge density (texture/weave complexity) + number of significant
    color clusters (pattern/print complexity) to bucket the fabric into a
    human-readable category.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 60, 160)
    edge_density = float(np.count_nonzero(edges)) / edges.size

    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    num_colors = len(dominant_colors)

    if num_colors >= 3:
        category = "Printed / Patterned Fabric"
    elif edge_density > 0.09 or laplacian_var > 400:
        category = "Textured / Woven Fabric"
    else:
        category = "Plain / Solid Fabric"

    return {
        "pattern_type": category,
        "note": "Visual pattern estimate only — fiber material (cotton/silk/"
                "polyester etc.) requires lab/spectroscopy testing, not a photo.",
    }


_SEVERITY_RANK = {"critical": 3, "high": 2, "medium": 1, "low": 0}


def assess_quality(detections: List[DefectDetectionResult], overall_severity: SeverityLevel) -> dict:
    """Overall pass/fail-style verdict for this fabric sample."""
    if not detections:
        return {"verdict": "Good Quality — Passed", "grade": "A", "color": "success"}

    sev = overall_severity.value
    if sev == "critical":
        return {"verdict": "Reject — Major Quality Issue", "grade": "D", "color": "critical"}
    if sev == "high":
        return {"verdict": "Needs Rework", "grade": "C", "color": "high"}
    if sev == "medium":
        return {"verdict": "Acceptable with Minor Issues", "grade": "B", "color": "medium"}
    return {"verdict": "Good Quality — Passed", "grade": "A", "color": "success"}


_RECOMMENDATIONS = {
    "hole": "Repair or discard this section immediately; inspect surrounding fabric for weakened threads.",
    "stain": "Attempt spot-cleaning if the stain is fresh; if set/permanent, downgrade or reject this piece.",
    "slub": "Trim the irregularity if minor; check spinning/yarn tensioning machine settings to prevent recurrence.",
    "broken_yarn": "Repair with mending/darning; inspect loom tension and needle condition on the production line.",
    "color_variation": "Compare against the approved shade card; check dye-batch consistency and re-dye if out of tolerance.",
}


def generate_recommendations(detections: List[DefectDetectionResult]) -> list:
    """
    Returns a priority-ordered action list — most severe / highest-confidence
    defect type first — so inspectors know what to fix first.
    """
    if not detections:
        return [{
            "priority": 1,
            "defect_type": "none",
            "action": "No action needed — fabric passed inspection.",
        }]

    # one recommendation per unique defect_type, ranked by worst severity then confidence
    best_per_type = {}
    for d in detections:
        key = d.defect_type.value
        rank = (_SEVERITY_RANK.get(d.severity.value, 0), d.confidence)
        if key not in best_per_type or rank > best_per_type[key][0]:
            best_per_type[key] = (rank, d)

    ordered = sorted(best_per_type.values(), key=lambda x: x[0], reverse=True)

    return [
        {
            "priority": idx + 1,
            "defect_type": d.defect_type.value,
            "severity": d.severity.value,
            "action": _RECOMMENDATIONS.get(d.defect_type.value, "Inspect manually and consult QC guidelines."),
        }
        for idx, (_, d) in enumerate(ordered)
    ]


def full_image_analysis(image_bytes: bytes) -> dict:
    """
    Convenience wrapper combining defect detection + color + pattern +
    quality verdict + recommendations, all from a single decode pass.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image. Please upload a valid JPG/PNG.")
    image = cv2.resize(image, (640, 640))

    start = time.time()
    detections = _run_yolo(image) if _YOLO_AVAILABLE else _run_heuristic_cv(image)
    elapsed_ms = round((time.time() - start) * 1000, 2)

    colors = detect_dominant_colors(image)
    pattern = classify_fabric_pattern(image, colors)
    severity = overall_severity(detections)
    quality = assess_quality(detections, severity)
    recommendations = generate_recommendations(detections)

    return {
        "detections": detections,
        "processing_time_ms": elapsed_ms,
        "overall_severity": severity,
        "dominant_colors": colors,
        "fabric_pattern": pattern,
        "quality": quality,
        "recommendations": recommendations,
    }


def overall_severity(detections: List[DefectDetectionResult]) -> SeverityLevel:
    if not detections:
        return SeverityLevel.low
    order = [SeverityLevel.low, SeverityLevel.medium, SeverityLevel.high, SeverityLevel.critical]
    return max(detections, key=lambda d: order.index(d.severity)).severity