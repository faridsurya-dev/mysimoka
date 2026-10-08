import { useSyncExternalStore } from 'react';
import { sha256Hex } from '../../lib/sha256';

// Hidden "Mode teknisi": unlocks the SmartGrowth accuracy check / calibration
// menu for the technical team. It only hides the menu from regular staff; it is
// not a security boundary (see mysimoka-backend-hasura docs/permissions.md).
// State lives in memory for this app session only and is never persisted.

export const TECHNICIAN_MODE_DURATION_MS = 30 * 60 * 1000;
export const TECHNICIAN_PIN_MAX_ATTEMPTS = 5;
export const TECHNICIAN_PIN_LOCKOUT_MS = 60 * 1000;
export const TECHNICIAN_PIN_MIN_LENGTH = 4;
export const TECHNICIAN_PIN_MAX_LENGTH = 8;

/** PIN row from `calibration_settings` (school row first, then the global row). */
export type TechnicianPinConfig = {
  hash: string;
  salt: string;
  source: 'school' | 'global';
};

export type TechnicianModeState = {
  /** Epoch ms when the mode turns itself off; null = off. */
  activeUntil: number | null;
  failedAttempts: number;
  /** Epoch ms until which PIN entry is locked; null = not locked. */
  lockedUntil: number | null;
};

export type PinVerifyResult =
  | { status: 'ok' }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'locked'; retryInMs: number }
  | { status: 'invalid_format' }
  | { status: 'not_configured' };

/** Hex SHA-256 of `salt + ":" + pin` (same formula as mysimoka-admin). */
export function hashTechnicianPin(salt: string, pin: string) {
  return sha256Hex(`${salt}:${pin}`);
}

export function isValidPinFormat(pin: string) {
  return new RegExp(`^\\d{${TECHNICIAN_PIN_MIN_LENGTH},${TECHNICIAN_PIN_MAX_LENGTH}}$`).test(pin);
}

let state: TechnicianModeState = { activeUntil: null, failedAttempts: 0, lockedUntil: null };
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function setState(next: TechnicianModeState) {
  state = next;
  listeners.forEach(listener => listener());
}

function clearExpiryTimer() {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

export function getTechnicianModeState() {
  return state;
}

export function subscribeTechnicianMode(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isTechnicianModeActive(now: number = Date.now()) {
  return state.activeUntil !== null && now < state.activeUntil;
}

export function disableTechnicianMode() {
  clearExpiryTimer();
  if (state.activeUntil !== null) {
    setState({ ...state, activeUntil: null });
  }
}

function enable(now: number) {
  clearExpiryTimer();
  const activeUntil = now + TECHNICIAN_MODE_DURATION_MS;
  setState({ activeUntil, failedAttempts: 0, lockedUntil: null });
  expiryTimer = setTimeout(() => {
    expiryTimer = null;
    if (state.activeUntil === activeUntil) {
      setState({ ...state, activeUntil: null });
    }
  }, TECHNICIAN_MODE_DURATION_MS);
}

/**
 * Checks a PIN and turns the mode on when it matches. Counts wrong tries:
 * after TECHNICIAN_PIN_MAX_ATTEMPTS wrong tries entry is locked for
 * TECHNICIAN_PIN_LOCKOUT_MS.
 */
export function submitTechnicianPin(
  pin: string,
  config: TechnicianPinConfig | null,
  now: number = Date.now(),
): PinVerifyResult {
  if (state.lockedUntil !== null) {
    if (now < state.lockedUntil) {
      return { status: 'locked', retryInMs: state.lockedUntil - now };
    }
    setState({ ...state, lockedUntil: null, failedAttempts: 0 });
  }
  if (!config) {
    return { status: 'not_configured' };
  }
  if (!isValidPinFormat(pin)) {
    return { status: 'invalid_format' };
  }
  if (hashTechnicianPin(config.salt, pin) === config.hash.trim().toLowerCase()) {
    enable(now);
    return { status: 'ok' };
  }
  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts >= TECHNICIAN_PIN_MAX_ATTEMPTS) {
    const lockedUntil = now + TECHNICIAN_PIN_LOCKOUT_MS;
    setState({ ...state, failedAttempts: 0, lockedUntil });
    return { status: 'locked', retryInMs: TECHNICIAN_PIN_LOCKOUT_MS };
  }
  setState({ ...state, failedAttempts });
  return { status: 'wrong', attemptsLeft: TECHNICIAN_PIN_MAX_ATTEMPTS - failedAttempts };
}

/** Test helper: back to the initial state. */
export function resetTechnicianModeForTests() {
  clearExpiryTimer();
  state = { activeUntil: null, failedAttempts: 0, lockedUntil: null };
  listeners.forEach(listener => listener());
}

/** True while the technician mode is on (re-renders on change and on auto-off). */
export function useTechnicianModeActive() {
  const snapshot = useSyncExternalStore(subscribeTechnicianMode, getTechnicianModeState);
  return snapshot.activeUntil !== null && Date.now() < snapshot.activeUntil;
}
