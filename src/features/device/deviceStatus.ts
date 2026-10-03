import type { DeviceSensorStatus, DeviceSessionSnapshot } from './deviceSession';
import type { SmartGrowthSensorStatus } from './smartGrowth';

// UI strings for the device status (no BLE imports: safe for manual screens).

export function formatDeviceNumber(value: number) {
  return value.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

export function describeLatestReading(session: DeviceSessionSnapshot) {
  const parts: string[] = [];
  if (session.latestWeightKg !== null) {
    parts.push(`${formatDeviceNumber(session.latestWeightKg)} kg`);
  }
  if (session.latestHeightCm !== null) {
    parts.push(`${formatDeviceNumber(session.latestHeightCm)} cm`);
  }
  if (parts.length > 0 && !session.latestReadingStable) {
    parts.push('mengukur…');
  }
  return parts.join(' · ');
}

/** Admin label from the school registry when set, else the advertised name. */
export function getDeviceDisplayName(
  session: Pick<
    DeviceSessionSnapshot,
    'connectedDeviceId' | 'connectedDeviceName' | 'connectedDeviceLabel'
  >,
) {
  return session.connectedDeviceLabel ?? session.connectedDeviceName ?? session.connectedDeviceId;
}

/** e.g. "Belum terhubung" or "Terhubung: SmartGrowth-1A2B · 25,4 kg · 123,4 cm". */
export function describeDeviceStatus(session: DeviceSessionSnapshot) {
  if (!session.connectedDeviceId) {
    if (session.deviceNotice) {
      return session.deviceNotice;
    }
    return session.reconnectingDeviceName
      ? `Menyambungkan ulang ke ${session.reconnectingDeviceName}…`
      : 'Belum terhubung';
  }
  const name = getDeviceDisplayName(session);
  const reading = describeLatestReading(session);
  return reading ? `Terhubung: ${name} · ${reading}` : `Terhubung: ${name} · menunggu data`;
}

export const SENSOR_STATUS_UNAVAILABLE_TEXT = 'Status sensor tidak tersedia (firmware lama)';
export const SENSOR_STATUS_LOADING_TEXT = 'Membaca status sensor…';

export type SensorChecklistItem = {
  key: string;
  label: string;
  value: string;
  /** true = ready, false = needs attention, null = informational. */
  ok: boolean | null;
};

const HEIGHT_SENSOR_LABELS = {
  vl53l0x: 'VL53L0X',
  sharp: 'Sharp GP2Y0A02',
  unknown: 'Tidak dikenal',
} as const;

const DEVICE_STATE_LABELS = {
  idle: 'Siap',
  measuring: 'Mengukur',
  held: 'Hasil ditahan',
  unknown: 'Tidak diketahui',
} as const;

/** SmartGrowth sensor checklist (Indonesian), from the Status characteristic. */
export function buildSensorChecklist(status: SmartGrowthSensorStatus): SensorChecklistItem[] {
  const items: SensorChecklistItem[] = [
    {
      key: 'weight',
      label: 'Timbangan (HX711)',
      value: status.weightOk ? 'Tersambung' : 'Tidak terdeteksi — cek kabel',
      ok: status.weightOk,
    },
  ];

  if (status.heightSensorType === 'none') {
    items.push({
      key: 'height',
      label: 'Sensor tinggi',
      value: 'Tidak ada (mode timbangan saja)',
      ok: null,
    });
  } else {
    items.push({
      key: 'height',
      label: 'Sensor tinggi',
      value: status.heightDetected
        ? HEIGHT_SENSOR_LABELS[status.heightSensorType]
        : `${HEIGHT_SENSOR_LABELS[status.heightSensorType]} — tidak terdeteksi`,
      ok: status.heightDetected,
    });
    items.push({
      key: 'headboard',
      label: 'Papan kepala',
      value: status.heightReading ? 'Terbaca' : 'Belum terbaca',
      ok: status.heightReading,
    });
  }

  items.push(
    {
      key: 'calibration',
      label: 'Kalibrasi berat',
      value: status.weightCalibrated ? 'Sudah' : 'Belum — kalibrasi lewat Serial (c <kg>)',
      ok: status.weightCalibrated,
    },
    {
      key: 'tare',
      label: 'Titik nol (tare)',
      value: status.tareSet ? 'Sudah' : 'Belum — tekan Tare',
      ok: status.tareSet,
    },
    {
      key: 'battery',
      label: 'Baterai',
      value: status.batteryPct !== null ? `${status.batteryPct}%` : 'Tidak tersedia',
      ok: null,
    },
    {
      key: 'state',
      label: 'Status alat',
      value: DEVICE_STATE_LABELS[status.state],
      ok: null,
    },
  );
  return items;
}

/**
 * One-line summary for compact cards, e.g. "Sensor siap" or
 * "Perlu dicek: Timbangan (HX711), Kalibrasi berat". Null when not applicable.
 */
export function describeSensorSummary(
  status: DeviceSensorStatus,
): { text: string; ok: boolean | null } | null {
  if (status === null) {
    return null;
  }
  if (status === 'unsupported') {
    return { text: SENSOR_STATUS_UNAVAILABLE_TEXT, ok: null };
  }
  // The head board is only "not read" while nobody stands under the sensor; not a fault.
  const problems = buildSensorChecklist(status).filter(
    item => item.ok === false && item.key !== 'headboard',
  );
  if (problems.length === 0) {
    return { text: 'Sensor siap', ok: true };
  }
  return { text: `Perlu dicek: ${problems.map(item => item.label).join(', ')}`, ok: false };
}
