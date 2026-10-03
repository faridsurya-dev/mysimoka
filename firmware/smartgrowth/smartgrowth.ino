/*
 * MySimoka SmartGrowth firmware (ESP32 + HX711 + height sensor, BLE)
 * Protocol: docs/ble-smartgrowth-protocol.md (protocol version 1)
 *
 * Replaces the team's v1.1 sketch (Classic Bluetooth SPP "TimbanganBadan",
 * JSON lines), which the MySimoka app cannot see: the app only speaks BLE,
 * and iPhones do not support SPP. Pins, calibration constants and the
 * empty -> measuring -> hold flow are taken over from v1.1.
 *
 * Fixes compared with v1.1:
 *   - a missing or broken height sensor no longer halts the device
 *     (v1.1 looped forever in setup()); the unit keeps weighing
 *   - VL53L0X ranging is actually started (continuous mode)
 *   - tare no longer subtracts the zero offset twice (weight stuck at 0)
 *   - tare and calibration are stored in flash (NVS) and survive a reboot
 *   - weight and height calibration work (Serial commands, see below)
 *
 * Board: "ESP32 Dev Module" (ESP32 DevKit V1, ESP32-WROOM-32).
 * Libraries (Arduino Library Manager):
 *   - NimBLE-Arduino (h2zero) 2.x
 *   - Adafruit_VL53L0X
 * The HX711 is read directly (no library): the common HX711 libraries block
 * forever in begin()/read() when no HX711 is connected.
 *
 * Serial monitor (115200 baud, line ending "Newline"):
 *   t            tare (platform empty)
 *   c 10.00      weight calibration with a 10.00 kg reference on the platform
 *   h 100.0      height calibration with a 100.0 cm reference block
 *   r            reset calibration to the defaults below
 *   i            print status
 */

#include <Arduino.h>
#include <climits>
#include <NimBLEDevice.h>
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>

// ---------------------------------------------------------------------------
// Hardware configuration (match the PCB)
// ---------------------------------------------------------------------------

// HX711 load cell amplifier (from v1.1).
#define HX711_DT_PIN 33
#define HX711_SCK_PIN 32

// Status LEDs (from v1.1). -1 disables a LED.
#define LED_READY_PIN 25    // blinks slowly: platform empty, ready
#define LED_MEASURE_PIN 26  // blinks fast: measuring
#define LED_HOLD_PIN 27     // on: result held
#define LED_BLE_PIN 14      // on: phone connected

// Height sensor:
//   HEIGHT_SENSOR_AUTO   VL53L0X on I2C if found, else Sharp if SHARP_ADC_PIN >= 0, else none
//   HEIGHT_SENSOR_SHARP  Sharp GP2Y0A02YK0F (analog, 20-150 cm) only
//   HEIGHT_SENSOR_NONE   weight-only unit
#define HEIGHT_SENSOR_NONE 0
#define HEIGHT_SENSOR_AUTO 1
#define HEIGHT_SENSOR_SHARP 2
#define HEIGHT_SENSOR HEIGHT_SENSOR_AUTO

#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// Sharp output on an ADC1 pin (32-39; ADC2 is not reliable with the radio).
// The sensor runs on 5 V but its output stays below ~2.8 V, safe for the ESP32.
// -1 = not fitted.
#define SHARP_ADC_PIN -1

// Mounting (v1.1 geometry: sensor on the platform pointing UP at a board held
// on the child's head, height = distance + offset). Use HEIGHT_MOUNT_DOWN for
// a sensor above the child pointing down (height = offset - distance).
#define HEIGHT_MOUNT_UP 0
#define HEIGHT_MOUNT_DOWN 1
#define HEIGHT_MOUNT HEIGHT_MOUNT_UP

// Optional battery sense through a divider on an ADC1 pin. -1 = none.
#define BATTERY_ADC_PIN -1
#define BATTERY_DIVIDER_RATIO 2.0f  // Vbat = Vadc * ratio (100k/100k divider)

// ---------------------------------------------------------------------------
// Calibration defaults (overridden by values saved in flash)
// ---------------------------------------------------------------------------

