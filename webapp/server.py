#!/usr/bin/env python3
"""
GuardianLink Backend Server
Handles BLE RSSI scanning, distance calculation, direction estimation, and location tracking
"""
import json
import os
import threading
import time
import math
from queue import Queue, Empty
from datetime import datetime
from collections import deque

from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS

# Try to import bleak for BLE (optional). If not available we'll run a simulator.
try:
    from bleak import BleakScanner
    BLE_AVAILABLE = True
except Exception:
    BleakScanner = None
    BLE_AVAILABLE = False

# Only enable BLE scanning if the environment variable ENABLE_BLE=1 is set.
# This prevents the server from failing during development when hardware isn't ready.
BLE_ENABLED = os.getenv("ENABLE_BLE", "0") == "1"

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# ============================================================================
# CONFIGURATION
# ============================================================================

# RSSI to Distance Calibration
# Calibrated for your ESP32: RSSI=-60 at 1.0m (perfect calibration!)
TX_POWER = -60  # RSSI at 1 meter (calibrated with your hardware)
PATH_LOSS_EXPONENT = 3.5  # Environmental factor (increased for indoor accuracy)

# Distance thresholds (meters)
DISCONNECT_THRESHOLD = 30  # Alert when child is beyond this distance
RSSI_THRESHOLD = -90  # Below this RSSI, consider out of range

# Fall detection parameters
FALL_RSSI_DROP = 15  # Sudden RSSI drop indicating possible fall
FALL_TIME_WINDOW = 2  # seconds

# Device tracking
TARGET_DEVICE_NAME = "GuardianLink"  # Must match BLE beacon name

# ============================================================================
# DATA STRUCTURES
# ============================================================================

# Event queue for server-sent events
events = Queue()

# Device state tracking
device_state = {
    "connected": False,
    "rssi": None,
    "distance": None,
    "last_seen": None,
    "battery": 85,
    "address": None,
    "location": {
        "lat": None,
        "lng": None,
        "address": None
    },
    "parent_location": {
        "lat": None,
        "lng": None,
        "heading": None  # Compass direction in degrees
    }
}

# RSSI history for fall detection and smoothing (reduced for faster response)
rssi_history = deque(maxlen=3)

# Last known good location (when connected)
last_known_location = {
    "lat": None,
    "lng": None,
    "address": None,
    "timestamp": None
}

# ============================================================================
# RSSI TO DISTANCE CALCULATION
# ============================================================================

def calculate_distance(rssi, tx_power=TX_POWER, n=PATH_LOSS_EXPONENT):
    """
    Calculate distance from RSSI using path loss model.
    
    Formula: d = 10^((TxPower - RSSI) / (10 * n))
    
    Args:
        rssi: Received Signal Strength Indicator
        tx_power: RSSI at 1 meter distance
        n: Path loss exponent (2-4)
    
    Returns:
        Distance in meters
    """
    if rssi == 0:
        return -1.0
    
    ratio = (tx_power - rssi) / (10.0 * n)
    distance = math.pow(10, ratio)
    
    return round(distance, 2)


def smooth_rssi(new_rssi):
    """
    Apply moving average filter to smooth RSSI readings.
    """
    rssi_history.append(new_rssi)
    if len(rssi_history) == 0:
        return new_rssi
    return sum(rssi_history) / len(rssi_history)


def detect_fall(current_rssi):
    """
    Detect sudden RSSI drop that might indicate a fall.
    
    Returns:
        True if fall detected, False otherwise
    """
    if len(rssi_history) < 3:
        return False
    
    # Check for sudden drop
    recent_avg = sum(list(rssi_history)[-3:]) / 3
    if recent_avg - current_rssi >= FALL_RSSI_DROP:
        return True
    
    return False


# ============================================================================
# LOCATION & DIRECTION CALCULATION
# ============================================================================

def calculate_child_location(parent_lat, parent_lng, distance, bearing):
    """
    Calculate child's approximate GPS coordinates based on:
    - Parent's GPS location
    - Estimated distance (from RSSI)
    - Bearing/direction (from compass or movement)
    
    Args:
        parent_lat: Parent latitude
        parent_lng: Parent longitude
        distance: Distance in meters
        bearing: Direction in degrees (0=North, 90=East, 180=South, 270=West)
    
    Returns:
        (child_lat, child_lng) tuple
    """
    # Earth's radius in meters
    R = 6371000
    
    # Convert to radians
    lat1 = math.radians(parent_lat)
    lng1 = math.radians(parent_lng)
    bearing_rad = math.radians(bearing)
    
    # Calculate new position
    lat2 = math.asin(
        math.sin(lat1) * math.cos(distance / R) +
        math.cos(lat1) * math.sin(distance / R) * math.cos(bearing_rad)
    )
    
    lng2 = lng1 + math.atan2(
        math.sin(bearing_rad) * math.sin(distance / R) * math.cos(lat1),
        math.cos(distance / R) - math.sin(lat1) * math.sin(lat2)
    )
    
    # Convert back to degrees
    child_lat = math.degrees(lat2)
    child_lng = math.degrees(lng2)
    
    return round(child_lat, 6), round(child_lng, 6)


