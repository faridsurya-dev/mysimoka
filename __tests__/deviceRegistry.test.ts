import {
  DEVICE_REGISTRY_REFRESH_MS,
  buildDeviceUpdateColumns,
  buildDeviceUpsertObject,
  mapConnectKindToKind,
  mapReadingSourceToKind,
  normalizeBatteryPct,
  shouldRefineKind,
} from '../src/features/device/deviceRegistryPayload';
import {
  getDeviceSessionSnapshot,
  setConnectedBleDevice,
  setLatestReading,
} from '../src/features/device/deviceSession';
import { getDeviceDisplayName, describeDeviceStatus } from '../src/features/device/deviceStatus';
import {
  registerDevice,
  setDeviceDisabledHandler,
  stopTrackingDevice,
  trackConnectedDevice,
} from '../src/features/device/deviceRegistry';
import { upsertSchoolDevice } from '../src/services/auth';

jest.mock('../src/services/auth', () => ({
  upsertSchoolDevice: jest.fn(),
}));

const mockUpsert = upsertSchoolDevice as jest.MockedFunction<typeof upsertSchoolDevice>;
const flush = () => new Promise(resolve => setImmediate(resolve));

describe('kind mapping', () => {
  test('reading sources map to registry kinds', () => {
    expect(mapReadingSourceToKind('smartgrowth')).toBe('smartgrowth');
    expect(mapReadingSourceToKind('gatt_weight_scale')).toBe('weight_scale');
    expect(mapReadingSourceToKind('gatt_body_composition')).toBe('body_composition');
    expect(mapReadingSourceToKind('s400_advertisement')).toBe('s400');
    expect(mapReadingSourceToKind(null)).toBeNull();
  });

  test('connect hints map to registry kinds', () => {
    expect(mapConnectKindToKind('smartgrowth')).toBe('smartgrowth');
    expect(mapConnectKindToKind('standard')).toBe('weight_scale');
    expect(mapConnectKindToKind('s400')).toBe('s400');
    expect(mapConnectKindToKind('unknown')).toBe('other');
    expect(mapConnectKindToKind(null)).toBe('other');
  });

  test('only connect-time guesses are refined', () => {
    expect(shouldRefineKind('weight_scale', 'body_composition')).toBe(true);
    expect(shouldRefineKind('other', 's400')).toBe(true);
    expect(shouldRefineKind('smartgrowth', 'weight_scale')).toBe(false);
    expect(shouldRefineKind('weight_scale', 'weight_scale')).toBe(false);
    expect(shouldRefineKind('weight_scale', null)).toBe(false);
  });
});

describe('payload builder', () => {
  const context = {
    schoolId: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    now: new Date('2026-10-03T08:00:00.000Z'),
  };

  test('uses SmartGrowth serial as device_key', () => {
    const object = buildDeviceUpsertObject(
      {
        bleId: 'AA:BB:CC:DD:EE:FF',
        name: ' SmartGrowth-1A2B ',
        kind: 'smartgrowth',
        serial: 'SG-0001',
        firmwareVersion: '1.1.0',
        batteryPct: 87.4,
      },
      context,
    );
    expect(object).toEqual({
      school_id: context.schoolId,
      device_key: 'SG-0001',
      ble_id: 'AA:BB:CC:DD:EE:FF',
      name: 'SmartGrowth-1A2B',
      kind: 'smartgrowth',
      serial: 'SG-0001',
      firmware_version: '1.1.0',
      battery_pct: 87,
      last_seen_at: '2026-10-03T08:00:00.000Z',
      last_seen_by: context.userId,
    });
    expect(buildDeviceUpdateColumns(object!)).toEqual([
      'ble_id',
      'name',
      'kind',
      'last_seen_at',
      'last_seen_by',
      'serial',
      'firmware_version',
      'battery_pct',
    ]);
  });

  test('falls back to BLE id and keeps unknown facts out of update_columns', () => {
    const object = buildDeviceUpsertObject(
      { bleId: 'AA:BB', name: '', kind: 'weight_scale', serial: '  ', batteryPct: 140 },
      context,
    );
    expect(object?.device_key).toBe('AA:BB');
    expect(object?.name).toBeNull();
    expect(object?.serial).toBeNull();
    expect(object?.battery_pct).toBeNull();
    expect(buildDeviceUpdateColumns(object!)).toEqual([
      'ble_id',
      'name',
      'kind',
      'last_seen_at',
      'last_seen_by',
    ]);
  });

  test('rejects empty BLE id', () => {
    expect(buildDeviceUpsertObject({ bleId: ' ', kind: 'other' }, context)).toBeNull();
  });

  test('normalizeBatteryPct clamps to 0-100 integers', () => {
    expect(normalizeBatteryPct(0)).toBe(0);
    expect(normalizeBatteryPct(100)).toBe(100);
    expect(normalizeBatteryPct(-1)).toBeNull();
    expect(normalizeBatteryPct(Number.NaN)).toBeNull();
    expect(normalizeBatteryPct(null)).toBeNull();
  });
});

