#define BUTTON_PIN 14
#define SPEAKER_PIN 25

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.println("Ready for siren test");
}

void loop() {
  if (digitalRead(BUTTON_PIN) == LOW) {
    Serial.println("Button pressed! Playing siren...");
    playSiren();
    delay(1000);
  }
}

void playTone(int frequency, int duration) {
  int delayMicros = 1000000 / (frequency * 2);
  int cycles = frequency * duration / 1000;
  for (int i = 0; i < cycles; i++) {
    dacWrite(SPEAKER_PIN, 255);
    delayMicroseconds(delayMicros);
    dacWrite(SPEAKER_PIN, 0);
    delayMicroseconds(delayMicros);
  }
}

void playSiren() {
  unsigned long startTime = millis();
  while (millis() - startTime < 5000) {
    for (int freq = 400; freq <= 1000; freq += 20) {
      playTone(freq, 5);
    }
    for (int freq = 1000; freq >= 400; freq -= 20) {
      playTone(freq, 5);
    }
  }
  dacWrite(SPEAKER_PIN, 0);
  Serial.println("Siren done");
}
