# 🔵 Quick Connection Steps

## 🚀 **Fastest Way (Browser Direct)**

```
┌─────────────────────────────────────────────────────────┐
│  1. Power on ESP32 Bracelet                             │
│     → Should see "Beacon active" in serial monitor      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. Open React App                                      │
│     $ cd webapp && npm start                            │
│     → Opens http://localhost:3000                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. Click "Settings" Button                             │
│     → Large button on home screen                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. Click "Connect via Bluetooth"                       │
│     → Browser shows device selection dialog             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  5. Select "GuardianLink" from List                     │
│     → Click "Pair" button                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  ✅ CONNECTED!                                          │
│     → Hear "Device connected successfully"              │
│     → Status shows "Connected"                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🖥️ **With Backend (For RSSI Tracking)**

```
┌─────────────────────────────────────────────────────────┐
│  1. Start Backend Server                                │
│     $ ./start_backend.sh                                │
│     → Server runs on http://localhost:5000              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. Power on ESP32 Bracelet                             │
│     → Backend auto-detects "GuardianLink"               │
│     → Starts measuring RSSI                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. Open React App                                      │
│     $ cd webapp && npm start                            │
│     → Opens http://localhost:3000                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. Go to "Child Status"                                │
│     → Shows real-time distance                          │
│     → Shows connection status                           │
│     → Shows location on map                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  ✅ TRACKING!                                           │
│     → Distance updates every second                     │
│     → Fall detection active                             │
│     → Location calculated                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 **Verify Connection**

### Check ESP32:
```
Serial Monitor should show:
┌──────────────────────────────────┐
│ Starting BLE Beacon...           │
│ Beacon active — ready to detect  │
│ via phone RSSI!                  │
└──────────────────────────────────┘
```

### Check Backend:
```bash
curl http://localhost:5000/api/status
```

Should return:
```json
{
  "device": {
    "connected": true,
    "rssi": -65.5,
    "distance": 5.2
  }
}
```

### Check Frontend:
```
Settings Page should show:
┌──────────────────────────────────┐
│ Connection: Connected ✅          │
│ Battery: 85%                     │
│ Signal: Strong                   │
│ Bluetooth Range: ~30m typical    │
└──────────────────────────────────┘
```

---

## ⚠️ **Common Issues**

| Problem | Solution |
|---------|----------|
| "No devices found" | 1. Check ESP32 is powered on<br>2. Check device name is "GuardianLink"<br>3. Move closer (within 10m) |
| "Web Bluetooth not supported" | Use Chrome, Edge, or Opera browser |
| "Connection failed" | 1. Refresh page<br>2. Restart ESP32<br>3. Clear browser Bluetooth cache |
| Backend says "BLE not available" | `pip install bleak` |
| Distance shows 0 | Backend needs parent location<br>(automatically sent from browser) |

---

## 📱 **Test Without Hardware**

Don't have ESP32 yet? No problem!

```bash
# Backend runs in simulator mode automatically
./start_backend.sh

# You'll see:
# "BLE not available — running simulator loop"
# Simulates RSSI readings for testing
```

---

## 🎯 **Expected Behavior**

### When Connected (< 30m):
- ✅ Status: "Connected"
- ✅ Green indicator (mint green)
- ✅ Distance shows in meters
- ✅ Battery level visible
- ✅ No location panel (child is with you)

### When Disconnected (> 30m):
- ⚠️ Status: "Disconnected"
- ⚠️ Red/black indicator
- ⚠️ Shows last known location
- ⚠️ Map displays child's position
- ⚠️ Distance and direction shown
- ⚠️ "Speak Location Details" button active

### When Fall Detected:
- 🚨 Alert: "Possible Fall Detected"
- 🚨 Red indicator
- 🚨 Timestamp shown
- 🚨 Audio announcement (if enabled)
- 🚨 Can replay accelerometer data

---

## 💡 **Pro Tips**

1. **Calibrate for accuracy:**
   ```bash
   # Place bracelet 1m away, note RSSI
   curl -X POST http://localhost:5000/api/calibrate \
     -H "Content-Type: application/json" \
     -d '{"rssi": -65, "actual_distance": 1.0}'
   ```

2. **Test fall detection:**
   ```bash
   curl -X POST http://localhost:5000/api/test-fall
   ```

3. **Monitor real-time events:**
   ```bash
   curl http://localhost:5000/events
   ```

4. **Check logs:**
   - Browser: F12 → Console
   - Backend: Terminal output
   - ESP32: Serial Monitor (115200 baud)

---

**Ready to connect! 🔵✨**

**Next:** See `BLUETOOTH_CONNECTION_GUIDE.md` for detailed troubleshooting.
