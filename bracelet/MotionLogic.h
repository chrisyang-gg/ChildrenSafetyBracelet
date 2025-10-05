#pragma once
#include <Arduino.h>
#include "ImuReader.h"

// Tunables (start here, tweak in field tests)
struct MotionCfg {
  float gyroStillRad = 0.08f;      // |ω| below this → still (rad/s)
  float accelStillG  = 0.05f;      // |a|-1g below this → still
  uint32_t stillHoldMs = 800;      // must satisfy for this long

  // Step detection (walk/run)
  float stepMinPeakG = 1.12f;      // peak threshold (after smoothing)
  uint16_t stepMinISI = 250;       // min time between steps (ms)
  uint16_t stepMaxISI = 1200;      // max time (older than this resets)

  // Filters
  float accelAlpha = 0.2f;         // EWMA for accel magnitude smoothing
  float yawAlpha   = 0.02f;        // LPF on gyro yaw bias track

  // Output cadence
  uint32_t emitEveryMs = 200;      // JSON output rate
};

enum class MotionState : uint8_t {
  Unknown = 0, Still, Walking, Running, Jerk
};

struct MotionOut {
  MotionState state = MotionState::Unknown;
  uint32_t steps = 0;
  float stepRateHz = 0.0f;         // steps per second, EWMA
  float yawRad = 0.0f;             // integrated heading (relative)
  float yawRateRad = 0.0f;         // instantaneous yaw rate
  float accelMagG = 1.0f;          // |a| in g (smoothed)
  bool  zupt = false;              // zero-velocity update true this tick
};

class MotionLogic {
public:
  MotionLogic(ImuReader& imu, const MotionCfg& cfg = {}) :
    _imu(imu), _cfg(cfg) {}

  void begin();
  void update();              // call in loop()
  const MotionOut& last() const { return _out; }

  // Optional: change output cadence or thresholds at runtime
  void setEmitInterval(uint32_t ms) { _cfg.emitEveryMs = ms; }
  void setSamplingInterval(uint32_t ms); // forward to ImuReader

private:
  ImuReader& _imu;
  MotionCfg _cfg;
  MotionOut _out;

  // Calibration / bias
  bool _calDone = false;
  float _gyroBiasZ = 0.0f;

  // Timing
  uint32_t _tPrev = 0;
  uint32_t _lastEmit = 0;
  uint32_t _stillSince = 0;

  // Step detection
  uint32_t _lastStepMs = 0;
  float _stepRateEwma = 0.0f;

  // Filters
  float _accelMagSmoothed = 1.0f;

  // Helpers
  void calibrateIfStill(const ImuSample& s, uint32_t now);
  void integrateYaw(const ImuSample& s, float dt);
  void updateState(const ImuSample& s, uint32_t now);
  void maybeEmit(uint32_t now);
  bool maybeStep(uint32_t now, float accelMagG);
  bool isStill(const ImuSample& s, uint32_t now, bool markHold);
  void emitJson();
};