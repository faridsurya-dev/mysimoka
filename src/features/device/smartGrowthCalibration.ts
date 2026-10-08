import type { Subscription } from 'react-native-ble-plx';
import { getBleManager } from './ble';
import { getDeviceManagerState, sendSmartGrowthControl } from './deviceManager';
import { getDeviceSessionSnapshot } from './deviceSession';
import {
  SMARTGROWTH_CALIBRATION_CHAR_UUID,
  SMARTGROWTH_COMMANDS,
  SMARTGROWTH_RESET_CONFIRM,
  SMARTGROWTH_SERVICE_UUID,
  SMARTGROWTH_TARE_FORCE,
  float32LEBytes,
  parseSmartGrowthCalibrationBase64,
  subscribeSmartGrowthFrames,
  type SmartGrowthCalibrationState,
  type SmartGrowthMeasurement,
} from './smartGrowth';
import type { CalibrationMeasure } from './calibration';

// GATT side of the SmartGrowth accuracy check and calibration wizard.
// Accuracy check: uses the normal Measurement stream (works on every firmware).
// Calibration commands: need the Calibration characteristic (firmware >= 2.1).

const COMMAND_TIMEOUT_MS = 15000;
const READING_TIMEOUT_MS = 12000;

function connectedSmartGrowthId() {
  const { connectedDeviceId } = getDeviceSessionSnapshot();
  return connectedDeviceId && getDeviceManagerState().deviceKind === 'smartgrowth'
    ? connectedDeviceId
    : null;
}

/** Firmware with the Calibration characteristic (519e0006)? */
export async function hasSmartGrowthCalibrationSupport() {
  const deviceId = connectedSmartGrowthId();
  const manager = getBleManager();
  if (!deviceId || !manager) {
    return false;
  }
  try {
    const characteristics = await manager.characteristicsForDevice(deviceId, SMARTGROWTH_SERVICE_UUID);
    return characteristics.some(
      characteristic => characteristic.uuid.toLowerCase() === SMARTGROWTH_CALIBRATION_CHAR_UUID,
    );
  } catch {
    return false;
  }
}

export async function readSmartGrowthCalibration(): Promise<SmartGrowthCalibrationState | null> {
  const deviceId = connectedSmartGrowthId();
  const manager = getBleManager();
  if (!deviceId || !manager) {
    return null;
  }
  try {
    const characteristic = await manager.readCharacteristicForDevice(
      deviceId,
      SMARTGROWTH_SERVICE_UUID,
      SMARTGROWTH_CALIBRATION_CHAR_UUID,
    );
    return characteristic.value ? parseSmartGrowthCalibrationBase64(characteristic.value) : null;
  } catch {
    return null;
  }
}

export type CalibrationAction =
  | { type: 'tare' }
  | { type: 'weight'; referenceKg: number }
  | { type: 'height'; referenceCm: number }
  | { type: 'reset' };

export type CalibrationCommandResult = {
  ok: boolean;
  /** Result name (SMARTGROWTH_CALIBRATION_RESULTS) or 'timeout' / 'not_connected' / 'write_failed'. */
  result: string;
  before: SmartGrowthCalibrationState | null;
  after: SmartGrowthCalibrationState | null;
};

function commandFor(action: CalibrationAction): { command: number; params: number[] } {
  switch (action.type) {
    case 'tare':
      return { command: SMARTGROWTH_COMMANDS.tare, params: [SMARTGROWTH_TARE_FORCE] };
    case 'weight':
      return {
        command: SMARTGROWTH_COMMANDS.calibrateWeight,
        params: float32LEBytes(action.referenceKg),
      };
    case 'height':
      return {
        command: SMARTGROWTH_COMMANDS.calibrateHeight,
        params: float32LEBytes(action.referenceCm),
      };
    case 'reset':
      return { command: SMARTGROWTH_COMMANDS.resetCalibration, params: [SMARTGROWTH_RESET_CONFIRM] };
  }
}

/**
 * Sends one calibration command and waits until the device reports its result
 * (Calibration characteristic sequence changes and busy is clear).
 */
export async function runSmartGrowthCalibration(
  action: CalibrationAction,
): Promise<CalibrationCommandResult> {
  const deviceId = connectedSmartGrowthId();
  const manager = getBleManager();
  if (!deviceId || !manager) {
    return { ok: false, result: 'not_connected', before: null, after: null };
  }
  const before = await readSmartGrowthCalibration();
  const { command, params } = commandFor(action);

  let subscription: Subscription | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const done = new Promise<SmartGrowthCalibrationState | null>(resolve => {
    const isFinished = (state: SmartGrowthCalibrationState | null) =>
      !!state && !state.busy && state.lastCommand === command && state.sequence !== before?.sequence;
    timer = setTimeout(() => {
      // Notifications may be lost; one last read before giving up.
      readSmartGrowthCalibration()
        .then(state => resolve(isFinished(state) ? state : null))
        .catch(() => resolve(null));
    }, COMMAND_TIMEOUT_MS);
    try {
      subscription = manager.monitorCharacteristicForDevice(
        deviceId,
        SMARTGROWTH_SERVICE_UUID,
        SMARTGROWTH_CALIBRATION_CHAR_UUID,
        (error, characteristic) => {
          if (error || !characteristic?.value) {
            return;
          }
          const state = parseSmartGrowthCalibrationBase64(characteristic.value);
          if (isFinished(state)) {
            resolve(state);
          }
        },
      );
    } catch {
      // Fall back to the read at the timeout.
    }
  });

  try {
    const written = await sendSmartGrowthControl(
      command as (typeof SMARTGROWTH_COMMANDS)[keyof typeof SMARTGROWTH_COMMANDS],
      params,
    );
    if (!written) {
      return { ok: false, result: 'write_failed', before, after: null };
    }
    const after = await done;
    if (!after) {
      return { ok: false, result: 'timeout', before, after: await readSmartGrowthCalibration() };
    }
    return { ok: after.lastResult === 'ok', result: after.lastResult, before, after };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    (subscription as Subscription | null)?.remove();
  }
}

/**
 * Collects one fresh stable reading: sends "start measurement" so the device
 * leaves its held result, then waits for a non-stable frame followed by a
 * stable frame that contains the wanted value. null on timeout / disconnect.
 */
export function collectStableReading(
  measure: CalibrationMeasure,
  signal?: { cancelled: boolean },
): Promise<number | null> {
  return new Promise(resolve => {
    let sawMeasuring = false;
    let finished = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (value: number | null) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      clearInterval(cancelPoll);
      unsubscribe?.();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), READING_TIMEOUT_MS);
    const cancelPoll = setInterval(() => {
      if (signal?.cancelled || !connectedSmartGrowthId()) {
        finish(null);
      }
    }, 250);
    unsubscribe = subscribeSmartGrowthFrames((frame: SmartGrowthMeasurement) => {
      if (!frame.stable) {
        sawMeasuring = true;
        return;
      }
      if (!sawMeasuring) {
        return; // repeat of the previous held result
      }
      const value = measure === 'weight' ? frame.weightKg : frame.heightCm;
      if (value === null) {
        sawMeasuring = false; // stable without this value: wait for the next cycle
        sendSmartGrowthControl(SMARTGROWTH_COMMANDS.startMeasurement).catch(() => undefined);
        return;
      }
      finish(value);
    });
    sendSmartGrowthControl(SMARTGROWTH_COMMANDS.startMeasurement)
      .then(sent => {
        if (!sent) {
          finish(null);
        }
      })
      .catch(() => finish(null));
  });
}
