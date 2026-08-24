# TexVision — API Documentation

Base URL (local dev): `http://127.0.0.1:8000`
Interactive Swagger docs auto-generated at: `GET /docs` (and ReDoc at `/redoc`)

All protected routes require header:
```
Authorization: Bearer <JWT access_token>
```

---

## Authentication

### `POST /api/auth/register`
Register a new user.

**Body**
```json
{
  "name": "Rahim Uddin",
  "email": "inspector@texvision.com",
  "password": "test1234",
  "role": "inspector",
  "factory_id": null
}
```
`role` ∈ `inspector | manager | admin`

**Response `200`**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "name": "...", "email": "...", "role": "inspector" }
}
```

### `POST /api/auth/login`
**Body**: `{ "email": "...", "password": "..." }`
**Response**: same shape as register.

### `GET /api/auth/me`
Returns the current authenticated user's profile.

---

## Fabric Inspection

### `POST /api/upload-image`
Uploads a raw image only (no AI analysis). `multipart/form-data`, field `file`.
**Response**: `{ "image_url": "..." }`

### `POST /api/predict-defect`  ⭐ Core AI endpoint
`multipart/form-data`
- `file`: image (jpg/png)
- `production_line_id` (optional form field)

**Response `200`**
```json
{
  "inspection_id": "a3fe55bb-...",
  "image_url": "/static/uploads/fabric_205a80f9.jpg",
  "defects": [
    {
      "defect_type": "hole",
      "confidence": 0.706,
      "severity": "high",
      "bbox": [0.70, 0.15, 0.86, 0.28]
    }
  ],
  "overall_severity": "critical",
  "defect_free": false,
  "processing_time_ms": 103.99
}
```

### `GET /api/inspection-history?limit=50`
Inspectors receive only their own history; managers/admins receive all.
**Response**: `{ "count": N, "inspections": [ ... ] }`

### `GET /api/inspection/{inspection_id}`
Fetch a single inspection record.

---

## Dashboard & Reports  (role: `manager`, `admin` only)

### `GET /api/statistics`
```json
{
  "total_inspected": 128,
  "total_defects": 47,
  "defect_percentage": 18.5,
  "production_efficiency": 81.5,
  "estimated_waste_percentage": 11.1,
  "defect_breakdown": { "hole": 12, "stain": 9, "slub": 14, "broken_yarn": 5, "color_variation": 7 },
  "trend_last_7_days": [ { "date": "2026-08-08", "inspected": 12, "defects": 3 }, ... ],
  "alerts": [
    "Production Line 03 defect rate increased 25% compared to yesterday.",
    "Most frequent defect: slub (14 occurrences)."
  ]
}
```

### `GET /api/reports`
List previously generated report snapshots.

### `POST /api/reports/generate`
Generates and stores a new report snapshot from current statistics.

---

## Admin  (role: `admin` only, unless noted)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/{user_id}` | Delete a user |
| PATCH | `/api/admin/users/{user_id}/role?role=manager` | Change a user's role |
| POST | `/api/admin/factories` | Create a factory |
| GET | `/api/admin/factories` | List factories (any authenticated role) |
| POST | `/api/admin/production-lines` | Create a production line (admin or manager) |
| GET | `/api/admin/production-lines` | List production lines (any authenticated role) |

---

## Error Format

All errors follow FastAPI's standard shape:
```json
{ "detail": "human readable message" }
```
Common status codes: `400` validation, `401` missing/invalid token, `403` insufficient role, `404` not found.

## Defect Taxonomy

| Type | Description |
|---|---|
| `hole` | Physical puncture/tear in fabric |
| `stain` | Discoloration/contamination patch |
| `slub` | Yarn thickness irregularity/knot |
| `broken_yarn` | Broken or missing yarn strand |
| `color_variation` | Localized shade/hue inconsistency |

Severity is derived from a weighted combination of AI confidence and
defect area ratio: `low → medium → high → critical`.
