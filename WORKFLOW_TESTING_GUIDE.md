# TexVision AI Quality Decision & Approval Workflow - Testing Guide

## Quick Start

### Backend Setup

1. **Install Dependencies** (if not already installed):
```bash
cd backend
pip install -r requirements.txt
```

2. **Start Backend Server**:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will initialize with demo data stored in `local_data.json`.

### Frontend Setup

1. **Install Dependencies** (if not already installed):
```bash
cd mobile
npm install
# or
yarn install
```

2. **Start Expo Development Server**:
```bash
cd mobile
npx expo start -c
```

3. **Run on Emulator or Physical Device**:
- Follow Expo prompts to run on Android/iOS emulator or scan QR code for physical device

## Complete Test Scenario: Approve for Production

### Step 1: Inspector Workflow - Create Inspection

1. Open app and login as **Quality Inspector**
   - Email: `inspector@example.com` (register if needed with role: inspector)
   - Password: any 6+ character password

2. On Inspector Dashboard:
   - Tap "New Fabric Inspection" button
   - Select "Upload Image" or "Capture Photo"
   - Choose or take a fabric image

3. App uploads image and performs AI analysis:
   - AI defect detection runs automatically
   - Results show:
     - Detected defects (if any)
     - Severity level (low/medium/high/critical)
     - Confidence scores
     - AI recommendation (approve/rework/reject)
     - Quality verdict
     - Recommended actions

4. On Result Screen:
   - Review all AI analysis details
   - Scroll through defects list, colors, pattern analysis
   - Tap "Submit for Manager Review" button
   - Status changes to `pending_manager_review`

### Step 2: Manager Workflow - Review & Approve

1. Logout from inspector account

2. Login as **Project Manager**
   - Email: `manager@example.com` (register if needed with role: manager)
   - Password: any 6+ character password

3. On Manager Dashboard:
   - See "Pending Reviews" card with count badge
   - See workflow summary (rework, approved, rejected counts)
   - Tap the pending reviews card

4. On Manager Pending List:
   - See inspection card from inspector
   - See fabric image thumbnail
   - See severity badge (red/orange/yellow/green)
   - See defect count and AI recommendation
   - Tap inspection to view details

5. On Manager Review Screen:
   - **Inspection Summary** section:
     - Batch ID
     - Inspector name
     - Date/time
     - Current status
   
   - **Fabric Image** section:
     - Original uploaded fabric image
   
   - **AI Analysis** section:
     - Severity (CRITICAL/HIGH/MEDIUM/LOW)
     - Defect count
     - Affected area percentage
     - Confidence percentage
     - AI Recommendation (in different color: green=approve, yellow=rework, red=reject)
     - AI explanation of recommendation
   
   - **Detected Defects** section (if any):
     - Each defect with:
       - Type (hole, stain, slub, broken_yarn, color_variation)
       - Severity level
       - Confidence score
   
   - **Before/After Comparison** (only if this is a reinspection):
     - Can view comparison of metrics with previous inspection
   
   - **Audit Trail** button:
     - View complete history of all actions on this inspection
   
   - **Make Decision** button:
     - Opens decision modal

6. Tap "Make Decision":
   - Modal appears with 3 options:
     - APPROVED (green)
     - REWORK (yellow)
     - REJECTED (red)
   
   - Select "APPROVED"
   - Add decision reason: "Defects are within acceptable tolerance"
   - Tap "Submit"
   - Success message appears
   - Status changes to `approved_for_production`

### Step 3: Verify Completion

1. Go back to Manager Dashboard:
   - Pending count decreases by 1
   - Approved for production count increases by 1
   - Inspection no longer in pending list

2. Logout and login as inspector:
   - Navigate to History
   - See the inspection with status `approved_for_production`
   - Manager decision visible with reason

## Alternative Test Scenario: Send for Rework

### Steps 1-5: Same as above (Inspector submits, Manager reviews)

### Step 6 (Modified): Send for Rework Decision

1. On Manager Review Screen, tap "Make Decision"
2. Select "REWORK" button
3. Add reason: "Minor defects detected, send for rework before production"
4. Tap "Submit"
5. Status changes to `rework_required`, then `reinspection_required`

### Step 7: Inspector Reinspection

1. Login as inspector
2. Go to History or Dashboard
3. Find the inspection with status `reinspection_required`
4. Tap inspection and look for "View Before/After Comparison" button
5. Or create a new fabric inspection (same fabric after rework)
6. New inspection will be linked to parent
7. Can see comparison of:
   - Before severity vs After severity
   - Before defects vs After defects
   - Before affected area vs After affected area
8. Submit new inspection for manager review

### Step 8: Manager Final Decision

1. Login as manager
2. See new pending inspection (reinspection)
3. Can view "Before/After Comparison" to see improvement
4. Make final decision (approve, rework again, or reject)
5. Audit trail shows complete history of both inspections

## Alternative Test Scenario: Reject

