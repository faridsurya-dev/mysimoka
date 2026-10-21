import { NativeModules, Platform, Vibration } from 'react-native';

export type FeedbackKind = 'success' | 'error' | 'stable';

type FeedbackToneModule = { play: (kind: FeedbackKind) => void };

// Android-only native module (FeedbackToneModule.kt); missing elsewhere.
const tone = NativeModules.FeedbackTone as FeedbackToneModule | undefined;

const VIBRATION: Record<FeedbackKind, number | number[]> = {
  success: [0, 80, 80, 80],
  error: 450,
  stable: 60,
};

/**
 * Sound + vibration so the operator knows, without looking, that a measurement
 * was saved (or not), or that a stable device reading filled the form.
 * Best-effort: never throws.
 */
export function signalFeedback(kind: FeedbackKind) {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    tone?.play(kind);
  } catch {
    // Sound is optional.
  }
  try {
    Vibration.vibrate(VIBRATION[kind]);
  } catch {
    // Vibration is optional.
  }
}
