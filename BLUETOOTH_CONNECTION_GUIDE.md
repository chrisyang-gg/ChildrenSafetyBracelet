# 🔵 Bluetooth Connection Guide - GuardianLink

## 📱 How to Connect to Your ESP32 Bracelet

There are **two ways** to connect:

---

## ✅ **Option 1: Direct Browser Connection (Web Bluetooth API)**

### What is it?
Your React app connects **directly** to the ESP32 from the browser - no backend needed for BLE!

### Requirements:
- ✅ **Chrome**, **Edge**, or **Opera** browser (Safari doesn't support Web Bluetooth)
- ✅ **HTTPS** (or localhost for testing)
- ✅ ESP32 powered on and broadcasting as "GuardianLink"

### How to Use:

#### Step 1: Power On ESP32
Upload your Arduino code and power on the bracelet. It should start broadcasting immediately.

#### Step 2: Open React App
```bash
cd webapp
npm start
```

#### Step 3: Go to Settings
1. Open `http://localhost:3000`
2. Click **"Settings"**
3. Click **"Connect via Bluetooth"**

#### Step 4: Select Device
A browser dialog will appear showing nearby Bluetooth devices:
```
┌─────────────────────────────────┐
│  Select a device                │
│                                 │
│  ○ GuardianLink                 │
│  ○ Other Device                 │
│  ○ Another Device               │
│                                 │
│  [Cancel]  [Pair]               │
└─────────────────────────────────┘
```

Select **"GuardianLink"** and click **"Pair"**.

#### Step 5: Connected! ✅
You'll hear "Device connected successfully" and see:
- Connection: **Connected** ✅
- Battery: 85%
- Signal: Strong

---

## 🖥️ **Option 2: Backend Server Connection (Python BLE Scanner)**

### What is it?
The Python backend scans for BLE devices and provides RSSI data via API.

### Requirements:
- ✅ Python 3.8+
- ✅ `bleak` library installed
- ✅ Bluetooth enabled on your computer

### How to Use:

#### Step 1: Install Dependencies
```bash
cd webapp
pip install -r requirements.txt
```

This installs:
- `Flask` - Web server
- `flask-cors` - CORS support
- `bleak` - Bluetooth scanner

#### Step 2: Start Backend
```bash
cd ..
./start_backend.sh
```

You should see:
```
============================================================
GuardianLink Backend Server
============================================================
BLE Available: True
Target Device: GuardianLink
TX Power: -59 dBm
Path Loss Exponent: 2.5
Disconnect Threshold: 30m
============================================================
✅ BLE scanner thread started
 * Running on http://0.0.0.0:5000
```

#### Step 3: Power On ESP32
The backend will automatically detect it and start tracking distance!

#### Step 4: Check Status
```bash
curl http://localhost:5000/api/status
```

You should see:
```json
{
  "success": true,
  "device": {
    "connected": true,
    "rssi": -65.5,
    "distance": 5.2,
    "last_seen": "2025-10-04T16:45:30"
  }
}
```

---

## 🔍 **Troubleshooting**

### Problem: "Web Bluetooth not supported"

**Solution:**
- Use Chrome, Edge, or Opera (not Firefox or Safari)
- Make sure you're on `https://` or `localhost`
- Update your browser to the latest version

### Problem: "No devices found"

**Solution:**
1. **Check ESP32 is powered on**
   - Look for LED indicator
   - Check serial monitor for "Beacon active" message

2. **Check device name**
   - Must be exactly "GuardianLink" in Arduino code
   - Look for this line: `BLEDevice::init("GuardianLink");`

3. **Check Bluetooth is enabled**
   - On your computer/phone
   - In browser settings

4. **Check distance**
   - Must be within ~30m (100ft)
   - Try moving closer

### Problem: "Connection failed"

**Solution:**
1. **Refresh the page** and try again
2. **Restart ESP32** (power cycle)
3. **Clear browser Bluetooth cache:**
   - Chrome: `chrome://bluetooth-internals`
   - Click "Forget" on old devices
4. **Check browser console** for error messages (F12)

### Problem: Backend says "BLE not available"

**Solution:**
1. **Install bleak:**
   ```bash
   pip install bleak
   ```

2. **Check Bluetooth permissions:**
   - **macOS:** System Settings → Privacy & Security → Bluetooth
   - **Linux:** User must be in `bluetooth` group
   - **Windows:** Bluetooth must be enabled

3. **Restart backend:**
   ```bash
   ./start_backend.sh
   ```

---

## 🧪 **Testing Connection**

### Test 1: Check ESP32 is Broadcasting

Use **nRF Connect** mobile app:
1. Download from App Store / Play Store
2. Open app → Scan
3. Look for "GuardianLink"
4. Note the RSSI value (e.g., -65 dBm)

### Test 2: Check Backend Detection

```bash
# Terminal 1: Start backend
./start_backend.sh

# Terminal 2: Monitor logs
tail -f webapp/server.log  # if logging enabled

# Or check status
curl http://localhost:5000/api/status
```

### Test 3: Check Frontend Connection

1. Open browser console (F12)
2. Go to Settings page
3. Click "Connect via Bluetooth"
4. Watch console for messages:
   ```
   Requesting Bluetooth Device...
   Device found: GuardianLink
   Connecting to GATT Server...
   Connected to GATT Server
   ```

---

## 📊 **Understanding RSSI Values**

| RSSI (dBm) | Distance | Signal |
|------------|----------|--------|
| -30 to -50 | 0-1m | Excellent |
| -50 to -60 | 1-5m | Very Good |
| -60 to -70 | 5-10m | Good |
| -70 to -80 | 10-20m | Fair |
| -80 to -90 | 20-30m | Weak |
| < -90 | >30m | Very Weak / Out of Range |

---

## 🔧 **Advanced: Modify Arduino Code**

### Increase Transmission Power (for longer range)

Add this to your `setup()`:
```cpp
#include <esp_bt.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE Beacon...");

  BLEDevice::init("GuardianLink");
  
  // Set maximum TX power for longer range
  esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_P9);
  
  BLEServer *pServer = BLEDevice::createServer();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("Beacon active — ready to detect via phone RSSI!");
}
```

### Add Battery Level Service

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define BATTERY_SERVICE_UUID "0000180F-0000-1000-8000-00805f9b34fb"
#define BATTERY_LEVEL_UUID   "00002A19-0000-1000-8000-00805f9b34fb"

BLECharacteristic *pBatteryLevelCharacteristic;

void setup() {
  Serial.begin(115200);
  BLEDevice::init("GuardianLink");
  
  BLEServer *pServer = BLEDevice::createServer();
  
  // Create Battery Service
  BLEService *pBatteryService = pServer->createService(BATTERY_SERVICE_UUID);
  
  // Create Battery Level Characteristic
  pBatteryLevelCharacteristic = pBatteryService->createCharacteristic(
    BATTERY_LEVEL_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  
  pBatteryLevelCharacteristic->addDescriptor(new BLE2902());
  
  // Set initial battery level (0-100%)
  uint8_t batteryLevel = 85;
  pBatteryLevelCharacteristic->setValue(&batteryLevel, 1);
  
  pBatteryService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BATTERY_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  
  Serial.println("Beacon with battery service active!");
}

void loop() {
  // Update battery level every 60 seconds
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 60000) {
    uint8_t batteryLevel = readBatteryLevel(); // Your function
    pBatteryLevelCharacteristic->setValue(&batteryLevel, 1);
    pBatteryLevelCharacteristic->notify();
    lastUpdate = millis();
  }
  delay(1000);
}
```

---

## 📱 **Browser Compatibility**

| Browser | Web Bluetooth Support |
|---------|----------------------|
| Chrome (Desktop) | ✅ Yes |
| Chrome (Android) | ✅ Yes |
| Edge (Desktop) | ✅ Yes |
| Opera (Desktop) | ✅ Yes |
| Safari (Mac/iOS) | ❌ No |
| Firefox | ❌ No |

**Recommendation:** Use **Chrome** for best compatibility.

---

## 🔐 **Security Notes**

1. **User must click** to initiate connection (browser security)
2. **HTTPS required** for production (localhost OK for development)
3. **Pairing dialog** prevents automatic connections
4. **No background scanning** - page must be open

---

## 🎯 **Quick Reference**

### Connect via Browser (Option 1):
```
1. Open React app (npm start)
2. Go to Settings
3. Click "Connect via Bluetooth"
4. Select "GuardianLink" from dialog
5. Done! ✅
```

### Connect via Backend (Option 2):
```
1. Start backend (./start_backend.sh)
2. Power on ESP32
3. Backend auto-detects
4. Check status: curl localhost:5000/api/status
5. Done! ✅
```

---

## 💡 **Which Option Should I Use?**

| Feature | Browser (Option 1) | Backend (Option 2) |
|---------|-------------------|-------------------|
| **Setup** | Easy | Medium |
| **Browser Support** | Chrome/Edge only | Any browser |
| **RSSI Access** | Via backend API | Direct |
| **Background Scanning** | No | Yes |
| **Distance Calculation** | Backend does it | Backend does it |
| **Best For** | Simple demos | Production use |

**Recommendation for Hackathon:** Use **Option 1** (Browser) for demos - it's more impressive to show direct connection!

---

## 🆘 **Still Having Issues?**

1. **Check ESP32 serial monitor:**
   ```
   Starting BLE Beacon...
   Beacon active — ready to detect via phone RSSI!
   ```

2. **Test with nRF Connect app** (mobile) first
   - Confirms ESP32 is broadcasting correctly

3. **Check browser console** (F12) for errors

4. **Try backend simulator mode:**
   - Uninstall bleak: `pip uninstall bleak`
   - Restart backend
   - Should say "BLE not available — running simulator loop"

5. **Ask for help!** Include:
   - Browser name & version
   - Operating system
   - Error messages from console
   - ESP32 serial output

---

**You're ready to connect! 🔵✨**
