import { upsertSchoolDevice, type SchoolDeviceUpsertResult } from '../../services/auth';
import {
  getDeviceSessionSnapshot,
  setConnectedDeviceLabel,
  subscribeDeviceSession,
} from './deviceSession';
import {
  DEVICE_REGISTRY_REFRESH_MS,
  mapConnectKindToKind,
  mapReadingSourceToKind,
  normalizeBatteryPct,
  resolveDeviceKey,
  shouldRefineKind,
  type ConnectKindHint,
  type DeviceRegistrationInput,
  type RegistryDeviceKind,
} from './deviceRegistryPayload';

// Best-effort registration of the connected BLE device in the school's device
// registry so admins can see it. The device is optional hardware: nothing here
// may throw into the UI or block measuring/manual input. Failures (offline,
// backend not deployed, permission) are ignored.

function devLog(...args: unknown[]) {
  if (__DEV__) {
    console.log('[deviceRegistry]', ...args);
  }
}

/** Upserts the device for the active school. Never throws; null = skipped or failed. */
export async function registerDevice(
  input: DeviceRegistrationInput,
): Promise<SchoolDeviceUpsertResult | null> {
  try {
    const result = await upsertSchoolDevice(input);
    devLog(result ? 'registered' : 'skipped', input.bleId, input.kind, result);
    return result;
  } catch (error) {
    devLog('failed (ignored)', input.bleId, error instanceof Error ? error.message : error);
    return null;
  }
}

type TrackedDevice = {
  bleId: string;
  name: string | null;
  serial: string | null;
  firmwareVersion: string | null;
  /** S400: wait until a bound scale yields its first reading. */
  waitForReading: boolean;
  sentKind: RegistryDeviceKind | null;
  sentBatteryPct: number | null;
  lastAttemptAt: number;
  lastAttemptFailed: boolean;
  inFlight: boolean;
};

let tracked: TrackedDevice | null = null;
/** Registry row (devices.id + device_key) per BLE id, for logging calibrations. */
const registeredDevices = new Map<string, { id: string | null; deviceKey: string }>();

export function getRegisteredDevice(bleId: string) {
  return registeredDevices.get(bleId) ?? null;
}
let disabledHandler: ((bleId: string) => void) | null = null;
let sessionUnsubscribe: (() => void) | null = null;

/** Called with the BLE id when the registry says the admin disabled the device. */
export function setDeviceDisabledHandler(handler: ((bleId: string) => void) | null) {
  disabledHandler = handler;
}

function ensureSessionWatch() {
  if (!sessionUnsubscribe) {
    sessionUnsubscribe = subscribeDeviceSession(handleSessionChange);
  }
}

async function send(device: TrackedDevice, kind: RegistryDeviceKind, batteryPct: number | null) {
  device.inFlight = true;
  device.lastAttemptAt = Date.now();
  const result = await registerDevice({
    bleId: device.bleId,
    name: device.name,
    kind,
    serial: device.serial,
    firmwareVersion: device.firmwareVersion,
    batteryPct,
  });
  device.inFlight = false;
  device.lastAttemptFailed = result === null;
  device.waitForReading = false;
  device.sentKind = kind;
  if (result) {
    registeredDevices.set(device.bleId, {
      id: result.id,
      deviceKey: resolveDeviceKey({ bleId: device.bleId, serial: device.serial }),
    });
  }
  if (batteryPct !== null) {
    device.sentBatteryPct = batteryPct;
  }

  if (!result || tracked !== device || getDeviceSessionSnapshot().connectedDeviceId !== device.bleId) {
    return;
  }
  setConnectedDeviceLabel(device.bleId, result.label);
  if (!result.isActive) {
    tracked = null;
    disabledHandler?.(device.bleId);
  }
}

function handleSessionChange() {
  const device = tracked;
  const session = getDeviceSessionSnapshot();
  if (!device) {
    return;
  }
  if (session.connectedDeviceId !== device.bleId) {
    if (session.connectedDeviceId === null) {
      tracked = null;
    }
    return;
  }
  if (device.inFlight) {
    return;
  }

  const now = Date.now();
  const observedKind = mapReadingSourceToKind(session.latestReadingSource);
  const batteryPct = normalizeBatteryPct(session.latestBatteryPct);
  const throttled = now - device.lastAttemptAt < DEVICE_REGISTRY_REFRESH_MS;

  if (device.waitForReading) {
    if (observedKind && !(device.lastAttemptFailed && throttled)) {
      send(device, observedKind, batteryPct);
    }
    return;
  }
  if (device.lastAttemptFailed && throttled) {
    return;
  }
  if (shouldRefineKind(device.sentKind, observedKind) && observedKind) {
    send(device, observedKind, batteryPct);
    return;
  }
  const kind = device.sentKind ?? observedKind ?? 'other';
  // First battery value is sent once; afterwards at most every 10 minutes.
  const batteryDue = batteryPct !== null && (device.sentBatteryPct === null || !throttled);
  if (batteryDue || (!throttled && device.lastAttemptFailed)) {
    send(device, kind, batteryPct);
  }
}

export type TrackConnectedDeviceInput = {
  bleId: string;
  name: string | null;
  kindHint: ConnectKindHint | null;
  serial?: string | null;
  firmwareVersion?: string | null;
};

/**
 * Starts tracking the freshly connected device: registers it now (or, for the
 * advertisement-only S400, on its first decoded reading), then refreshes kind
 * and battery from the session without per-frame writes.
 */
export function trackConnectedDevice(input: TrackConnectedDeviceInput) {
  ensureSessionWatch();
  const device: TrackedDevice = {
    bleId: input.bleId,
    name: input.name,
    serial: input.serial ?? null,
    firmwareVersion: input.firmwareVersion ?? null,
    waitForReading: input.kindHint === 's400',
    sentKind: null,
    sentBatteryPct: null,
    lastAttemptAt: 0,
    lastAttemptFailed: false,
    inFlight: false,
  };
  tracked = device;
  if (!device.waitForReading) {
    const session = getDeviceSessionSnapshot();
    const kind =
      input.kindHint === 'standard'
        ? (mapReadingSourceToKind(session.latestReadingSource) ?? mapConnectKindToKind('standard'))
        : mapConnectKindToKind(input.kindHint);
    send(device, kind, normalizeBatteryPct(session.latestBatteryPct));
  } else {
    // A reading may already be in (e.g. a bound S400 broadcasting before connect finished).
    handleSessionChange();
  }
}

export function stopTrackingDevice(bleId?: string) {
  if (!bleId || tracked?.bleId === bleId) {
    tracked = null;
  }
}
