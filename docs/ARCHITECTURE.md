# TexVision — System Architecture

**AI Fabric Defect Detection and Production Intelligence System**
NITER Innovate Hackathon 2026

## 1. High-Level Overview

TexVision connects three layers:

```
┌─────────────────────────┐      HTTPS/REST      ┌──────────────────────────┐
│   Mobile App (Expo)      │ <──────────────────> │   FastAPI Backend         │
│  React Native SDK 52     │      JWT Auth          │   (Python)                │
│  - Inspector UI           │                        │  - Auth (JWT)             │
│  - Manager Dashboard      │                        │  - Inspection API         │
└─────────────────────────┘                        │  - Dashboard/Analytics    │
                                                      │  - AI Defect Engine       │
                                                      └───────────┬──────────────┘
                                                                  │
                                          ┌───────────────────────┼───────────────────────┐
                                          │                       │                        │
                                 ┌────────▼───────┐     ┌─────────▼────────┐    ┌──────────▼─────────┐
                                 │ Firebase Auth /  │     │ Firestore /       │    │ Firebase Storage /  │
                                 │ Local JWT (fallback)   │ Local JSON DB     │    │ Local disk (fallback)│
                                 └────────────────┘     └──────────────────┘    └─────────────────────┘
```

## 2. Component Responsibilities

### Mobile App (Expo React Native, SDK 52)
- Role-based UI: Inspector vs Production Manager
- Camera capture + gallery upload (`expo-camera`, `expo-image-picker`)
- Talks to backend over REST via `axios`
- JWT stored locally via `AsyncStorage`
- Charts rendered with `react-native-chart-kit`

### Backend (FastAPI)
- Stateless REST API, JWT-based authentication & RBAC
- Routers: `auth`, `inspection`, `dashboard`, `admin`
- AI inference triggered synchronously on `/api/predict-defect`
- Abstracted storage & database layers so Firebase can be swapped in
  without touching route/business logic

### AI Module
- **YOLO mode**: loads a trained `ultralytics.YOLO` model if weights are
  present at `app/ai/weights/defect_model.pt` — this is the production path.
- **Heuristic CV fallback mode**: if no trained weights exist (typical at
  hackathon time, before a dataset is fully labeled/trained), a classical
  OpenCV pipeline (adaptive thresholding, Canny edge-density grid scan,
  HSV color-variance scan) produces realistic bounding boxes + confidence
  + severity so the **full product flow works live in a demo**.
- Both paths return an identical schema — swapping in a trained model
  requires zero API or frontend changes.

### Data Layer
- **Primary design target: Firebase** (Firestore + Firebase Auth + Firebase Storage)
- **Local demo fallback**: a local JSON-file datastore (`app/utils/local_db.py`)
  with the exact same collection shape as Firestore, so the whole system
  runs end-to-end with zero cloud setup — ideal for offline hackathon judging.
  See `docs/DATABASE_SCHEMA.md` for the Firestore migration mapping.

## 3. Request Flow: Fabric Inspection

1. Inspector opens **Camera Upload Screen**, captures/selects a fabric image.
2. Image is POSTed as `multipart/form-data` to `POST /api/predict-defect`
   with `Authorization: Bearer <JWT>`.
3. Backend decodes the image, runs the AI defect engine.
4. Detected defects (type, confidence, severity, bbox) are returned and
   simultaneously persisted (`inspections` + `defects` collections).
5. Manager's **Dashboard** aggregates all inspections in real time:
   defect %, efficiency, waste estimate, 7-day trend, auto-generated alerts.

## 4. Folder Structure

```
texvision/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── config.py                # Settings (env vars)
│   │   ├── firebase_setup.py        # Firebase Admin SDK init (+ local fallback)
│   │   ├── models/schemas.py        # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── inspection.py
│   │   │   ├── dashboard.py
│   │   │   └── admin.py
│   │   ├── ai/
│   │   │   ├── defect_model.py      # YOLO + heuristic CV defect engine
│   │   │   └── weights/             # place trained .pt file here
│   │   └── utils/
│   │       ├── security.py          # JWT + bcrypt + RBAC
│   │       ├── storage.py           # Firebase Storage / local disk
│   │       └── local_db.py          # Local JSON DB fallback
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── mobile/
│   ├── App.js
│   ├── navigation/AppNavigator.js
│   ├── screens/                     # 9 screens (see below)
│   ├── components/                  # StatCard, DefectBadge
│   ├── context/AuthContext.js
│   ├── services/api.js
│   ├── theme/colors.js
│   └── package.json / app.json
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── API_DOCUMENTATION.md
    ├── SETUP_GUIDE.md
    ├── DEPLOYMENT_GUIDE.md
    └── PRESENTATION.md
```

## 5. Mobile Screens

| Screen | Purpose |
|---|---|
| SplashScreen | Auto-routes based on stored session |
| LoginScreen | Email/password login |
| RoleSelectScreen | Choose Inspector or Manager before registering |
| RegisterScreen | Account creation |
| InspectorDashboardScreen | Quick stats + recent inspections + "New Inspection" CTA |
| CameraUploadScreen | Live camera capture / gallery picker + AI analysis trigger |
| ResultScreen | Defect results with confidence & severity badges |
| HistoryScreen | Full inspection history list |
| ManagerDashboardScreen | Defect stats, trend line chart, breakdown bar chart, alerts |

## 6. Why This Architecture Wins a Hackathon

- **Runs with zero external setup** (local DB + heuristic CV fallback) —
  judges can run it instantly without a live Firebase project or trained model.
- **Production-realistic path is fully wired**: flipping to Firebase or a
  trained YOLO model is a config change, not a rewrite.
- **Clean separation of concerns** — frontend never talks to AI or DB directly,
  only through the REST API.
