import { useSyncExternalStore } from 'react';
import { ScanMode, State } from 'react-native-ble-plx';
import type { Device, Subscription } from 'react-native-ble-plx';
import {
  BLE_UNAVAILABLE_MESSAGE,
  ensureBlePoweredOn,
  getBleDeviceName,
  getBleManager,
  requestBlePermissions,
} from './ble';
import { loadS400BindKey } from './bindKeyStore';
import { getDeviceSessionSnapshot, setConnectedBleDevice, setDeviceNotice } from './deviceSession';
import { setDeviceDisabledHandler, stopTrackingDevice, trackConnectedDevice } from './deviceRegistry';
import { DEVICE_DISABLED_MESSAGE } from './deviceRegistryPayload';
import {
  handleS400Advertisement,
  handleS400ManufacturerData,
  resetAdvertisementCache,
  setDeviceMacAddress,
  startMonitoringWeightScale,
  stopMonitoringWeightScale,
} from './weightScale';
import {
  SMARTGROWTH_COMMANDS,
  SMARTGROWTH_CONTROL_CHAR_UUID,
  SMARTGROWTH_SERVICE_UUID,
  encodeSmartGrowthCommand,
  getSmartGrowthDeviceInfo,
} from './smartGrowth';

// BLE lifecycle lives here (app-wide), not inside a screen, so readings keep
// flowing after the operator leaves the device screen. One phone : one device.

const DISCOVERY_DURATION_MS = 7000;
const S400_CONNECT_TIMEOUT_MS = 6000;
const GATT_CONNECT_TIMEOUT_MS = 10000;
const BROADCAST_RECEIVING_MESSAGE = 'Menerima broadcast data S400 (service data terdeteksi).';

export type DetectedDevice = {
  id: string;
  name: string;
  isConnected: boolean;
};

export type ConnectionMode = 'gatt' | 'broadcast';

/** What the connected device can report. */
export type ConnectedDeviceKind = 'smartgrowth' | 'standard' | 's400' | 'unknown';

export type DeviceManagerState = {
  isScanning: boolean;
  detectedDevices: DetectedDevice[];
  busyDeviceId: string | null;
  busyAction: 'connect' | 'disconnect' | null;
  message: string | null;
  connectionMode: ConnectionMode | null;
  deviceKind: ConnectedDeviceKind | null;
};

type ScanKind = 'discovery' | 'listen';

let state: DeviceManagerState = {
  isScanning: false,
  detectedDevices: [],
  busyDeviceId: null,
  busyAction: null,
  message: null,
  connectionMode: null,
  deviceKind: null,
};

const stateListeners = new Set<() => void>();

let initialized = false;
let activeScan: ScanKind | null = null;
let discoveryTimeout: ReturnType<typeof setTimeout> | null = null;
let disconnectSubscription: Subscription | null = null;
let pendingDisabledDeviceId: string | null = null;

export function isLikelyS400Device(name: string) {
  return /s400|xmtzc/i.test(name);
}

function setState(patch: Partial<DeviceManagerState>) {
  state = { ...state, ...patch };
  for (const listener of stateListeners) {
    listener();
  }
}

function markConnected(deviceId: string | null) {
  setState({
    detectedDevices: state.detectedDevices.map(device => ({
      ...device,
      isConnected: device.id === deviceId,
    })),
  });
}

function readServiceData(device: Device) {
  return (device as unknown as { serviceData?: Record<string, string> }).serviceData ?? null;
}

function ensureInitialized() {
  if (initialized) {
    return;
  }
  initialized = true;
  setDeviceDisabledHandler(handleDeviceDisabled);

  const manager = getBleManager();
  if (!manager) {
    return;
  }

  manager.onStateChange(bleState => {
    if (bleState === State.PoweredOn) {
      return;
    }

    activeScan = null;
    clearDiscoveryTimeout();
    if (getDeviceSessionSnapshot().connectedDeviceId) {
      handleConnectionLost('Bluetooth dimatikan. Koneksi perangkat terputus.');
    } else if (state.isScanning) {
      setState({ isScanning: false });
    }
  }, false);
}

function clearDiscoveryTimeout() {
  if (discoveryTimeout) {
    clearTimeout(discoveryTimeout);
    discoveryTimeout = null;
  }
}

async function stopScan() {
  activeScan = null;
  try {
    await getBleManager()?.stopDeviceScan();
  } catch {
    // no-op
  }
}

