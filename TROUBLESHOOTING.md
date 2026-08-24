# Troubleshooting: "Could not load dashboard data" Error

## What This Error Means

The error "Could not load dashboard data" appears when:
1. The app tried to load the Manager Dashboard
2. The API call to `/api/statistics` failed
3. This usually happens because:
   - Wrong user role (Inspector instead of Manager)
   - Invalid login credentials
   - Connection issue between phone and backend
   - Backend not responding

---

## Quick Fix (Try This First)

### **Step 1: Make Sure You're Logged In As a MANAGER**

The Manager Dashboard only works for **Project Managers**, not Inspectors.

**Available Manager Accounts:**
- `nafis@gmail.com`
- `refat@gmail.com`

**Available Inspector Accounts (for testing inspection workflow):**
- `rafi@gmail.com`
- `qwert@gmail.com`

### **Step 2: Check Your Login Credentials**

1. On the app login screen, enter:
   - **Email**: `nafis@gmail.com` (or `refat@gmail.com`)
   - **Password**: Whatever password you set when creating the account

2. If you don't remember the password:
   - Tap "New here? Create an account"
   - Register a new manager account
   - Choose **role = "manager"**
   - Use those credentials to login

### **Step 3: Verify Backend Connection**

Check if your phone can reach the backend server:

1. **Check Your Backend is Running:**
   - Open terminal where backend runs
   - Should see: "Uvicorn running on 0.0.0.0:8000"
   - If not, run: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

2. **Verify Your IP Address:**
   - Your computer IP is: `192.168.0.103`
   - This is configured in `mobile/services/api.js` as `API_BASE_URL`
   - Your phone needs to be on the same WiFi network as your computer

3. **Test Connection from Phone:**
   - Open a browser on your phone
   - Navigate to: `http://192.168.0.103:8000/docs`
   - You should see the API documentation (Swagger UI)
   - If this doesn't load, your phone can't reach the backend

---

## Detailed Troubleshooting Steps

### Issue 1: Phone Can't Reach Backend

**Symptoms:**
- Backend is running on your computer
- Phone shows "Could not load dashboard data"
- Opening `http://192.168.0.103:8000/docs` in phone browser fails

**Solutions:**

1. **Check WiFi Connection:**
   - Ensure phone and computer are on the **same WiFi network**
   - Not on phone hotspot, not on different networks

2. **Check Firewall:**
   - Windows Firewall might be blocking port 8000
   - Open Windows Defender Firewall with Advanced Security
   - Create an inbound rule allowing port 8000 for Python/Uvicorn

3. **Update API URL if Needed:**
   - If you have multiple network adapters, the IP might be different
   - On your computer, run: `ipconfig | findstr "IPv4"`
   - Use the correct IP in the app

