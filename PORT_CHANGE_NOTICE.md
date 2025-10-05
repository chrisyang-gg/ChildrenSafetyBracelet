# ⚠️ Port Change Notice

## Backend Now Runs on Port 5001

Due to macOS AirPlay Receiver using port 5000, the backend server now runs on **port 5001**.

---

## 🔧 What Changed

### Backend Server
- **Old:** `http://localhost:5000`
- **New:** `http://localhost:5001`

### Files Updated
- ✅ `server.py` - Changed port to 5001
- ✅ `test_client.py` - Updated BASE_URL
- ✅ `bluetooth.js` - Updated API endpoint
- ✅ Fixed BLE scanner coroutine issue

---

## 🚀 How to Use

### Start Backend
```bash
./start_backend.sh
```

Server will start on: **http://localhost:5001**

### Test API
```bash
curl http://localhost:5001/api/status
```

### Test Client
```bash
cd webapp
python test_client.py
```

---

## 🍎 macOS AirPlay Issue

If you still get "Port in use" error:

### Option 1: Disable AirPlay Receiver
1. Open **System Settings**
2. Go to **General** → **AirDrop & Handoff**
3. Turn off **AirPlay Receiver**

### Option 2: Use Different Port (Already Done!)
The backend now uses port 5001 automatically.

---

## ✅ All Fixed!

You can now run:
```bash
./start_backend.sh
```

And it will work without conflicts! 🎉
