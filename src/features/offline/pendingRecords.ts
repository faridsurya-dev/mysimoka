import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import {
  buildImmunizationText,
  buildMeasurementText,
  formatMeasurementTimestamp,
  getAuthSession,
  getSessionUserId,
  saveStudentImmunizationRecord,
  saveStudentMeasurementRecord,
  type SaveStudentImmunizationRecordPayload,
  type SaveStudentMeasurementRecordPayload,
} from '../../services/auth';
import type { StudentMeasurementItem } from '../../types';
import { isNetworkError, withTimeout } from './network';

// Measurement / immunization records that could not be sent (no connection),
// persisted on the phone and sent later. The server upserts one record per
// (session, student), so sending the same record twice is harmless; a newer
// local record for the same student replaces the queued one.

const STORAGE_KEY = '@mysimoka/pending-records';
/** A save waits this long before it is queued instead (weak signal). */
export const SAVE_TIMEOUT_MS = 20000;

export type PendingRecord =
  | {
      kind: 'measurement';
      key: string;
      userId: string;
      sessionId: string;
      studentId: string;
      payload: SaveStudentMeasurementRecordPayload;
      queuedAt: string;
      attempts: number;
      lastError: string | null;
    }
  | {
      kind: 'immunization';
      key: string;
      userId: string;
      sessionId: string;
      studentId: string;
      payload: SaveStudentImmunizationRecordPayload;
      queuedAt: string;
      attempts: number;
      lastError: string | null;
    };

export type PendingState = {
  loaded: boolean;
  records: PendingRecord[];
  isSyncing: boolean;
  /** ISO time of the last sync attempt that reached the server. */
  lastSyncedAt: string | null;
};

let state: PendingState = { loaded: false, records: [], isSyncing: false, lastSyncedAt: null };
let loadPromise: Promise<void> | null = null;
let syncPromise: Promise<SyncResult> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<PendingState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
}

function recordKey(kind: PendingRecord['kind'], sessionId: string, studentId: string): string {
  return `${kind}:${sessionId}:${studentId}`;
}

async function persist(records: PendingRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Keep the in-memory queue; the next change retries the write.
  }
}

export function loadPendingRecords(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const stored = Array.isArray(parsed) ? (parsed as PendingRecord[]) : [];
        // Records queued before the store finished loading win over stored ones.
        const queuedKeys = new Set(state.records.map(record => record.key));
        setState({
          loaded: true,
          records: [...stored.filter(record => !queuedKeys.has(record.key)), ...state.records],
        });
      })
      .catch(() => setState({ loaded: true }));
  }
  return loadPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

/** Pending records of the logged-in user. */
export function usePendingRecords(): PendingState {
  loadPendingRecords();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function pendingForCurrentUser(records: PendingRecord[] = state.records): PendingRecord[] {
  const userId = getSessionUserId();
  return userId ? records.filter(record => record.userId === userId) : [];
}

export async function enqueueMeasurement(payload: SaveStudentMeasurementRecordPayload): Promise<void> {
  await enqueue({
    kind: 'measurement',
    payload: { ...payload, measuredAt: payload.measuredAt ?? new Date().toISOString() },
  });
}

export async function enqueueImmunization(
  payload: SaveStudentImmunizationRecordPayload,
): Promise<void> {
  await enqueue({
    kind: 'immunization',
    payload: { ...payload, administeredAt: payload.administeredAt ?? new Date().toISOString() },
  });
}

async function enqueue(
  input:
    | { kind: 'measurement'; payload: SaveStudentMeasurementRecordPayload }
    | { kind: 'immunization'; payload: SaveStudentImmunizationRecordPayload },
): Promise<void> {
  const userId = getSessionUserId();
  if (!userId) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }
  await loadPendingRecords();
  const key = recordKey(input.kind, input.payload.sessionId, input.payload.studentId);
  const record = {
    ...input,
    key,
    userId,
    sessionId: input.payload.sessionId,
    studentId: input.payload.studentId,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  } as PendingRecord;
  const records = [...state.records.filter(item => item.key !== key), record];
  setState({ records });
  await persist(records);
}

