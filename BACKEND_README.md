# GuardianLink Backend - RSSI-Based Location Tracking

## 🎯 Overview

This backend server handles:
- **BLE RSSI scanning** for the GuardianLink child bracelet
- **Distance calculation** from RSSI using path loss model
- **Direction estimation** using parent's GPS + compass
- **Child location approximation** via triangulation
- **Fall detection** from sudden RSSI drops
- **Real-time event streaming** via Server-Sent Events (SSE)

---

## 🧮 Technical Implementation

### 1. RSSI to Distance Calculation

**Formula:**
```
d = 10^((TxPower - RSSI) / (10 × n))
```

Where:
- `TxPower` = RSSI at 1 meter (calibrated, default: -59 dBm)
- `RSSI` = Received Signal Strength Indicator
- `n` = Path loss exponent (2 = free space, 2.5-4 = indoors)
- `d` = Distance in meters

**Accuracy:**
- Indoors: ±1-3 meters
- Outdoors (clear line of sight): ±0.5-1 meter
- Affected by obstacles, interference, antenna orientation

### 2. Child Location Calculation

Given:
- Parent GPS coordinates (lat, lng)
- Distance from RSSI
- Bearing/direction from compass

Calculate child's approximate GPS coordinates:

```python
child_lat = parent_lat + (distance × cos(bearing))
child_lng = parent_lng + (distance × sin(bearing))
```

### 3. Fall Detection

Monitors RSSI history for sudden drops (≥15 dBm within 2 seconds), which may indicate:
- Child falling
- Bracelet impact
- Sudden movement

---

## 📡 API Endpoints

### `GET /api/status`
Get current device status.

**Response:**
```json
{
  "success": true,
  "device": {
    "connected": true,
    "rssi": -65.5,
    "distance": 5.2,
    "last_seen": "2025-10-04T16:45:30",
    "battery": 85,
    "location": {
      "lat": 37.7750,
      "lng": -122.4195,
      "address": null
    },
    "parent_location": {
      "lat": 37.7749,
      "lng": -122.4194,
      "heading": 45
    }
  },
  "last_known_location": {
    "lat": 37.7750,
    "lng": -122.4195,
    "timestamp": "2025-10-04T16:45:30"
  }
}
```

### `POST /api/parent-location`
Update parent's GPS location and compass heading.

**Request:**
```json
{
  "lat": 37.7749,
  "lng": -122.4194,
  "heading": 45
}
```

**Response:**
```json
{
  "success": true,
  "child_location": {
    "lat": 37.7750,
    "lng": -122.4195,
    "distance": 5.2,
    "bearing": 45.3,
    "direction": "northeast"
  }
}
```

### `POST /api/calibrate`
Calibrate RSSI-to-distance conversion.

**How to calibrate:**
1. Place bracelet exactly 1 meter from phone
2. Note the RSSI value (from nRF Connect or similar)
3. Send calibration request

**Request:**
```json
{
  "rssi": -65,
  "actual_distance": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "tx_power": -59.2,
  "message": "Calibration successful"
}
```

### `GET /api/config`
Get current configuration.

**Response:**
```json
{
  "tx_power": -59,
  "path_loss_exponent": 2.5,
  "disconnect_threshold": 30,
  "target_device_name": "GuardianLink"
}
```

### `POST /api/config`
Update configuration.

**Request:**
```json
{
  "tx_power": -60,
  "path_loss_exponent": 3.0,
  "disconnect_threshold": 25
}
```

### `POST /api/test-fall`
Trigger a test fall event.

### `GET /events`
Server-Sent Events stream for real-time updates.

**Event Types:**
- `status_update` - Regular status updates
- `device_disconnected` - Child out of range
- `fall_detected` - Possible fall detected

---

## 🚀 Setup & Installation

### 1. Install Dependencies

```bash
cd webapp
pip install -r requirements.txt
```

**Requirements:**
- `Flask` - Web server
- `flask-cors` - CORS support for React frontend
- `bleak` - Bluetooth Low Energy scanner (optional, falls back to simulator)

### 2. Run the Server

```bash
python server.py
```

**Output:**
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

### 3. Test the API

```bash
python test_client.py
```

This will:
- Check server status
- Get device status
- Send parent location updates
- Test fall detection
- Optionally start continuous monitoring

---

## 🔧 Calibration Guide

For accurate distance measurement, calibrate your specific hardware:

### Step 1: Measure RSSI at Known Distance

1. Upload the Arduino code to your ESP32/bracelet
2. Open **nRF Connect** app on your phone
3. Scan for "GuardianLink" device
4. Place bracelet **exactly 1 meter** from phone
5. Note the RSSI value (e.g., -65 dBm)

### Step 2: Calibrate Backend

```bash
curl -X POST http://localhost:5000/api/calibrate \
  -H "Content-Type: application/json" \
  -d '{"rssi": -65, "actual_distance": 1.0}'
```

### Step 3: Test Different Distances

