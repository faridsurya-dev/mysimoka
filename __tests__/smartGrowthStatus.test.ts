import { hexToBytes } from '../src/features/device/bytes';
import {
  getDeviceSessionSnapshot,
  setConnectedBleDevice,
  setSensorStatus,
} from '../src/features/device/deviceSession';
import {
  buildSensorChecklist,
  describeSensorSummary,
  SENSOR_STATUS_UNAVAILABLE_TEXT,
} from '../src/features/device/deviceStatus';
import {
  parseSmartGrowthStatus,
  parseSmartGrowthStatusBase64,
} from '../src/features/device/smartGrowth';

// Vectors from docs/ble-smartgrowth-protocol.md section 6a.
describe('parseSmartGrowthStatus', () => {
  test('01 01 00 00 FF: only HX711 OK', () => {
    expect(parseSmartGrowthStatus(hexToBytes('01 01 00 00 FF'))).toEqual({
      version: 1,
      weightOk: true,
      heightDetected: false,
      heightReading: false,
      batterySensing: false,
      weightCalibrated: false,
      tareSet: false,
      heightSensorType: 'none',
      state: 'idle',
      batteryPct: null,
    });
  });

  test('01 37 01 01 57: full station, measuring, battery 87', () => {
    expect(parseSmartGrowthStatus(hexToBytes('01 37 01 01 57'))).toEqual({
      version: 1,
      weightOk: true,
      heightDetected: true,
      heightReading: true,
      batterySensing: false,
      weightCalibrated: true,
      tareSet: true,
      heightSensorType: 'vl53l0x',
      state: 'measuring',
      batteryPct: 87,
    });
  });

  test('ignores reserved bits, maps Sharp and held state', () => {
    const status = parseSmartGrowthStatus(hexToBytes('01 C9 02 02 64'));
    expect(status).toMatchObject({
      weightOk: true,
      batterySensing: true,
      heightSensorType: 'sharp',
      state: 'held',
      batteryPct: 100,
    });
  });

  test('rejects short frames and other versions', () => {
    expect(parseSmartGrowthStatus(hexToBytes('01 01 00 00'))).toBeNull();
    expect(parseSmartGrowthStatus(hexToBytes('02 01 00 00 FF'))).toBeNull();
    expect(parseSmartGrowthStatusBase64('###')).toBeNull();
  });
});

describe('sensor checklist', () => {
  test('weight-only station needing calibration and tare', () => {
    const status = parseSmartGrowthStatus(hexToBytes('01 01 00 00 FF'))!;
    const items = buildSensorChecklist(status);
    expect(items.map(item => [item.label, item.value, item.ok])).toEqual([
      ['Timbangan (HX711)', 'Tersambung', true],
      ['Sensor tinggi', 'Tidak ada (mode timbangan saja)', null],
      ['Kalibrasi berat', 'Belum — kalibrasi lewat Serial (c <kg>)', false],
      ['Titik nol (tare)', 'Belum — tekan Tare', false],
      ['Baterai', 'Tidak tersedia', null],
      ['Status alat', 'Siap', null],
    ]);
    expect(describeSensorSummary(status)).toEqual({
      text: 'Perlu dicek: Kalibrasi berat, Titik nol (tare)',
      ok: false,
    });
  });

  test('full station is ready; head board not read is not a fault', () => {
    const status = parseSmartGrowthStatus(hexToBytes('01 33 01 00 57'))!;
    const items = buildSensorChecklist(status);
    expect(items.find(item => item.key === 'height')?.value).toBe('VL53L0X');
    expect(items.find(item => item.key === 'headboard')).toMatchObject({
      value: 'Belum terbaca',
      ok: false,
    });
    expect(items.find(item => item.key === 'battery')?.value).toBe('87%');
    expect(describeSensorSummary(status)).toEqual({ text: 'Sensor siap', ok: true });
  });

  test('HX711 missing is flagged', () => {
    const status = parseSmartGrowthStatus(hexToBytes('01 30 00 00 FF'))!;
    expect(buildSensorChecklist(status)[0].value).toBe('Tidak terdeteksi — cek kabel');
    expect(describeSensorSummary(status)?.ok).toBe(false);
  });

  test('unknown status (old firmware)', () => {
    expect(describeSensorSummary('unsupported')).toEqual({
      text: SENSOR_STATUS_UNAVAILABLE_TEXT,
      ok: null,
    });
    expect(describeSensorSummary(null)).toBeNull();
  });
});

describe('session sensor status', () => {
  test('stored while connected and cleared on disconnect', () => {
    setConnectedBleDevice({ id: 'sg', name: 'SmartGrowth-1A2B' });
    setSensorStatus(parseSmartGrowthStatus(hexToBytes('01 37 01 01 57')));
    expect(getDeviceSessionSnapshot().sensorStatus).toMatchObject({ state: 'measuring' });

    setConnectedBleDevice(null);
    expect(getDeviceSessionSnapshot().sensorStatus).toBeNull();

    // Late notifications after disconnect are ignored.
    setSensorStatus('unsupported');
    expect(getDeviceSessionSnapshot().sensorStatus).toBeNull();
  });
});