#define DEFAULT_ZERO_OFFSET 1355500L  // HX711 raw value with empty platform (v1.1)
#define DEFAULT_CAL_FACTOR 23666.0f   // raw units per kg (v1.1)
#define DEFAULT_HEIGHT_OFFSET_CM 0.0f // calibrate with "h <cm>"

// ---------------------------------------------------------------------------
// Firmware identity
// ---------------------------------------------------------------------------

#define FW_MAJOR 2
#define FW_MINOR 0
#define FW_PATCH 0
// Serial number in Device Info. Empty = "SG-" + last 3 bytes of the MAC.
#define SERIAL_NUMBER ""

// ---------------------------------------------------------------------------
// Protocol (do not change without bumping the protocol version)
// ---------------------------------------------------------------------------

#define PROTOCOL_VERSION 1
#define SG_SERVICE_UUID "519e0001-59fe-44b5-828f-34822e2361a9"
#define SG_MEASUREMENT_UUID "519e0002-59fe-44b5-828f-34822e2361a9"
#define SG_DEVICE_INFO_UUID "519e0003-59fe-44b5-828f-34822e2361a9"
#define SG_CONTROL_UUID "519e0004-59fe-44b5-828f-34822e2361a9"
#define SG_STATUS_UUID "519e0005-59fe-44b5-828f-34822e2361a9"

// Status characteristic (read + notify), additive to protocol v1.
#define STATUS_VERSION 1
#define ST_HX711_OK 0x01         // HX711 delivered a sample in the last second
#define ST_HEIGHT_PRESENT 0x02   // a height sensor was detected at boot
#define ST_HEIGHT_READING 0x04   // the height sensor gave a valid reading recently
#define ST_BATTERY_SENSE 0x08
#define ST_WEIGHT_CALIBRATED 0x10  // weight factor set with "c <kg>"
#define ST_ZERO_SET 0x20           // tare done (boot auto-tare, "t" or BLE)
#define STATUS_PERIOD_MS 5000

#define FLAG_WEIGHT 0x01
#define FLAG_HEIGHT 0x02
#define FLAG_STABLE 0x04
#define FLAG_BATTERY 0x08

#define CMD_TARE 0x01
#define CMD_START 0x02
#define CMD_STOP 0x03

#define WEIGHT_MIN_KG 2.0f
#define WEIGHT_MAX_KG 200.0f
#define HEIGHT_MIN_CM 45.0f
#define HEIGHT_MAX_CM 220.0f

// Measuring
#define PERSON_KG 2.0f            // measuring starts above this
#define EMPTY_KG 1.0f             // platform considered empty below this
#define AUTO_TARE_MAX_KG 3.0f     // boot auto-tare only when the reading is this close to zero
#define MEDIAN_SIZE 5             // spike filter before the stability check
#define WEIGHT_WINDOW 8           // ~0.8 s at the HX711 default 10 SPS
#define HEIGHT_WINDOW 5
#define WEIGHT_STABLE_TOL_KG 0.05f
#define HEIGHT_STABLE_TOL_CM 0.5f
#define MEASURING_NOTIFY_MS 200   // <= 5 Hz
#define HOLD_REPEAT_MS 1000       // repeat the held result at most 1x/s
#define HEIGHT_TIMEOUT_MS 3000    // then send weight only
#define HX711_TIMEOUT_MS 1000

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

enum State { STATE_EMPTY, STATE_MEASURING, STATE_HOLD };

enum HeightSource { HEIGHT_NONE, HEIGHT_VL53L0X, HEIGHT_SHARP };

Adafruit_VL53L0X tof;
Preferences prefs;

HeightSource heightSource = HEIGHT_NONE;
long zeroOffset = DEFAULT_ZERO_OFFSET;
float calFactor = DEFAULT_CAL_FACTOR;
float heightOffsetCm = DEFAULT_HEIGHT_OFFSET_CM;
bool weightCalibrated = false;
bool zeroSet = false;
unsigned long lastDistanceMs = 0;

NimBLECharacteristic* weightMeasurementChar = nullptr;  // 0x2A9D
NimBLECharacteristic* sgMeasurementChar = nullptr;
NimBLECharacteristic* sgStatusChar = nullptr;

