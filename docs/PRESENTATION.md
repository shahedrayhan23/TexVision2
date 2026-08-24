# TexVision — Hackathon Presentation Content
**NITER Innovate Hackathon 2026**

Use this as a script/outline for slides. Suggested: 8–10 slides, 4–5 min pitch.

---

### Slide 1 — Title
**TexVision**
AI Fabric Defect Detection & Production Intelligence System
*Team [Your Team Name] · NITER Innovate Hackathon 2026*

---

### Slide 2 — The Problem
- Bangladesh's RMG industry contributes ~80% of national export earnings,
  yet fabric defect inspection is still largely **manual, slow, and
  inconsistent** between inspectors.
- Undetected defects (holes, stains, slubs, broken yarn, color variation)
  cause **costly downstream waste** — rejected garments, rework, and
  customer returns.
- Production managers lack **real-time visibility** into defect trends
  across lines, so problems are caught late.

---

### Slide 3 — Our Solution
TexVision is a mobile-first AI quality control system that lets any
inspector on the factory floor:
1. **Capture** a fabric image with their phone
2. Get **instant AI defect analysis** (type, confidence, severity)
3. Feed that data into a **live production dashboard** for managers —
   automatically surfacing trends and alerts like:
   *"Production Line 03 defect rate increased 25% compared to yesterday."*

---

### Slide 4 — Live Demo Flow
1. Inspector logs in → captures fabric photo
2. AI detects: Hole / Stain / Slub / Broken Yarn / Color Variation
   with confidence score + severity level
3. Result saved to inspection history instantly
4. Manager dashboard updates in real time: defect %, efficiency, waste
   estimate, 7-day trend chart, auto-generated alerts

*(Switch to live app on phone via Expo Go here)*

---

### Slide 5 — Tech Stack
| Layer | Technology |
|---|---|
| Mobile | Expo (React Native) SDK 52 |
| Backend | FastAPI (Python), JWT Auth |
| AI | YOLO/CNN computer vision — trainable, with a live OpenCV fallback pipeline |
| Database & Storage | Firebase (Firestore + Storage) |
| Deployment | Docker / Cloud Run / Render, EAS for mobile builds |

---

### Slide 6 — AI Engine Highlight
- Architected for a **trained YOLOv8 model** on labeled fabric-defect data
  (hole, stain, slub, broken yarn, color variation).
- Ships with a **classical CV fallback pipeline** (adaptive thresholding,
  edge-density scanning, color-variance analysis) so the *entire product
  works live today*, even before a large labeled dataset is collected —
  a practical bridge from prototype to production.
- Swapping in trained weights requires **zero API or app changes**.

---

### Slide 7 — Impact & Metrics
- Reduces defect-detection time from **minutes (manual) to seconds (AI)**
- Gives managers **real-time defect-rate and waste visibility** they
  currently don't have
- Standardizes inspection quality across shifts and inspectors
- Scalable to any factory: just add a production line + inspector accounts

---

### Slide 8 — Roadmap
- Train YOLOv8 on a NITER/RMG-sourced labeled defect dataset
- Add per-line camera integration for continuous (non-handheld) inspection
- Predictive maintenance alerts (defect-rate correlation with machine wear)
- Multi-factory / multi-tenant support for buying houses & compliance audits

---

### Slide 9 — Team & Ask
- [Team member names + roles]
- Ask: mentorship on dataset partnerships with local RMG factories, and
  compute credits for model training.

---

### Slide 10 — Thank You / Q&A
**TexVision** — Seeing quality before it becomes waste.
