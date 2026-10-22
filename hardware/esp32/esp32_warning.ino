
const int LED_PIN = 2;
const int BUZZER_PIN = 4;

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("GUARDAI_ESP32_READY");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toUpperCase();

    if (command == "ALERT_ON") {
      digitalWrite(LED_PIN, HIGH);
      digitalWrite(BUZZER_PIN, HIGH);
      Serial.println("ALERT_ACTIVE");
    }
    else if (command == "ALERT_OFF") {
      digitalWrite(LED_PIN, LOW);
      digitalWrite(BUZZER_PIN, LOW);
      Serial.println("ALERT_CLEARED");
    }
    else if (command == "STATUS") {
      Serial.println("GUARDAI_ESP32_READY");
    }
  }
}
