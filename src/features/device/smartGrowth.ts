/* eslint-disable no-bitwise */
import type { Device, Subscription } from 'react-native-ble-plx';
import { base64ToBytes, bytesToBase64, bytesToHex, readUInt16LE } from './bytes';
import { setLatestReading, setSensorStatus } from './deviceSession';

// SmartGrowth (MySimoka height + weight station) custom GATT protocol.
// Spec: docs/ble-smartgrowth-protocol.md — keep both in sync.

export const SMARTGROWTH_SERVICE_UUID = '519e0001-59fe-44b5-828f-34822e2361a9';
export const SMARTGROWTH_MEASUREMENT_CHAR_UUID = '519e0002-59fe-44b5-828f-34822e2361a9';
export const SMARTGROWTH_DEVICE_INFO_CHAR_UUID = '519e0003-59fe-44b5-828f-34822e2361a9';
export const SMARTGROWTH_CONTROL_CHAR_UUID = '519e0004-59fe-44b5-828f-34822e2361a9';
/** Sensor status (read + notify), protocol section 6a. Absent on old firmware. */
export const SMARTGROWTH_STATUS_CHAR_UUID = '519e0005-59fe-44b5-828f-34822e2361a9';
/** Calibration values + last calibration result (read + notify), protocol section 6b. Firmware >= 2.1. */
export const SMARTGROWTH_CALIBRATION_CHAR_UUID = '519e0006-59fe-44b5-828f-34822e2361a9';

export const SMARTGROWTH_NAME_PATTERN = /^(smartgrowth|mysimoka)-/i;

export const SMARTGROWTH_FLAGS = {
  weightPresent: 0x01,
  heightPresent: 0x02,
  stable: 0x04,
  batteryPresent: 0x08,
} as const;

export const SMARTGROWTH_COMMANDS = {
  tare: 0x01,
  startMeasurement: 0x02,
  stopMeasurement: 0x03,
  /** Reserved: set display unit. */
  setUnit: 0x10,
  /** Weight calibration, param float32 LE reference kg (firmware >= 2.1). */
  calibrateWeight: 0x20,
  /** Height calibration, param float32 LE reference cm (firmware >= 2.1). */
  calibrateHeight: 0x21,
  /** Reset calibration to defaults, param 0xA5 (confirm) (firmware >= 2.1). */
  resetCalibration: 0x22,
} as const;

export type SmartGrowthCommand = (typeof SMARTGROWTH_COMMANDS)[keyof typeof SMARTGROWTH_COMMANDS];

/** Tare param: skip the "platform empty" check (calibration wizard). */
export const SMARTGROWTH_TARE_FORCE = 0x01;
export const SMARTGROWTH_RESET_CONFIRM = 0xa5;

export const SMARTGROWTH_RANGES = {
  weightKg: { min: 2, max: 200 },
  heightCm: { min: 45, max: 220 },
} as const;

const NOT_PRESENT_U16 = 0xffff;

export type SmartGrowthMeasurement = {
  /** null when absent or outside SMARTGROWTH_RANGES. */
  weightKg: number | null;
  heightCm: number | null;
  stable: boolean;
  sequence: number;
  batteryPct: number | null;
  /** Value was flagged present but rejected by range validation. */
  weightOutOfRange: boolean;
  heightOutOfRange: boolean;
  rawHex: string;
};

export function isSmartGrowthName(name: string | null | undefined) {
  return !!name && SMARTGROWTH_NAME_PATTERN.test(name.trim());
}

/**
 * Parses a Measurement frame (little-endian):
 * [0] flags u8 | [1-2] weight u16 (0.01 kg) | [3-4] height u16 (0.1 cm)
 * | [5-6] sequence u16 | [7] battery % u8 (optional).
 */
