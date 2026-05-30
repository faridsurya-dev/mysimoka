type DeviceSessionSnapshot = {
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;
  latestWeightKg: number | null;
  latestWeightAt: string | null;
};

let snapshot: DeviceSessionSnapshot = {
  connectedDeviceId: null,
  connectedDeviceName: null,
  latestWeightKg: null,
  latestWeightAt: null,
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
    snapshot = {
      ...snapshot,
      latestWeightKg: null,
      latestWeightAt: null,
    };
  }

  emitChange();
}

export function setLatestWeightKg(weightKg: number) {
  snapshot = {
    ...snapshot,
    latestWeightKg: weightKg,
    latestWeightAt: new Date().toISOString(),
  };
  emitChange();
}

