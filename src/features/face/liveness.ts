/**
 * Active liveness for face identification: before the photo is taken the
 * child must blink (and, at random, turn the head and look back). A printed
 * photo or a picture on another screen cannot do that, so the face search can
 * no longer be fooled with a still image. Pure logic on ML Kit face data
 * (eye-open probabilities, yaw); the screen feeds it one face per frame.
 */

export type LivenessStep = 'blink' | 'turn';

export type LivenessFace = {
  yawAngle: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  trackingId?: number;
};

export type LivenessState = {
  steps: LivenessStep[];
  /** Index of the current step; steps.length = passed. */
  index: number;
  /** Progress inside the current step (see advanceLiveness). */
  phase: number;
  trackingId: number | undefined;
  startedAt: number;
};

export type LivenessUpdate = {
  state: LivenessState;
  passed: boolean;
  /** Set when the challenge restarted: another face appeared or it took too long. */
  reset: 'face-changed' | 'timeout' | null;
};

export const LIVENESS_TIMEOUT_MS = 10_000;
const EYES_OPEN = 0.6;
const EYES_CLOSED = 0.35;
const TURN_AWAY_DEG = 20;
const TURN_BACK_DEG = 10;

export const LIVENESS_PROMPT: Record<LivenessStep, string> = {
  blink: 'Kedipkan mata',
  turn: 'Tolehkan kepala ke samping, lalu kembali lurus',
};

/** blink always; half of the time also a head turn, in random order. */
export function newLivenessChallenge(now: number, random: () => number = Math.random): LivenessState {
  const steps: LivenessStep[] =
    random() < 0.5 ? ['blink'] : random() < 0.5 ? ['blink', 'turn'] : ['turn', 'blink'];
  return { steps, index: 0, phase: 0, trackingId: undefined, startedAt: now };
}

export function isLivenessPassed(state: LivenessState): boolean {
  return state.index >= state.steps.length;
}

export function currentLivenessStep(state: LivenessState): LivenessStep | null {
  return state.steps[state.index] ?? null;
}

function eyesKnown(face: LivenessFace): boolean {
  return face.leftEyeOpenProbability >= 0 && face.rightEyeOpenProbability >= 0;
}

/**
 * Feeds one detected face. Blink: eyes open -> both closed -> open again.
 * Turn: |yaw| >= 20 deg -> back to |yaw| <= 10 deg. Unknown eye probabilities
 * (ML Kit returns -1 / undefined) never advance a blink.
 */
export function advanceLiveness(state: LivenessState, face: LivenessFace, now: number): LivenessUpdate {
  if (isLivenessPassed(state)) {
    return { state, passed: true, reset: null };
  }
  if (now - state.startedAt > LIVENESS_TIMEOUT_MS) {
    return { state: newLivenessChallenge(now), passed: false, reset: 'timeout' };
  }
  if (state.trackingId !== undefined && face.trackingId !== undefined && face.trackingId !== state.trackingId) {
    return { state: newLivenessChallenge(now), passed: false, reset: 'face-changed' };
  }

  const next: LivenessState = { ...state, trackingId: state.trackingId ?? face.trackingId };
  const step = state.steps[state.index];
  const yaw = Math.abs(face.yawAngle);

  if (step === 'blink') {
    if (eyesKnown(face)) {
      const open = face.leftEyeOpenProbability >= EYES_OPEN && face.rightEyeOpenProbability >= EYES_OPEN;
      const closed = face.leftEyeOpenProbability <= EYES_CLOSED && face.rightEyeOpenProbability <= EYES_CLOSED;
      if (next.phase === 0 && open) next.phase = 1;
      else if (next.phase === 1 && closed) next.phase = 2;
      else if (next.phase === 2 && open) {
        next.index += 1;
        next.phase = 0;
      }
    }
  } else if (step === 'turn') {
    if (next.phase === 0 && yaw >= TURN_AWAY_DEG) next.phase = 1;
    else if (next.phase === 1 && yaw <= TURN_BACK_DEG) {
      next.index += 1;
      next.phase = 0;
    }
  }

  return { state: next, passed: isLivenessPassed(next), reset: null };
}