function needsBroadcastListen() {
  return getDeviceSessionSnapshot().connectedDeviceId !== null && state.connectionMode === 'broadcast';
}

// Android throttles apps that start scans too often (~5 per 30s), so a scan is
// only restarted when its kind actually changes.
async function startListenScan() {
  if (activeScan === 'listen') {
    return;
  }

  await stopScan();
  const connectedId = getDeviceSessionSnapshot().connectedDeviceId;
  const manager = getBleManager();
  if (!connectedId || !manager) {
    return;
  }

  try {
    await manager.startDeviceScan(
      null,
      { allowDuplicates: true, scanMode: ScanMode.LowLatency },
      (error, scannedDevice) => {
        if (error) {
          activeScan = null;
          setState({
            message: state.message ?? `Scan broadcast gagal: ${error.message || 'unknown error'}`,
          });
          return;
        }

        // Ignore every other advertiser nearby; only the connected scale matters.
        if (!scannedDevice || scannedDevice.id !== connectedId) {
          return;
        }

        const hasManufacturerPacket = handleS400ManufacturerData(
          scannedDevice.id,
          scannedDevice.manufacturerData,
        );
        const isS400Packet = handleS400Advertisement(scannedDevice.id, readServiceData(scannedDevice));

        if ((isS400Packet || hasManufacturerPacket) && state.message !== BROADCAST_RECEIVING_MESSAGE) {
          setState({ message: BROADCAST_RECEIVING_MESSAGE });
        }
      },
    );
    activeScan = 'listen';
  } catch (error) {
    activeScan = null;
    setState({
      message: error instanceof Error ? error.message : 'Gagal memulai scan broadcast perangkat.',
    });
  }
}

// The school admin disabled this device in the registry: drop the connection.
// Manual input is unaffected; the notice stays visible until the next connect.
function handleDeviceDisabled(deviceId: string) {
  if (state.busyAction === 'connect' && state.busyDeviceId === deviceId) {
    // Registry answered before connectDevice() finished; apply it right after.
    pendingDisabledDeviceId = deviceId;
    return;
  }
  if (getDeviceSessionSnapshot().connectedDeviceId !== deviceId || state.busyDeviceId) {
    return;
  }
  disconnectDevice(deviceId, DEVICE_DISABLED_MESSAGE)
    .catch(() => undefined)
    .finally(() => setDeviceNotice(DEVICE_DISABLED_MESSAGE));
}

function handleConnectionLost(message: string) {
  const { connectedDeviceId } = getDeviceSessionSnapshot();
  if (connectedDeviceId) {
    stopMonitoringWeightScale(connectedDeviceId);
    stopTrackingDevice(connectedDeviceId);
  }
  disconnectSubscription?.remove();
  disconnectSubscription = null;
  if (activeScan === 'listen') {
    stopScan();
  }

  setConnectedBleDevice(null);
  markConnected(null);
  setState({
    busyAction: null,
    busyDeviceId: null,
    connectionMode: null,
    deviceKind: null,
    message,
  });
}

function watchDisconnect(deviceId: string, deviceName: string) {
  disconnectSubscription?.remove();
  const manager = getBleManager();
  if (!manager) {
    return;
  }
  disconnectSubscription = manager.onDeviceDisconnected(deviceId, () => {
    disconnectSubscription?.remove();
    disconnectSubscription = null;

    // S400 readings come from advertisements, so losing GATT is not fatal.
    if (isLikelyS400Device(deviceName) && getDeviceSessionSnapshot().connectedDeviceId === deviceId) {
      setState({ connectionMode: 'broadcast' });
      startListenScan();
      return;
    }

    handleConnectionLost(`Koneksi ke ${deviceName} terputus.`);
  });
}