export function parseSmartGrowthMeasurement(bytes: Uint8Array): SmartGrowthMeasurement | null {
  if (bytes.length < 7) {
    return null;
  }

  const flags = bytes[0];
  const weightRaw = readUInt16LE(bytes, 1);
  const heightRaw = readUInt16LE(bytes, 3);
  const sequence = readUInt16LE(bytes, 5);

  const weightPresent = (flags & SMARTGROWTH_FLAGS.weightPresent) !== 0 && weightRaw !== NOT_PRESENT_U16;
  const heightPresent = (flags & SMARTGROWTH_FLAGS.heightPresent) !== 0 && heightRaw !== NOT_PRESENT_U16;
  const batteryPresent = (flags & SMARTGROWTH_FLAGS.batteryPresent) !== 0 && bytes.length >= 8;

  const weightCandidate = weightPresent ? Math.round(weightRaw) / 100 : null;
  const heightCandidate = heightPresent ? Math.round(heightRaw) / 10 : null;
  const weightInRange =
    weightCandidate !== null &&
    weightCandidate >= SMARTGROWTH_RANGES.weightKg.min &&
    weightCandidate <= SMARTGROWTH_RANGES.weightKg.max;
  const heightInRange =
    heightCandidate !== null &&
    heightCandidate >= SMARTGROWTH_RANGES.heightCm.min &&
    heightCandidate <= SMARTGROWTH_RANGES.heightCm.max;
  const battery = batteryPresent ? bytes[7] : null;

  return {
    weightKg: weightInRange ? weightCandidate : null,
    heightCm: heightInRange ? heightCandidate : null,
    stable: (flags & SMARTGROWTH_FLAGS.stable) !== 0,
    sequence,
    batteryPct: battery !== null && battery <= 100 ? battery : null,
    weightOutOfRange: weightCandidate !== null && !weightInRange,
    heightOutOfRange: heightCandidate !== null && !heightInRange,
    rawHex: bytesToHex(bytes),
  };
}

export function parseSmartGrowthMeasurementBase64(base64Value: string) {
  try {
    return parseSmartGrowthMeasurement(base64ToBytes(base64Value));
  } catch {
    return null;
  }
}

export type SmartGrowthDeviceInfo = {
  protocolVersion: number;
  firmwareVersion: string;
  serial: string;
};

/** Device Info: [0] protocol version | [1-3] fw major.minor.patch | [4..] serial ASCII. */
export function parseSmartGrowthDeviceInfo(bytes: Uint8Array): SmartGrowthDeviceInfo | null {
  if (bytes.length < 4) {
    return null;
  }
  let serial = '';
  for (let i = 4; i < bytes.length; i += 1) {
    if (bytes[i] === 0) {
      break;
    }
    serial += String.fromCharCode(bytes[i]);
  }
  return {
    protocolVersion: bytes[0],
    firmwareVersion: `${bytes[1]}.${bytes[2]}.${bytes[3]}`,
    serial,
  };
}

export const SMARTGROWTH_STATUS_FLAGS = {
  weightOk: 0x01,
  heightDetected: 0x02,
  heightReading: 0x04,
  batterySensing: 0x08,
  weightCalibrated: 0x10,
  tareSet: 0x20,
} as const;

export type SmartGrowthHeightSensorType = 'none' | 'vl53l0x' | 'sharp' | 'unknown';
export type SmartGrowthDeviceState = 'idle' | 'measuring' | 'held' | 'unknown';

export type SmartGrowthSensorStatus = {
  version: number;
  /** HX711 delivered data within the last second. */
  weightOk: boolean;
  /** Height sensor found at boot. */
  heightDetected: boolean;
  /** Height sensor gave a valid reading within 2 s (head board seen). */
  heightReading: boolean;
  batterySensing: boolean;
  weightCalibrated: boolean;
  tareSet: boolean;
  heightSensorType: SmartGrowthHeightSensorType;
  state: SmartGrowthDeviceState;
  batteryPct: number | null;
};

const HEIGHT_SENSOR_TYPES: Record<number, SmartGrowthHeightSensorType> = {
  0: 'none',
  1: 'vl53l0x',
  2: 'sharp',
};

const DEVICE_STATES: Record<number, SmartGrowthDeviceState> = {
  0: 'idle',
  1: 'measuring',
  2: 'held',
};

/**
 * Status frame: [0] version (=1) | [1] flags | [2] height sensor type
 * | [3] state | [4] battery % (0xFF = none). Unknown flag bits are ignored.
 */
export function parseSmartGrowthStatus(bytes: Uint8Array): SmartGrowthSensorStatus | null {
  if (bytes.length < 5 || bytes[0] !== 1) {
    return null;
  }
  const flags = bytes[1];
  const battery = bytes[4];
  return {
    version: bytes[0],
    weightOk: (flags & SMARTGROWTH_STATUS_FLAGS.weightOk) !== 0,
    heightDetected: (flags & SMARTGROWTH_STATUS_FLAGS.heightDetected) !== 0,
    heightReading: (flags & SMARTGROWTH_STATUS_FLAGS.heightReading) !== 0,
    batterySensing: (flags & SMARTGROWTH_STATUS_FLAGS.batterySensing) !== 0,
    weightCalibrated: (flags & SMARTGROWTH_STATUS_FLAGS.weightCalibrated) !== 0,
    tareSet: (flags & SMARTGROWTH_STATUS_FLAGS.tareSet) !== 0,
    heightSensorType: HEIGHT_SENSOR_TYPES[bytes[2]] ?? 'unknown',
    state: DEVICE_STATES[bytes[3]] ?? 'unknown',
    batteryPct: battery <= 100 ? battery : null,
  };
}

