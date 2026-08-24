# 🔍 TexVision — AI Fabric Defect Detection System

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React Native">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV">
  <img src="https://img.shields.io/badge/YOLOv8-FF6600?style=for-the-badge&logo=yolo&logoColor=white" alt="YOLO">
</p>

<p align="center">
  <strong>🏭 NITER Innovate Hackathon 2026</strong><br>
  AI-powered fabric defect detection system for textile & RMG factories
</p>

---

## 📖 About TexVision

TexVision is an **AI-powered fabric defect detection system** that helps textile and Ready-Made Garment (RMG) factories:

- ✅ **Reduce fabric defects** with instant AI analysis
- ✅ **Improve quality control** with real-time detection
- ✅ **Cut wastage** by identifying defects early
- ✅ **Get production analytics** via a beautiful mobile dashboard

Inspectors can **capture fabric images** using a mobile app and get **instant AI-powered defect analysis** — no manual inspection needed!

---

## 🌟 Features

### 📱 Mobile App (React Native / Expo)

| Feature | Description |
|---------|-------------|
| 🔐 **Role-Based Login** | Inspector, Manager, Admin roles |
| 📷 **Image Capture** | Take photos or upload from gallery |
| 🤖 **AI Defect Detection** | Real-time analysis with bounding boxes |
| 📊 **Defect Classification** | Hole, Stain, Slub, Broken Yarn, Color Variation |
| 🎯 **Severity Grading** | Critical, High, Medium, Low |
| 📈 **Dashboard** | Production stats, defect trends, waste estimates |
| 🔔 **Notifications** | Alerts for critical defects |
| 🌙 **Dark Mode** | Beautiful green/white Material Design |

### 🖥️ Backend API (FastAPI)

| Feature | Description |
|---------|-------------|
| 🚀 **REST API** | Fast, async endpoints |
| 🔑 **JWT Authentication** | Secure token-based auth |
| 🛡️ **RBAC** | Role-Based Access Control |
| 📸 **Image Processing** | OpenCV + YOLO/CNN detection |
| 📊 **Analytics** | Defect statistics, trends, reports |
| 🔄 **Inspection Workflow** | Submit → Review → Approve/Reject → Reinspect |
| 📝 **Audit Trail** | Complete activity logging |
| 🏠 **Local Storage** | Works without Firebase (demo mode) |

---

## 🧠 AI Detection System

TexVision uses **two detection modes**:

### Mode 1: YOLO (Production) 🎯
- Requires trained model file: `backend/app/ai/weights/defect_model.pt`
- Uses **YOLOv8** for real-time object detection
- Best accuracy for production use

### Mode 2: Heuristic CV (Demo) 🔬
- **No model file needed** — works immediately!
- Uses classical computer vision:
  - **Adaptive Thresholding** → Detect holes/stains
  - **Canny Edge Detection** → Detect broken yarn/slub
  - **HSV Color Analysis** → Detect color variation
- Perfect for hackathon demos!

---

## 📂 Project Structure

```
TexVision2/
├── 📁 backend/                    # FastAPI Backend
│   ├── 📁 app/
│   │   ├── 📁 ai/                # AI Detection Engine
│   │   │   ├── defect_model.py   # YOLO + Heuristic CV
│   │   │   └── authenticity_check.py
│   │   ├── 📁 models/            # Pydantic Schemas
│   │   ├── 📁 routers/           # API Endpoints
│   │   │   ├── auth.py           # Login/Register
│   │   │   ├── inspection.py     # Fabric Inspection
│   │   │   ├── dashboard.py      # Analytics
│   │   │   └── admin.py          # Admin Panel
│   │   ├── 📁 utils/             # Helpers
│   │   ├── config.py             # Settings
│   │   └── main.py               # FastAPI Entry
│   ├── requirements.txt          # Python Dependencies
│   ├── .env                      # Environment Variables
│   └── Dockerfile                # Docker Setup
│
├── 📁 mobile/                     # React Native App
│   ├── 📁 screens/               # 9 Screens
│   ├── 📁 components/            # Reusable UI
│   ├── 📁 services/              # API Calls
│   ├── 📁 context/               # State Management
│   ├── 📁 navigation/            # React Navigation
│   ├── App.js                    # App Entry
│   └── package.json              # Dependencies
│
├── 📁 docs/                       # Documentation
│   ├── SETUP_GUIDE.md
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   └── ...
│
├── README.md                      # This File
├── IMPLEMENTATION_REPORT.md       # Project Report
├── TROUBLESHOOTING.md             # Common Issues
└── WORKFLOW_TESTING_GUIDE.md      # Testing Guide
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+**
- **Node.js 16+**
- **VS Code** (recommended)
- **Expo Go App** (for mobile testing)

### Step 1: Clone Repository
```bash
git clone https://github.com/shahedrayhan23/TexVision2.git
cd TexVision2
```

### Step 2: Setup Backend
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will run at:** `http://localhost:8000`
**API Docs:** `http://localhost:8000/docs`

