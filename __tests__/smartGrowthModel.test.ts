import { buildCalibrationInsertObject, modelMeanAbsError } from '../src/features/device/calibration';
import {
  SMARTGROWTH_COMMANDS,
  encodeSmartGrowthCommand,
  float32LEBytes,
  parseSmartGrowthModel,
} from '../src/features/device/smartGrowth';

/** Model frame as firmware 2.3 builds it (protocol section 6c). */
function modelFrame(options: {
  weight: [number, number, number, number]; // type, slope, intercept, rmse
  height: [number, number, number, number];
  zero: number;
  weightPoints: Array<[number, number]>; // counts, reference kg
  heightPoints: Array<[number, number]>; // distance cm, reference cm
}) {
  const bytes = new Uint8Array(33 + (options.weightPoints.length + options.heightPoints.length) * 8);
  const view = new DataView(bytes.buffer);
  bytes[0] = 1;
  bytes[1] = options.weight[0];
  bytes[2] = options.weightPoints.length;
  bytes[3] = options.height[0];
  bytes[4] = options.heightPoints.length;
  [options.weight[1], options.weight[2], options.weight[3]].forEach((v, i) => view.setFloat32(5 + i * 4, v, true));
  [options.height[1], options.height[2], options.height[3]].forEach((v, i) => view.setFloat32(17 + i * 4, v, true));
  view.setInt32(29, options.zero, true);
  let offset = 33;
  for (const [counts, reference] of options.weightPoints) {
    view.setInt32(offset, counts, true);
    view.setFloat32(offset + 4, reference, true);
    offset += 8;
  }
  for (const [distance, reference] of options.heightPoints) {
    view.setFloat32(offset, distance, true);
    view.setFloat32(offset + 4, reference, true);
    offset += 8;
  }
  return bytes;
}

test('parses the sensor stabiliser model with points and predictions', () => {
  const model = parseSmartGrowthModel(
    modelFrame({
      weight: [2, 0.0000432, -0.1, 0.12],
      height: [1, -1, 204.3, 0.4],
      zero: 1453138,
      weightPoints: [
        [1081458, 46.25],
        [2142294, 92.1],
      ],
      heightPoints: [[24.1, 180]],
    }),
  );
  expect(model).not.toBeNull();
  expect(model!.zeroOffset).toBe(1453138);
  expect(model!.weight.type).toBe('regression');
  expect(model!.height.type).toBe('single');
  expect(model!.weightPoints).toHaveLength(2);
  expect(model!.weightPoints[0].referenceKg).toBeCloseTo(46.25, 4);
  expect(model!.weightPoints[0].predictedKg).toBeCloseTo(0.0000432 * 1081458 - 0.1, 2);
  expect(model!.heightPoints[0].predictedCm).toBeCloseTo(204.3 - 24.1, 1);
  expect(model!.height.rmse).toBeCloseTo(0.4, 4);
});

test('model without points: rmse null, default type', () => {
  const model = parseSmartGrowthModel(
    modelFrame({
      weight: [0, 1 / 23357.62, 0, NaN],
      height: [0, -1, 204.3, NaN],
      zero: 0,
      weightPoints: [],
      heightPoints: [],
    }),
  );
  expect(model!.weight.type).toBe('default');
  expect(model!.weight.rmse).toBeNull();
  expect(model!.weightPoints).toEqual([]);
});

test('rejects truncated / unknown model frames', () => {
  const frame = modelFrame({
    weight: [2, 1, 0, 0],
    height: [0, -1, 0, NaN],
    zero: 0,
    weightPoints: [[1, 1]],
    heightPoints: [],
  });
  expect(parseSmartGrowthModel(frame.slice(0, 36))).toBeNull();
  const wrongVersion = frame.slice();
  wrongVersion[0] = 2;
  expect(parseSmartGrowthModel(wrongVersion)).toBeNull();
});

test('training point commands', () => {
  expect(Array.from(Buffer.from(encodeSmartGrowthCommand(SMARTGROWTH_COMMANDS.addWeightPoint, float32LEBytes(46.25)), 'base64'))).toEqual([
    0x23, 0x00, 0x00, 0x39, 0x42,
  ]);
  expect(Array.from(Buffer.from(encodeSmartGrowthCommand(SMARTGROWTH_COMMANDS.deletePoint, [1, 0xff]), 'base64'))).toEqual([
    0x25, 0x01, 0xff,
  ]);
});

test('model snapshot is logged only when present; mean abs error per point', () => {
  const base = {
    bleId: 'ble',
    deviceId: null,
    deviceKey: null,
    deviceName: null,
    batchId: 'batch',
    kind: 'adjust_weight' as const,
    result: 'ok',
  };
  const context = { schoolId: 'school', userId: 'user' };
  expect('model' in buildCalibrationInsertObject(base, context)).toBe(false);
  const part = {
    type: 'regression' as const,
    slope: 1,
    intercept: 0,
    rmse: 0.1,
    points: [
      { raw: 1, reference: 10, predicted: 10.1 },
      { raw: 2, reference: 20, predicted: 19.7 },
    ],
  };
  const row = buildCalibrationInsertObject(
    { ...base, model: { weight: part, height: { ...part, points: [] } } },
    context,
  );
  expect(row.model?.weight.points).toHaveLength(2);
  expect(modelMeanAbsError(part)).toBeCloseTo(0.2, 3);
  expect(modelMeanAbsError({ ...part, points: [] })).toBeNull();
});
