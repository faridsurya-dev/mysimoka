import { Linking, PermissionsAndroid, Platform } from 'react-native';
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

export type BlePermissionStatus = 'granted' | 'denied' | 'blocked';

/**
 * Shows the system permission prompt. 'blocked' means the user chose
 * "don't ask again", so only the app settings page can grant it now.
 */
export async function requestBlePermissionStatus(): Promise<BlePermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }

  try {
    const permissions =
      Platform.Version >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const result = await PermissionsAndroid.requestMultiple(permissions);
    const values = permissions.map(permission => result[permission]);

    if (values.every(value => value === PermissionsAndroid.RESULTS.GRANTED)) {
      return 'granted';
    }
    if (values.some(value => value === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
      return 'blocked';
    }
    return 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Asks the system to turn Bluetooth on. On Android this shows the
 * "an app wants to turn on Bluetooth" dialog; when that intent is unavailable
 * (or on iOS) it opens the Bluetooth / app settings instead. Callers should
 * watch the BLE state afterwards rather than trust the return value.
 */
export async function requestBluetoothEnable(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.bluetooth.adapter.action.REQUEST_ENABLE');
      return;
    } catch {
      // fall through to the settings page
    }
    try {
      await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
      return;
    } catch {
      // fall through to the app settings page
    }
  }

  await Linking.openSettings().catch(() => undefined);
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

/**
 * True when BLE permissions are already granted. Never shows a prompt, so it is
 * safe for background work such as auto-reconnect.
 */
export async function hasBlePermissions() {
  if (Platform.OS !== 'android') {
    // iOS has no runtime check API here; auto-reconnect only runs for a device
    // the user already connected, i.e. after the system prompt was answered.
    return isBleSupported();
  }

  try {
    if (Platform.Version >= 31) {
      const [canScan, canConnect] = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
      ]);
      return canScan && canConnect;
    }
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  } catch {
    return false;
  }
}
