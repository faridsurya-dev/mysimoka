// Auto-reconnect scheduling, free of BLE/RN imports so it is unit-testable.
// Backoff: 2s, 5s, 10s, then every 30s. At most one attempt in flight; pauses
// while the app is in the background.

export const RECONNECT_DELAYS_MS = [2000, 5000, 10000] as const;
export const RECONNECT_STEADY_DELAY_MS = 30000;

export function getReconnectDelayMs(attemptIndex: number) {
  return RECONNECT_DELAYS_MS[attemptIndex] ?? RECONNECT_STEADY_DELAY_MS;
}

export type ReconnectTarget = {
  bleId: string;
  name: string | null;
  label: string | null;
};

export type ReconnectControllerDeps = {
  /** The device to reconnect to, or null when auto-reconnect should not run. */
  getTarget: () => ReconnectTarget | null;
  isConnected: () => boolean;
  /** A manual connect/disconnect/scan is in progress: wait, don't compete. */
  isBusy: () => boolean;
  /** Bluetooth on and permissions already granted (must never prompt). */
  canUseBle: () => Promise<boolean>;
  attempt: (target: ReconnectTarget) => Promise<boolean>;
  /** Display name while reconnecting, null when idle. */
  onStatus: (reconnectingName: string | null) => void;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export type ReconnectController = {
  start: () => void;
  stop: () => void;
  setAppActive: (active: boolean) => void;
  /** Re-evaluate; `reset` restarts the backoff (foreground, BT on, unexpected disconnect). */
  notify: (reset?: boolean) => void;
  getAttemptIndex: () => number;
  isAttemptInFlight: () => boolean;
};

export function createReconnectController(deps: ReconnectControllerDeps): ReconnectController {
  const setTimer = deps.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer =
    deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let running = false;
  let appActive = true;
  let timer: unknown = null;
  let inFlight = false;
  let attemptIndex = 0;
  let status: string | null = null;

  function setStatus(next: string | null) {
    if (status !== next) {
      status = next;
      deps.onStatus(next);
    }
  }

  function cancelTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function shouldRun() {
    return running && appActive && deps.getTarget() !== null && !deps.isConnected();
  }

  function schedule() {
    if (!shouldRun()) {
      cancelTimer();
      if (!inFlight) {
        setStatus(null);
      }
      return;
    }
    if (timer !== null || inFlight) {
      return;
    }
    timer = setTimer(() => {
      timer = null;
      run();
    }, getReconnectDelayMs(attemptIndex));
  }

  async function run() {
    const target = shouldRun() ? deps.getTarget() : null;
    if (!target) {
      schedule();
      return;
    }
    if (deps.isBusy()) {
      // Retry later without counting this as a failed attempt.
      schedule();
      return;
    }

    inFlight = true;
    let connected = false;
    try {
      if (!(await deps.canUseBle())) {
        setStatus(null);
      } else {
        setStatus(target.label ?? target.name ?? target.bleId);
        connected = await deps.attempt(target);
      }
    } catch {
      connected = false;
    }
    inFlight = false;

    if (connected || deps.isConnected()) {
      attemptIndex = 0;
      setStatus(null);
      return;
    }
    attemptIndex += 1;
    schedule();
  }

  return {
    start() {
      running = true;
      attemptIndex = 0;
      schedule();
    },
    stop() {
      running = false;
      cancelTimer();
      setStatus(null);
    },
    setAppActive(active: boolean) {
      if (appActive === active) {
        return;
      }
      appActive = active;
      if (active) {
        attemptIndex = 0;
      }
      schedule();
    },
    notify(reset = false) {
      if (reset && !inFlight) {
        attemptIndex = 0;
        cancelTimer();
      }
      schedule();
    },
    getAttemptIndex: () => attemptIndex,
    isAttemptInFlight: () => inFlight,
  };
}
