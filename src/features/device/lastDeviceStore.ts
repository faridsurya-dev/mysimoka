import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { getSessionUserId } from '../../services/auth';

// The last successfully connected BLE device (per logged-in user) and the
// "Sambung otomatis ke alat terakhir" preference, persisted in AsyncStorage.

const LAST_DEVICE_KEY = '@mysimoka/last-ble-device';
const AUTO_RECONNECT_KEY = '@mysimoka/ble-auto-reconnect';

export type RememberedDevice = {
  userId: string | null;
  bleId: string;
  name: string | null;
  /** ConnectedDeviceKind at connect time ('smartgrowth' | 'standard' | 's400' | 'unknown'). */
  kind: string;
  /** Admin label from the school registry, if any. */
  label: string | null;
  /** True after the user pressed "Putuskan"; cleared by the next manual connect. */
  paused: boolean;
};

export type LastDeviceState = {
  loaded: boolean;
  device: RememberedDevice | null;
  autoReconnectEnabled: boolean;
};

let state: LastDeviceState = { loaded: false, device: null, autoReconnectEnabled: true };
let deviceTouched = false;
let preferenceTouched = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<LastDeviceState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
}

function persistDevice(device: RememberedDevice | null) {
  const write = device
    ? AsyncStorage.setItem(LAST_DEVICE_KEY, JSON.stringify(device))
    : AsyncStorage.removeItem(LAST_DEVICE_KEY);
  write.catch(() => undefined);
}

function parseDevice(raw: string | null): RememberedDevice | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Partial<RememberedDevice> | null;
    if (!value || typeof value.bleId !== 'string' || value.bleId.length === 0) {
      return null;
    }
    return {
      userId: typeof value.userId === 'string' ? value.userId : null,
      bleId: value.bleId,
      name: typeof value.name === 'string' ? value.name : null,
      kind: typeof value.kind === 'string' ? value.kind : 'unknown',
      label: typeof value.label === 'string' ? value.label : null,
      paused: value.paused === true,
    };
  } catch {
    return null;
  }
}

export function loadLastDeviceStore(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [rawDevice, rawPreference] = await Promise.all([
        AsyncStorage.getItem(LAST_DEVICE_KEY).catch(() => null),
        AsyncStorage.getItem(AUTO_RECONNECT_KEY).catch(() => null),
      ]);
      // Changes made while loading win over what was on disk.
      setState({
        loaded: true,
        device: deviceTouched ? state.device : parseDevice(rawDevice),
        autoReconnectEnabled: preferenceTouched ? state.autoReconnectEnabled : rawPreference !== '0',
      });
    })();
  }
  return loadPromise;
}

export function getLastDeviceState() {
  return state;
}

export function subscribeLastDevice(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLastDeviceState() {
  return useSyncExternalStore(subscribeLastDevice, getLastDeviceState);
}

function updateDevice(device: RememberedDevice | null) {
  deviceTouched = true;
  setState({ device });
  persistDevice(device);
}

/** A successful connect: remember it and (re)enable auto-reconnect for it. */
export function rememberConnectedDevice(input: { bleId: string; name: string | null; kind: string }) {
  const previous = state.device;
  updateDevice({
    userId: getSessionUserId(),
    bleId: input.bleId,
    name: input.name,
    kind: input.kind,
    label: previous?.bleId === input.bleId ? previous.label : null,
    paused: false,
  });
}

export function updateRememberedLabel(bleId: string, label: string | null) {
  const device = state.device;
  if (!device || device.bleId !== bleId || device.label === label) {
    return;
  }
  updateDevice({ ...device, label });
}

/** User pressed "Putuskan": do not fight them by reconnecting. */
export function pauseAutoReconnectFor(bleId: string) {
  const device = state.device;
  if (!device || device.bleId !== bleId || device.paused) {
    return;
  }
  updateDevice({ ...device, paused: true });
}

/** Forget the remembered device (logout, or disabled by the school admin). */
export function forgetRememberedDevice(bleId?: string) {
  if (bleId && state.device?.bleId !== bleId) {
    return;
  }
  updateDevice(null);
}

export function setAutoReconnectEnabled(enabled: boolean) {
  preferenceTouched = true;
  setState({ autoReconnectEnabled: enabled });
  AsyncStorage.setItem(AUTO_RECONNECT_KEY, enabled ? '1' : '0').catch(() => undefined);
}

/** The device auto-reconnect may target for this user, or null. */
export function selectReconnectCandidate(
  current: LastDeviceState,
  userId: string | null,
): RememberedDevice | null {
  const device = current.device;
  if (!current.loaded || !current.autoReconnectEnabled || !device || device.paused) {
    return null;
  }
  // S400 is advertisement-only and has its own listen flow.
  if (device.kind === 's400') {
    return null;
  }
  if (!userId || device.userId !== userId) {
    return null;
  }
  return device;
}
