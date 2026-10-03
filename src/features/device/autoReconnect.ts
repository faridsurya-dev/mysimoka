import { AppState } from 'react-native';
import type { Subscription } from 'react-native-ble-plx';
import { State } from 'react-native-ble-plx';
import { getSessionUserId } from '../../services/auth';
import { ensureBlePoweredOn, getBleManager, hasBlePermissions, isBleSupported } from './ble';
import { getDeviceManagerState, reconnectToDevice } from './deviceManager';
import {
  getDeviceSessionSnapshot,
  setReconnectingDeviceName,
  subscribeDeviceSession,
} from './deviceSession';
import {
  forgetRememberedDevice,
  getLastDeviceState,
  loadLastDeviceStore,
  selectReconnectCandidate,
  subscribeLastDevice,
  updateRememberedLabel,
} from './lastDeviceStore';
import { createReconnectController, type ReconnectController } from './reconnectController';

// Background auto-reconnect to the last measuring device. Optional hardware:
// never prompts for permissions, never shows errors, never blocks manual input.
// Started after login/session restore (RootNavigator), stopped on logout.

let controller: ReconnectController | null = null;
let cleanups: Array<() => void> = [];
let bleStateSubscription: Subscription | null = null;

function watchBleState(onPoweredOn: () => void) {
  if (bleStateSubscription) {
    return;
  }
  // Only reached once a remembered device exists, i.e. BLE was used before, so
  // creating the manager here does not cause a first-time system prompt.
  const manager = getBleManager();
  if (!manager) {
    return;
  }
  bleStateSubscription = manager.onStateChange(bleState => {
    if (bleState === State.PoweredOn) {
      onPoweredOn();
    }
  }, false);
}

function isAppActive(appState: string | null | undefined) {
  // 'inactive' (iOS) is transient; only real backgrounding pauses reconnecting.
  return appState !== 'background';
}

export function startAutoReconnect() {
  if (controller || !isBleSupported()) {
    return;
  }

  const reconnect = createReconnectController({
    getTarget: () => {
      const device = selectReconnectCandidate(getLastDeviceState(), getSessionUserId());
      return device ? { bleId: device.bleId, name: device.name, label: device.label } : null;
    },
    isConnected: () => getDeviceSessionSnapshot().connectedDeviceId !== null,
    isBusy: () => {
      const managerState = getDeviceManagerState();
      return managerState.busyDeviceId !== null || managerState.isScanning;
    },
    canUseBle: async () => {
      if (!(await hasBlePermissions())) {
        return false;
      }
      watchBleState(() => controller?.notify(true));
      return ensureBlePoweredOn();
    },
    attempt: target => reconnectToDevice(target),
    onStatus: setReconnectingDeviceName,
  });
  controller = reconnect;

  let wasConnected = getDeviceSessionSnapshot().connectedDeviceId !== null;
  cleanups.push(
    subscribeDeviceSession(() => {
      const session = getDeviceSessionSnapshot();
      const isConnected = session.connectedDeviceId !== null;
      if (session.connectedDeviceId && session.connectedDeviceLabel) {
        updateRememberedLabel(session.connectedDeviceId, session.connectedDeviceLabel);
      }
      const lostConnection = wasConnected && !isConnected;
      wasConnected = isConnected;
      reconnect.notify(lostConnection);
    }),
  );
  cleanups.push(subscribeLastDevice(() => reconnect.notify(true)));

  const appStateSubscription = AppState.addEventListener('change', nextState => {
    reconnect.setAppActive(isAppActive(nextState));
  });
  cleanups.push(() => appStateSubscription.remove());
  reconnect.setAppActive(isAppActive(AppState.currentState));

  loadLastDeviceStore()
    .catch(() => undefined)
    .finally(() => {
      if (controller === reconnect) {
        reconnect.start();
      }
    });
}

export function stopAutoReconnect() {
  controller?.stop();
  controller = null;
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
  bleStateSubscription?.remove();
  bleStateSubscription = null;
  setReconnectingDeviceName(null);
}

/** Logout: stop reconnecting and forget this user's last device. */
export function resetAutoReconnectOnLogout() {
  stopAutoReconnect();
  forgetRememberedDevice();
}
