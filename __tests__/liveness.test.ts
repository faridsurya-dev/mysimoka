import {
  advanceLiveness,
  LIVENESS_TIMEOUT_MS,
  newLivenessChallenge,
  type LivenessFace,
  type LivenessState,
} from '../src/features/face/liveness';

const face = (overrides: Partial<LivenessFace> = {}): LivenessFace => ({
  yawAngle: 0,
  leftEyeOpenProbability: 0.95,
  rightEyeOpenProbability: 0.95,
  trackingId: 1,
  ...overrides,
});
const open = face();
const closed = face({ leftEyeOpenProbability: 0.05, rightEyeOpenProbability: 0.1 });

function run(state: LivenessState, frames: LivenessFace[], now = 0) {
  let current = state;
  let passed = false;
  for (const frame of frames) {
    const update = advanceLiveness(current, frame, now);
    current = update.state;
    passed = update.passed;
  }
  return { state: current, passed };
}

const blinkOnly: LivenessState = { steps: ['blink'], index: 0, phase: 0, trackingId: undefined, startedAt: 0 };
const blinkTurn: LivenessState = { ...blinkOnly, steps: ['blink', 'turn'] };

describe('liveness', () => {
  it('passes a blink: open -> closed -> open', () => {
    expect(run(blinkOnly, [open, closed, open]).passed).toBe(true);
  });

  it('a still photo (eyes always open) never passes', () => {
    expect(run(blinkOnly, Array.from({ length: 50 }, () => open)).passed).toBe(false);
  });

  it('unknown eye probabilities do not count as a blink', () => {
    const unknown = face({ leftEyeOpenProbability: -1, rightEyeOpenProbability: -1 });
    expect(run(blinkOnly, [open, unknown, open]).passed).toBe(false);
  });

  it('one eye closed is not a blink', () => {
    const wink = face({ leftEyeOpenProbability: 0.05 });
    expect(run(blinkOnly, [open, wink, open]).passed).toBe(false);
  });

  it('needs the head turn and the return to front', () => {
    const away = face({ yawAngle: -25 });
    expect(run(blinkTurn, [open, closed, open, away]).passed).toBe(false);
    expect(run(blinkTurn, [open, closed, open, away, open]).passed).toBe(true);
  });

  it('restarts when another face takes over', () => {
    const update = advanceLiveness({ ...blinkOnly, phase: 2, trackingId: 1 }, face({ trackingId: 2 }), 100);
    expect(update.reset).toBe('face-changed');
    expect(update.state.index).toBe(0);
    expect(update.state.phase).toBe(0);
  });

  it('restarts after the timeout', () => {
    const update = advanceLiveness(blinkOnly, open, LIVENESS_TIMEOUT_MS + 1);
    expect(update.reset).toBe('timeout');
  });

  it('every challenge contains a blink', () => {
    for (const r of [0.1, 0.3, 0.6, 0.9]) {
      expect(newLivenessChallenge(0, () => r).steps).toContain('blink');
    }
  });
});
