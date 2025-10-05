#pragma once
#include <Arduino.h>

// Uncomment to use simple DAC beeps on ESP32 pin 25 (as in your sketch)
// Comment it out to use PWM tone via LEDC (more stable tones).
#define SIREN_USE_DAC

#ifdef SIREN_USE_DAC
  #include "driver/dac.h"
#endif

class Siren {
public:
  Siren(uint8_t buttonPin, uint8_t outPin, uint32_t holdMs = 5000)
  : _btn(buttonPin), _out(outPin), _duration(holdMs) {}

  void begin() {
    pinMode(_btn, INPUT_PULLUP);
#ifdef SIREN_USE_DAC
    // DAC channel on GPIO25 is DAC1, on GPIO26 is DAC2
    if (_out == 25) dac_output_enable(DAC_CHANNEL_1);
    else if (_out == 26) dac_output_enable(DAC_CHANNEL_2);
#else
    // LEDC tone output on _out
    ledcSetup(_ch, _baseHz, 10);      // 10-bit resolution
    ledcAttachPin(_out, _ch);
    ledcWrite(_ch, 512);              // 50% duty
    ledcWriteTone(_ch, 0);            // off
#endif
    Serial.println("[SIREN] ready");
  }

  void update() {
    // Button triggers siren
    const bool pressed = (digitalRead(_btn) == LOW);
    const uint32_t now = millis();

    // Basic debounce
    if (pressed && (now - _lastBtnMs > 50)) {
      _lastBtnMs = now;
      if (!_active) {
        start();
      }
    }

    if (_active) runSweep(now);
  }

  bool active() const { return _active; }

private:
  // Start siren
  void start() {
    Serial.println("[SIREN] Button pressed! Playing siren...");
    _active = true;
    _startMs = millis();
    _phase = 0;          // 0: up-sweep, 1: down-sweep
    _freq = 400;
    _lastStep = 0;
#ifdef SIREN_USE_DAC
    _dacLevel = 0;
#endif
  }

  // Generate beeps/tone non-blockingly
  void runSweep(uint32_t now) {
    // Stop after duration
    if (now - _startMs >= _duration) {
      stop();
      return;
    }

    // Step frequency every few ms
    if (now - _lastStep < _stepMs) return;
    _lastStep = now;

    // Sweep 400 -> 1000 -> 400
    if (_phase == 0) {
      _freq += 20;
      if (_freq >= 1000) { _freq = 1000; _phase = 1; }
    } else {
      _freq -= 20;
      if (_freq <= 400)  { _freq = 400; _phase = 0; }
    }

#ifdef SIREN_USE_DAC
    // Simple DAC "tone": we’ll approximate a square-ish wave quickly.
    // This is coarse, but mirrors your dacWrite approach intent.
    // Generate for a tiny burst proportional to _burstMs
    const uint32_t start = micros();
    while (micros() - start < _burstUs) {
      // Toggle DAC level quickly to create audible buzz
      _dacLevel = (_dacLevel > 0) ? 0 : 255;
      if (_out == 25) dac_output_voltage(DAC_CHANNEL_1, _dacLevel);
      else if (_out == 26) dac_output_voltage(DAC_CHANNEL_2, _dacLevel);
    }
#else
    // Use hardware tone
    ledcWriteTone(_ch, _freq);
#endif
  }

  void stop() {
#ifdef SIREN_USE_DAC
    // Silence DAC
    if (_out == 25) dac_output_voltage(DAC_CHANNEL_1, 0);
    else if (_out == 26) dac_output_voltage(DAC_CHANNEL_2, 0);
#else
    ledcWriteTone(_ch, 0);
#endif
    _active = false;
    Serial.println("[SIREN] done");
  }

  // Pins / config
  uint8_t _btn, _out;
  uint32_t _duration;

  // State
  bool _active = false;
  uint32_t _startMs = 0;
  uint8_t _phase = 0;
  int _freq = 400;

  // Timing
  uint32_t _lastBtnMs = 0;
  uint32_t _lastStep = 0;
  const uint32_t _stepMs = 5;     // how quickly to change freq

#ifdef SIREN_USE_DAC
  // Crude DAC “buzz” time-slice (microseconds per update)
  const uint32_t _burstUs = 1000;
  uint8_t _dacLevel = 0;
#else
  // LEDC params
  const uint8_t _ch = 0;
  const uint32_t _baseHz = 1000;
#endif
};