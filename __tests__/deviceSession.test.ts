import {
  getDeviceSessionSnapshot,
  setLatestWeightKg,
  subscribeDeviceSession,
} from '../src/features/device/deviceSession';

test('setLatestWeightKg skips repeated identical readings', () => {
  const listener = jest.fn();
  const unsubscribe = subscribeDeviceSession(listener);

  setLatestWeightKg(42.5);
  setLatestWeightKg(42.5);
  setLatestWeightKg(42.5);
  expect(listener).toHaveBeenCalledTimes(1);

  setLatestWeightKg(42.6);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(getDeviceSessionSnapshot().latestWeightKg).toBe(42.6);

  unsubscribe();
});
