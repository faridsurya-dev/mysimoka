import type { Device, Subscription } from 'react-native-ble-plx';
import { resolveS400BindKey } from './bindKeyStore';
import { base64ToBytes, bytesToHex, readUInt16LE } from './bytes';
import { setLatestWeightKg } from './deviceSession';
import { decryptS400FromAdvertisement } from './s400Decryptor';
import {
  SMARTGROWTH_MEASUREMENT_CHAR_UUID,
  SMARTGROWTH_SERVICE_UUID,
  startSmartGrowthMonitor,
  stopSmartGrowthMonitor,
} from './smartGrowth';

// Bluetooth SIG: Weight Scale service + Weight Measurement characteristic.
const WEIGHT_SCALE_SERVICE_UUID = '0000181d-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT_CHAR_UUID = '00002a9d-0000-1000-8000-00805f9b34fb';

// Bluetooth SIG: Body Composition service + Body Composition Measurement characteristic.
const BODY_COMPOSITION_SERVICE_UUID = '0000181b-0000-1000-8000-00805f9b34fb';
const BODY_COMPOSITION_MEASUREMENT_CHAR_UUID = '00002a9c-0000-1000-8000-00805f9b34fb';

const LB_TO_KG = 0.45359237;

const activeMonitors = new Map<string, Subscription[]>();

export type WeightScaleDebugLog = {
  timestamp: string;
  deviceId: string;
  source: 'WeightMeasurement' | 'BodyCompositionMeasurement' | 'SmartGrowthMeasurement';
  serviceUuid: string;
  characteristicUuid: string;
  rawValueBase64: string | null;
  parsedWeightKg: number | null;
  message: string;
};

const debugLogListeners = new Set<(entry: WeightScaleDebugLog) => void>();

const S400_SERVICE_UUID_SHORT = '181b';
const XIAOMI_SERVICE_UUID_SHORT = 'fe95';
const lastAdvHexByDevice = new Map<string, string>();
const lastManufacturerHexByDevice = new Map<string, string>();
const macAddressByDevice = new Map<string, string>();

function emitDebugLog(entry: WeightScaleDebugLog) {
  for (const listener of debugLogListeners) {
    listener(entry);
  }
}

function pushDebugLog(
  deviceId: string,
  source: WeightScaleDebugLog['source'],
  serviceUuid: string,
  characteristicUuid: string,
  message: string,
  rawValueBase64: string | null = null,
  parsedWeightKg: number | null = null,
) {
  if (debugLogListeners.size === 0) {
    return;
  }

  emitDebugLog({
    timestamp: new Date().toISOString(),
    deviceId,
    source,
    serviceUuid,
    characteristicUuid,
    rawValueBase64,
    parsedWeightKg,
    message,
  });
}

export function subscribeWeightScaleDebugLog(listener: (entry: WeightScaleDebugLog) => void) {
  debugLogListeners.add(listener);
  return () => {
    debugLogListeners.delete(listener);
  };
}

export function setDeviceMacAddress(deviceId: string, macAddress: string | null | undefined) {
  if (!macAddress) {
    return;
  }

  macAddressByDevice.set(deviceId, macAddress.toUpperCase());
}

function parseWeightScaleMeasurementKg(bytes: Uint8Array): number | null {
  if (bytes.length < 3) {
    return null;
  }

  const flags = bytes[0];
  const isImperial = flags % 2 === 1;
  const weightRaw = readUInt16LE(bytes, 1);

  if (isImperial) {
    const weightLb = weightRaw * 0.01;
    const weightKg = weightLb * LB_TO_KG;
    return Number.isFinite(weightKg) ? weightKg : null;
  }

  const weightKg = weightRaw * 0.005;
  return Number.isFinite(weightKg) ? weightKg : null;
}

