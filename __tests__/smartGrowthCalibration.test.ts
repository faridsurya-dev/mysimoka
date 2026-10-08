import {
  buildCalibrationInsertObject,
  computeCheckStats,
  describeCheck,
  parseReferenceInput,
} from '../src/features/device/calibration';
import {
  SMARTGROWTH_COMMANDS,
  encodeSmartGrowthCommand,
  float32LEBytes,
  parseSmartGrowthCalibration,
} from '../src/features/device/smartGrowth';

test('accuracy check statistics', () => {
  const stats = computeCheckStats([10.1, 10.12, 10.14, 10.12, 10.12], 10, 0.1);
  expect(stats).not.toBeNull();
  expect(stats!.n).toBe(5);
  expect(stats!.mean).toBeCloseTo(10.12, 4);
  expect(stats!.bias).toBeCloseTo(0.12, 4);
  expect(stats!.pctError).toBeCloseTo(1.2, 3);
  expect(stats!.sd).toBeCloseTo(0.0141, 3);
  expect(stats!.withinTolerance).toBe(false);
  expect(describeCheck('weight', 10, stats!)).toBe(
    'Alat membaca 10.12 kg untuk beban 10.00 kg → selisih +0.12 kg (+1.2%)',
  );
});

test('bias exactly at the tolerance is within tolerance', () => {
  expect(computeCheckStats([10.1, 10.1], 10, 0.1)!.withinTolerance).toBe(true);
  expect(computeCheckStats([], 10, 0.1)).toBeNull();
  expect(computeCheckStats([1], 0, 0.1)).toBeNull();
});

test('reference input accepts comma decimals', () => {
  expect(parseReferenceInput('10,5')).toBe(10.5);
  expect(parseReferenceInput(' 20 ')).toBe(20);
  expect(parseReferenceInput('abc')).toBeNull();
  expect(parseReferenceInput('0')).toBeNull();
});

test('calibration commands encode float32 little-endian', () => {
  expect(float32LEBytes(10)).toEqual([0x00, 0x00, 0x20, 0x41]);
  expect(encodeSmartGrowthCommand(SMARTGROWTH_COMMANDS.calibrateWeight, float32LEBytes(10))).toBe(
    'IAAAIEE=',
  );
});

test('parses the Calibration characteristic', () => {
  const bytes = new Uint8Array(20);
  const view = new DataView(bytes.buffer);
  bytes[0] = 1;
  bytes[1] = 0x13; // weight calibrated, zero set, height sensor present
  bytes[2] = 0x20;
  bytes[3] = 0x00;
  bytes[4] = 7;
  view.setInt32(5, 1355500, true);
  view.setFloat32(9, 23666, true);
  view.setFloat32(13, 12.5, true);
  // measured = -2 as int24
  bytes[17] = 0xfe;
  bytes[18] = 0xff;
  bytes[19] = 0xff;
  const state = parseSmartGrowthCalibration(bytes)!;
  expect(state.weightCalibrated).toBe(true);
  expect(state.zeroSet).toBe(true);
  expect(state.heightCalibrated).toBe(false);
  expect(state.heightPresent).toBe(true);
  expect(state.lastCommand).toBe(0x20);
  expect(state.lastResult).toBe('ok');
  expect(state.sequence).toBe(7);
  expect(state.zeroOffset).toBe(1355500);
  expect(state.calFactor).toBe(23666);
  expect(state.heightOffsetCm).toBe(12.5);
  expect(state.lastMeasuredRaw).toBe(-2);
  expect(parseSmartGrowthCalibration(bytes.slice(0, 19))).toBeNull();
});

test('builds the device_calibrations insert object', () => {
  const stats = computeCheckStats([10.2, 10.2], 10, 0.1)!;
  const object = buildCalibrationInsertObject(
    {
      bleId: 'AA:BB',
      deviceId: null,
      deviceKey: 'SG-1',
      deviceName: 'SmartGrowth-0001',
      batchId: 'b',
      kind: 'check',
      measure: 'weight',
      referenceValue: 10,
      readings: [10.2, 10.2],
      stats,
      result: 'ok',
    },
    { schoolId: 's', userId: 'u' },
  );
  expect(object).toMatchObject({
    school_id: 's',
    performed_by: 'u',
    kind: 'check',
    n: 2,
    within_tolerance: false,
    tolerance: 0.1,
    previous_values: null,
    zero_offset: null,
  });
});
