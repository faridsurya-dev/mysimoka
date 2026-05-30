import { parseWeightMeasurementKg } from '../src/features/device/weightScale';

beforeAll(() => {
  (globalThis as unknown as { atob?: unknown }).atob = (value: string) =>
    Buffer.from(value, 'base64').toString('binary');
});

test('parseWeightMeasurementKg parses SI kg payload', () => {
  const bytes = Buffer.from([0x00, 0xb0, 0x36]); // flags=SI, weightRaw=14000 -> 70.0kg
  const weightKg = parseWeightMeasurementKg(bytes.toString('base64'));
  expect(weightKg).toBeCloseTo(70, 4);
});

test('parseWeightMeasurementKg parses imperial lb payload', () => {
  const bytes = Buffer.from([0x01, 0x28, 0x3c]); // flags=imperial, weightRaw=15400 -> 154.00lb
  const weightKg = parseWeightMeasurementKg(bytes.toString('base64'));
  expect(weightKg).toBeCloseTo(154 * 0.45359237, 4);
});