function parseBodyCompositionMeasurementKg(bytes: Uint8Array): number | null {
  if (bytes.length < 4) {
    return null;
  }

  const flags = readUInt16LE(bytes, 0);
  const isImperial = flags % 2 === 1;
  const weightRaw = readUInt16LE(bytes, 2);

  if (isImperial) {
    const weightLb = weightRaw * 0.01;
    const weightKg = weightLb * LB_TO_KG;
    return Number.isFinite(weightKg) ? weightKg : null;
  }

  const weightKg = weightRaw * 0.005;
  return Number.isFinite(weightKg) ? weightKg : null;
}

function parseMeasurementKg(base64Value: string, characteristicUuid: string): number | null {
  try {
    const bytes = base64ToBytes(base64Value);
    const normalizedUuid = characteristicUuid.toLowerCase();

    if (normalizedUuid === BODY_COMPOSITION_MEASUREMENT_CHAR_UUID) {
      return parseBodyCompositionMeasurementKg(bytes);
    }

    return parseWeightScaleMeasurementKg(bytes);
  } catch {
    return null;
  }
}

export function parseWeightMeasurementKg(base64Value: string): number | null {
  try {
    return parseWeightScaleMeasurementKg(base64ToBytes(base64Value));
  } catch {
    return null;
  }
}

function normalizeUuid(input: string) {
  const lower = input.toLowerCase();
  if (lower.length === 4) {
    return lower;
  }

  if (lower.includes('-')) {
    return lower.slice(4, 8);
  }

  return lower;
}

// Forget last-seen payloads so the first packet after a (re)connect is decoded.
export function resetAdvertisementCache(deviceId: string) {
  lastAdvHexByDevice.delete(deviceId);
  lastManufacturerHexByDevice.delete(deviceId);
}

