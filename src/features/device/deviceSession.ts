export type DeviceReadingSource =
  | 'gatt_weight_scale'
  | 'gatt_body_composition'
  | 's400_advertisement'
  | 'smartgrowth';

export type DeviceSessionSnapshot = {
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;
  /** Latest weight from the device (stable or not); see latestReadingStable. */
  latestWeightKg: number | null;
  latestWeightAt: string | null;
  /** Latest height (SmartGrowth station only). */
  latestHeightCm: number | null;
  latestHeightAt: string | null;
  /** True when the latest reading is final (safe to auto-fill). */
  latestReadingStable: boolean;
  latestReadingAt: string | null;
  latestReadingSource: DeviceReadingSource | null;
  /** Raw frame of the latest reading as lowercase hex (for device_payload). */
  latestRawHex: string | null;
  latestSequence: number | null;
  latestBatteryPct: number | null;
};

const EMPTY_READING = {
  latestWeightKg: null,
  latestWeightAt: null,
  latestHeightCm: null,
  latestHeightAt: null,
  latestReadingStable: false,
  latestReadingAt: null,
  latestReadingSource: null,
  latestRawHex: null,
  latestSequence: null,
  latestBatteryPct: null,
} as const;

let snapshot: DeviceSessionSnapshot = {
  connectedDeviceId: null,
  connectedDeviceName: null,
  ...EMPTY_READING,
};

const listeners = new Set<() => void>();

export function getDeviceSessionSnapshot(): DeviceSessionSnapshot {
  return snapshot;
}

export function subscribeDeviceSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function setConnectedBleDevice(device: { id: string; name: string } | null) {
  snapshot = {
    ...snapshot,
    connectedDeviceId: device?.id ?? null,
    connectedDeviceName: device?.name ?? null,
  };

  if (!device) {
    snapshot = { ...snapshot, ...EMPTY_READING };
  }

  emitChange();
}

const SAME_READING_REFRESH_MS = 1000;

export type DeviceReading = {
  weightKg?: number | null;
  heightCm?: number | null;
  stable: boolean;
  source: DeviceReadingSource;
  rawHex?: string | null;
  sequence?: number | null;
  batteryPct?: number | null;
};

export function setLatestReading(reading: DeviceReading) {
  const weightKg = reading.weightKg ?? null;
  const heightCm = reading.heightCm ?? null;
  if (weightKg === null && heightCm === null) {
    return;
  }

  // Devices repeat identical frames; re-rendering every subscribed screen for
  // each one is wasteful, so identical readings refresh at most once a second.
  const previousAt = snapshot.latestReadingAt ? Date.parse(snapshot.latestReadingAt) : 0;
  const isSame =
    (weightKg === null || snapshot.latestWeightKg === weightKg) &&
    (heightCm === null || snapshot.latestHeightCm === heightCm) &&
    snapshot.latestReadingStable === reading.stable;
  if (isSame && Date.now() - previousAt < SAME_READING_REFRESH_MS) {
    return;
  }

  const now = new Date().toISOString();
  snapshot = {
    ...snapshot,
    latestWeightKg: weightKg ?? snapshot.latestWeightKg,
    latestWeightAt: weightKg !== null ? now : snapshot.latestWeightAt,
    latestHeightCm: heightCm ?? snapshot.latestHeightCm,
    latestHeightAt: heightCm !== null ? now : snapshot.latestHeightAt,
    latestReadingStable: reading.stable,
    latestReadingAt: now,
    latestReadingSource: reading.source,
    latestRawHex: reading.rawHex ?? null,
    latestSequence: reading.sequence ?? null,
    latestBatteryPct: reading.batteryPct ?? snapshot.latestBatteryPct,
  };
  emitChange();
}

/** Legacy helper: a final weight-only reading (standard scales, S400). */
export function setLatestWeightKg(
  weightKg: number,
  source: DeviceReadingSource = 'gatt_weight_scale',
  rawHex: string | null = null,
) {
  setLatestReading({ weightKg, stable: true, source, rawHex });
}