volatile bool clientConnected = false;
volatile bool clientJustConnected = false;
volatile bool tareRequested = false;
volatile bool startRequested = false;
volatile bool measuringEnabled = true;

State state = STATE_EMPTY;
uint16_t sequenceNumber = 0;
unsigned long stateSinceMs = 0;
unsigned long lastMeasuringNotifyMs = 0;
unsigned long lastHoldNotifyMs = 0;
unsigned long lastWeightReadyMs = 0;
float heldWeightKg = NAN;
float heldHeightCm = NAN;

float medianBuf[MEDIAN_SIZE];
uint8_t medianCount = 0, medianIndex = 0;
float weightWindow[WEIGHT_WINDOW];
uint8_t weightCount = 0;
float heightWindow[HEIGHT_WINDOW];
uint8_t heightCount = 0;
float lastWeightKg = NAN;
float lastDistanceCm = NAN;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

static void ledWrite(int pin, bool on) {
  if (pin >= 0) digitalWrite(pin, on ? HIGH : LOW);
}

static void pushWindow(float* window, uint8_t size, uint8_t& count, float value) {
  for (int i = size - 1; i > 0; i--) window[i] = window[i - 1];
  window[0] = value;
  if (count < size) count++;
}

// Stable = window full and every sample within +-tolerance of the mean.
static bool windowStable(const float* window, uint8_t size, uint8_t count, float tolerance) {
  if (count < size) return false;
  float lo = window[0], hi = window[0];
  for (int i = 1; i < size; i++) {
    lo = min(lo, window[i]);
    hi = max(hi, window[i]);
  }
  return (hi - lo) <= 2 * tolerance;
}

static float windowAverage(const float* window, uint8_t count) {
  if (count == 0) return NAN;
  float sum = 0;
  for (int i = 0; i < count; i++) sum += window[i];
  return sum / count;
}

static float pushMedian(float value) {
  medianBuf[medianIndex] = value;
  medianIndex = (medianIndex + 1) % MEDIAN_SIZE;
  if (medianCount < MEDIAN_SIZE) medianCount++;
  float sorted[MEDIAN_SIZE];
  memcpy(sorted, medianBuf, sizeof(float) * medianCount);
  for (int i = 1; i < medianCount; i++) {
    float v = sorted[i];
    int j = i - 1;
    while (j >= 0 && sorted[j] > v) {
      sorted[j + 1] = sorted[j];
      j--;
    }
    sorted[j + 1] = v;
  }
  return sorted[medianCount / 2];
}

static void resetFilters() {
  medianCount = medianIndex = 0;
  weightCount = 0;
  heightCount = 0;
}

static void enterState(State next) {
  state = next;
  stateSinceMs = millis();
  if (next != STATE_HOLD) {
    heldWeightKg = NAN;
    heldHeightCm = NAN;
  }
  const char* names[] = {"empty", "measuring", "hold"};
  Serial.printf("state: %s\n", names[next]);
}

// ---------------------------------------------------------------------------
// Calibration storage
// ---------------------------------------------------------------------------

static void loadCalibration() {
  prefs.begin("smartgrowth", true);
  zeroOffset = prefs.getLong("zero", DEFAULT_ZERO_OFFSET);
  calFactor = prefs.getFloat("factor", DEFAULT_CAL_FACTOR);
  heightOffsetCm = prefs.getFloat("hoffset", DEFAULT_HEIGHT_OFFSET_CM);
  weightCalibrated = prefs.getBool("calibrated", false);
  zeroSet = prefs.isKey("zero");
  prefs.end();
  if (calFactor == 0 || isnan(calFactor)) calFactor = DEFAULT_CAL_FACTOR;
}

static void saveCalibration() {
  prefs.begin("smartgrowth", false);
  prefs.putLong("zero", zeroOffset);
  prefs.putFloat("factor", calFactor);
  prefs.putFloat("hoffset", heightOffsetCm);
  prefs.putBool("calibrated", weightCalibrated);
  prefs.end();
}

// ---------------------------------------------------------------------------
// HX711 (bit-banged, never blocks)
// ---------------------------------------------------------------------------

static portMUX_TYPE hx711Mux = portMUX_INITIALIZER_UNLOCKED;