describe('registry tracking', () => {
  const disabled = jest.fn();

  beforeEach(() => {
    mockUpsert.mockReset();
    disabled.mockReset();
    setDeviceDisabledHandler(disabled);
    stopTrackingDevice();
    setConnectedBleDevice(null);
  });

  test('registerDevice swallows request errors', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('field "insert_devices_one" not found'));
    await expect(registerDevice({ bleId: 'X', kind: 'other' })).resolves.toBeNull();
  });

  test('applies the admin label and reports disabled devices', async () => {
    setConnectedBleDevice({ id: 'dev-1', name: 'SmartGrowth-1A2B' });
    mockUpsert.mockResolvedValueOnce({ id: 'row', isActive: false, label: 'Timbangan Kelas 1' });

    trackConnectedDevice({
      bleId: 'dev-1',
      name: 'SmartGrowth-1A2B',
      kindHint: 'smartgrowth',
      serial: 'SG-1',
      firmwareVersion: '1.0.0',
    });
    await flush();

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ bleId: 'dev-1', kind: 'smartgrowth', serial: 'SG-1' }),
    );
    const session = getDeviceSessionSnapshot();
    expect(session.connectedDeviceLabel).toBe('Timbangan Kelas 1');
    expect(getDeviceDisplayName(session)).toBe('Timbangan Kelas 1');
    expect(describeDeviceStatus(session)).toContain('Timbangan Kelas 1');
    expect(disabled).toHaveBeenCalledWith('dev-1');
  });

  test('S400 registers on its first reading; battery refresh is throttled', async () => {
    let now = 1_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    mockUpsert.mockResolvedValue({ id: 'row', isActive: true, label: null });
    setConnectedBleDevice({ id: 's400', name: 'Xiaomi S400' });

    trackConnectedDevice({ bleId: 's400', name: 'Xiaomi S400', kindHint: 's400' });
    await flush();
    expect(mockUpsert).not.toHaveBeenCalled();

    setLatestReading({ weightKg: 30.5, stable: true, source: 's400_advertisement' });
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 's400' }));

    // Frames keep coming; no new write until a battery value shows up.
    now += 2000;
    setLatestReading({ weightKg: 30.6, stable: true, source: 's400_advertisement' });
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    now += 2000;
    setLatestReading({ weightKg: 30.7, stable: true, source: 's400_advertisement', batteryPct: 80 });
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(2);

    now += 2000;
    setLatestReading({ weightKg: 30.8, stable: true, source: 's400_advertisement', batteryPct: 79 });
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(2);

    now += DEVICE_REGISTRY_REFRESH_MS;
    setLatestReading({ weightKg: 30.9, stable: true, source: 's400_advertisement', batteryPct: 78 });
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(3);
    expect(mockUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ batteryPct: 78 }));
    expect(disabled).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });
});
