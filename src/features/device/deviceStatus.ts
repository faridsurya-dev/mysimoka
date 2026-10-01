import type { DeviceSessionSnapshot } from './deviceSession';

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

/** e.g. "Belum terhubung" or "Terhubung: SmartGrowth-1A2B · 25,4 kg · 123,4 cm". */
export function describeDeviceStatus(session: DeviceSessionSnapshot) {
  if (!session.connectedDeviceId) {
    return 'Belum terhubung';
  }
  const name = session.connectedDeviceName ?? session.connectedDeviceId;
  const reading = describeLatestReading(session);
  return reading ? `Terhubung: ${name} · ${reading}` : `Terhubung: ${name} · menunggu data`;
}