static void hx711Begin() {
  // Pull-up: a missing HX711 reads HIGH = "not ready" instead of floating.
  pinMode(HX711_DT_PIN, INPUT_PULLUP);
  pinMode(HX711_SCK_PIN, OUTPUT);
  digitalWrite(HX711_SCK_PIN, LOW);
}

static bool hx711Ready() {
  return digitalRead(HX711_DT_PIN) == LOW;
}

// Reads one 24-bit sample (channel A, gain 128). Call only when hx711Ready().
// SCK high must stay < 60 us or the HX711 powers down, hence the critical section.
static int32_t hx711ReadRaw() {
  uint32_t value = 0;
  portENTER_CRITICAL(&hx711Mux);
  for (int i = 0; i < 24; i++) {
    digitalWrite(HX711_SCK_PIN, HIGH);
    delayMicroseconds(1);
    value = (value << 1) | (digitalRead(HX711_DT_PIN) ? 1 : 0);
    digitalWrite(HX711_SCK_PIN, LOW);
    delayMicroseconds(1);
  }
  digitalWrite(HX711_SCK_PIN, HIGH);  // 25th pulse: next sample channel A, gain 128
  delayMicroseconds(1);
  digitalWrite(HX711_SCK_PIN, LOW);
  portEXIT_CRITICAL(&hx711Mux);
  if (value & 0x800000) value |= 0xFF000000;  // sign-extend
  return (int32_t)value;
}

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------

// NAN when the HX711 has no new sample (it runs at 10 SPS).
static float readWeightKg() {
  if (!hx711Ready()) return NAN;
  lastWeightReadyMs = millis();
  return (hx711ReadRaw() - zeroOffset) / calFactor;
}

static long readRawAverage(int samples) {
  long sum = 0;
  int got = 0;
  unsigned long start = millis();
  while (got < samples && millis() - start < (unsigned long)samples * 200) {
    if (hx711Ready()) {
      sum += hx711ReadRaw();
      got++;
    }
    delay(5);
  }
  return got ? sum / got : LONG_MIN;
}

static bool tare() {
  long raw = readRawAverage(20);
  if (raw == LONG_MIN) return false;
  zeroOffset = raw;
  zeroSet = true;
  saveCalibration();
  resetFilters();
  return true;
}

static void setupHeightSensor() {
#if HEIGHT_SENSOR == HEIGHT_SENSOR_AUTO
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (tof.begin(VL53L0X_I2C_ADDR, false, &Wire, Adafruit_VL53L0X::VL53L0X_SENSE_LONG_RANGE)) {
    tof.startRangeContinuous(50);
    heightSource = HEIGHT_VL53L0X;
    Serial.println("height: VL53L0X (long range)");
    return;
  }
  Serial.println("height: VL53L0X not found");
#endif
#if HEIGHT_SENSOR == HEIGHT_SENSOR_AUTO || HEIGHT_SENSOR == HEIGHT_SENSOR_SHARP
  if (SHARP_ADC_PIN >= 0) {
    analogSetPinAttenuation(SHARP_ADC_PIN, ADC_11db);
    heightSource = HEIGHT_SHARP;
    Serial.println("height: Sharp GP2Y0A02");
    return;
  }
#endif
  heightSource = HEIGHT_NONE;
  Serial.println("height: none (weight only)");
}

// Distance from the sensor to the head board in cm, NAN when invalid.
static float readDistanceCm() {
  switch (heightSource) {
    case HEIGHT_VL53L0X: {
      if (!tof.isRangeComplete()) return NAN;
      uint16_t mm = tof.readRangeResult();
      if (tof.readRangeStatus() != 0 || mm == 0 || mm >= 8190) return NAN;
      return mm / 10.0f;
    }
    case HEIGHT_SHARP: {
#if SHARP_ADC_PIN >= 0
      uint32_t mv = 0;
      for (int i = 0; i < 8; i++) mv += analogReadMilliVolts(SHARP_ADC_PIN);
      float v = mv / 8 / 1000.0f;
      if (v < 0.4f) return NAN;  // beyond ~150 cm: nothing in range
      // Datasheet curve fit, valid 20-150 cm.
      float cm = 60.374f * powf(v, -1.16f);
      if (cm < 20.0f || cm > 150.0f) return NAN;
      return cm;
#else
      return NAN;
#endif
    }
    default:
      return NAN;
  }
}

