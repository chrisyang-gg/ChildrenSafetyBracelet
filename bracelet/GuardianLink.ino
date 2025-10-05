#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

#include "ImuReader.h"
#include "MotionLogic.h"

#include <BLE2902.h>

// ===== UUIDs =====
#define SVC_UUID   "6e400001-0000-1000-8000-00805f9b34fb"
#define EVT_UUID   "6e400002-0000-1000-8000-00805f9b34fb"
#define RAW_UUID   "6e400003-0000-1000-8000-00805f9b34fb"
#define CTRL_UUID  "6e400004-0000-1000-8000-00805f9b34fb"

// ===== Data structs (packed, 20B) =====
struct __attribute__((packed)) Event {
  uint32_t t_ms;
  uint8_t  state;
  uint8_t  flags;
  uint16_t steps;
  int16_t  yaw_mrad;
  int16_t  yaw_rate_mrads;
  uint16_t amag_mg;
  uint16_t step_rate_mHz;
  uint16_t seq;
};

struct __attribute__((packed)) ImuRaw {
  uint32_t t_ms;
  int16_t  ax_mg, ay_mg, az_mg;
  int16_t  gx_mrads, gy_mrads, gz_mrads;
  uint16_t seq;
};

// ===== IMU/Motion =====
ImuReader   imu(50);     // ~20 Hz initial
MotionLogic motion(imu);

// ===== BLE globals =====
BLEServer*         gServer = nullptr;
BLECharacteristic* chEvent = nullptr;
BLECharacteristic* chRaw   = nullptr;
BLECharacteristic* chCtrl  = nullptr;

volatile bool gDeviceConnected = false;

enum Mode : uint8_t { EVENT_ONLY=0, RAW_BURST=1, RAW_CONT=2 };
Mode gMode = EVENT_ONLY;
uint32_t gBurstUntil = 0;
uint16_t gSeqEvent = 0, gSeqRaw = 0;

// ===== Server callbacks =====
class ServerCBs : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    gDeviceConnected = true;
    // Central may renegotiate MTU; we keep notifications <=20B so we're safe either way.
  }
  void onDisconnect(BLEServer* pServer) override {
    gDeviceConnected = false;
    pServer->getAdvertising()->start();
  }
};

// ===== CTRL write handler =====
class CtrlCBs : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    std::string v = std::string(c->getValue().c_str(), c->getValue().length());
    if (v.size() < 4) return;
    const uint8_t* p = (const uint8_t*)v.data();
    uint8_t mode = p[0], hz = p[1], secs = p[2], band = p[3];

    // Apply IMU sampling interval
    uint32_t intervalMs = (hz == 0) ? 100 : max(1, (int)roundf(1000.0f / hz));
    motion.setSamplingInterval(intervalMs);

    switch (mode) {
      case 0: gMode = EVENT_ONLY; break;
      case 1: gMode = RAW_BURST;  gBurstUntil = millis() + (uint32_t)secs*1000; break;
      case 2: gMode = RAW_CONT;   break;
      default: break;
    }

    // Optional: do something with band (0=Far,1=Near,2=Immediate)
    (void)band;
  }
};

void setup() {
  Serial.begin(115200);
  delay(100);

  if (!imu.begin()) {
    Serial.println("[ERR] IMU init failed");
  }
  motion.begin();

  // Quiet the IMU debug prints and slow JSON emission to 1 Hz
  imu.setPrinting(false);
  motion.setEmitInterval(1000);

  // ===== BLE init (ESP32 BLE Arduino) =====
  BLEDevice::init("KidWearable");                 // Device name
  gServer = BLEDevice::createServer();
  gServer->setCallbacks(new ServerCBs());

  BLEService* svc = gServer->createService(SVC_UUID);

  chEvent = svc->createCharacteristic(
    EVT_UUID, BLECharacteristic::PROPERTY_NOTIFY
  );
  chRaw = svc->createCharacteristic(
    RAW_UUID, BLECharacteristic::PROPERTY_NOTIFY
  );
  chCtrl = svc->createCharacteristic(
    CTRL_UUID, BLECharacteristic::PROPERTY_WRITE_NR | BLECharacteristic::PROPERTY_WRITE
  );
  chCtrl->setCallbacks(new CtrlCBs());

  // (Optional) Set CCCD descriptors automatically for notify chars
  chEvent->addDescriptor(new BLE2902());
  chRaw->addDescriptor(new BLE2902());

  svc->start();

  BLEAdvertising* adv = gServer->getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);  // iOS connection params hints
  adv->setMinPreferred(0x12);
  adv->start();

  // Power level if needed (0..7); default is fine:
  // BLEDevice::setPower(ESP_PWR_LVL_P7);
}

static inline void notifyEvent() {
  if (!gDeviceConnected) return;

  MotionOut o = motion.last();
  Event e{};
  e.t_ms           = millis();
  e.state          = (uint8_t)o.state;
  e.flags          = (o.zupt ? 0x01 : 0x00) | ((gMode!=EVENT_ONLY) ? 0x02 : 0x00);
  e.steps          = o.steps;
  e.yaw_mrad       = (int16_t)lroundf(o.yawRad * 1000.0f);
  e.yaw_rate_mrads = (int16_t)lroundf(o.yawRateRad * 1000.0f);
  e.amag_mg        = (uint16_t)lroundf(o.accelMagG * 1000.0f);
  e.step_rate_mHz  = (uint16_t)lroundf(o.stepRateHz * 1000.0f);
  e.seq            = ++gSeqEvent;

  chEvent->setValue((uint8_t*)&e, sizeof(e));
  chEvent->notify();  // <= 20B payload (safe under default MTU 23)
}

static inline void notifyRawOne() {
  if (!gDeviceConnected) return;

  auto s = imu.last();
  if (!s.valid) return;

  ImuRaw r{};
  r.t_ms = millis();
  r.ax_mg = (int16_t)lroundf(s.accel.x / 9.80665f * 1000.0f);
  r.ay_mg = (int16_t)lroundf(s.accel.y / 9.80665f * 1000.0f);
  r.az_mg = (int16_t)lroundf(s.accel.z / 9.80665f * 1000.0f);
  r.gx_mrads = (int16_t)lroundf(s.gyro.x * 1000.0f);
  r.gy_mrads = (int16_t)lroundf(s.gyro.y * 1000.0f);
  r.gz_mrads = (int16_t)lroundf(s.gyro.z * 1000.0f);
  r.seq = ++gSeqRaw;

  chRaw->setValue((uint8_t*)&r, sizeof(r));
  chRaw->notify(); // 20B, safe
}

void loop() {
  motion.update();  // runs IMU + logic, non-blocking

  static uint32_t lastEvt = 0, lastRaw = 0;
  uint32_t now = millis();

  // Event stream @ ~0.5 Hz (2000 ms) — tune to taste
  if (now - lastEvt >= 2000) {
    notifyEvent();
    lastEvt = now;
  }

  // Raw stream control
  bool rawOn = (gMode == RAW_CONT) || (gMode == RAW_BURST && now < gBurstUntil);
  if (gMode == RAW_BURST && now >= gBurstUntil) {
    gMode = EVENT_ONLY;
  }

  // Send raw samples @ ~50 Hz (20 ms) when enabled
  if (rawOn && (now - lastRaw >= 20)) {
    notifyRawOne();        // single 20B sample; batching added later
    lastRaw = now;
  }
}