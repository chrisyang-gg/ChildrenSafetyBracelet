#!/usr/bin/env python3
"""
Test client for GuardianLink Backend API
Simulates parent device sending GPS updates and receiving status
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5001"

def test_status():
    """Get current device status."""
    print("\n" + "="*60)
    print("Testing /api/status")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/api/status")
    data = response.json()
    
    print(f"Connected: {data['device']['connected']}")
    print(f"RSSI: {data['device']['rssi']}")
    print(f"Distance: {data['device']['distance']}m")
    print(f"Last Seen: {data['device']['last_seen']}")
    print(f"Child Location: {data['device']['location']}")
    print(f"Last Known Location: {data['last_known_location']}")


def test_parent_location():
    """Update parent location and get child location."""
    print("\n" + "="*60)
    print("Testing /api/parent-location")
    print("="*60)
    
    # Example: Parent at San Francisco coordinates
    parent_data = {
        "lat": 37.7749,
        "lng": -122.4194,
        "heading": 45  # Northeast
    }
    
    print(f"Sending parent location: {parent_data}")
    
    response = requests.post(
        f"{BASE_URL}/api/parent-location",
        json=parent_data
    )
    data = response.json()
    
    if data.get("child_location"):
        child = data["child_location"]
        print(f"\nChild Location Calculated:")
        print(f"  Latitude: {child['lat']}")
        print(f"  Longitude: {child['lng']}")
        print(f"  Distance: {child['distance']}m")
        print(f"  Bearing: {child['bearing']}°")
        print(f"  Direction: {child['direction']}")
    else:
        print("No child location available (device not connected)")


def test_calibration():
    """Test RSSI calibration."""
    print("\n" + "="*60)
    print("Testing /api/calibrate")
    print("="*60)
    
    # Example: Measured RSSI at known distance
    calibration_data = {
        "rssi": -65,
        "actual_distance": 1.0  # 1 meter
    }
    
    print(f"Calibrating with: RSSI={calibration_data['rssi']}, Distance={calibration_data['actual_distance']}m")
    
    response = requests.post(
        f"{BASE_URL}/api/calibrate",
        json=calibration_data
    )
    data = response.json()
    
    print(f"New TX Power: {data['tx_power']} dBm")
    print(f"Message: {data['message']}")


def test_config():
    """Get and update configuration."""
    print("\n" + "="*60)
    print("Testing /api/config")
    print("="*60)
    
    # Get current config
    response = requests.get(f"{BASE_URL}/api/config")
    config = response.json()
    
    print("Current Configuration:")
    print(f"  TX Power: {config['tx_power']} dBm")
    print(f"  Path Loss Exponent: {config['path_loss_exponent']}")
    print(f"  Disconnect Threshold: {config['disconnect_threshold']}m")
    print(f"  Target Device: {config['target_device_name']}")


def test_fall_detection():
    """Trigger a test fall event."""
    print("\n" + "="*60)
    print("Testing /api/test-fall")
    print("="*60)
    
    response = requests.post(f"{BASE_URL}/api/test-fall")
    data = response.json()
    
    print(f"Fall event triggered: {data['success']}")


def continuous_monitoring():
    """Simulate continuous parent location updates."""
    print("\n" + "="*60)
    print("Continuous Monitoring (Press Ctrl+C to stop)")
    print("="*60)
    
    # Starting location (San Francisco)
    lat = 37.7749
    lng = -122.4194
    heading = 0
    
    try:
        while True:
            # Simulate parent movement (small random walk)
            import random
            lat += random.uniform(-0.0001, 0.0001)
            lng += random.uniform(-0.0001, 0.0001)
            heading = (heading + random.uniform(-10, 10)) % 360
            
            # Send update
            response = requests.post(
                f"{BASE_URL}/api/parent-location",
                json={"lat": lat, "lng": lng, "heading": heading}
            )
            
            # Get status
            status_response = requests.get(f"{BASE_URL}/api/status")
            data = status_response.json()
            
            print(f"\r[{datetime.now().strftime('%H:%M:%S')}] "
                  f"Connected: {data['device']['connected']} | "
                  f"RSSI: {data['device']['rssi']} | "
                  f"Distance: {data['device']['distance']}m | "
                  f"Heading: {int(heading)}°", end="")
            
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped.")


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("GuardianLink Backend API Test Client")
    print("="*60)
    
    try:
        # Check if server is running
        response = requests.get(BASE_URL)
        print(f"✅ Server is running: {response.json()['name']}")
    except Exception as e:
        print(f"❌ Error: Cannot connect to server at {BASE_URL}")
        print(f"   Make sure the server is running: python server.py")
        return
    
    # Run tests
    test_config()
    test_status()
    test_parent_location()
    test_fall_detection()
    
    # Ask if user wants continuous monitoring
    print("\n" + "="*60)
    choice = input("\nStart continuous monitoring? (y/n): ")
    if choice.lower() == 'y':
        continuous_monitoring()


if __name__ == "__main__":
    main()
