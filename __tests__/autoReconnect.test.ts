import {
  createReconnectController,
  getReconnectDelayMs,
  type ReconnectTarget,
} from '../src/features/device/reconnectController';
import {
  forgetRememberedDevice,
  getLastDeviceState,
  loadLastDeviceStore,
  pauseAutoReconnectFor,
  rememberConnectedDevice,
  selectReconnectCandidate,
  setAutoReconnectEnabled,
  updateRememberedLabel,
} from '../src/features/device/lastDeviceStore';

jest.mock('../src/services/auth', () => ({
  getSessionUserId: jest.fn(() => 'user-1'),
}));

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
};

describe('backoff', () => {
  test('2s, 5s, 10s, then every 30s', () => {
    expect([0, 1, 2, 3, 4, 10].map(getReconnectDelayMs)).toEqual([
      2000, 5000, 10000, 30000, 30000, 30000,
    ]);
  });
});

describe('reconnect controller', () => {
  const target: ReconnectTarget = { bleId: 'dev-1', name: 'SmartGrowth-1A2B', label: 'Kelas 1' };

  function setup(overrides: Partial<Parameters<typeof createReconnectController>[0]> = {}) {
    let connected = false;
    const statuses: Array<string | null> = [];
    const attempt = jest.fn(async () => false);
    const controller = createReconnectController({
      getTarget: () => target,
      isConnected: () => connected,
      isBusy: () => false,
      canUseBle: async () => true,
      attempt,
      onStatus: status => statuses.push(status),
      ...overrides,
    });
    return {
      controller,
      attempt,
      statuses,
      setConnected: (value: boolean) => {
        connected = value;
      },
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  async function advance(ms: number) {
    jest.advanceTimersByTime(ms);
    await flush();
  }

  test('retries with backoff and shows a quiet status', async () => {
    const { controller, attempt, statuses } = setup();
    controller.start();

    await advance(1999);
    expect(attempt).not.toHaveBeenCalled();
    await advance(1);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['Kelas 1']);

    await advance(5000);
    expect(attempt).toHaveBeenCalledTimes(2);
    await advance(10000);
    expect(attempt).toHaveBeenCalledTimes(3);
    await advance(29999);
    expect(attempt).toHaveBeenCalledTimes(3);
    await advance(1);
    expect(attempt).toHaveBeenCalledTimes(4);
    controller.stop();
    expect(statuses[statuses.length - 1]).toBeNull();
  });

  test('never runs two attempts at once', async () => {
    let release: (value: boolean) => void = () => undefined;
    const attempt = jest.fn(
      () =>
        new Promise<boolean>(resolve => {
          release = resolve;
        }),
    );
    const { controller } = setup({ attempt });
    controller.start();
    await advance(2000);
    expect(controller.isAttemptInFlight()).toBe(true);

    controller.notify(true);
    await advance(60000);
    expect(attempt).toHaveBeenCalledTimes(1);

    release(false);
    await flush();
    expect(controller.isAttemptInFlight()).toBe(false);
    await advance(5000);
    expect(attempt).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  test('stops while backgrounded and resets backoff on foreground', async () => {
    const { controller, attempt } = setup();
    controller.start();
    await advance(2000);
    await advance(5000);
    expect(attempt).toHaveBeenCalledTimes(2);

    controller.setAppActive(false);
    await advance(120000);
    expect(attempt).toHaveBeenCalledTimes(2);

    controller.setAppActive(true);
    expect(controller.getAttemptIndex()).toBe(0);
    await advance(2000);
    expect(attempt).toHaveBeenCalledTimes(3);
    controller.stop();
  });

  test('does nothing when connected, without target, or when BLE is unusable', async () => {
    const connectedCase = setup();
    connectedCase.setConnected(true);
    connectedCase.controller.start();
    await advance(60000);
    expect(connectedCase.attempt).not.toHaveBeenCalled();
    connectedCase.controller.stop();

    const noTarget = setup({ getTarget: () => null });
    noTarget.controller.start();
    await advance(60000);
    expect(noTarget.attempt).not.toHaveBeenCalled();
    noTarget.controller.stop();

    const bleOff = setup({ canUseBle: async () => false });
    bleOff.controller.start();
    await advance(60000);
    expect(bleOff.attempt).not.toHaveBeenCalled();
    expect(bleOff.statuses.filter(Boolean)).toEqual([]);
    bleOff.controller.stop();
  });

  test('waits instead of competing with a manual connect', async () => {
    let busy = true;
    const { controller, attempt } = setup({ isBusy: () => busy });
    controller.start();
    await advance(2000);
    expect(attempt).not.toHaveBeenCalled();
    expect(controller.getAttemptIndex()).toBe(0);
    busy = false;
    await advance(2000);
    expect(attempt).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  test('success clears status and resets backoff', async () => {
    const harness = setup();
    harness.attempt.mockImplementationOnce(async () => {
      harness.setConnected(true);
      return true;
    });
    harness.controller.start();
    await advance(2000);
    expect(harness.controller.getAttemptIndex()).toBe(0);
    expect(harness.statuses).toEqual(['Kelas 1', null]);
    harness.controller.stop();
  });
});

describe('last device store', () => {
  beforeAll(async () => {
    await loadLastDeviceStore();
  });

  test('remember, pause on Putuskan, resume on manual connect, forget', () => {
    rememberConnectedDevice({ bleId: 'dev-1', name: 'SmartGrowth-1A2B', kind: 'smartgrowth' });
    updateRememberedLabel('dev-1', 'Kelas 1');
    expect(selectReconnectCandidate(getLastDeviceState(), 'user-1')).toMatchObject({
      bleId: 'dev-1',
      label: 'Kelas 1',
    });
    expect(selectReconnectCandidate(getLastDeviceState(), 'other-user')).toBeNull();

    pauseAutoReconnectFor('dev-1');
    expect(selectReconnectCandidate(getLastDeviceState(), 'user-1')).toBeNull();

    rememberConnectedDevice({ bleId: 'dev-1', name: 'SmartGrowth-1A2B', kind: 'smartgrowth' });
    expect(getLastDeviceState().device?.paused).toBe(false);
    expect(getLastDeviceState().device?.label).toBe('Kelas 1');

    setAutoReconnectEnabled(false);
    expect(selectReconnectCandidate(getLastDeviceState(), 'user-1')).toBeNull();
    setAutoReconnectEnabled(true);

    forgetRememberedDevice('other');
    expect(getLastDeviceState().device).not.toBeNull();
    forgetRememberedDevice('dev-1');
    expect(selectReconnectCandidate(getLastDeviceState(), 'user-1')).toBeNull();
  });

  test('S400 is never an auto-reconnect target', () => {
    rememberConnectedDevice({ bleId: 's400', name: 'Xiaomi S400', kind: 's400' });
    expect(selectReconnectCandidate(getLastDeviceState(), 'user-1')).toBeNull();
    forgetRememberedDevice();
  });
});
