import { sha256Hex } from '../src/lib/sha256';
import {
  TECHNICIAN_MODE_DURATION_MS,
  TECHNICIAN_PIN_LOCKOUT_MS,
  disableTechnicianMode,
  hashTechnicianPin,
  isTechnicianModeActive,
  isValidPinFormat,
  resetTechnicianModeForTests,
  submitTechnicianPin,
} from '../src/features/device/technicianMode';
import { computeDeviceCalibrationStatus, describeInterval } from '../src/features/device/calibration';

describe('sha256Hex', () => {
  test('known vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  test('matches node crypto around block boundaries', () => {
    const nodeCrypto = require('crypto');
    for (const length of [1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const text = 'a'.repeat(length);
      expect(sha256Hex(text)).toBe(nodeCrypto.createHash('sha256').update(text).digest('hex'));
    }
  });

  test('utf-8 input', () => {
    expect(sha256Hex('é')).toBe(require('crypto').createHash('sha256').update('é', 'utf8').digest('hex'));
  });

  test('matches node crypto for the PIN formula', () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const expected = require('crypto').createHash('sha256').update(`${salt}:1234`).digest('hex');
    expect(hashTechnicianPin(salt, '1234')).toBe(expected);
  });
});

describe('technician mode', () => {
  const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const config = { hash: hashTechnicianPin(salt, '2468'), salt, source: 'global' as const };

  beforeEach(() => {
    jest.useFakeTimers();
    resetTechnicianModeForTests();
  });
  afterEach(() => {
    resetTechnicianModeForTests();
    jest.useRealTimers();
  });

  test('pin format', () => {
    expect(isValidPinFormat('123')).toBe(false);
    expect(isValidPinFormat('1234')).toBe(true);
    expect(isValidPinFormat('12345678')).toBe(true);
    expect(isValidPinFormat('123456789')).toBe(false);
    expect(isValidPinFormat('12a4')).toBe(false);
  });

  test('not configured', () => {
    expect(submitTechnicianPin('2468', null).status).toBe('not_configured');
  });

  test('correct pin enables for 30 minutes, then auto-off', () => {
    const now = Date.now();
    expect(submitTechnicianPin('2468', config, now)).toEqual({ status: 'ok' });
    expect(isTechnicianModeActive(now + 1000)).toBe(true);
    expect(isTechnicianModeActive(now + TECHNICIAN_MODE_DURATION_MS + 1)).toBe(false);
    disableTechnicianMode();
    expect(isTechnicianModeActive(now + 1000)).toBe(false);
  });

  test('5 wrong tries lock for 60 s', () => {
    const now = 1_000_000;
    for (let i = 1; i <= 4; i += 1) {
      expect(submitTechnicianPin('0000', config, now)).toEqual({ status: 'wrong', attemptsLeft: 5 - i });
    }
    expect(submitTechnicianPin('0000', config, now).status).toBe('locked');
    // Even the right PIN is refused while locked.
    expect(submitTechnicianPin('2468', config, now + 30_000).status).toBe('locked');
    expect(submitTechnicianPin('2468', config, now + TECHNICIAN_PIN_LOCKOUT_MS + 1).status).toBe('ok');
  });
});

describe('computeDeviceCalibrationStatus', () => {
  const now = Date.parse('2026-10-09T00:00:00Z');
  const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();

  test('never checked', () => {
    const status = computeDeviceCalibrationStatus([], 180, now);
    expect(status.never).toBe(true);
    expect(status.stale).toBe(false);
  });

  test('recent passing check', () => {
    const status = computeDeviceCalibrationStatus(
      [
        { measure: 'weight', createdAt: daysAgo(10), bias: 0.04, withinTolerance: true },
        { measure: 'height', createdAt: daysAgo(10), bias: -0.2, withinTolerance: true },
      ],
      180,
      now,
    );
    expect(status.never).toBe(false);
    expect(status.stale).toBe(false);
    expect(status.weightBias).toBe(0.04);
    expect(status.heightBias).toBe(-0.2);
    expect(status.outOfTolerance).toEqual([]);
  });

  test('stale after the interval', () => {
    const rows = [{ measure: 'weight' as const, createdAt: daysAgo(200), bias: 0.01, withinTolerance: true }];
    expect(computeDeviceCalibrationStatus(rows, 180, now).stale).toBe(true);
    expect(computeDeviceCalibrationStatus(rows, 365, now).stale).toBe(false);
  });

  test('out of tolerance unless a later check passed', () => {
    const failed = { measure: 'weight' as const, createdAt: daysAgo(5), bias: 0.3, withinTolerance: false };
    expect(computeDeviceCalibrationStatus([failed], 180, now).outOfTolerance).toEqual([
      { measure: 'weight', bias: 0.3 },
    ]);
    const passedLater = { measure: 'weight' as const, createdAt: daysAgo(4), bias: 0.02, withinTolerance: true };
    expect(computeDeviceCalibrationStatus([failed, passedLater], 180, now).outOfTolerance).toEqual([]);
  });

  test('interval wording', () => {
    expect(describeInterval(180)).toBe('6 bulan');
    expect(describeInterval(45)).toBe('45 hari');
  });
});