def calculate_bearing(lat1, lng1, lat2, lng2):
    """
    Calculate bearing between two GPS coordinates.
    
    Returns:
        Bearing in degrees (0-360)
    """
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    lng_diff = math.radians(lng2 - lng1)
    
    x = math.sin(lng_diff) * math.cos(lat2_rad)
    y = math.cos(lat1_rad) * math.sin(lat2_rad) - \
        math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(lng_diff)
    
    bearing = math.atan2(x, y)
    bearing_deg = math.degrees(bearing)
    
    # Normalize to 0-360
    return (bearing_deg + 360) % 360


def bearing_to_direction(bearing):
    """
    Convert bearing degrees to cardinal direction.
    """
    directions = ['north', 'northeast', 'east', 'southeast', 
                  'south', 'southwest', 'west', 'northwest']
    index = round(bearing / 45) % 8
    return directions[index]


# ============================================================================
# EVENT HANDLING
# ============================================================================

def push_event(payload: dict):
    """Push event to SSE queue."""
    payload.setdefault("ts", time.time())
    events.put(payload)


def get_proximity_zone(rssi):
    """
    Determine proximity zone based on RSSI.
    
    Returns tuple: (zone_name, zone_color)
    """
    if rssi > -65:
        return ("very_close", "#00ff00")  # Bright green - 0-10m
    elif rssi > -75:
        return ("near", "#ffff00")  # Yellow - 10-20m
    elif rssi > -85:
        return ("far", "#ff8800")  # Orange - 20-30m
    else:
        return ("out_of_range", "#ff0000")  # Red - >30m


def update_device_state(rssi, address):
    """
    Update device state based on new RSSI reading.
    """
    global device_state, last_known_location
    
    # Smooth RSSI
    smoothed_rssi = smooth_rssi(rssi)
    
    # Calculate distance (keep for reference, but use zones for display)
    distance = calculate_distance(smoothed_rssi)
    
    # Get proximity zone
    zone, zone_color = get_proximity_zone(smoothed_rssi)
    
    # Update state
    device_state["connected"] = zone != "out_of_range"
    device_state["rssi"] = round(smoothed_rssi, 1)
    device_state["distance"] = distance
    device_state["proximity_zone"] = zone
    device_state["zone_color"] = zone_color
    device_state["last_seen"] = datetime.now().isoformat()
    device_state["address"] = address
    
    # Check for fall
    if detect_fall(rssi):
        push_event({
            "type": "fall_detected",
            "severity": "high",
            "rssi": rssi,
            "distance": distance,
            "timestamp": datetime.now().isoformat()
        })
    
    # Check for disconnect
    if not device_state["connected"]:
        push_event({
            "type": "device_disconnected",
            "distance": distance,
            "last_location": last_known_location,
            "timestamp": datetime.now().isoformat()
        })
    
    # Update child location if parent location is available
    if (device_state["parent_location"]["lat"] and 
        device_state["parent_location"]["lng"] and
        device_state["parent_location"]["heading"] is not None):
        
        child_lat, child_lng = calculate_child_location(
            device_state["parent_location"]["lat"],
            device_state["parent_location"]["lng"],
            distance,
            device_state["parent_location"]["heading"]
        )
        
        device_state["location"]["lat"] = child_lat
        device_state["location"]["lng"] = child_lng
        
        # Update last known location if connected
        if device_state["connected"]:
            last_known_location["lat"] = child_lat
            last_known_location["lng"] = child_lng
            last_known_location["timestamp"] = datetime.now().isoformat()
    
    # Push status update event
    push_event({
        "type": "status_update",
        "connected": device_state["connected"],
        "rssi": device_state["rssi"],
        "distance": distance,
        "location": device_state["location"]
    })


# ============================================================================
# BLE SCANNING
# ============================================================================