Measure RSSI at various distances and verify accuracy:

| Distance | Expected RSSI (approx) |
|----------|------------------------|
| 1m       | -60 to -65 dBm        |
| 5m       | -70 to -75 dBm        |
| 10m      | -75 to -80 dBm        |
| 20m      | -80 to -85 dBm        |
| 30m+     | -85 to -90 dBm        |

### Step 4: Adjust Path Loss Exponent

If distances are consistently off:
- **Too high?** Decrease `path_loss_exponent` (try 2.0)
- **Too low?** Increase `path_loss_exponent` (try 3.0-3.5)

```bash
curl -X POST http://localhost:5000/api/config \
  -H "Content-Type: application/json" \
  -d '{"path_loss_exponent": 3.0}'
```

---

## 📱 Integration with React Frontend

### 1. Update Parent Location from Browser

```javascript
// Get parent's GPS location
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  
  // Get compass heading (if available)
  const heading = await getCompassHeading(); // 0-360 degrees
  
  // Send to backend
  const response = await fetch('http://localhost:5000/api/parent-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: latitude,
      lng: longitude,
      heading: heading
    })
  });
  
  const data = await response.json();
  console.log('Child location:', data.child_location);
});
```

### 2. Subscribe to Real-Time Events

```javascript
const eventSource = new EventSource('http://localhost:5000/events');

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'status_update':
      updateUI(data);
      break;
    case 'device_disconnected':
      showAlert('Child is out of range!');
      showLastKnownLocation(data.last_location);
      break;
    case 'fall_detected':
      showEmergencyAlert('Possible fall detected!');
      break;
  }
});
```

### 3. Get Device Status

```javascript
const response = await fetch('http://localhost:5000/api/status');
const data = await response.json();

console.log('Connected:', data.device.connected);
console.log('Distance:', data.device.distance, 'meters');
console.log('Child location:', data.device.location);
```

---

## 🧪 Testing Without Hardware

The server includes a **simulator mode** that runs automatically if BLE is not available:

```python
# Simulates RSSI readings
simulated_rssi = -60  # starts at -60 dBm
# Fluctuates between -55 and -85 dBm
# Occasionally simulates falls (sudden drop to -95 dBm)
```

**To force simulator mode:**
1. Don't install `bleak` package
2. Or run on a system without Bluetooth

---

## 🔍 Troubleshooting

### BLE Scanner Not Finding Device

1. **Check device name:** Must be exactly "GuardianLink" in Arduino code
2. **Check Bluetooth:** Ensure Bluetooth is enabled on server machine
3. **Check range:** Device must be within ~30m
4. **Check permissions:** macOS/Linux may require Bluetooth permissions

### Distance Readings Inaccurate

1. **Calibrate:** Use `/api/calibrate` endpoint
2. **Adjust path loss:** Increase for indoors (3.0-3.5)
3. **Check environment:** Walls, metal, water affect RSSI
4. **Average readings:** RSSI fluctuates ±5-10 dBm naturally

### Direction Not Working

1. **Check compass:** Phone must support compass/magnetometer
2. **Calibrate compass:** Wave phone in figure-8 pattern
3. **Check heading:** Must send `heading` parameter (0-360°)

---

## 📊 Performance Considerations

### RSSI Smoothing
- Uses **moving average** filter (10 samples)
- Reduces noise and false fall detections
- Trade-off: Slight delay in distance updates

### Scan Frequency
- Default: **1 scan per second**
- Faster = more responsive, but higher CPU/battery usage
- Slower = less responsive, but better battery life

### Event Stream
- Uses **Server-Sent Events** (SSE)
- Lightweight, one-way communication
- Automatic reconnection on disconnect

---

## 🛡️ Security Considerations

1. **No authentication** (add JWT/OAuth for production)
2. **CORS enabled** for all origins (restrict in production)
3. **No HTTPS** (use reverse proxy with SSL in production)
4. **No rate limiting** (add for production)

---

## 📈 Future Enhancements

1. **Multi-device support:** Track multiple children
2. **AoA (Angle of Arrival):** Use BLE 5.1 direction finding
3. **Triangulation:** Use multiple receivers for better accuracy
4. **Machine learning:** Train model for better RSSI-to-distance
5. **Geofencing:** Alert when child leaves predefined area
6. **Historical tracking:** Store location history in database

---

## 📝 Arduino Code Notes

Your ESP32 code broadcasts as "GuardianLink" - perfect! 

**Recommendations:**
1. **Set TX power:** Add `esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_P9);` for max range
2. **Add battery level:** Include battery % in advertising data
3. **Add accelerometer data:** For better fall detection
4. **Increase advertising frequency:** Faster updates (but more battery drain)

---

## 🤝 Support

For issues or questions:
1. Check logs: Server prints detailed debug info
2. Test with simulator first
3. Use `test_client.py` to verify API
4. Check RSSI values in nRF Connect app

---

**Built for the 2025 Wireless Innovation Hackathon** 🏆