1. Follow Steps 1-5: Inspector submits, Manager reviews
2. On Manager Review Screen, tap "Make Decision"
3. Select "REJECTED" button
4. Add reason: "Critical defects found - fabric must be scrapped"
5. Tap "Submit"
6. Status changes to `rejected`
7. Inspection closed, cannot be reinspected

## Audit Trail Test

1. After completing any action on an inspection:
2. On Inspector or Manager review screen
3. Tap "View Audit Trail"
4. See timeline of all actions:
   - "Image uploaded and AI analysis completed" by inspector
   - "Inspection submitted for manager review" by inspector
   - "Manager decision: approved" by manager
   - Each with timestamp and decision reason (if applicable)
5. Chronologically ordered from oldest to newest

## API Testing with cURL

```bash
# Get all pending inspections for manager
curl -H "Authorization: Bearer {TOKEN}" http://localhost:8000/api/inspections/pending/manager

# Submit manager decision
curl -X POST -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"decision":"approved","reason":"Defects within tolerance"}' \
  http://localhost:8000/api/inspections/{INSPECTION_ID}/decision

# Get audit trail
curl -H "Authorization: Bearer {TOKEN}" \
  http://localhost:8000/api/inspections/{INSPECTION_ID}/audit-trail

# Get workflow status
curl -H "Authorization: Bearer {TOKEN}" \
  http://localhost:8000/api/workflow-status

# Start reinspection
curl -X POST -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Fabric reworked, ready for re-inspection"}' \
  http://localhost:8000/api/inspections/{INSPECTION_ID}/reinspect
```

## Authorization Testing

### Test 1: Inspector Cannot Approve
1. As inspector, try to call:
   ```bash
   curl -X POST -H "Authorization: Bearer {INSPECTOR_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"decision":"approved","reason":"OK"}' \
     http://localhost:8000/api/inspections/{ID}/decision
   ```
2. Expected: 403 Forbidden error (requires manager role)

### Test 2: Inspector Cannot Access Manager Endpoints
1. Try to access manager pending list:
   ```bash
   curl -H "Authorization: Bearer {INSPECTOR_TOKEN}" \
     http://localhost:8000/api/inspections/pending/manager
   ```
2. Expected: 403 Forbidden error

### Test 3: Cannot Submit Another Inspector's Inspection
1. As Inspector A, create and start inspection submission
2. Logout and login as Inspector B
3. Try to submit Inspector A's inspection:
   ```bash
   curl -X POST -H "Authorization: Bearer {INSPECTOR_B_TOKEN}" \
     http://localhost:8000/api/inspections/{INSPECTOR_A_INSPECTION_ID}/submit
   ```
4. Expected: 403 Forbidden error

## Data Verification

### Check local_data.json

The local database file at `backend/local_data.json` stores all data. You can inspect it to verify:

```json
{
  "users": [
    {
      "id": "...",
      "name": "John Inspector",
      "email": "inspector@example.com",
      "role": "inspector",
      ...
    }
  ],
  "inspections": [
    {
      "id": "...",
      "inspector_id": "...",
      "status": "approved_for_production",
      "overall_severity": "low",
      "defects": [...],
      "ai_recommendation": "approve",
      "manager_decision": "approved",
      "decided_by": "manager_id",
      "decided_at": "2026-...",
      ...
    }
  ],
  "audit_logs": [
    {
      "inspection_id": "...",
      "action": "Inspection submitted for manager review",
      "user_name": "John Inspector",
      "user_role": "inspector",
      "timestamp": "2026-...",
      "note": null
    }
  ]
}
```

## Troubleshooting

### Backend Won't Start
1. Ensure all dependencies installed: `pip install -r requirements.txt`
2. Check port 8000 is not in use: `netstat -ano | findstr :8000`
3. Verify PYTHONPATH: `echo $env:PYTHONPATH`

### App Won't Connect to Backend
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify API_BASE_URL in `mobile/services/api.js` is correct
3. On emulator, use `10.0.2.2:8000` instead of `localhost:8000`
4. On physical device, use local network IP (e.g., `http://192.168.x.x:8000`)

### Inspection Won't Submit
1. Verify status is `inspector_review`: Check in local_data.json
2. Verify no errors in browser console
3. Check backend logs for validation errors
4. Ensure user role is "inspector"

### Manager Can't See Inspection
1. Verify inspection status is `pending_manager_review`
2. Verify manager is logged in with role="manager"
3. Refresh the page
4. Check backend logs

## Success Criteria Checklist

- [x] Inspector can create fabric inspection
- [x] AI analysis runs and generates recommendation
- [x] Inspector can submit for manager review
- [x] Inspection status changes through workflow
- [x] Manager can see pending inspections
- [x] Manager can view full AI analysis details
- [x] Manager can make decisions (approve/rework/reject)
- [x] Audit trail records all actions
- [x] Before/after comparison works for reinspections
- [x] Role-based authorization enforced on backend
- [x] Inspector cannot approve production
- [x] Manager cannot bypass decision workflow
- [x] All existing TexVision features still work
