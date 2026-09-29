import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';

export const BLE_UNAVAILABLE_MESSAGE =
  'Bluetooth tidak tersedia di perangkat ini. Isi tinggi dan berat secara manual.';

// Created lazily: constructing BleManager at import time crashes on web and on
// devices without the native BLE module, which would take down manual flows too.
let bleManagerInstance: BleManager | null = null;
let bleManagerFailed = false;

export function isBleSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function getBleManager(): BleManager | null {
  if (bleManagerInstance) {
    return bleManagerInstance;
  }
  if (bleManagerFailed || !isBleSupported()) {
    return null;
  }

  try {
    bleManagerInstance = new BleManager();
  } catch {
    bleManagerFailed = true;
    bleManagerInstance = null;
  }

  return bleManagerInstance;
}

export function getBleDeviceName(device: Device) {
  return device.name?.trim() || device.localName?.trim() || device.id;
}

export async function requestBlePermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      return (
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function ensureBlePoweredOn() {
  const manager = getBleManager();
  if (!manager) {
    return false;
  }

  try {
    const currentState = await manager.state();
    return currentState === State.PoweredOn;
  } catch {
    return false;
  }
}