def ble_scanner_loop(stop_event: threading.Event):
    """
    Scan for BLE devices and track GuardianLink bracelet.
    """
    if not BLE_AVAILABLE:
        return
    
    print(f"BLE scanner started. Looking for device: {TARGET_DEVICE_NAME}")
    
    # Import asyncio for running async discover
    import asyncio
    
    async def scan_devices():
        """Async function to scan for devices with RSSI."""
        devices = await BleakScanner.discover(timeout=2.0, return_adv=True)
        return devices
    
    while not stop_event.is_set():
        try:
            # Run async discover in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            devices = loop.run_until_complete(scan_devices())
            loop.close()
            
            found = False
            for address, (device, advertisement_data) in devices.items():
                name = device.name or ""
                
                # Look for our target device
                if TARGET_DEVICE_NAME.lower() in name.lower():
                    found = True
                    rssi = advertisement_data.rssi
                    update_device_state(rssi, device.address)
                    zone = device_state['proximity_zone'].replace('_', ' ').title()
                    print(f"Found {name}: RSSI={rssi} | Zone: {zone}", flush=True)
            
            if not found:
                # Device not found - mark as disconnected
                if device_state["connected"]:
                    device_state["connected"] = False
                    push_event({
                        "type": "device_disconnected",
                        "reason": "out_of_range",
                        "last_location": last_known_location,
                        "timestamp": datetime.now().isoformat()
                    })
            
            time.sleep(1.0)
            
        except Exception as e:
            print(f"BLE scanner error: {e}")
            time.sleep(2.0)


def simulator_loop(stop_event: threading.Event):
    """
    Simulator for testing without real BLE hardware.
    Simulates RSSI readings and distance changes.
    """
    print("BLE not available — running simulator loop")
    
    simulated_rssi = -60
    direction = 1
    
    while not stop_event.is_set():
        time.sleep(2)
        
        # Simulate RSSI fluctuation
        simulated_rssi += direction * 5
        
        if simulated_rssi < -85:
            direction = 1
        elif simulated_rssi > -55:
            direction = -1
        
        # Occasionally simulate a fall
        if simulated_rssi < -80 and len(rssi_history) > 0:
            simulated_rssi = -95  # Sudden drop
        
        update_device_state(simulated_rssi, "SIM:00:00:00:00:00")
        print(f"Simulator: RSSI={simulated_rssi}, Distance={device_state['distance']}m")


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route("/events")
def sse_events():
    """Server-Sent Events stream for real-time updates."""
    def gen():
        while True:
            try:
                ev = events.get(timeout=0.5)
            except Empty:
                # Send keepalive
                yield ": keepalive\n\n"
                continue
            data = json.dumps(ev)
            yield f"data: {data}\n\n"
    
    return Response(gen(), mimetype="text/event-stream")


@app.route("/api/status", methods=["GET"])
def get_status():
    """Get current device status."""
    return jsonify({
        "success": True,
        "device": device_state,
        "last_known_location": last_known_location
    })


