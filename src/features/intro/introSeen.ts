import AsyncStorage from '@react-native-async-storage/async-storage';

// "Intro already shown" flag for the first-launch slides before Login.

const INTRO_SEEN_KEY = '@mysimoka/intro-seen';

/**
 * True when the intro was finished or skipped before. A storage error also
 * returns true: better to land on Login than to show the intro every launch.
 */
export async function hasSeenIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_SEEN_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // Not fatal: the intro shows once more on the next launch.
  }
}