export async function scanDevices() {
  ensureInitialized();
  const manager = getBleManager();
  if (!manager) {
    setState({ isScanning: false, message: BLE_UNAVAILABLE_MESSAGE });
    return;
  }

  clearDiscoveryTimeout();
  await stopScan();

  const hasPermission = await requestBlePermissions();
  if (!hasPermission) {
    setState({ message: 'Izin Bluetooth belum diberikan, jadi pemindaian tidak bisa dimulai.' });
    return;
  }

  const isBluetoothReady = await ensureBlePoweredOn();
  if (!isBluetoothReady) {
    setState({ message: 'Bluetooth belum aktif. Nyalakan Bluetooth lalu coba scan lagi.' });
    if (needsBroadcastListen()) {
      startListenScan();
    }
    return;
  }

  setState({
    isScanning: true,
    message: null,
    detectedDevices: state.detectedDevices.filter(device => device.isConnected),
  });

  const connectedId = getDeviceSessionSnapshot().connectedDeviceId;

  try {
    await manager.startDeviceScan(null, { scanMode: ScanMode.LowLatency }, (error, device) => {
      if (error) {
        clearDiscoveryTimeout();
        stopScan();
        setState({
          isScanning: false,
          message: error.message || 'Pemindaian Bluetooth gagal dijalankan.',
        });
        return;
      }

      if (!device) {
        return;
      }

      // Discovery keeps feeding the connected S400 so readings don't pause.
      if (device.id === connectedId) {
        handleS400ManufacturerData(device.id, device.manufacturerData);
        handleS400Advertisement(device.id, readServiceData(device));
      }

      const deviceName = getBleDeviceName(device);
      const existing = state.detectedDevices.find(item => item.id === device.id);

      // Advertisements repeat many times per second; only re-render on real changes.
      if (existing?.name === deviceName) {
        return;
      }

      setDeviceMacAddress(device.id, device.id);
      if (isLikelyS400Device(deviceName)) {
        // Prefetch the per-scale bind key so the device screen can show its state.
        loadS400BindKey(device.id).catch(() => undefined);
      }
      setState({
        detectedDevices: existing
          ? state.detectedDevices.map(item =>
              item.id === device.id ? { ...item, name: deviceName } : item,
            )
          : [...state.detectedDevices, { id: device.id, name: deviceName, isConnected: false }],
      });
    });
    activeScan = 'discovery';
  } catch (error) {
    setState({
      isScanning: false,
      message: error instanceof Error ? error.message : 'Pemindaian Bluetooth gagal dimulai.',
    });
    return;
  }

  discoveryTimeout = setTimeout(() => {
    discoveryTimeout = null;
    setState({
      isScanning: false,
      message:
        state.message ?? 'Pemindaian selesai. Pilih satu perangkat BLT yang ingin dihubungkan.',
    });
    if (needsBroadcastListen()) {
      startListenScan();
    } else {
      stopScan();
    }
  }, DISCOVERY_DURATION_MS);
}

