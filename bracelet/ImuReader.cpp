#include "ImuReader.h"

bool ImuReader::begin() {
  Serial.println("[IMU] init");
  if (!_mpu.begin()) {
    Serial.println("[IMU] Failed to find MPU6050 chip");
    return false;
  }
  _mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  _mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  _mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  _last = millis();
  Serial.println("[IMU] ready");
  return true;
}

void ImuReader::update() {
  const uint32_t now = millis();
  if (now - _last < _interval) return;
  _last = now;

  // Simplest + most robust with Adafruit driver: fetch once, ignore temp.
  sensors_event_t a, g, temp_ignored;
  _mpu.getEvent(&a, &g, &temp_ignored);

  _sample.accel = a.acceleration; // m/s^2
  _sample.gyro  = g.gyro;         // rad/s
  _sample.valid = true;

  if (_print) {
    Serial.print("[IMU] Acc (m/s^2) X:"); Serial.print(_sample.accel.x);
    Serial.print(" Y:"); Serial.print(_sample.accel.y);
    Serial.print(" Z:"); Serial.println(_sample.accel.z);

    Serial.print("[IMU] Gyr (rad/s)  X:"); Serial.print(_sample.gyro.x);
    Serial.print(" Y:"); Serial.print(_sample.gyro.y);
    Serial.print(" Z:"); Serial.println(_sample.gyro.z);
    Serial.println();
  }
}

void ImuReader::setIntervalMs(uint32_t ms) { _interval = ms; }