static float distanceToHeightCm(float distanceCm) {
  if (isnan(distanceCm)) return NAN;
#if HEIGHT_MOUNT == HEIGHT_MOUNT_DOWN
  return heightOffsetCm - distanceCm;
#else
  return distanceCm + heightOffsetCm;
#endif
}

static int readBatteryPct() {
#if BATTERY_ADC_PIN >= 0
  float v = analogReadMilliVolts(BATTERY_ADC_PIN) / 1000.0f * BATTERY_DIVIDER_RATIO;
  // Rough Li-ion curve: 3.3 V = 0 %, 4.2 V = 100 %.
  int pct = (int)((v - 3.3f) / (4.2f - 3.3f) * 100.0f);
  return constrain(pct, 0, 100);
#else
  return -1;
#endif
}

// ---------------------------------------------------------------------------
// BLE
// ---------------------------------------------------------------------------

static void notifyMeasurement(float weightKg, float heightCm, bool stable) {
  if (!clientConnected || !measuringEnabled) return;

  uint8_t frame[8];
  uint8_t flags = 0;
  uint16_t weightRaw = 0xFFFF;
  uint16_t heightRaw = 0xFFFF;

  if (!isnan(weightKg) && weightKg >= WEIGHT_MIN_KG && weightKg <= WEIGHT_MAX_KG) {
    flags |= FLAG_WEIGHT;
    weightRaw = (uint16_t)lroundf(weightKg * 100.0f);
  }
  if (!isnan(heightCm) && heightCm >= HEIGHT_MIN_CM && heightCm <= HEIGHT_MAX_CM) {
    flags |= FLAG_HEIGHT;
    heightRaw = (uint16_t)lroundf(heightCm * 10.0f);
  }
  if (stable && (flags & (FLAG_WEIGHT | FLAG_HEIGHT))) flags |= FLAG_STABLE;

  size_t length = 7;
  int battery = readBatteryPct();
  if (battery >= 0) {
    flags |= FLAG_BATTERY;
    frame[7] = (uint8_t)battery;
    length = 8;
  }

  frame[0] = flags;
  frame[1] = weightRaw & 0xFF;
  frame[2] = weightRaw >> 8;
  frame[3] = heightRaw & 0xFF;
  frame[4] = heightRaw >> 8;
  frame[5] = sequenceNumber & 0xFF;
  frame[6] = sequenceNumber >> 8;
  sequenceNumber++;

  sgMeasurementChar->setValue(frame, length);
  sgMeasurementChar->notify();

  // Standard Weight Scale (0x2A9D): final weight only, SI, 0.005 kg resolution.
  if ((flags & FLAG_STABLE) && (flags & FLAG_WEIGHT)) {
    uint16_t ws = (uint16_t)lroundf(weightKg / 0.005f);
    uint8_t wsFrame[3] = {0x00, (uint8_t)(ws & 0xFF), (uint8_t)(ws >> 8)};
    weightMeasurementChar->setValue(wsFrame, sizeof(wsFrame));
    weightMeasurementChar->indicate();
  }
}

// 5 bytes: version, sensor flags, height sensor type, state, battery (0xFF = none).
static size_t buildStatus(uint8_t* out) {
  uint8_t flags = 0;
  if (lastWeightReadyMs != 0 && millis() - lastWeightReadyMs < HX711_TIMEOUT_MS) flags |= ST_HX711_OK;
  if (heightSource != HEIGHT_NONE) flags |= ST_HEIGHT_PRESENT;
  if (lastDistanceMs != 0 && millis() - lastDistanceMs < 2000) flags |= ST_HEIGHT_READING;
  int battery = readBatteryPct();
  if (battery >= 0) flags |= ST_BATTERY_SENSE;
  if (weightCalibrated) flags |= ST_WEIGHT_CALIBRATED;
  if (zeroSet) flags |= ST_ZERO_SET;
  out[0] = STATUS_VERSION;
  out[1] = flags;
  out[2] = (uint8_t)heightSource;  // 0 none, 1 VL53L0X, 2 Sharp
  out[3] = (uint8_t)state;         // 0 empty, 1 measuring, 2 hold
  out[4] = battery >= 0 ? (uint8_t)battery : 0xFF;
  return 5;
}

