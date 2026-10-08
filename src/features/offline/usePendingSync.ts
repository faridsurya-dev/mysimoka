import { useEffect } from 'react';
import { AppState } from 'react-native';
import { pendingForCurrentUser, syncPendingRecords, usePendingRecords } from './pendingRecords';

const RETRY_INTERVAL_MS = 30000;

/**
 * Sends queued records when the app starts or returns to the foreground, and
 * every 30 s while something is queued. Mount once, while logged in.
 */
export function usePendingSync(enabled: boolean) {
  const { loaded, records } = usePendingRecords();
  const pendingCount = enabled && loaded ? pendingForCurrentUser(records).length : 0;

  useEffect(() => {
    if (!enabled || !loaded) {
      return;
    }
    syncPendingRecords().catch(() => undefined);
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        syncPendingRecords().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [enabled, loaded]);

  useEffect(() => {
    if (pendingCount === 0) {
      return;
    }
    const timer = setInterval(() => {
      syncPendingRecords().catch(() => undefined);
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pendingCount]);
}