@app.route("/api/parent-location", methods=["POST"])
def update_parent_location():
    """
    Update parent's GPS location and compass heading.
    
    Expected JSON:
    {
        "lat": 37.7749,
        "lng": -122.4194,
        "heading": 45  // Optional: compass direction in degrees
    }
    """
    try:
        data = request.get_json()
        
        device_state["parent_location"]["lat"] = data.get("lat")
        device_state["parent_location"]["lng"] = data.get("lng")
        device_state["parent_location"]["heading"] = data.get("heading", 0)
        
        # Recalculate child location if we have distance
        if device_state["distance"]:
            child_lat, child_lng = calculate_child_location(
                data["lat"],
                data["lng"],
                device_state["distance"],
                data.get("heading", 0)
            )
            
            device_state["location"]["lat"] = child_lat
            device_state["location"]["lng"] = child_lng
            
            # Calculate bearing and direction
            bearing = calculate_bearing(
                data["lat"], data["lng"],
                child_lat, child_lng
            )
            direction_text = bearing_to_direction(bearing)
            
            return jsonify({
                "success": True,
                "child_location": {
                    "lat": child_lat,
                    "lng": child_lng,
                    "distance": device_state["distance"],
                    "bearing": round(bearing, 1),
                    "direction": direction_text
                }
            })
        
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/calibrate", methods=["POST"])
def calibrate_rssi():
    """
    Calibrate TX_POWER for more accurate distance calculation.
    
    Expected JSON:
    {
        "rssi": -65,
        "actual_distance": 1.0  // meters
    }
    """
    global TX_POWER
    
    try:
        data = request.get_json()
        rssi = data["rssi"]
        actual_distance = data["actual_distance"]
        
        # Calculate TX_POWER (RSSI at 1 meter)
        TX_POWER = rssi - (10 * PATH_LOSS_EXPONENT * math.log10(actual_distance))
        
        return jsonify({
            "success": True,
            "tx_power": round(TX_POWER, 1),
            "message": "Calibration successful"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/test-fall", methods=["POST"])
def test_fall():
    """Trigger a test fall event."""
    push_event({
        "type": "fall_detected",
        "severity": "high",
        "source": "manual_test",
        "timestamp": datetime.now().isoformat()
    })
    return jsonify({"success": True})


@app.route("/api/config", methods=["GET", "POST"])
def config():
    """Get or update configuration."""
    global TX_POWER, PATH_LOSS_EXPONENT, DISCONNECT_THRESHOLD
    
    if request.method == "POST":
        data = request.get_json()
        
        if "tx_power" in data:
            TX_POWER = data["tx_power"]
        if "path_loss_exponent" in data:
            PATH_LOSS_EXPONENT = data["path_loss_exponent"]
        if "disconnect_threshold" in data:
            DISCONNECT_THRESHOLD = data["disconnect_threshold"]
        
        return jsonify({"success": True, "message": "Configuration updated"})
    
    return jsonify({
        "tx_power": TX_POWER,
        "path_loss_exponent": PATH_LOSS_EXPONENT,
        "disconnect_threshold": DISCONNECT_THRESHOLD,
        "target_device_name": TARGET_DEVICE_NAME
    })


@app.route("/ingest", methods=["POST"])
def ingest():
    """Generic ingest endpoint for hardware: accepts JSON payloads containing
    device_id, rssi, lat, lng, and fall (boolean). The server immediately
    pushes corresponding SSE events so the front-end can react in real-time.

    Example payloads:
      {"device_id":"DEV123","rssi":-42}
      {"device_id":"DEV123","lat":37.7749, "lng":-122.4194}
      {"device_id":"DEV123","fall":true, "severity":"high"}
    """
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"ok": False, "error": "invalid json"}), 400

    device = data.get("device_id") or data.get("address") or "unknown"

    # If hardware reports fall directly
    if data.get("fall"):
        ev = {
            "type": "fall",
            "device": device,
            "severity": data.get("severity", "high"),
            "meta": data.get("meta", {}),
            "source": "ingest"
        }
        push_event(ev)
        return jsonify({"ok": True, "event": ev})

    # If hardware reports location
    if "lat" in data and "lng" in data:
        ev = {
            "type": "location",
            "device": device,
            "lat": float(data["lat"]),
            "lng": float(data["lng"]),
            "rssi": data.get("rssi"),
            "source": "ingest"
        }
        push_event(ev)
        return jsonify({"ok": True, "event": ev})

    # Fallback: rssi-only presence/location
    if "rssi" in data:
        ev = {
            "type": "location",
            "device": device,
            "rssi": data.get("rssi"),
            "source": "ingest"
        }
        push_event(ev)
        return jsonify({"ok": True, "event": ev})

    return jsonify({"ok": False, "error": "no recognized fields"}), 400


@app.route("/monitor")
def monitor_html():
    # serve a simple static monitor page included in this folder
    return send_from_directory(os.path.dirname(__file__), "monitor.html")


@app.route("/")
def index():
    """Serve API documentation."""
    return jsonify({
        "name": "GuardianLink Backend API",
        "version": "1.0",
        "ble_available": BLE_AVAILABLE,
        "endpoints": {
            "/api/status": "GET - Current device status",
            "/api/parent-location": "POST - Update parent GPS location",
            "/api/calibrate": "POST - Calibrate RSSI to distance",
            "/api/test-fall": "POST - Trigger test fall event",
            "/api/config": "GET/POST - Configuration",
            "/events": "GET - SSE stream for real-time updates"
        }
    })


# ============================================================================
# STARTUP
# ============================================================================

def start_background_threads():
    """Start BLE scanner or simulator thread."""
    stop_event = threading.Event()
    
    if BLE_AVAILABLE:
        t = threading.Thread(target=ble_scanner_loop, args=(stop_event,), daemon=True)
        t.start()
        print("✅ BLE scanner thread started")
    else:
        t = threading.Thread(target=simulator_loop, args=(stop_event,), daemon=True)
        t.start()
        print("⚠️  BLE not available - simulator thread started")
    
    return stop_event


if __name__ == "__main__":
    print("=" * 60)
    print("GuardianLink Backend Server")
    print("=" * 60)
    print(f"BLE Available: {BLE_AVAILABLE}")
    print(f"Target Device: {TARGET_DEVICE_NAME}")
    print(f"TX Power: {TX_POWER} dBm")
    print(f"Path Loss Exponent: {PATH_LOSS_EXPONENT}")
    print(f"Disconnect Threshold: {DISCONNECT_THRESHOLD}m")
    print("=" * 60)
    
    stop_event = start_background_threads()
    
    # Flask's built-in server; for production use gunicorn
    # Using port 5001 to avoid conflict with macOS AirPlay on port 5000
    app.run(host="0.0.0.0", port=5001, threaded=True, debug=False)