export function handleS400Advertisement(deviceId: string, serviceData: Record<string, string> | null | undefined) {
  if (!serviceData) {
    return false;
  }

  let foundS400Packet = false;

  for (const [uuidKey, value] of Object.entries(serviceData)) {
    const shortUuid = normalizeUuid(uuidKey);
    if (shortUuid !== S400_SERVICE_UUID_SHORT && shortUuid !== XIAOMI_SERVICE_UUID_SHORT) {
      continue;
    }

    foundS400Packet = true;
    try {
      const bytes = base64ToBytes(value);
      const payloadLength = bytes.length;
      const payloadHex = bytesToHex(bytes);
      const payloadHexPreview = payloadHex.slice(0, 120);
      const previousHex = lastAdvHexByDevice.get(deviceId) ?? null;
      const hasChanged = previousHex !== payloadHex;
      // Scales repeat the same frame many times per second; decrypt each frame once.
      if (!hasChanged) {
        continue;
      }
      lastAdvHexByDevice.set(deviceId, payloadHex);

      const packetType = shortUuid === XIAOMI_SERVICE_UUID_SHORT ? 'adv FE95' : 'adv 0x181B';
      pushDebugLog(
        deviceId,
        'BodyCompositionMeasurement',
        BODY_COMPOSITION_SERVICE_UUID,
        BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
        `${packetType} diterima (${payloadLength} byte) [berubah]`,
        value,
        null,
      );
      pushDebugLog(
        deviceId,
        'BodyCompositionMeasurement',
        BODY_COMPOSITION_SERVICE_UUID,
        BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
        `adv hex preview: ${payloadHexPreview}`,
      );

      const bindKey = resolveS400BindKey(deviceId).key;
      const macAddress = macAddressByDevice.get(deviceId);
      if (bindKey && macAddress) {
        const measurement = decryptS400FromAdvertisement(bytes, macAddress, bindKey);
        if (measurement) {
          setLatestWeightKg(measurement.weightKg, 's400_advertisement', payloadHex);
          pushDebugLog(
            deviceId,
            'BodyCompositionMeasurement',
            BODY_COMPOSITION_SERVICE_UUID,
            BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
            `decrypt sukses dari ${packetType}: ${measurement.weightKg.toFixed(1)} kg`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushDebugLog(
        deviceId,
        'BodyCompositionMeasurement',
        BODY_COMPOSITION_SERVICE_UUID,
        BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
        `adv decode gagal: ${message}`,
        value,
      );
    }
  }

  return foundS400Packet;
}

export function handleS400ManufacturerData(
  deviceId: string,
  manufacturerDataBase64: string | null | undefined,
) {
  if (!manufacturerDataBase64) {
    return false;
  }

  try {
    const bytes = base64ToBytes(manufacturerDataBase64);
    const payloadHex = bytesToHex(bytes);
    const payloadLength = bytes.length;
    const previousHex = lastManufacturerHexByDevice.get(deviceId) ?? null;
    if (previousHex === payloadHex) {
      return true;
    }
    lastManufacturerHexByDevice.set(deviceId, payloadHex);

    pushDebugLog(
      deviceId,
      'BodyCompositionMeasurement',
      BODY_COMPOSITION_SERVICE_UUID,
      BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
      `manufacturerData diterima (${payloadLength} byte) [berubah]`,
      manufacturerDataBase64,
      null,
    );
    pushDebugLog(
      deviceId,
      'BodyCompositionMeasurement',
      BODY_COMPOSITION_SERVICE_UUID,
      BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
      `manufacturer hex preview: ${payloadHex.slice(0, 120)}`,
    );

    const bindKey = resolveS400BindKey(deviceId).key;
    const macAddress = macAddressByDevice.get(deviceId);
    if (bindKey && macAddress) {
      const measurement = decryptS400FromAdvertisement(bytes, macAddress, bindKey);
      if (measurement) {
        setLatestWeightKg(measurement.weightKg, 's400_advertisement', payloadHex);
        pushDebugLog(
          deviceId,
          'BodyCompositionMeasurement',
          BODY_COMPOSITION_SERVICE_UUID,
          BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
          `decrypt sukses dari manufacturerData: ${measurement.weightKg.toFixed(1)} kg`,
        );
      } else {
        pushDebugLog(
          deviceId,
          'BodyCompositionMeasurement',
          BODY_COMPOSITION_SERVICE_UUID,
          BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
          'raw packet diterima, decode berat belum valid (bind key/frame belum match)',
        );
      }
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushDebugLog(
      deviceId,
      'BodyCompositionMeasurement',
      BODY_COMPOSITION_SERVICE_UUID,
      BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
      `manufacturer decode gagal: ${message}`,
      manufacturerDataBase64,
      null,
    );
    return false;
  }
}

export type WeightScaleMonitorKind = 'smartgrowth' | 'standard';

/**
 * Subscribes to the device's measurement notifications. Prefers the SmartGrowth
 * custom service (weight + height); falls back to the standard Weight Scale /
 * Body Composition services. Returns null when nothing could be monitored.
 */
export async function startMonitoringWeightScale(
  device: Device,
): Promise<WeightScaleMonitorKind | null> {
  stopMonitoringWeightScale(device.id);

  try {
    const readyDevice = await device.discoverAllServicesAndCharacteristics();

    const isSmartGrowth = await startSmartGrowthMonitor(readyDevice, (measurement, rawBase64) => {
      pushDebugLog(
        readyDevice.id,
        'SmartGrowthMeasurement',
        SMARTGROWTH_SERVICE_UUID,
        SMARTGROWTH_MEASUREMENT_CHAR_UUID,
        measurement
          ? `parse sukses: berat=${measurement.weightKg ?? '-'} kg, tinggi=${measurement.heightCm ?? '-'} cm, ${measurement.stable ? 'stabil' : 'mengukur'}, seq=${measurement.sequence}`
          : 'parse gagal',
        rawBase64,
        measurement?.weightKg ?? null,
      );
    });
    if (isSmartGrowth) {
      pushDebugLog(
        readyDevice.id,
        'SmartGrowthMeasurement',
        SMARTGROWTH_SERVICE_UUID,
        SMARTGROWTH_MEASUREMENT_CHAR_UUID,
        'monitor SmartGrowth aktif (berat + tinggi)',
      );
      return 'smartgrowth';
    }

    let discoveredServices: string[] | null = null;
    try {
      discoveredServices = (await readyDevice.services()).map(service => service.uuid.toLowerCase());
    } catch {
      discoveredServices = null;
    }

    const subscriptions: Subscription[] = [];

    const monitorTargets: Array<{
      serviceUuid: string;
      characteristicUuid: string;
      label: WeightScaleDebugLog['source'];
    }> = [
      {
        serviceUuid: WEIGHT_SCALE_SERVICE_UUID,
        characteristicUuid: WEIGHT_MEASUREMENT_CHAR_UUID,
        label: 'WeightMeasurement' as const,
      },
      {
        serviceUuid: BODY_COMPOSITION_SERVICE_UUID,
        characteristicUuid: BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
        label: 'BodyCompositionMeasurement' as const,
      },
    ].filter(
      // ble-plx reports a missing service asynchronously, so skip absent ones up front.
      target => discoveredServices === null || discoveredServices.includes(target.serviceUuid),
    );

    for (const target of monitorTargets) {
      try {
        const subscription = readyDevice.monitorCharacteristicForService(
          target.serviceUuid,
          target.characteristicUuid,
          (error, characteristic) => {
            if (error) {
              console.warn(`[BLE] ${target.label} error:`, error.message);
              pushDebugLog(
                readyDevice.id,
                target.label,
                target.serviceUuid,
                target.characteristicUuid,
                `error: ${error.message}`,
              );
              return;
            }

            const value = characteristic?.value;
            if (!value) {
              pushDebugLog(
                readyDevice.id,
                target.label,
                target.serviceUuid,
                target.characteristicUuid,
                'notify tanpa value',
              );
              return;
            }

            const weightKg = parseMeasurementKg(value, target.characteristicUuid);
            pushDebugLog(
              readyDevice.id,
              target.label,
              target.serviceUuid,
              target.characteristicUuid,
              weightKg === null ? 'parse gagal' : 'parse sukses',
              value,
              weightKg,
            );

            if (weightKg === null) {
              return;
            }

            setLatestWeightKg(
              weightKg,
              target.label === 'WeightMeasurement' ? 'gatt_weight_scale' : 'gatt_body_composition',
              safeBase64ToHex(value),
            );
          },
        );

        subscriptions.push(subscription);
        pushDebugLog(
          readyDevice.id,
          target.label,
          target.serviceUuid,
          target.characteristicUuid,
          'monitor aktif',
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[BLE] ${target.label} gagal diaktifkan:`, message);
        pushDebugLog(
          readyDevice.id,
          target.label,
          target.serviceUuid,
          target.characteristicUuid,
          `monitor gagal: ${message}`,
        );
      }
    }

    if (subscriptions.length === 0) {
      pushDebugLog(
        readyDevice.id,
        'WeightMeasurement',
        WEIGHT_SCALE_SERVICE_UUID,
        WEIGHT_MEASUREMENT_CHAR_UUID,
        'tidak ada monitor yang aktif',
      );
      return null;
    }

    activeMonitors.set(device.id, subscriptions);
    return 'standard';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[BLE] Gagal monitor WeightMeasurement:', message);
    return null;
  }
}

function safeBase64ToHex(value: string) {
  try {
    return bytesToHex(base64ToBytes(value));
  } catch {
    return null;
  }
}

export function stopMonitoringWeightScale(deviceId: string) {
  stopSmartGrowthMonitor(deviceId);
  const subscriptions = activeMonitors.get(deviceId);
  if (!subscriptions) {
    return;
  }

  for (const subscription of subscriptions) {
    subscription.remove();
  }

  activeMonitors.delete(deviceId);
}