### Step 3: Setup Mobile App
```bash
# Open new terminal
cd mobile

# Install dependencies
npm install

# Start Expo server
npx expo start

# Press 'w' for web mode
# Or scan QR code with Expo Go app
```

**Frontend will run at:** `http://localhost:19006`

---

## 👥 User Roles

### 🔍 Quality Inspector
- Capture/upload fabric images
- Get AI defect analysis
- View inspection history
- Submit for manager review

### 📊 Production Manager
- View dashboard with statistics
- See defect trends & analytics
- Approve/reject inspections
- Request rework if needed

### ⚙️ Admin
- Manage users & roles
- Configure production lines
- View complete audit trail
- System settings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native, Expo SDK 52, React Navigation |
| **Backend** | Python, FastAPI, Pydantic, JWT Auth |
| **AI/ML** | YOLOv8, OpenCV, NumPy |
| **Database** | Firebase Firestore + Local JSON Fallback |
| **Storage** | Firebase Storage + Local File Fallback |
| **Auth** | JWT Tokens, bcrypt Password Hashing |
| **Deployment** | Docker, EAS Build |

---

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get token |

### Inspection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload-image` | Upload fabric image |
| POST | `/api/predict-defect` | AI defect detection |
| GET | `/api/inspection-history` | View past inspections |
| GET | `/api/inspection/{id}` | Get inspection details |

### Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inspections/{id}/submit` | Submit for review |
| GET | `/api/inspections/pending/manager` | Manager queue |
| POST | `/api/inspections/{id}/decision` | Approve/Reject |
| POST | `/api/inspections/{id}/reinspect` | Start reinspection |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Production statistics |
| GET | `/api/dashboard/trends` | Defect trends |

---

## 🔧 Environment Variables

Create `.env` file in `backend/`:

```env
# Server
PORT=8000
HOST=0.0.0.0

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Firebase (Optional - works without it)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# AI Model (Optional - uses heuristic CV without it)
MODEL_PATH=app/ai/weights/defect_model.pt
CONFIDENCE_THRESHOLD=0.5

# Storage
LOCAL_STORAGE_DIR=uploads
```

---

## 🐳 Docker Setup

```bash
# Build image
docker build -t texvision-backend ./backend

# Run container
docker run -p 8000:8000 texvision-backend
```

---

## 📱 Mobile App Screens

1. **Login Screen** — Email/Password authentication
2. **Register Screen** — Create new account
3. **Home Screen** — Quick actions & recent inspections
4. **Capture Screen** — Camera/Gallery image selection
5. **Result Screen** — AI analysis with defect boxes
6. **History Screen** — Past inspections list
7. **Dashboard Screen** — Manager analytics
8. **Profile Screen** — User settings
9. **Admin Screen** — User management

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **NITER** — North International University for organizing the hackathon
- **Ultralytics** — For YOLOv8 framework
- **FastAPI** — For the amazing async framework
- **Expo** — For React Native tooling
- **OpenCV** — For computer vision utilities

---

## 📞 Contact

**MD. Shahed Rayhan**
- GitHub: [@shahedrayhan23](https://github.com/shahedrayhan23)
- Email: shahedrayhan23@gmail.com

---

<p align="center">
  Made with ❤️ for NITER Innovate Hackathon 2026
</p>
