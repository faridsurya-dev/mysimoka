/*
 * SmartGrowth example firmware (ESP32 + NimBLE-Arduino 2.x + HX711)
 * Protocol: docs/ble-smartgrowth-protocol.md (protocol version 1)
 *
 * *** UNTESTED REFERENCE SKETCH ***
 * Written as a starting point for the firmware team; it has not been compiled
 * or run on hardware. All pins are suggestions and MUST be matched to the PCB.
 *
 * Libraries (Arduino Library Manager):
 *   - NimBLE-Arduino (h2zero) 2.x
 *   - HX711 (bogde)
 *   - VL53L1X (Pololu)            only if HEIGHT_SENSOR == HEIGHT_SENSOR_VL53L1X
 * Board: "ESP32 Dev Module" (ESP32 DevKit V1, ESP32-WROOM-32).
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <HX711.h>

// ---------------------------------------------------------------------------
// Configuration (compile-time)
// ---------------------------------------------------------------------------

#define HEIGHT_SENSOR_NONE 0
#define HEIGHT_SENSOR_HCSR04 1
#define HEIGHT_SENSOR_VL53L1X 2
#ifndef HEIGHT_SENSOR
#define HEIGHT_SENSOR HEIGHT_SENSOR_NONE  // weight-only unit by default
#endif

// HX711 (suggested free GPIOs, not strapping / not input-only).
#define HX711_DT_PIN 16
#define HX711_SCK_PIN 4

// HC-SR04: TRIG is 3.3 V-tolerant on the sensor; ECHO is 5 V and needs a
// divider (e.g. 1k / 2k) or level shifter before reaching the ESP32.
#define HCSR04_TRIG_PIN 25
#define HCSR04_ECHO_PIN 26

// VL53L1X on the default I2C pins.
#define VL53_SDA_PIN 21
#define VL53_SCL_PIN 22

// Optional battery sense via divider on an ADC1 pin (input-only is fine for
// analog). -1 = no battery sensing (battery flag never set).
#define BATTERY_ADC_PIN -1
#define BATTERY_DIVIDER_RATIO 2.0f   // Vbat = Vadc * ratio (100k/100k divider)

// Calibration: see protocol doc section 11 / 10.
#define CALIBRATION_FACTOR 21500.0f  // raw units per kg - placeholder, calibrate!
#define MOUNT_HEIGHT_CM 225.0f       // sensor height above platform - calibrate!

#define FW_MAJOR 0
#define FW_MINOR 1
#define FW_PATCH 0
#define SERIAL_NUMBER "SG-000001"     // max 16 chars

// Protocol constants.
#define PROTOCOL_VERSION 1
#define SG_SERVICE_UUID "519e0001-59fe-44b5-828f-34822e2361a9"
#define SG_MEASUREMENT_UUID "519e0002-59fe-44b5-828f-34822e2361a9"
#define SG_DEVICE_INFO_UUID "519e0003-59fe-44b5-828f-34822e2361a9"
#define SG_CONTROL_UUID "519e0004-59fe-44b5-828f-34822e2361a9"

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
#define EMPTY_PLATFORM_KG 1.0f
#define STABLE_WINDOW 5
#define WEIGHT_STABLE_TOL_KG 0.05f
#define HEIGHT_STABLE_TOL_CM 0.5f
#define MEASURING_NOTIFY_MS 200      // <= 5 Hz
#define HEIGHT_TIMEOUT_MS 3000

#if HEIGHT_SENSOR == HEIGHT_SENSOR_VL53L1X
#include <Wire.h>
#include <VL53L1X.h>
VL53L1X tof;
#endif

HX711 scale;

NimBLEServer* server = nullptr;
NimBLECharacteristic* weightMeasurementChar = nullptr;  // 0x2A9D
NimBLECharacteristic* sgMeasurementChar = nullptr;
NimBLECharacteristic* sgDeviceInfoChar = nullptr;
NimBLECharacteristic* sgControlChar = nullptr;

volatile bool tareRequested = false;
volatile bool restartRequested = false;
volatile bool measuringEnabled = true;
bool clientConnected = false;

uint16_t sequenceNumber = 0;
bool stableSentThisCycle = false;
unsigned long lastMeasuringNotifyMs = 0;
unsigned long cycleStartMs = 0;

float weightWindow[STABLE_WINDOW];
float heightWindow[STABLE_WINDOW];
uint8_t weightCount = 0;
uint8_t heightCount = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static void pushWindow(float* window, uint8_t& count, float value) {
  for (int i = STABLE_WINDOW - 1; i > 0; i--) window[i] = window[i - 1];
  window[0] = value;
  if (count < STABLE_WINDOW) count++;
}

static bool windowStable(const float* window, uint8_t count, float tolerance) {
  if (count < STABLE_WINDOW) return false;
  float lo = window[0], hi = window[0];
  for (int i = 1; i < STABLE_WINDOW; i++) {
    lo = min(lo, window[i]);
    hi = max(hi, window[i]);
  }
  return (hi - lo) <= 2 * tolerance;  // all samples within +-tolerance
}

static float windowAverage(const float* window, uint8_t count) {
  float sum = 0;
  for (int i = 0; i < count; i++) sum += window[i];
  return count ? sum / count : NAN;
}

static void resetCycle() {
  weightCount = 0;
  heightCount = 0;
  stableSentThisCycle = false;
  cycleStartMs = millis();
}

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------

static float readWeightKg() {
  if (!scale.is_ready()) return NAN;
  return scale.get_units(1);
}

#if HEIGHT_SENSOR == HEIGHT_SENSOR_HCSR04
static float readDistanceCm() {
  digitalWrite(HCSR04_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(HCSR04_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(HCSR04_TRIG_PIN, LOW);
  unsigned long us = pulseIn(HCSR04_ECHO_PIN, HIGH, 30000UL);  // ~5 m max
  if (us == 0) return NAN;
  // Speed of sound ~343 m/s at 20 C. TODO: temperature compensation.
  return (us * 0.0343f) / 2.0f;
}
#elif HEIGHT_SENSOR == HEIGHT_SENSOR_VL53L1X
static float readDistanceCm() {
  if (!tof.dataReady()) return NAN;
  uint16_t mm = tof.read(false);
  if (tof.ranging_data.range_status != VL53L1X::RangeValid) return NAN;
  return mm / 10.0f;
}
#endif

// Returns NAN when no height sensor is fitted or the reading is invalid.
static float readHeightCm() {
#if HEIGHT_SENSOR == HEIGHT_SENSOR_NONE
  return NAN;  // TODO: fit HC-SR04 or VL53L1X (see HEIGHT_SENSOR).
#else
  float distance = readDistanceCm();
  if (isnan(distance)) return NAN;
  return MOUNT_HEIGHT_CM - distance;
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
// BLE frames
// ---------------------------------------------------------------------------

static void notifyMeasurement(float weightKg, float heightCm, bool stable) {
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

  int battery = readBatteryPct();
  size_t length = 7;
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

  // Standard Weight Scale: final weight only, 0.005 kg resolution, SI.
  if ((flags & FLAG_STABLE) && (flags & FLAG_WEIGHT)) {
    uint16_t ws = (uint16_t)lroundf(weightKg / 0.005f);
    uint8_t wsFrame[3] = {0x00, (uint8_t)(ws & 0xFF), (uint8_t)(ws >> 8)};
    weightMeasurementChar->setValue(wsFrame, sizeof(wsFrame));
    weightMeasurementChar->indicate();
  }
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, NimBLEConnInfo& info) override {
    clientConnected = true;
  }
  void onDisconnect(NimBLEServer* s, NimBLEConnInfo& info, int reason) override {
    clientConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

class ControlCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    std::string value = c->getValue();
    if (value.empty()) return;
    switch ((uint8_t)value[0]) {
      case CMD_TARE: tareRequested = true; break;      // handled in loop()
      case CMD_START: restartRequested = true; measuringEnabled = true; break;
      case CMD_STOP: measuringEnabled = false; break;
      default: break;                                   // 0x10 / 0x20 reserved
    }
  }
};

static void setupBle() {
  NimBLEDevice::init("SmartGrowth");
  // Name with the last 2 bytes of the BLE MAC (getVal() is little-endian).
  const uint8_t* mac = NimBLEDevice::getAddress().getVal();
  char name[20];
  snprintf(name, sizeof(name), "SmartGrowth-%02X%02X", mac[1], mac[0]);
  NimBLEDevice::setDeviceName(name);

  server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService* ws = server->createService(NimBLEUUID((uint16_t)0x181D));
  weightMeasurementChar =
      ws->createCharacteristic(NimBLEUUID((uint16_t)0x2A9D), NIMBLE_PROPERTY::INDICATE);

  NimBLEService* sg = server->createService(SG_SERVICE_UUID);
  sgMeasurementChar = sg->createCharacteristic(
      SG_MEASUREMENT_UUID, NIMBLE_PROPERTY::NOTIFY | NIMBLE_PROPERTY::READ);
  sgDeviceInfoChar = sg->createCharacteristic(SG_DEVICE_INFO_UUID, NIMBLE_PROPERTY::READ);
  sgControlChar = sg->createCharacteristic(SG_CONTROL_UUID, NIMBLE_PROPERTY::WRITE);
  sgControlChar->setCallbacks(new ControlCallbacks());

  uint8_t info[20];
  info[0] = PROTOCOL_VERSION;
  info[1] = FW_MAJOR;
  info[2] = FW_MINOR;
  info[3] = FW_PATCH;
  size_t serialLength = min((size_t)16, strlen(SERIAL_NUMBER));
  memcpy(info + 4, SERIAL_NUMBER, serialLength);
  sgDeviceInfoChar->setValue(info, 4 + serialLength);

  server->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  NimBLEAdvertisementData advData;
  advData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
  advData.setName(name);
  advData.addServiceUUID(NimBLEUUID((uint16_t)0x181D));
  NimBLEAdvertisementData scanData;
  scanData.addServiceUUID(NimBLEUUID(SG_SERVICE_UUID));  // 128-bit: scan response
  adv->setAdvertisementData(advData);
  adv->setScanResponseData(scanData);
  adv->start();

  Serial.printf("BLE advertising as %s\n", name);
}

// ---------------------------------------------------------------------------
// Arduino entry points
// ---------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);

  scale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(20);  // platform must be empty at boot

#if HEIGHT_SENSOR == HEIGHT_SENSOR_HCSR04
  pinMode(HCSR04_TRIG_PIN, OUTPUT);
  pinMode(HCSR04_ECHO_PIN, INPUT);
#elif HEIGHT_SENSOR == HEIGHT_SENSOR_VL53L1X
  Wire.begin(VL53_SDA_PIN, VL53_SCL_PIN);
  tof.setTimeout(500);
  if (!tof.init()) {
    Serial.println("VL53L1X not found");
  } else {
    tof.setDistanceMode(VL53L1X::Long);
    tof.setMeasurementTimingBudget(50000);
    tof.startContinuous(60);
  }
#endif

  setupBle();
  resetCycle();
}

void loop() {
  if (tareRequested) {
    tareRequested = false;
    scale.tare(20);
    resetCycle();
    Serial.println("tare");
  }
  if (restartRequested) {
    restartRequested = false;
    resetCycle();
  }

  float weight = readWeightKg();
  float height = readHeightCm();

  // Serial output for calibration: raw = value to divide by the reference kg.
  static unsigned long lastLog = 0;
  if (millis() - lastLog > 500) {
    lastLog = millis();
    Serial.printf("kg=%.2f raw=%.0f h=%.1f\n", weight, scale.get_value(1), height);
  }

  if (isnan(weight)) {
    delay(20);
    return;
  }

  // Platform empty: arm a new cycle for the next child.
  if (weight < EMPTY_PLATFORM_KG) {
    if (weightCount > 0 || stableSentThisCycle) resetCycle();
    delay(50);
    return;
  }

  pushWindow(weightWindow, weightCount, weight);
  if (!isnan(height)) pushWindow(heightWindow, heightCount, height);

  bool weightStable = weight >= WEIGHT_MIN_KG &&
                      windowStable(weightWindow, weightCount, WEIGHT_STABLE_TOL_KG);
  bool heightExpected = HEIGHT_SENSOR != HEIGHT_SENSOR_NONE &&
                        millis() - cycleStartMs < HEIGHT_TIMEOUT_MS;
  bool heightStable = windowStable(heightWindow, heightCount, HEIGHT_STABLE_TOL_CM);

  if (!clientConnected || !measuringEnabled) {
    delay(50);
    return;
  }

  bool readyToSend = weightStable && (heightStable || !heightExpected);
  if (readyToSend && !stableSentThisCycle) {
    float avgWeight = windowAverage(weightWindow, weightCount);
    float avgHeight = heightStable ? windowAverage(heightWindow, heightCount) : NAN;
    notifyMeasurement(avgWeight, avgHeight, true);
    stableSentThisCycle = true;
  } else if (!stableSentThisCycle && millis() - lastMeasuringNotifyMs >= MEASURING_NOTIFY_MS) {
    lastMeasuringNotifyMs = millis();
    notifyMeasurement(weight, height, false);
  }

  delay(20);
}
