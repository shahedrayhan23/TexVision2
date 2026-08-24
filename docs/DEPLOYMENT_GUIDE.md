# TexVision — Deployment Guide

## Backend Deployment

### Option A: Docker (recommended)
```bash
cd texvision/backend
docker build -t texvision-backend .
docker run -p 8000:8000 --env-file .env texvision-backend
```

### Option B: Render / Railway / Fly.io (fastest for hackathon judging)
1. Push `backend/` to a GitHub repo.
2. Create a new **Web Service** on Render (or Railway):
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables from `.env.example` in the dashboard.
4. If using Firebase, upload `firebase-service-account.json` as a secret
   file, or base64-encode it into an env var and decode on startup.
5. Once deployed, note the public URL (e.g. `https://texvision-api.onrender.com`).

### Option C: Google Cloud Run (natural fit alongside Firebase)
```bash
gcloud builds submit --tag gcr.io/<project-id>/texvision-backend
gcloud run deploy texvision-backend \
  --image gcr.io/<project-id>/texvision-backend \
  --platform managed --allow-unauthenticated --port 8000
```

> **CORS**: `main.py` currently allows `*` origins for demo convenience.
> Restrict `allow_origins` to your deployed frontend's domain before any
> real production use.

---

## Mobile App Deployment

### For hackathon demo day (fastest)
Just run `npx expo start` and have judges scan the QR code with Expo Go —
no build/publish step needed. Update `API_BASE_URL` in `services/api.js`
to your deployed backend URL (from above) so it works over the internet,
not just LAN.

### For a shareable build (EAS)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```
This produces an installable `.apk`/`.aab` you can share via a link —
no Play Store submission needed for a hackathon demo.

### Production app store release
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android
eas submit --platform ios
```

---

## Environment Checklist Before Going Live

- [ ] Set a strong, unique `SECRET_KEY` in backend `.env`
- [ ] Restrict CORS `allow_origins` to real frontend domain(s)
- [ ] Switch from local JSON DB to live Firebase (`firebase-service-account.json`)
- [ ] Replace heuristic CV fallback with a trained YOLO model for real accuracy
- [ ] Enable HTTPS (automatic on Render/Cloud Run/EAS-hosted backends)
- [ ] Set `API_BASE_URL` in the mobile app to the deployed backend's HTTPS URL
- [ ] Add rate limiting / request size limits on `/api/predict-defect`
- [ ] Set up automated backups if using Firestore in production