4. **Test Backend Directly:**
   - On your computer terminal:
     ```bash
     curl http://localhost:8000/api/statistics
     ```
   - Should show error: `{"detail":"Not authenticated"}` (that's OK)
   - If backend doesn't respond, it's not running

### Issue 2: Logging In With Wrong Role

**Symptoms:**
- Login seems to work
- Dashboard loads but shows "Could not load dashboard data"
- Inspector tries to access Manager Dashboard

**Solution:**
- Make sure you're using a **MANAGER** account, not an inspector
- Available managers: `nafis@gmail.com`, `refat@gmail.com`
- If you login as inspector, you'll go to Inspector Dashboard (different screen)

### Issue 3: Invalid Token/Session Issue

**Symptoms:**
- User can login on one device but not another
- Token expires or becomes invalid
- Error appears randomly

**Solution:**
1. **Clear App Data:**
   - iOS: Uninstall Expo app and reinstall
   - Android: Tap and hold Expo app → Clear storage
   - Then login again

2. **Or Force Re-Login:**
   - Logout from app (tap Logout button on dashboard)
   - Clear browser cache on phone
   - Login again with correct credentials

### Issue 4: Backend Error Despite Connection

**Symptoms:**
- Can open `192.168.0.103:8000/docs` in browser
- Swagger UI loads
- But app still shows "Could not load dashboard data"

**Solution:**
1. **Check Backend Logs:**
   - Look at the terminal running the backend
   - Look for error messages or stack traces
   - Common issues:
     - Database locked (try restarting backend)
     - Missing dependencies (run `pip install -r requirements.txt`)
     - Invalid data in local_data.json (delete it and restart backend)

2. **Test with API Directly:**
   - On your computer, create a temporary token:
     ```bash
     # First, login to get a token
     curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"nafis@gmail.com","password":"yourpassword"}'
     ```
   - Copy the `access_token` from response
   - Then test the statistics endpoint:
     ```bash
     curl http://localhost:8000/api/statistics \
       -H "Authorization: Bearer YOUR_TOKEN_HERE"
     ```
   - If this fails, the backend API has an issue

---

## Step-By-Step Test Scenario

### Setup Phase
1. ✅ Backend running: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
2. ✅ Expo running: `npx expo start -c` (in mobile folder)
3. ✅ Phone on same WiFi as computer
4. ✅ Scanned QR code in Expo Go

### Test As Inspector
1. Tap "New here? Create an account"
2. Fill in:
   - Name: "Test Inspector"
   - Email: "testinsp@test.com"
   - Password: "password123"
   - Role: "Inspector"
3. Tap Register
4. You should see **Inspector Dashboard** (with "New Fabric Inspection" button)
5. ✅ This means app can connect to backend

### Test As Manager
1. Logout (tap Logout button)
2. Tap "New here? Create an account"
3. Fill in:
   - Name: "Test Manager"
   - Email: "testmgr@test.com"
   - Password: "password123"
   - Role: "Manager"
4. Tap Register
5. You should see **Manager Dashboard** (with stats cards and workflow section)
6. If you see "Could not load dashboard data" here, backend API is the issue
7. ✅ If dashboard loads, everything is working

---

## If All Else Fails

### Reset Database
If the database is corrupted or has issues:

1. **Delete the database file:**
   ```bash
   cd backend
   del local_data.json
   ```

2. **Restart backend:**
   - Kill the running backend (Ctrl+C in terminal)
   - Run again: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   - New empty database created automatically

3. **Create fresh accounts in app:**
   - Logout (if logged in)
   - Register new manager and inspector accounts
   - Login as manager
   - Dashboard should load with empty stats

### Re-install App
1. Kill Expo (`Ctrl+C` in mobile terminal)
2. Clear Expo cache: `npx expo start -c`
3. Reinstall Expo Go app on phone (uninstall and reinstall)
4. Scan QR code again

### Check Backend Logs
1. Look at terminal running backend
2. When you try to login, you should see API logs:
   ```
   POST /api/auth/login - "200 OK"
   GET /api/statistics - "200 OK"
   ```
3. If you see `500 Internal Server Error`, there's a backend bug
4. Copy the error message and share it for debugging

---

## Checklist Before Testing

- [ ] Backend running and listening on 0.0.0.0:8000
- [ ] Expo running in mobile folder
- [ ] Phone connected to same WiFi as computer
- [ ] Can open `http://192.168.0.103:8000/docs` in phone browser
- [ ] Trying to login as MANAGER (not inspector)
- [ ] Using correct password for the account
- [ ] No firewall blocking port 8000

---

## Summary

**Most Common Causes:**
1. **Wrong account role** → Use a manager email (nafis@gmail.com or refat@gmail.com)
2. **Phone not on same WiFi** → Check WiFi connection
3. **Backend not accessible** → Test with browser: `http://192.168.0.103:8000/docs`
4. **Backend not running** → Check terminal running backend

**Quick Diagnosis:**
```
Can you open http://192.168.0.103:8000/docs in phone browser?
├─ YES → Backend is accessible
│    ├─ Did you login as a MANAGER?
│    │  ├─ YES → Backend API error (check backend logs)
│    │  └─ NO → Login with manager email
│    └─ Issue resolved
└─ NO → Phone can't reach backend
     ├─ Is backend running?
     │  ├─ YES → Firewall/WiFi issue
     │  └─ NO → Start backend
     └─ Connect to same WiFi or disable firewall
```
