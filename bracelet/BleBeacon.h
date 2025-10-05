#pragma once
#include <Arduino.h>

// ESP32 BLE (matches your BLEDevice.h usage)
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

class BleBeacon {
public:
  explicit BleBeacon(const char* name = "GuardianLink")
  : _name(name) {}

  void begin() {
    Serial.println("[BLE] init");
    BLEDevice::init(_name);
    // Keep a server instance around (not strictly used, but mirrors your sketch)
    _server = BLEDevice::createServer();
    _adv = BLEDevice::getAdvertising();
    _adv->setScanResponse(true);
    _adv->setMinPreferred(0x06);
    _adv->setMinPreferred(0x12);
    BLEDevice::startAdvertising();
    Serial.println("[BLE] Beacon active — ready to detect via phone RSSI!");
  }

  // Nothing to do each loop for a simple beacon, but keep API consistent
  void update() {}

private:
  const char* _name;
  BLEServer* _server = nullptr;
  BLEAdvertising* _adv = nullptr;
};