import { NativeModules, Platform, Vibration } from 'react-native';

type FeedbackToneModule = { play: (kind: 'success' | 'error') => void };

// Android-only native module (FeedbackToneModule.kt); missing elsewhere.
const tone = NativeModules.FeedbackTone as FeedbackToneModule | undefined;

/**
 * Sound + vibration so the operator knows, without looking, that a measurement
 * was saved (or not). Best-effort: never throws.
 */
export function signalFeedback(kind: 'success' | 'error') {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    tone?.play(kind);
  } catch {
    // Sound is optional.
  }
  try {
    Vibration.vibrate(kind === 'success' ? [0, 80, 80, 80] : 450);
  } catch {
    // Vibration is optional.
  }
}
