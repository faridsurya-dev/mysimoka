import type { DeviceReadingSource } from './deviceSession';

// Pure helpers for the school device registry (Hasura `devices`). No BLE or
// network imports so they are unit-testable and safe to import anywhere.

export type RegistryDeviceKind =
  | 'smartgrowth'
  | 'weight_scale'
  | 'body_composition'
  | 's400'
  | 'other';

/** What the device manager knows right after connecting. */
export type ConnectKindHint = 'smartgrowth' | 'standard' | 's400' | 'unknown';

export const DEVICE_DISABLED_MESSAGE = 'Alat ini dinonaktifkan oleh admin sekolah.';

/** Battery is refreshed at most this often while connected. */
export const DEVICE_REGISTRY_REFRESH_MS = 10 * 60 * 1000;

export function mapReadingSourceToKind(
  source: DeviceReadingSource | null | undefined,
): RegistryDeviceKind | null {
  switch (source) {
    case 'smartgrowth':
      return 'smartgrowth';
    case 'gatt_weight_scale':
      return 'weight_scale';
    case 'gatt_body_composition':
      return 'body_composition';
    case 's400_advertisement':
      return 's400';
    default:
      return null;
  }
}

export function mapConnectKindToKind(kind: ConnectKindHint | null | undefined): RegistryDeviceKind {
  switch (kind) {
    case 'smartgrowth':
      return 'smartgrowth';
    case 'standard':
      // Refined to body_composition once a reading shows which service it uses.
      return 'weight_scale';
    case 's400':
      return 's400';
    default:
      return 'other';
  }
}

/** A connect-time guess may be refined by the first real reading. */
export function shouldRefineKind(sent: RegistryDeviceKind | null, observed: RegistryDeviceKind | null) {
  if (!observed || observed === sent) {
    return false;
  }
  return sent === null || sent === 'other' || sent === 'weight_scale';
}

export type DeviceRegistrationInput = {
  /** BLE id as seen by this phone (same value as student_measurement_records.device_id). */
  bleId: string;
  /** Advertised name. */
  name?: string | null;
  kind: RegistryDeviceKind;
  serial?: string | null;
  firmwareVersion?: string | null;
  batteryPct?: number | null;
};

export type DeviceUpsertContext = {
  schoolId: string;
  userId: string;
  now: Date;
};

export type DeviceUpsertObject = {
  school_id: string;
  device_key: string;
  ble_id: string;
  name: string | null;
  kind: RegistryDeviceKind;
  serial: string | null;
  firmware_version: string | null;
  battery_pct: number | null;
  last_seen_at: string;
  last_seen_by: string;
};

const BASE_UPDATE_COLUMNS = ['ble_id', 'name', 'kind', 'last_seen_at', 'last_seen_by'] as const;

function cleanText(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeBatteryPct(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= 100 ? rounded : null;
}

/** device_key: SmartGrowth serial when known, otherwise the BLE id. */
export function resolveDeviceKey(input: Pick<DeviceRegistrationInput, 'bleId' | 'serial'>) {
  return cleanText(input.serial) ?? input.bleId.trim();
}

export function buildDeviceUpsertObject(
  input: DeviceRegistrationInput,
  context: DeviceUpsertContext,
): DeviceUpsertObject | null {
  const bleId = cleanText(input.bleId);
  if (!bleId) {
    return null;
  }
  return {
    school_id: context.schoolId,
    device_key: resolveDeviceKey({ bleId, serial: input.serial }),
    ble_id: bleId,
    name: cleanText(input.name),
    kind: input.kind,
    serial: cleanText(input.serial),
    firmware_version: cleanText(input.firmwareVersion),
    battery_pct: normalizeBatteryPct(input.batteryPct),
    last_seen_at: context.now.toISOString(),
    last_seen_by: context.userId,
  };
}

/**
 * Columns refreshed on conflict. Optional facts the app does not know right
 * now (battery, serial, firmware) are left out so the admin keeps the last
 * known value instead of seeing it wiped to null.
 */
export function buildDeviceUpdateColumns(object: DeviceUpsertObject): string[] {
  const columns: string[] = [...BASE_UPDATE_COLUMNS];
  if (object.serial !== null) {
    columns.push('serial');
  }
  if (object.firmware_version !== null) {
    columns.push('firmware_version');
  }
  if (object.battery_pct !== null) {
    columns.push('battery_pct');
  }
  return columns;
}