// Keeps the readable value current; notifies on change or every STATUS_PERIOD_MS.
static void updateStatus() {
  static uint8_t last[5] = {0};
  static unsigned long lastSentMs = 0;
  uint8_t now[5];
  size_t length = buildStatus(now);
  bool changed = memcmp(now, last, length) != 0;
  if (!changed && millis() - lastSentMs < STATUS_PERIOD_MS) return;
  memcpy(last, now, length);
  lastSentMs = millis();
  sgStatusChar->setValue(now, length);
  if (clientConnected) sgStatusChar->notify();
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& info) override {
    clientConnected = true;
    clientJustConnected = true;
  }
  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& info, int reason) override {
    clientConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

// Runs on the BLE task: only set flags, the loop does the work.
class ControlCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    NimBLEAttValue value = c->getValue();
    if (value.size() == 0) return;
    switch (value.data()[0]) {
      case CMD_TARE: tareRequested = true; break;
      case CMD_START: startRequested = true; measuringEnabled = true; break;
      case CMD_STOP: measuringEnabled = false; break;
      default: break;  // 0x10 / 0x20 reserved, acknowledged and ignored
    }
  }
};

static void setupBle() {
  NimBLEDevice::init("SmartGrowth");
  const uint8_t* mac = NimBLEDevice::getAddress().getVal();  // little-endian
  char name[20];
  snprintf(name, sizeof(name), "SmartGrowth-%02X%02X", mac[1], mac[0]);
  NimBLEDevice::setDeviceName(name);

  char serial[17];
  if (strlen(SERIAL_NUMBER) > 0) {
    snprintf(serial, sizeof(serial), "%s", SERIAL_NUMBER);
  } else {
    snprintf(serial, sizeof(serial), "SG-%02X%02X%02X", mac[2], mac[1], mac[0]);
  }

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService* ws = server->createService(NimBLEUUID((uint16_t)0x181D));
  weightMeasurementChar =
      ws->createCharacteristic(NimBLEUUID((uint16_t)0x2A9D), NIMBLE_PROPERTY::INDICATE);

  NimBLEService* sg = server->createService(SG_SERVICE_UUID);
  sgMeasurementChar = sg->createCharacteristic(
      SG_MEASUREMENT_UUID, NIMBLE_PROPERTY::NOTIFY | NIMBLE_PROPERTY::READ);
  NimBLECharacteristic* info = sg->createCharacteristic(SG_DEVICE_INFO_UUID, NIMBLE_PROPERTY::READ);
  NimBLECharacteristic* control = sg->createCharacteristic(SG_CONTROL_UUID, NIMBLE_PROPERTY::WRITE);
  sgStatusChar = sg->createCharacteristic(SG_STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  control->setCallbacks(new ControlCallbacks());

  uint8_t infoValue[20];
  infoValue[0] = PROTOCOL_VERSION;
  infoValue[1] = FW_MAJOR;
  infoValue[2] = FW_MINOR;
  infoValue[3] = FW_PATCH;
  size_t serialLength = min((size_t)16, strlen(serial));
  memcpy(infoValue + 4, serial, serialLength);
  info->setValue(infoValue, 4 + serialLength);

  server->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  NimBLEAdvertisementData advData;
  advData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
  advData.setName(name);
  advData.addServiceUUID(NimBLEUUID((uint16_t)0x181D));
  NimBLEAdvertisementData scanData;
  scanData.addServiceUUID(NimBLEUUID(SG_SERVICE_UUID));  // 128-bit UUID: scan response
  adv->enableScanResponse(true);
  adv->setAdvertisementData(advData);
  adv->setScanResponseData(scanData);
  adv->start();

  Serial.printf("BLE: advertising as %s, serial %s\n", name, serial);
}

// ---------------------------------------------------------------------------
// LEDs
// ---------------------------------------------------------------------------

static void updateLeds() {
  unsigned long now = millis();
  ledWrite(LED_BLE_PIN, clientConnected);
  ledWrite(LED_READY_PIN, state == STATE_EMPTY && (now / 1000) % 2 == 0);
  ledWrite(LED_MEASURE_PIN, state == STATE_MEASURING && (now / 250) % 2 == 0);
  ledWrite(LED_HOLD_PIN, state == STATE_HOLD);
}

// ---------------------------------------------------------------------------
// Serial commands (calibration)
// ---------------------------------------------------------------------------

static void printStatus() {
  const char* sources[] = {"none", "VL53L0X", "Sharp"};
  Serial.printf("fw %d.%d.%d | zero=%ld factor=%.2f hoffset=%.1f | height=%s | kg=%.2f d=%.1f h=%.1f | ble=%s\n",
                FW_MAJOR, FW_MINOR, FW_PATCH, zeroOffset, calFactor, heightOffsetCm,
                sources[heightSource], lastWeightKg, lastDistanceCm,
                distanceToHeightCm(lastDistanceCm), clientConnected ? "connected" : "advertising");
}

static void handleSerialCommand(String line) {
  line.trim();
  if (line.length() == 0) return;
  char cmd = line.charAt(0);
  float arg = line.length() > 1 ? line.substring(1).toFloat() : 0;

  switch (cmd) {
    case 't':
      Serial.println(tare() ? "tare ok" : "tare failed: HX711 not responding");
      break;
    case 'c': {
      if (arg <= 0) { Serial.println("usage: c <reference kg>"); break; }
      long raw = readRawAverage(20);
      if (raw == LONG_MIN) { Serial.println("HX711 not responding"); break; }
      float factor = (raw - zeroOffset) / arg;
      if (fabsf(factor) < 1) { Serial.println("no load detected, tare first and put the weight on"); break; }
      calFactor = factor;
      weightCalibrated = true;
          saveCalibration();
      resetFilters();
      Serial.printf("weight calibrated: factor=%.2f\n", calFactor);
      break;
    }
    case 'h': {
      if (arg <= 0) { Serial.println("usage: h <reference cm>"); break; }
      float sum = 0;
      int got = 0;
      unsigned long start = millis();
      while (got < 20 && millis() - start < 5000) {
        float d = readDistanceCm();
        if (!isnan(d)) { sum += d; got++; }
        delay(60);
      }
      if (got < 10) { Serial.println("height sensor gives no stable reading"); break; }
      float distance = sum / got;
#if HEIGHT_MOUNT == HEIGHT_MOUNT_DOWN
      heightOffsetCm = arg + distance;
#else
      heightOffsetCm = arg - distance;
#endif
      saveCalibration();
      Serial.printf("height calibrated: distance=%.1f offset=%.1f\n", distance, heightOffsetCm);
      break;
    }
    case 'r':
      zeroOffset = DEFAULT_ZERO_OFFSET;
      calFactor = DEFAULT_CAL_FACTOR;
      heightOffsetCm = DEFAULT_HEIGHT_OFFSET_CM;
      weightCalibrated = false;
          saveCalibration();
      Serial.println("calibration reset to defaults");
      break;
    case 'i':
      printStatus();
      break;
    default:
      Serial.println("commands: t | c <kg> | h <cm> | r | i");
  }
}

static void pollSerial() {
  static String buffer;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (buffer.length()) handleSerialCommand(buffer);
      buffer = "";
    } else if (buffer.length() < 32) {
      buffer += c;
    }
  }
}

