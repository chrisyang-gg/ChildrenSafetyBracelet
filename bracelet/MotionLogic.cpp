#include "MotionLogic.h"

void MotionLogic::begin() {
  _tPrev = millis();
  _lastEmit = _tPrev;
  _stillSince = _tPrev;
}

void MotionLogic::setSamplingInterval(uint32_t ms) {
  _imu.setIntervalMs(ms);
}

void MotionLogic::update() {
  _imu.update();
  uint32_t now = millis();
  float dt = (now - _tPrev) * 1e-3f;
  if (dt <= 0) { _tPrev = now; return; }

  auto s = _imu.last();
  if (!s.valid) { _tPrev = now; return; }

  // accel magnitude (in g), smooth
  float ax = s.accel.x / 9.80665f;
  float ay = s.accel.y / 9.80665f;
  float az = s.accel.z / 9.80665f;
  float amag = sqrtf(ax*ax + ay*ay + az*az);
  _accelMagSmoothed = _cfg.accelAlpha * amag + (1.f - _cfg.accelAlpha) * _accelMagSmoothed;

  // Calibrate gyro bias when clearly still
  calibrateIfStill(s, now);

  // Integrate yaw (remove bias)
  integrateYaw(s, dt);

  // Update motion state + step detection
  updateState(s, now);

  // Emit JSON snapshot at a steady rate
  maybeEmit(now);

  _tPrev = now;
}

void MotionLogic::calibrateIfStill(const ImuSample& s, uint32_t now) {
  // Check stillness without enforcing hold (quick check)
  float gz = s.gyro.z; // rad/s
  float gx = s.gyro.x, gy = s.gyro.y;
  float gnorm = sqrtf(gx*gx + gy*gy + gz*gz);
  float amag = _accelMagSmoothed;

  bool still = (gnorm < _cfg.gyroStillRad) && (fabsf(amag - 1.0f) < _cfg.accelStillG);

  static float biasAcc = 0.0f;
  static uint16_t biasN = 0;

  if (still) {
    // slow-track bias while still
    biasAcc += s.gyro.z;
    biasN++;
    if (biasN >= 100) {                 // ~100 samples of stillness
      _gyroBiasZ = biasAcc / (float)biasN;
      _calDone = true;
      // keep tracking slowly to adapt
      biasAcc *= 0.9f; biasN = (uint16_t)(biasN * 0.9f);
    }
  } else {
    // decay memory
    biasAcc *= 0.99f; if (biasN) biasN--;
  }
}

void MotionLogic::integrateYaw(const ImuSample& s, float dt) {
  float wz = s.gyro.z - _gyroBiasZ;
  // Track very slow bias wander
  _gyroBiasZ = (1.f - _cfg.yawAlpha) * _gyroBiasZ + _cfg.yawAlpha * s.gyro.z;

  _out.yawRateRad = wz;
  _out.yawRad += wz * dt;
  // bound to [-pi, pi] optional
  if (_out.yawRad > PI) _out.yawRad -= 2*PI;
  else if (_out.yawRad < -PI) _out.yawRad += 2*PI;
}

bool MotionLogic::isStill(const ImuSample& s, uint32_t now, bool markHold) {
  float gx = s.gyro.x, gy = s.gyro.y, gz = s.gyro.z;
  float gnorm = sqrtf(gx*gx + gy*gy + gz*gz);
  bool still = (gnorm < _cfg.gyroStillRad) && (fabsf(_accelMagSmoothed - 1.0f) < _cfg.accelStillG);

  if (!markHold) return still;

  if (still) {
    if (now - _stillSince >= _cfg.stillHoldMs) return true;
    // else still counting
  } else {
    _stillSince = now;
  }
  return false;
}

bool MotionLogic::maybeStep(uint32_t now, float accelMagG) {
  static float lastVal = 1.0f;
  static bool armed = true;

  // Simple peak detection around 1g
  bool peak = (accelMagG > _cfg.stepMinPeakG) && armed;
  bool stepped = false;

  if (peak) {
    uint32_t isi = now - _lastStepMs;
    if (isi >= _cfg.stepMinISI && isi <= _cfg.stepMaxISI) {
      _out.steps++;
      _lastStepMs = now;
      // EWMA step rate
      float rate = 1000.0f / max<uint32_t>(isi, 1);
      _stepRateEwma = 0.3f * rate + 0.7f * _stepRateEwma;
      stepped = true;
    } else if (isi > _cfg.stepMaxISI) {
      _lastStepMs = now;
      _stepRateEwma *= 0.8f;
    }
    armed = false;  // wait to go below 1g before next peak
  } else if (accelMagG < 1.0f) {
    armed = true;
  }

  lastVal = accelMagG;
  return stepped;
}

void MotionLogic::updateState(const ImuSample& s, uint32_t now) {
  _out.accelMagG = _accelMagSmoothed;
  _out.zupt = false;

  // Zero-velocity update if fully still for hold time
  bool heldStill = isStill(s, now, /*markHold*/true);
  if (heldStill) {
    _out.zupt = true;
  }

  // Steps & cadence
  bool tookStep = maybeStep(now, _accelMagSmoothed);

  // Classify state
  if (heldStill) {
    _out.state = MotionState::Still;
    _stepRateEwma *= 0.8f;
  } else {
    // rough gating by cadence
    if (_stepRateEwma >= 2.5f) _out.state = MotionState::Running;   // > 2.5 Hz
    else if (_stepRateEwma >= 0.9f) _out.state = MotionState::Walking; // ~1..2.5 Hz
    else {
      // sudden spikes without cadence = jerk
      if (fabsf(_accelMagSmoothed - 1.0f) > 0.25f) _out.state = MotionState::Jerk;
      else _out.state = MotionState::Walking; // soft default if moving but low cadence
    }
  }

  _out.stepRateHz = _stepRateEwma;
}

void MotionLogic::maybeEmit(uint32_t now) {
  if (now - _lastEmit < _cfg.emitEveryMs) return;
  _lastEmit = now;
  emitJson();
}

static const char* stateToStr(MotionState s) {
  switch (s) {
    case MotionState::Still: return "still";
    case MotionState::Walking: return "walking";
    case MotionState::Running: return "running";
    case MotionState::Jerk: return "jerk";
    default: return "unknown";
  }
}

void MotionLogic::emitJson() {
  Serial.print(F("{\"t\":"));            Serial.print(millis());
  Serial.print(F(",\"state\":\""));      Serial.print(stateToStr(_out.state)); Serial.print(F("\""));
  Serial.print(F(",\"steps\":"));        Serial.print(_out.steps);
  Serial.print(F(",\"rate_hz\":"));      Serial.print(_out.stepRateHz, 2);
  Serial.print(F(",\"yaw\":"));          Serial.print(_out.yawRad, 3);
  Serial.print(F(",\"yaw_rate\":"));     Serial.print(_out.yawRateRad, 3);
  Serial.print(F(",\"amag_g\":"));       Serial.print(_out.accelMagG, 3);
  Serial.print(F(",\"zupt\":"));         Serial.print(_out.zupt ? F("true") : F("false"));
  Serial.println(F("}"));
}