/** Drops a queued record once the same student was saved online. */
export async function removePendingRecord(
  kind: PendingRecord['kind'],
  sessionId: string,
  studentId: string,
): Promise<void> {
  await loadPendingRecords();
  const key = recordKey(kind, sessionId, studentId);
  if (!state.records.some(record => record.key === key)) {
    return;
  }
  const records = state.records.filter(record => record.key !== key);
  setState({ records });
  await persist(records);
}

export type SyncResult = {
  sent: number;
  failed: number;
  remaining: number;
  offline: boolean;
};

/**
 * Sends the logged-in user's queued records, oldest first. Stops at the first
 * connection failure; a record the server rejects stays queued with its error
 * (never dropped silently). Only one sync runs at a time.
 */
export function syncPendingRecords(): Promise<SyncResult> {
  if (!syncPromise) {
    syncPromise = runSync().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

async function runSync(): Promise<SyncResult> {
  await loadPendingRecords();
  const queue = pendingForCurrentUser();
  if (queue.length === 0 || !getAuthSession().accessToken) {
    return { sent: 0, failed: 0, remaining: queue.length, offline: false };
  }

  setState({ isSyncing: true });
  let sent = 0;
  let failed = 0;
  let offline = false;
  try {
    for (const record of queue) {
      try {
        if (record.kind === 'measurement') {
          await withTimeout(saveStudentMeasurementRecord(record.payload), SAVE_TIMEOUT_MS);
        } else {
          await withTimeout(saveStudentImmunizationRecord(record.payload), SAVE_TIMEOUT_MS);
        }
        sent += 1;
        // Re-read: the record may have been replaced by a newer one meanwhile.
        const records = state.records.filter(
          item => !(item.key === record.key && item.queuedAt === record.queuedAt),
        );
        setState({ records, lastSyncedAt: new Date().toISOString() });
        await persist(records);
      } catch (error) {
        if (isNetworkError(error)) {
          offline = true;
          break;
        }
        failed += 1;
        const message = error instanceof Error ? error.message : 'Gagal mengirim data.';
        const records = state.records.map(item =>
          item.key === record.key && item.queuedAt === record.queuedAt
            ? { ...item, attempts: item.attempts + 1, lastError: message }
            : item,
        );
        setState({ records, lastSyncedAt: new Date().toISOString() });
        await persist(records);
      }
    }
  } finally {
    setState({ isSyncing: false });
  }
  return { sent, failed, remaining: pendingForCurrentUser().length, offline };
}

/**
 * Shows queued (not yet sent) records of a session on its student list:
 * values from the phone, status pending.
 */
export function applyPendingToStudents(
  kind: PendingRecord['kind'],
  sessionId: string,
  students: StudentMeasurementItem[],
  records: PendingRecord[] = state.records,
): StudentMeasurementItem[] {
  const bySessionStudent = new Map(
    pendingForCurrentUser(records)
      .filter(record => record.kind === kind && record.sessionId === sessionId)
      .map(record => [record.studentId, record] as const),
  );
  if (bySessionStudent.size === 0) {
    return students;
  }
  return students.map(student => {
    const record = bySessionStudent.get(student.id);
    return record ? toPendingStudent(student, record) : student;
  });
}

export function toPendingStudent(
  student: StudentMeasurementItem,
  record: PendingRecord,
): StudentMeasurementItem {
  if (record.kind === 'measurement') {
    const height = record.payload.heightCm == null ? '' : String(record.payload.heightCm);
    const weight = record.payload.weightKg == null ? '' : String(record.payload.weightKg);
    return {
      ...student,
      measurement: buildMeasurementText(height, weight),
      timestamp: formatMeasurementTimestamp(record.payload.measuredAt ?? record.queuedAt),
      checked: height.length > 0 && weight.length > 0,
      syncStatus: 'pending',
      heightCm: height,
      weightKg: weight,
    };
  }
  return {
    ...student,
    measurement: buildImmunizationText(
      record.payload.vaccineName,
      record.payload.doseLabel ?? null,
      record.payload.status ?? 'given',
    ),
    timestamp: formatMeasurementTimestamp(record.payload.administeredAt ?? record.queuedAt).replace(
      'Diukur',
      'Dicatat',
    ),
    checked: true,
    syncStatus: 'pending',
  };
}
