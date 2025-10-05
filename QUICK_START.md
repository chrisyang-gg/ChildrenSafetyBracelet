# GuardianLink - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Start Backend (Terminal 1)
```bash
cd ChildrenSafetyBracelet
./start_backend.sh
```
✅ Server running on `http://localhost:5000`

### 2. Start Frontend (Terminal 2)
```bash
cd ChildrenSafetyBracelet/webapp
npm install
npm start
```
✅ App opens at `http://localhost:3000`

### 3. Test (Terminal 3)
```bash
cd ChildrenSafetyBracelet/webapp
python test_client.py
```

---

## 🔧 Quick Commands

```bash
# Backend
./start_backend.sh                    # Start server
python webapp/test_client.py          # Test API

# Frontend  
cd webapp && npm start                # Start React app
cd webapp && npm run build            # Build for production

# Hardware
# Upload Arduino code to ESP32
# Device name: "GuardianLink"
```

---

## 📡 API Quick Reference

```bash
# Get status
curl http://localhost:5000/api/status

# Update parent location
curl -X POST http://localhost:5000/api/parent-location \
  -H "Content-Type: application/json" \
  -d '{"lat": 37.7749, "lng": -122.4194, "heading": 45}'

# Calibrate (bracelet 1m away, RSSI = -65)
curl -X POST http://localhost:5000/api/calibrate \
  -H "Content-Type: application/json" \
  -d '{"rssi": -65, "actual_distance": 1.0}'

# Test fall
curl -X POST http://localhost:5000/api/test-fall
```

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Distance Tracking** | RSSI → meters (±1-3m accuracy) |
| **Location Estimation** | Parent GPS + distance + bearing |
| **Fall Detection** | Sudden RSSI drop ≥15 dBm |
| **Real-time Alerts** | SSE stream for instant updates |
| **Text-to-Speech** | Audio announcements for accessibility |
| **Google Maps** | Visual location display |
| **Auto-location** | Browser geolocation API |

---

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | `pip install -r webapp/requirements.txt` |
| Frontend won't start | `cd webapp && npm install` |
| Map not loading | Add API key to `webapp/.env` |
| No BLE device found | Check device name = "GuardianLink" |
| Distance wrong | Calibrate: `/api/calibrate` |
| Speech not working | Check browser permissions |

---

## 📱 Usage Flow

1. **Open app** → Allow location access
2. **Tap "Child Status"** → See connection
3. **If connected** → Shows distance in real-time
4. **If disconnected** → Shows last known location
5. **Hover buttons** → Hear text-to-speech
6. **Tap "Speak Location"** → Hear full details

---

## 🎨 Accessibility

- ✅ Large buttons (easy to tap)
- ✅ High contrast (black/white)
- ✅ Text-to-speech (hover + auto)
- ✅ Apple SF Pro font
- ✅ No icons/emojis
- ✅ Simple navigation (2 pages)

---

## 📊 Default Configuration

```python
TX_POWER = -59              # RSSI at 1 meter
PATH_LOSS_EXPONENT = 2.5    # Indoor environment
DISCONNECT_THRESHOLD = 30   # meters
TARGET_DEVICE_NAME = "GuardianLink"
```

---

## 🚀 Demo Checklist

- [ ] Backend running
- [ ] Frontend running
- [ ] ESP32 powered on & broadcasting
- [ ] Browser location permission granted
- [ ] Google Maps API key configured
- [ ] Test fall detection works
- [ ] Test text-to-speech works
- [ ] Test distance calculation accurate

---

## 📞 Quick Links

- **Backend API Docs:** `BACKEND_README.md`
- **Full Implementation:** `IMPLEMENTATION_SUMMARY.md`
- **Test Client:** `webapp/test_client.py`
- **Server:** `webapp/server.py`

---

**Ready to demo! 🎉**
