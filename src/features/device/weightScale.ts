import type { Device, Subscription } from 'react-native-ble-plx';
import { setLatestWeightKg } from './deviceSession';
import { decryptS400FromAdvertisement, isValidS400BindKey } from './s400Decryptor';

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
  source: 'WeightMeasurement' | 'BodyCompositionMeasurement';
  serviceUuid: string;
  characteristicUuid: string;
  rawValueBase64: string | null;
  parsedWeightKg: number | null;
  message: string;
};

const debugLogListeners = new Set<(entry: WeightScaleDebugLog) => void>();

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const S400_SERVICE_UUID_SHORT = '181b';
const XIAOMI_SERVICE_UUID_SHORT = 'fe95';
const lastAdvHexByDevice = new Map<string, string>();
const lastManufacturerHexByDevice = new Map<string, string>();
const macAddressByDevice = new Map<string, string>();
let s400BindKey: string | null = null;

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

export function setS400BindKey(value: string | null) {
  const normalized = value?.trim() ?? null;
  if (!normalized) {
    s400BindKey = null;
    return;
  }

  s400BindKey = isValidS400BindKey(normalized) ? normalized.toLowerCase() : null;
}

export function setDeviceMacAddress(deviceId: string, macAddress: string | null | undefined) {
  if (!macAddress) {
    return;
  }

  macAddressByDevice.set(deviceId, macAddress.toUpperCase());
}

function base64ToBytes(base64Value: string) {
  const normalized = base64Value.replace(/[^A-Za-z0-9+/=]/g, '');
  const output: number[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char1 = normalized[index] ?? '=';
    const char2 = normalized[index + 1] ?? '=';
    const char3 = normalized[index + 2] ?? '=';
    const char4 = normalized[index + 3] ?? '=';

    const enc1 = BASE64_ALPHABET.indexOf(char1);
    const enc2 = BASE64_ALPHABET.indexOf(char2);
    const enc3 = char3 === '=' ? -1 : BASE64_ALPHABET.indexOf(char3);
    const enc4 = char4 === '=' ? -1 : BASE64_ALPHABET.indexOf(char4);

    if (enc1 < 0 || enc2 < 0 || (enc3 < 0 && char3 !== '=') || (enc4 < 0 && char4 !== '=')) {
      throw new Error('Invalid base64 payload.');
    }

    const byte1 = enc1 * 4 + Math.floor(enc2 / 16);
    output.push(byte1);

    if (enc3 >= 0) {
      const byte2 = (enc2 % 16) * 16 + Math.floor(enc3 / 4);
      output.push(byte2);
    }

    if (enc4 >= 0 && enc3 >= 0) {
      const byte3 = (enc3 % 4) * 64 + enc4;
      output.push(byte3);
    }

    index += 4;
  }

  return Uint8Array.from(output);
}

function bytesToHex(bytes: Uint8Array) {
  let result = '';
  for (const byte of bytes) {
    result += byte.toString(16).padStart(2, '0');
  }
  return result;
}

function readUInt16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] + bytes[offset + 1] * 256;
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
      lastAdvHexByDevice.set(deviceId, payloadHex);

      const packetType = shortUuid === XIAOMI_SERVICE_UUID_SHORT ? 'adv FE95' : 'adv 0x181B';
      pushDebugLog(
        deviceId,
        'BodyCompositionMeasurement',
        BODY_COMPOSITION_SERVICE_UUID,
        BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
        `${packetType} diterima (${payloadLength} byte) ${hasChanged ? '[berubah]' : '[sama]'}`,
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

      const bindKey = s400BindKey;
      const macAddress = macAddressByDevice.get(deviceId);
      if (bindKey && macAddress) {
        const measurement = decryptS400FromAdvertisement(bytes, macAddress, bindKey);
        if (measurement) {
          setLatestWeightKg(measurement.weightKg);
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
    const hasChanged = previousHex !== payloadHex;
    lastManufacturerHexByDevice.set(deviceId, payloadHex);

    pushDebugLog(
      deviceId,
      'BodyCompositionMeasurement',
      BODY_COMPOSITION_SERVICE_UUID,
      BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
      `manufacturerData diterima (${payloadLength} byte) ${hasChanged ? '[berubah]' : '[sama]'}`,
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

    const bindKey = s400BindKey;
    const macAddress = macAddressByDevice.get(deviceId);
    if (bindKey && macAddress) {
      const measurement = decryptS400FromAdvertisement(bytes, macAddress, bindKey);
      if (measurement) {
        setLatestWeightKg(measurement.weightKg);
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

export async function startMonitoringWeightScale(device: Device) {
  stopMonitoringWeightScale(device.id);

  try {
    const readyDevice = await device.discoverAllServicesAndCharacteristics();
    const subscriptions: Subscription[] = [];

    const monitorTargets = [
      {
        serviceUuid: WEIGHT_SCALE_SERVICE_UUID,
        characteristicUuid: WEIGHT_MEASUREMENT_CHAR_UUID,
        label: 'WeightMeasurement',
      },
      {
        serviceUuid: BODY_COMPOSITION_SERVICE_UUID,
        characteristicUuid: BODY_COMPOSITION_MEASUREMENT_CHAR_UUID,
        label: 'BodyCompositionMeasurement',
      },
    ];

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

            setLatestWeightKg(weightKg);
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
      return false;
    }

    activeMonitors.set(device.id, subscriptions);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[BLE] Gagal monitor WeightMeasurement:', message);
    return false;
  }
}

export function stopMonitoringWeightScale(deviceId: string) {
  const subscriptions = activeMonitors.get(deviceId);
  if (!subscriptions) {
    return;
  }

  for (const subscription of subscriptions) {
    subscription.remove();
  }

  activeMonitors.delete(deviceId);
}