// ---------------------------------------------------------------------------
// Arduino entry points
// ---------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\nMySimoka SmartGrowth fw %d.%d.%d (BLE, protocol %d)\n",
                FW_MAJOR, FW_MINOR, FW_PATCH, PROTOCOL_VERSION);

  const int leds[] = {LED_READY_PIN, LED_MEASURE_PIN, LED_HOLD_PIN, LED_BLE_PIN};
  for (int pin : leds) {
    if (pin >= 0) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, LOW);
    }
  }

  loadCalibration();
  hx711Begin();
  // Re-zero only when the platform is (almost) empty, so a child standing on
  // it during power-up does not become the new zero.
  long raw = readRawAverage(10);
  if (raw == LONG_MIN) {
    Serial.println("HX711 not responding, check wiring");
  } else if (fabsf((raw - zeroOffset) / calFactor) < AUTO_TARE_MAX_KG) {
    tare();
    Serial.println("auto tare ok");
  } else {
    Serial.println("platform not empty at boot, keeping saved zero");
  }

  setupHeightSensor();
  setupBle();
  enterState(STATE_EMPTY);
  printStatus();
  Serial.println("ready (type i for status)");
}

void loop() {
  pollSerial();
  updateLeds();

  if (tareRequested) {
    tareRequested = false;
    // Refuse while someone stands on the platform (would zero their weight).
    if (state == STATE_EMPTY) {
      Serial.println(tare() ? "tare ok (BLE)" : "tare failed (BLE)");
    } else {
      Serial.println("tare refused: platform not empty");
    }
  }
  if (startRequested) {
    startRequested = false;
    resetFilters();
    if (state != STATE_EMPTY) enterState(STATE_MEASURING);
  }
  if (clientJustConnected) {
    clientJustConnected = false;
    lastHoldNotifyMs = 0;  // resend a held result to a phone that just connected
  }

  float distance = readDistanceCm();
  if (!isnan(distance)) {
    lastDistanceCm = distance;
    lastDistanceMs = millis();
  }
  updateStatus();
  float sample = readWeightKg();

  if (isnan(sample)) {
    if (millis() - lastWeightReadyMs > HX711_TIMEOUT_MS && state != STATE_EMPTY) {
      Serial.println("HX711 timeout");
      resetFilters();
      enterState(STATE_EMPTY);
    }
    delay(5);
    return;
  }

  float weight = pushMedian(sample);
  lastWeightKg = weight;
  float height = distanceToHeightCm(distance);

  switch (state) {
    case STATE_EMPTY:
      if (weight > PERSON_KG) {
        resetFilters();
        enterState(STATE_MEASURING);
      }
      break;

    case STATE_MEASURING: {
      if (weight < EMPTY_KG) {
        resetFilters();
        enterState(STATE_EMPTY);
        break;
      }
      pushWindow(weightWindow, WEIGHT_WINDOW, weightCount, weight);
      if (!isnan(height) && height >= HEIGHT_MIN_CM && height <= HEIGHT_MAX_CM) {
        pushWindow(heightWindow, HEIGHT_WINDOW, heightCount, height);
      }

      bool weightStable = weight >= WEIGHT_MIN_KG && weight <= WEIGHT_MAX_KG &&
                          windowStable(weightWindow, WEIGHT_WINDOW, weightCount, WEIGHT_STABLE_TOL_KG);
      bool heightStable = windowStable(heightWindow, HEIGHT_WINDOW, heightCount, HEIGHT_STABLE_TOL_CM);
      bool heightPending = heightSource != HEIGHT_NONE && millis() - stateSinceMs < HEIGHT_TIMEOUT_MS;

      if (weightStable && (heightStable || !heightPending)) {
        enterState(STATE_HOLD);
        heldWeightKg = windowAverage(weightWindow, weightCount);
        heldHeightCm = heightStable ? windowAverage(heightWindow, heightCount) : NAN;
        Serial.printf("hold: %.2f kg, %.1f cm\n", heldWeightKg, heldHeightCm);
        notifyMeasurement(heldWeightKg, heldHeightCm, true);
        lastHoldNotifyMs = millis();
      } else if (millis() - lastMeasuringNotifyMs >= MEASURING_NOTIFY_MS) {
        lastMeasuringNotifyMs = millis();
        notifyMeasurement(weight, height, false);
      }
      break;
    }

    case STATE_HOLD:
      if (weight < EMPTY_KG) {
        resetFilters();
        enterState(STATE_EMPTY);
      } else if (lastHoldNotifyMs == 0 || millis() - lastHoldNotifyMs >= HOLD_REPEAT_MS) {
        // Repeat the held result at most 1x/s (protocol section 7), so a phone
        // that connected or subscribed late still receives it.
        notifyMeasurement(heldWeightKg, heldHeightCm, true);
        lastHoldNotifyMs = millis();
      }
      break;
  }

  static unsigned long lastLog = 0;
  if (millis() - lastLog > 1000) {
    lastLog = millis();
    Serial.printf("kg=%.2f d=%.1f h=%.1f\n", weight, distance, height);
  }
}
