# TexVision
### AI Fabric Defect Detection and Production Intelligence System
*Built for NITER Innovate Hackathon 2026*

TexVision helps textile/RMG factories reduce fabric defects, improve
quality control, cut wastage, and get real-time production analytics —
via a mobile app that lets inspectors capture fabric images and get
instant AI-powered defect analysis.

## ✅ Status: Fully working prototype, tested end-to-end
The backend has been run and verified locally (register → login → AI
predict-defect → inspection history → manager dashboard stats → RBAC
enforcement) before packaging this ZIP.

## Quick Start
See **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** for full instructions.

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# Mobile (in a second terminal)
cd mobile
npm install
npx expo start
# scan the QR code with Expo Go
```

Runs immediately in **local-demo mode** — no Firebase project or trained
AI model required. Swap in real Firebase credentials and a trained YOLO
model later without changing any code (see docs).

## Documentation

| Doc | Contents |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folder structure, request flow |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Firestore + local DB schema, security rules |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Full REST API reference |
| [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Local dev setup (VS Code + Expo Go) |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Backend + mobile deployment options |
| [PRESENTATION.md](docs/PRESENTATION.md) | Ready-to-use hackathon pitch content |

## Tech Stack
- **Mobile**: Expo (React Native) SDK 52, React Navigation
- **Backend**: FastAPI, JWT Auth, Pydantic
- **AI**: YOLO/CNN fabric defect detection (with a live OpenCV fallback
  pipeline so the demo works without a pre-trained model)
- **Database/Storage**: Firebase (Firestore + Storage), with an automatic
  local JSON DB + local file storage fallback for zero-setup demos
- **Deployment**: Docker, EAS Build

## Project Structure
```
texvision/
├── backend/     FastAPI REST API + AI defect engine
├── mobile/      Expo React Native app (9 screens, 3 roles)
└── docs/        Architecture, schema, API, setup, deployment, pitch
```

## Roles
- **Quality Inspector** — capture/upload fabric images, get AI analysis, view history
- **Production Manager** — dashboard, defect stats, trends, waste estimates, alerts
- **Admin** — manage users, factories, production lines
