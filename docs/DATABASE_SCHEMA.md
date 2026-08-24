# TexVision — Database Schema

Two equivalent representations are provided:
1. **Firestore (NoSQL)** — the target production schema, since the project uses Firebase.
2. **Local JSON DB** — the exact same shape, used automatically when no
   Firebase credentials are configured (see `backend/app/utils/local_db.py`).

Both share identical collection names and field names, so migrating from
local-demo mode to live Firebase requires no data-model changes.

---

## Collection: `users`

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| name | string | |
| email | string | Unique |
| password_hash | string | bcrypt hash (only used in local-demo mode; Firebase Auth handles this natively in production) |
| role | enum | `inspector` \| `manager` \| `admin` |
| factory_id | string \| null | FK → `factories.id` |
| created_at | timestamp | |

## Collection: `factories`

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| name | string | |
| location | string \| null | |
| created_at | timestamp | |

## Collection: `production_lines`

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| factory_id | string | FK → `factories.id` |
| name | string | e.g. "Line 03" |
| capacity_per_day | number \| null | |
| created_at | timestamp | |

## Collection: `inspections`

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| inspector_id | string | FK → `users.id` |
| production_line_id | string \| null | FK → `production_lines.id` |
| image_url | string | Firebase Storage public URL / local static path |
| defects | array\<object\> | Embedded snapshot of detected defects (denormalized for fast reads) |
| overall_severity | enum | `low` \| `medium` \| `high` \| `critical` |
| defect_free | boolean | |
| created_at | timestamp | |

`defects[]` embedded object shape:
```json
{
  "defect_type": "hole | stain | slub | broken_yarn | color_variation",
  "confidence": 0.0,
  "severity": "low | medium | high | critical",
  "bbox": [x1, y1, x2, y2]
}
```

## Collection: `defects` (normalized, for analytics queries)

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| inspection_id | string | FK → `inspections.id` |
| production_line_id | string \| null | FK → `production_lines.id` |
| defect_type | enum | hole / stain / slub / broken_yarn / color_variation |
| confidence | float | 0.0 – 1.0 |
| severity | enum | low / medium / high / critical |
| created_at | timestamp | |

> Why both embedded (`inspections.defects`) and normalized (`defects` collection)?
> Embedded data gives O(1) reads for the Result screen; the normalized
> collection lets the dashboard run cheap aggregate queries (defect
> breakdown, trend-by-line) without scanning every inspection document —
> a standard Firestore denormalization pattern.

## Collection: `reports`

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| generated_by | string | FK → `users.id` |
| summary | object | Snapshot of `DashboardStats` at generation time |
| created_at | timestamp | |

---

## Firestore Security Rules (starter)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function role() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && (request.auth.uid == userId || role() == 'admin');
    }
    match /inspections/{id} {
      allow create: if isSignedIn() && role() in ['inspector'];
      allow read: if isSignedIn();
    }
    match /defects/{id} {
      allow read: if isSignedIn() && role() in ['manager', 'admin'];
    }
    match /factories/{id} {
      allow write: if isSignedIn() && role() == 'admin';
      allow read: if isSignedIn();
    }
    match /production_lines/{id} {
      allow write: if isSignedIn() && role() in ['admin', 'manager'];
      allow read: if isSignedIn();
    }
    match /reports/{id} {
      allow read, write: if isSignedIn() && role() in ['manager', 'admin'];
    }
  }
}
```

## Entity Relationship Summary

```
factories 1───* production_lines
factories 1───* users
users     1───* inspections
production_lines 1───* inspections
inspections 1───* defects  (also embedded on inspections.defects)
users     1───* reports
```
