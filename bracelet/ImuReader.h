#pragma once
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

struct ImuSample {
  sensors_vec_t accel;  // m/s^2
  sensors_vec_t gyro;   // rad/s
  bool valid = false;
};

class ImuReader {
public:
  explicit ImuReader(uint32_t intervalMs = 500)
  : _interval(intervalMs) {}

  bool begin();
  void update();
  ImuSample last() const { return _sample; }

  // Optional: control printing from outside
  void setPrinting(bool enabled) { _print = enabled; }
  void setIntervalMs(uint32_t ms);

private:
  Adafruit_MPU6050 _mpu;
  uint32_t _interval;
  uint32_t _last = 0;
  bool _print = true;

  ImuSample _sample;
};