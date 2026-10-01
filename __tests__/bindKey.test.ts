import { maskS400BindKey, normalizeS400BindKey } from '../src/features/device/bindKey';

const KEY = '0123456789abcdef0123456789abcdef';

describe('normalizeS400BindKey', () => {
  test('accepts 32 hex chars and lowercases', () => {
    expect(normalizeS400BindKey(KEY.toUpperCase())).toBe(KEY);
    expect(normalizeS400BindKey(`  ${KEY}  `)).toBe(KEY);
  });

  test('tolerates copy-paste separators', () => {
    expect(normalizeS400BindKey('01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef')).toBe(KEY);
    expect(normalizeS400BindKey('01234567-89ab-cdef 0123456789abcdef')).toBe(KEY);
  });

  test('rejects invalid keys', () => {
    expect(normalizeS400BindKey(undefined)).toBeNull();
    expect(normalizeS400BindKey(null)).toBeNull();
    expect(normalizeS400BindKey('')).toBeNull();
    expect(normalizeS400BindKey(KEY.slice(0, 31))).toBeNull();
    expect(normalizeS400BindKey(`${KEY}0`)).toBeNull();
    expect(normalizeS400BindKey(`${KEY.slice(0, 31)}g`)).toBeNull();
  });
});

test('maskS400BindKey shows only the last 4 characters', () => {
  expect(maskS400BindKey(KEY)).toBe('••••••••cdef');
});

describe('bindKeyStore', () => {
  test('per-device key overrides, save/remove round-trip', async () => {
    const store = require('../src/features/device/bindKeyStore');
    expect(await store.saveS400BindKey('AA:BB:CC:DD:EE:FF', 'nope')).toBe(false);
    expect(await store.saveS400BindKey('AA:BB:CC:DD:EE:FF', KEY.toUpperCase())).toBe(true);
    expect(store.resolveS400BindKey('AA:BB:CC:DD:EE:FF')).toEqual({ key: KEY, source: 'device' });
    await store.removeS400BindKey('AA:BB:CC:DD:EE:FF');
    expect(store.resolveS400BindKey('AA:BB:CC:DD:EE:FF').source).not.toBe('device');
  });
});
