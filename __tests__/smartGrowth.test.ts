import { hexToBytes } from '../src/features/device/bytes';
import { getDeviceSessionSnapshot, setLatestReading } from '../src/features/device/deviceSession';
import {
  SMARTGROWTH_COMMANDS,
  encodeSmartGrowthCommand,
  isSmartGrowthName,
  parseSmartGrowthDeviceInfo,
  parseSmartGrowthMeasurement,
  parseSmartGrowthMeasurementBase64,
} from '../src/features/device/smartGrowth';

// Vectors mirror docs/ble-smartgrowth-protocol.md ("Contoh frame").
describe('parseSmartGrowthMeasurement', () => {
  test('full stable frame: weight + height + battery', () => {
    const m = parseSmartGrowthMeasurement(hexToBytes('0F EC 09 D2 04 07 00 57'));
    expect(m).toMatchObject({
      weightKg: 25.4,
      heightCm: 123.4,
      stable: true,
      sequence: 7,
      batteryPct: 87,
      weightOutOfRange: false,
      heightOutOfRange: false,
      rawHex: '0fec09d204070057',
    });
  });

  test('weight-only unit while measuring (7-byte frame, no battery)', () => {
    const m = parseSmartGrowthMeasurement(hexToBytes('01 51 07 00 00 2A 00'));
    expect(m).toMatchObject({
      weightKg: 18.73,
      heightCm: null,
      stable: false,
      sequence: 42,
      batteryPct: null,
    });
  });

  test('stable height only, weight field 0xFFFF', () => {
    const m = parseSmartGrowthMeasurement(hexToBytes('06 FF FF F7 03 2B 00'));
    expect(m).toMatchObject({ weightKg: null, heightCm: 101.5, stable: true, sequence: 43 });
  });

  test('out-of-range weight is rejected', () => {
    const m = parseSmartGrowthMeasurement(hexToBytes('05 A8 61 FF FF 2C 00'));
    expect(m).toMatchObject({ weightKg: null, weightOutOfRange: true, stable: true });
  });

  test('out-of-range height is rejected', () => {
    // height 30.0 cm (0x012C) < 45 cm
    const m = parseSmartGrowthMeasurement(hexToBytes('06 FF FF 2C 01 2D 00'));
    expect(m).toMatchObject({ heightCm: null, heightOutOfRange: true });
  });

  test('battery byte ignored when bit3 is clear', () => {
    const m = parseSmartGrowthMeasurement(hexToBytes('05 EC 09 FF FF 08 00 57'));
    expect(m?.batteryPct).toBeNull();
  });

  test('short frames are rejected', () => {
    expect(parseSmartGrowthMeasurement(hexToBytes('0F EC 09'))).toBeNull();
  });

  test('base64 entry point', () => {
    const base64 = Buffer.from('0fec09d204070057', 'hex').toString('base64');
    expect(parseSmartGrowthMeasurementBase64(base64)?.weightKg).toBe(25.4);
    expect(parseSmartGrowthMeasurementBase64('***')).toBeNull();
  });
});

test('parseSmartGrowthDeviceInfo', () => {
  const info = parseSmartGrowthDeviceInfo(hexToBytes('01 01 02 03 53 47 2D 30 30 30 31 32 33'));
  expect(info).toEqual({ protocolVersion: 1, firmwareVersion: '1.2.3', serial: 'SG-000123' });
});

test('control commands encode as base64', () => {
  expect(encodeSmartGrowthCommand(SMARTGROWTH_COMMANDS.tare)).toBe('AQ==');
  expect(encodeSmartGrowthCommand(SMARTGROWTH_COMMANDS.startMeasurement)).toBe('Ag==');
});

test('isSmartGrowthName', () => {
  expect(isSmartGrowthName('SmartGrowth-1A2B')).toBe(true);
  expect(isSmartGrowthName('MYSIMOKA-0001')).toBe(true);
  expect(isSmartGrowthName('Xiaomi Body Composition Scale S400')).toBe(false);
});

test('setLatestReading stores height and stability', () => {
  setLatestReading({
    weightKg: 25.4,
    heightCm: 123.4,
    stable: true,
    source: 'smartgrowth',
    rawHex: '0fec09d204070057',
    sequence: 7,
    batteryPct: 87,
  });
  const snapshot = getDeviceSessionSnapshot();
  expect(snapshot.latestHeightCm).toBe(123.4);
  expect(snapshot.latestWeightKg).toBe(25.4);
  expect(snapshot.latestReadingStable).toBe(true);
  expect(snapshot.latestReadingSource).toBe('smartgrowth');
  expect(snapshot.latestRawHex).toBe('0fec09d204070057');
});