export function parseSmartGrowthStatusBase64(base64Value: string) {
  try {
    return parseSmartGrowthStatus(base64ToBytes(base64Value));
  } catch {
    return null;
  }
}

export const SMARTGROWTH_CALIBRATION_FLAGS = {
  weightCalibrated: 0x01,
  zeroSet: 0x02,
  heightCalibrated: 0x04,
  busy: 0x08,
  heightPresent: 0x10,
} as const;

/** Result codes of the last calibration command (Calibration characteristic byte 3). */
export const SMARTGROWTH_CALIBRATION_RESULTS: Record<number, string> = {
  0x00: 'ok',
  0x01: 'hx711_not_responding',
  0x02: 'no_load',
  0x03: 'bad_argument',
  0x04: 'height_no_reading',
  0x05: 'platform_not_empty',
  0x06: 'no_height_sensor',
  0x07: 'busy',
  0x08: 'unknown_command',
  0xff: 'none',
};

export type SmartGrowthCalibrationState = {
  version: number;
  weightCalibrated: boolean;
  zeroSet: boolean;
  heightCalibrated: boolean;
  busy: boolean;
  heightPresent: boolean;
  /** Opcode of the last calibration command (0 = none since boot). */
  lastCommand: number;
  /** Raw result code, see SMARTGROWTH_CALIBRATION_RESULTS. */
  lastResultCode: number;
  lastResult: string;
  /** Increments (mod 256) when a calibration command finishes. */
  sequence: number;
  zeroOffset: number;
  calFactor: number;
  heightOffsetCm: number;
  /** tare/weight: HX711 raw; height: distance in 0.01 cm. */
  lastMeasuredRaw: number;
};

function readInt32LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(offset, true);
}

function readFloat32LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(offset, true);
}

/**
 * Calibration frame (20 bytes, little-endian): [0] version (=1) | [1] flags | [2] last opcode
 * | [3] last result | [4] seq | [5-8] zero i32 | [9-12] factor f32 | [13-16] height offset f32
 * | [17-19] measured i24.
 */
export function parseSmartGrowthCalibration(bytes: Uint8Array): SmartGrowthCalibrationState | null {
  if (bytes.length < 20 || bytes[0] !== 1) {
    return null;
  }
  const flags = bytes[1];
  let measured = bytes[17] + bytes[18] * 256 + bytes[19] * 65536;
  if (measured >= 0x800000) {
    measured -= 0x1000000;
  }
  const resultCode = bytes[3];
  return {
    version: bytes[0],
    weightCalibrated: (flags & SMARTGROWTH_CALIBRATION_FLAGS.weightCalibrated) !== 0,
    zeroSet: (flags & SMARTGROWTH_CALIBRATION_FLAGS.zeroSet) !== 0,
    heightCalibrated: (flags & SMARTGROWTH_CALIBRATION_FLAGS.heightCalibrated) !== 0,
    busy: (flags & SMARTGROWTH_CALIBRATION_FLAGS.busy) !== 0,
    heightPresent: (flags & SMARTGROWTH_CALIBRATION_FLAGS.heightPresent) !== 0,
    lastCommand: bytes[2],
    lastResultCode: resultCode,
    lastResult: SMARTGROWTH_CALIBRATION_RESULTS[resultCode] ?? `error_${resultCode}`,
    sequence: bytes[4],
    zeroOffset: readInt32LE(bytes, 5),
    calFactor: readFloat32LE(bytes, 9),
    heightOffsetCm: readFloat32LE(bytes, 13),
    lastMeasuredRaw: measured,
  };
}

export function parseSmartGrowthCalibrationBase64(base64Value: string) {
  try {
    return parseSmartGrowthCalibration(base64ToBytes(base64Value));
  } catch {
    return null;
  }
}

/** float32 little-endian bytes, for command parameters. */
export function float32LEBytes(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value, true);
  return Array.from(bytes);
}

export function buildSmartGrowthCommand(command: number, params: number[] = []) {
  return Uint8Array.from([command & 0xff, ...params.map(value => value & 0xff)]);
}

// --- GATT wiring -------------------------------------------------------------

const subscriptionsByDevice = new Map<string, Subscription>();
const statusSubscriptionsByDevice = new Map<string, Subscription>();
const deviceInfoById = new Map<string, SmartGrowthDeviceInfo>();
const frameListeners = new Set<(measurement: SmartGrowthMeasurement) => void>();

