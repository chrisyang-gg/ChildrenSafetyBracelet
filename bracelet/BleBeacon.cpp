#include "BleBeacon.h"

// 20 bytes
struct __attribute__((packed)) Event {
  uint32_t t_ms;
  uint8_t  state;          // 0 unk,1 still,2 walk,3 run,4 jerk
  uint8_t  flags;          // bit0: zupt, bit1: burst_on
  uint16_t steps;
  int16_t  yaw_mrad;
  int16_t  yaw_rate_mrads;
  uint16_t amag_mg;        // |a| * 1000
  uint16_t step_rate_mHz;  // steps/s * 1000
  uint16_t seq;
};

// 20 bytes per raw sample
struct __attribute__((packed)) ImuRaw {
  uint32_t t_ms;
  int16_t  ax_mg, ay_mg, az_mg;
  int16_t  gx_mrads, gy_mrads, gz_mrads;
  uint16_t seq;
};

// 4 bytes control
struct __attribute__((packed)) Ctrl {
  uint8_t mode;   // 0=EVENT_ONLY, 1=RAW_BURST, 2=RAW_CONT
  uint8_t hz;     // 10/20/50/100...
  uint8_t secs;   // for RAW_BURST
  uint8_t band;   // optional: 0 Far,1 Near,2 Immediate
};