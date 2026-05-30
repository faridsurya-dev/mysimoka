import { useSyncExternalStore } from 'react';
import { getDeviceSessionSnapshot, subscribeDeviceSession } from './deviceSession';

export function useDeviceSession() {
  return useSyncExternalStore(subscribeDeviceSession, getDeviceSessionSnapshot);
}

