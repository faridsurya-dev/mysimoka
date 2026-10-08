import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionUserId } from '../../services/auth';

// Last successful server responses (session lists, students per session),
// per logged-in user, so recording keeps working without a connection.

const CACHE_PREFIX = '@mysimoka/offline-cache';

export type CachedValue<T> = {
  value: T;
  /** ISO time the value was fetched from the server. */
  savedAt: string;
};

function cacheKey(key: string): string | null {
  const userId = getSessionUserId();
  return userId ? `${CACHE_PREFIX}/${userId}/${key}` : null;
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  const storageKey = cacheKey(key);
  if (!storageKey) {
    return;
  }
  const entry: CachedValue<T> = { value, savedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Cache is best-effort.
  }
}

export async function readCache<T>(key: string): Promise<CachedValue<T> | null> {
  const storageKey = cacheKey(key);
  if (!storageKey) {
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedValue<T>;
    return parsed && typeof parsed.savedAt === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
