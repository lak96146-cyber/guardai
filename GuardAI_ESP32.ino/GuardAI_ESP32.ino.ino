
#define BUZZER_PIN 25
#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  Serial.println("GuardAI ESP32 Ready");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "ALERT") {
      digitalWrite(BUZZER_PIN, HIGH);
      digitalWrite(LED_PIN, HIGH);
      Serial.println("ALERT ACTIVE");
    } 
    else if (command == "CLEAR") {
      digitalWrite(BUZZER_PIN, LOW);
      digitalWrite(LED_PIN, LOW);
      Serial.println("ALERT CLEARED");
    }
  }
}
