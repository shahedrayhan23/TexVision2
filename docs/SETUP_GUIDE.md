# TexVision — Setup Guide (VS Code + Expo Go)

This gets the full system running locally in ~10 minutes with **zero
external accounts required** (runs in local-demo mode by default).

## Prerequisites

- Python 3.11+ 
- Node.js 18+ and npm
- [Expo Go](https://expo.dev/go) app installed on your phone (Android/iOS)
- VS Code (recommended) with Python + ES7 React extensions
- Your computer and phone on the **same Wi-Fi network**

---

## 1. Backend Setup

```bash
cd texvision/backend
python -m venv venv

# activate:
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
cp .env.example .env
```

> **Note on AI dependencies**: `torch` and `ultralytics` are large. If you
> only want to run the **heuristic CV fallback mode** (no trained model
> needed — perfect for the hackathon demo), you can skip them:
> ```bash
> pip install fastapi uvicorn[standard] python-multipart pydantic pydantic-settings \
>   firebase-admin python-jose[cryptography] bcrypt Pillow numpy opencv-python-headless \
>   python-dotenv aiofiles
> ```
> The app auto-detects missing YOLO weights and falls back to the CV pipeline —
> no code changes needed.

### Run the backend
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Visit `http://127.0.0.1:8000/docs` to see the interactive Swagger UI.

### (Optional) Enable real Firebase
1. Create a project at https://console.firebase.google.com
2. Enable **Firestore**, **Storage**, and **Authentication (Email/Password)**
3. Project Settings → Service Accounts → Generate new private key
4. Save the JSON as `backend/firebase-service-account.json`
5. Update `FIREBASE_STORAGE_BUCKET` in `.env`
6. Restart the backend — it will auto-detect the credentials file and switch
   from local-demo mode to live Firebase.

### (Optional) Enable real YOLO defect detection
1. Label a fabric-defect dataset (classes: `hole, stain, slub, broken_yarn, color_variation`)
   — public datasets like AITEX or TILDA are good starting points.
2. Train: `yolo train data=defects.yaml model=yolov8n.pt epochs=100`
3. Copy the resulting `best.pt` to `backend/app/ai/weights/defect_model.pt`
4. Restart the backend — it auto-detects the weights and switches from the
   CV heuristic fallback to real YOLO inference.

---

## 2. Mobile App Setup (Expo SDK 52)

```bash
cd texvision/mobile
npm install
```

### Point the app at your backend
Open `mobile/services/api.js` and set `API_BASE_URL` to your computer's
**LAN IP** (not `127.0.0.1` — your phone can't reach that):

```js
export const API_BASE_URL = "http://192.168.1.42:8000"; // your computer's IP
```

Find your IP:
- macOS/Linux: `ifconfig | grep inet`
- Windows: `ipconfig`

### Run
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone. The app will load
live — edits hot-reload instantly.

> Running in the **Android Emulator** instead of a physical device? Use
> `http://10.0.2.2:8000` as `API_BASE_URL`.
> Running in the **iOS Simulator**? Use `http://127.0.0.1:8000`.

---

## 3. Quick Smoke Test

1. Open the app → **Create account** → choose **Quality Inspector** → register.
2. Tap **New Fabric Inspection** → grant camera permission → capture any
   textured surface (a shirt, towel, or printed fabric pattern works great
   for a live demo of the CV fallback detector).
3. Tap **Analyze Fabric** → see AI results with defect badges.
4. Register a second account as **Production Manager** → view the
   dashboard with live stats, trend chart, and alerts.

You now have the full system running end-to-end.
