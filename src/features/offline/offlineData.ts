import {
  listImmunizationSessions,
  listImmunizationStudents,
  listMeasurementSessions,
  listMeasurementStudents,
} from '../../services/auth';
import type {
  ImmunizationSessionListItem,
  MeasurementSessionListItem,
  StudentMeasurementItem,
} from '../../types';
import { isNetworkError } from './network';
import { readCache, writeCache } from './offlineCache';
import { applyPendingToStudents, loadPendingRecords } from './pendingRecords';

// Server reads used while recording, with the phone's last copy as fallback
// when there is no connection.

export type OfflineResult<T> = {
  value: T;
  /** Set when the value came from the phone because the server was unreachable. */
  cachedAt: string | null;
};

async function withCache<T>(key: string, load: () => Promise<T>): Promise<OfflineResult<T>> {
  try {
    const value = await load();
    await writeCache(key, value);
    return { value, cachedAt: null };
  } catch (error) {
    if (!isNetworkError(error)) {
      throw error;
    }
    const cached = await readCache<T>(key);
    if (!cached) {
      throw new Error(
        'Tidak ada koneksi, dan data ini belum pernah dibuka di HP ini. Buka sekali saat online agar bisa dipakai offline.',
      );
    }
    return { value: cached.value, cachedAt: cached.savedAt };
  }
}

type SessionKind = 'measurement' | 'immunization';

function studentsKey(kind: SessionKind, sessionId: string) {
  return `${kind}-students/${sessionId}`;
}

export async function loadSessionStudents(
  kind: SessionKind,
  sessionId: string,
): Promise<OfflineResult<StudentMeasurementItem[]>> {
  const [result] = await Promise.all([
    withCache(studentsKey(kind, sessionId), () =>
      kind === 'measurement' ? listMeasurementStudents(sessionId) : listImmunizationStudents(sessionId),
    ),
    loadPendingRecords(),
  ]);
  return { ...result, value: applyPendingToStudents(kind, sessionId, result.value) };
}

export async function loadMeasurementSessions(
  schoolId: string,
): Promise<OfflineResult<MeasurementSessionListItem[]>> {
  const result = await withCache(`measurement-sessions/${schoolId}`, () =>
    listMeasurementSessions(schoolId),
  );
  if (!result.cachedAt) {
    prefetchStudents('measurement', result.value);
  }
  return result;
}

export async function loadImmunizationSessions(
  schoolId: string,
): Promise<OfflineResult<ImmunizationSessionListItem[]>> {
  const result = await withCache(`immunization-sessions/${schoolId}`, () =>
    listImmunizationSessions(schoolId),
  );
  if (!result.cachedAt) {
    prefetchStudents('immunization', result.value);
  }
  return result;
}

const PREFETCH_LIMIT = 10;
const prefetched = new Set<string>();

/**
 * Stores the student lists of open sessions in the background, so a teacher
 * who opened Pencatatan once while online can record in a class without signal.
 */
function prefetchStudents(
  kind: SessionKind,
  sessions: Array<{ id: string; status: string }>,
): void {
  const open = sessions
    .filter(session => session.status === 'active' || session.status === 'draft')
    .slice(0, PREFETCH_LIMIT)
    .filter(session => !prefetched.has(`${kind}:${session.id}`));
  (async () => {
    for (const session of open) {
      try {
        const students =
          kind === 'measurement'
            ? await listMeasurementStudents(session.id)
            : await listImmunizationStudents(session.id);
        await writeCache(studentsKey(kind, session.id), students);
        prefetched.add(`${kind}:${session.id}`);
      } catch {
        return; // Offline or no access: try again on the next list load.
      }
    }
  })();
}