/** Every parsed Measurement frame (incl. repeats), e.g. for the accuracy check. */
export function subscribeSmartGrowthFrames(listener: (measurement: SmartGrowthMeasurement) => void) {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

export function getSmartGrowthDeviceInfo(deviceId: string) {
  return deviceInfoById.get(deviceId) ?? null;
}

export function isSmartGrowthActive(deviceId: string | null) {
  return !!deviceId && subscriptionsByDevice.has(deviceId);
}

/**
 * Subscribes to the SmartGrowth Measurement characteristic. The device must
 * already have its services discovered. Returns false when the custom service
 * is absent (caller falls back to the standard Weight Scale service).
 */
export async function startSmartGrowthMonitor(
  device: Device,
  onFrame?: (measurement: SmartGrowthMeasurement | null, rawBase64: string) => void,
) {
  stopSmartGrowthMonitor(device.id);

  let hasService = false;
  try {
    const services = await device.services();
    hasService = services.some(service => service.uuid.toLowerCase() === SMARTGROWTH_SERVICE_UUID);
  } catch {
    hasService = false;
  }
  if (!hasService) {
    return false;
  }

  try {
    const info = await device.readCharacteristicForService(
      SMARTGROWTH_SERVICE_UUID,
      SMARTGROWTH_DEVICE_INFO_CHAR_UUID,
    );
    const parsedInfo = info.value ? parseSmartGrowthDeviceInfo(base64ToBytes(info.value)) : null;
    if (parsedInfo) {
      deviceInfoById.set(device.id, parsedInfo);
    }
  } catch {
    // Device Info is optional for the app.
  }

  try {
    const subscription = device.monitorCharacteristicForService(
      SMARTGROWTH_SERVICE_UUID,
      SMARTGROWTH_MEASUREMENT_CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          return;
        }
        const measurement = parseSmartGrowthMeasurementBase64(characteristic.value);
        onFrame?.(measurement, characteristic.value);
        if (!measurement) {
          return;
        }
        for (const listener of frameListeners) {
          listener(measurement);
        }
        setLatestReading({
          weightKg: measurement.weightKg,
          heightCm: measurement.heightCm,
          stable: measurement.stable,
          source: 'smartgrowth',
          rawHex: measurement.rawHex,
          sequence: measurement.sequence,
          batteryPct: measurement.batteryPct,
        });
      },
    );
    subscriptionsByDevice.set(device.id, subscription);
  } catch {
    return false;
  }

  await startSmartGrowthStatusMonitor(device);
  return true;
}

/** Status is optional: old firmware lacks it and the device stays fully usable. */
async function startSmartGrowthStatusMonitor(device: Device) {
  let hasStatus = false;
  try {
    const characteristics = await device.characteristicsForService(SMARTGROWTH_SERVICE_UUID);
    hasStatus = characteristics.some(
      characteristic => characteristic.uuid.toLowerCase() === SMARTGROWTH_STATUS_CHAR_UUID,
    );
  } catch {
    hasStatus = false;
  }
  if (!hasStatus) {
    setSensorStatus('unsupported');
    return;
  }

  try {
    const initial = await device.readCharacteristicForService(
      SMARTGROWTH_SERVICE_UUID,
      SMARTGROWTH_STATUS_CHAR_UUID,
    );
    const parsed = initial.value ? parseSmartGrowthStatusBase64(initial.value) : null;
    if (parsed) {
      setSensorStatus(parsed);
    }
  } catch {
    // A notify follows within ~5 s.
  }

  try {
    const subscription = device.monitorCharacteristicForService(
      SMARTGROWTH_SERVICE_UUID,
      SMARTGROWTH_STATUS_CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          return;
        }
        const parsed = parseSmartGrowthStatusBase64(characteristic.value);
        if (parsed) {
          setSensorStatus(parsed);
        }
      },
    );
    statusSubscriptionsByDevice.set(device.id, subscription);
  } catch {
    // Ignore: status is informational only.
  }
}

export function stopSmartGrowthMonitor(deviceId: string) {
  subscriptionsByDevice.get(deviceId)?.remove();
  subscriptionsByDevice.delete(deviceId);
  statusSubscriptionsByDevice.get(deviceId)?.remove();
  statusSubscriptionsByDevice.delete(deviceId);
}

/** Control write payload (base64) for ble-plx writeCharacteristic* calls. */
export function encodeSmartGrowthCommand(command: number, params: number[] = []) {
  return bytesToBase64(buildSmartGrowthCommand(command, params));
}
