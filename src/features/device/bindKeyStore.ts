import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { S400_BIND_KEY } from '../../services/environment';
import { normalizeS400BindKey } from './bindKey';

// Per-scale S400 bind keys. Each Xiaomi scale has its own key, so keys are
// stored per BLE device id (Android: MAC address). The build-time env key is
// only a fallback. Keys are never logged.

const STORAGE_PREFIX = '@mysimoka/s400-bind-key/';

type BindKeyState = {
  /** deviceId -> key (null = known to have no stored key). */
  byDevice: Record<string, string | null>;
};

let state: BindKeyState = { byDevice: {} };
const listeners = new Set<() => void>();

function emit(next: BindKeyState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function setCached(deviceId: string, key: string | null) {
  emit({ byDevice: { ...state.byDevice, [deviceId]: key } });
}

export function subscribeBindKeys(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBindKeyState() {
  return state;
}

export function useBindKeys() {
  return useSyncExternalStore(subscribeBindKeys, getBindKeyState);
}

export type BindKeySource = 'device' | 'env' | null;

/** Synchronous lookup used by the advert decoder: per-device key, then env fallback. */
export function resolveS400BindKey(deviceId: string): { key: string | null; source: BindKeySource } {
  const deviceKey = state.byDevice[deviceId];
  if (deviceKey) {
    return { key: deviceKey, source: 'device' };
  }
  if (S400_BIND_KEY) {
    return { key: S400_BIND_KEY, source: 'env' };
  }
  return { key: null, source: null };
}

/** Loads a device's stored key into memory (no-op if already loaded). */
export async function loadS400BindKey(deviceId: string): Promise<string | null> {
  if (deviceId in state.byDevice) {
    return state.byDevice[deviceId] ?? null;
  }
  try {
    const stored = normalizeS400BindKey(await AsyncStorage.getItem(STORAGE_PREFIX + deviceId));
    setCached(deviceId, stored);
    return stored;
  } catch {
    setCached(deviceId, null);
    return null;
  }
}

/** Validates and stores a key for one device. Returns false if the key is invalid. */
export async function saveS400BindKey(deviceId: string, rawKey: string): Promise<boolean> {
  const key = normalizeS400BindKey(rawKey);
  if (!key) {
    return false;
  }
  await AsyncStorage.setItem(STORAGE_PREFIX + deviceId, key);
  setCached(deviceId, key);
  return true;
}

export async function removeS400BindKey(deviceId: string) {
  await AsyncStorage.removeItem(STORAGE_PREFIX + deviceId);
  setCached(deviceId, null);
}