export async function connectDevice(deviceId: string) {
  ensureInitialized();
  if (getDeviceSessionSnapshot().connectedDeviceId || state.busyDeviceId) {
    return;
  }

  const manager = getBleManager();
  if (!manager) {
    setState({ message: BLE_UNAVAILABLE_MESSAGE });
    return;
  }

  clearDiscoveryTimeout();
  setState({ busyAction: 'connect', busyDeviceId: deviceId, message: null });

  try {
    await stopScan();
    const fallbackName = state.detectedDevices.find(item => item.id === deviceId)?.name ?? deviceId;
    const isS400 = isLikelyS400Device(fallbackName);
    setDeviceMacAddress(deviceId, deviceId);
    resetAdvertisementCache(deviceId);
    if (isS400) {
      await loadS400BindKey(deviceId).catch(() => null);
    }

    const device = isS400
      ? await manager
          .connectToDevice(deviceId, { timeout: S400_CONNECT_TIMEOUT_MS })
          .catch(() => null)
      : await manager.connectToDevice(deviceId, { timeout: GATT_CONNECT_TIMEOUT_MS });

    if (!device && isS400) {
      setConnectedBleDevice({ id: deviceId, name: fallbackName });
      markConnected(deviceId);
      setState({
        connectionMode: 'broadcast',
        deviceKind: 's400',
        message: 'S400 aktif dalam mode broadcast. Menunggu paket iklan untuk pembacaan berat.',
      });
      trackConnectedDevice({ bleId: deviceId, name: fallbackName, kindHint: 's400' });
      await startListenScan();
      return;
    }

    if (!device) {
      throw new Error('Perangkat tidak bisa dihubungkan.');
    }

    const deviceName = getBleDeviceName(device);
    setConnectedBleDevice({ id: device.id, name: deviceName });
    watchDisconnect(device.id, deviceName);

    const deviceIsS400 = isLikelyS400Device(deviceName);
    if (deviceIsS400 && deviceName !== fallbackName) {
      await loadS400BindKey(device.id).catch(() => null);
    }
    const monitorKind = deviceIsS400 ? null : await startMonitoringWeightScale(device);
    markConnected(deviceId);

    const connectedKind: ConnectedDeviceKind = deviceIsS400 ? 's400' : (monitorKind ?? 'unknown');
    // SmartGrowth Device Info (serial/firmware) is read while monitoring starts,
    // so it is included here; the serial is the stable registry key.
    const deviceInfo = monitorKind === 'smartgrowth' ? getSmartGrowthDeviceInfo(device.id) : null;
    trackConnectedDevice({
      bleId: device.id,
      name: deviceName,
      kindHint: connectedKind,
      serial: deviceInfo?.serial,
      firmwareVersion: deviceInfo?.firmwareVersion,
    });

    if (deviceIsS400 || !monitorKind) {
      // No GATT weight notifications: fall back to reading advertisements.
      setState({ connectionMode: 'broadcast', deviceKind: connectedKind });
      await startListenScan();
    } else {
      setState({ connectionMode: 'gatt', deviceKind: monitorKind });
    }

    setState({
      message: deviceIsS400
        ? 'Perangkat S400 terhubung. Menunggu paket terenkripsi dan proses decode berat.'
        : monitorKind === 'smartgrowth'
          ? 'SmartGrowth terhubung. Pembacaan tinggi dan berat via BLE aktif.'
          : monitorKind === 'standard'
            ? 'Perangkat BLT berhasil terhubung. Pembacaan berat via BLE aktif.'
            : 'Perangkat BLT berhasil terhubung, tapi layanan timbangan (GATT Weight Scale) tidak terdeteksi.',
    });
  } catch (error) {
    setState({
      message: error instanceof Error ? error.message : 'Gagal menghubungkan perangkat.',
    });
  } finally {
    setState({ isScanning: false, busyAction: null, busyDeviceId: null });
    const disabledId = pendingDisabledDeviceId;
    pendingDisabledDeviceId = null;
    if (disabledId) {
      handleDeviceDisabled(disabledId);
    }
  }
}

export async function disconnectDevice(deviceId: string, doneMessage?: string) {
  setState({ busyAction: 'disconnect', busyDeviceId: deviceId, message: null });

  try {
    stopTrackingDevice(deviceId);
    disconnectSubscription?.remove();
    disconnectSubscription = null;
    stopMonitoringWeightScale(deviceId);
    if (activeScan === 'listen') {
      await stopScan();
    }

    const manager = getBleManager();
    const isGattConnected = manager
      ? await manager.isDeviceConnected(deviceId).catch(() => false)
      : false;
    if (manager && isGattConnected) {
      await manager.cancelDeviceConnection(deviceId);
    }

    setConnectedBleDevice(null);
    markConnected(null);
    setState({
      connectionMode: null,
      deviceKind: null,
      message: doneMessage ?? 'Perangkat BLT berhasil diputuskan.',
    });
  } catch (error) {
    setState({
      message: error instanceof Error ? error.message : 'Gagal memutuskan perangkat.',
    });
  } finally {
    setState({ busyAction: null, busyDeviceId: null });
  }
}

/** Sends a Control command (tare / start) to a connected SmartGrowth station. */
export async function sendSmartGrowthControl(
  command: (typeof SMARTGROWTH_COMMANDS)[keyof typeof SMARTGROWTH_COMMANDS],
) {
  const { connectedDeviceId } = getDeviceSessionSnapshot();
  const manager = getBleManager();
  if (!connectedDeviceId || !manager || state.deviceKind !== 'smartgrowth') {
    return false;
  }
  try {
    await manager.writeCharacteristicWithResponseForDevice(
      connectedDeviceId,
      SMARTGROWTH_SERVICE_UUID,
      SMARTGROWTH_CONTROL_CHAR_UUID,
      encodeSmartGrowthCommand(command),
    );
    return true;
  } catch (error) {
    setState({
      message: error instanceof Error ? error.message : 'Perintah ke alat gagal dikirim.',
    });
    return false;
  }
}

export function getDeviceManagerState() {
  return state;
}

export function subscribeDeviceManager(listener: () => void) {
  ensureInitialized();
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function useDeviceManager() {
  return useSyncExternalStore(subscribeDeviceManager, getDeviceManagerState);
}
