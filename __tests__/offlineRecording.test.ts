jest.mock('../src/services/auth', () => ({
  getSessionUserId: jest.fn(() => 'user-1'),
  getAuthSession: jest.fn(() => ({ accessToken: 'token', refreshToken: 'r', user: { id: 'user-1' } })),
  saveStudentMeasurementRecord: jest.fn(),
  saveStudentImmunizationRecord: jest.fn(),
  listMeasurementStudents: jest.fn(),
  listImmunizationStudents: jest.fn(),
  listMeasurementSessions: jest.fn(),
  listImmunizationSessions: jest.fn(),
  buildMeasurementText: (h: string, w: string) => `TB ${h || '-'} cm • BB ${w || '-'} kg`,
  buildImmunizationText: (v: string) => `${v} • Lengkap`,
  formatMeasurementTimestamp: (value: string | null) => `Diukur ${value}`,
}));

type Offline = typeof import('../src/features/offline');
type Auth = typeof import('../src/services/auth');

const SESSION = 'session-1';
const offlineError = () => new TypeError('Network request failed');
const student = (id: string) => ({
  id,
  name: `Siswa ${id}`,
  measurement: 'Belum ada data pengukuran',
  timestamp: 'Belum diukur',
  checked: false,
  syncStatus: 'synced' as const,
  photoUri: null,
  heightCm: '',
  weightKg: '',
});

type AsyncStorageApi = typeof import('@react-native-async-storage/async-storage').default;

let offline: Offline;
let auth: jest.Mocked<Auth>;
let storage: AsyncStorageApi;

// The jest mock module is the storage API itself (no default export).
function requireStorage(): AsyncStorageApi {
  const mod = require('@react-native-async-storage/async-storage');
  return mod.default ?? mod;
}

beforeEach(async () => {
  jest.resetModules();
  storage = requireStorage();
  await storage.clear();
  offline = require('../src/features/offline');
  auth = require('../src/services/auth');
});

describe('network errors', () => {
  test('offline and timeouts are network errors, server rejections are not', () => {
    expect(offline.isNetworkError(offlineError())).toBe(true);
    expect(offline.isNetworkError(new offline.RequestTimeoutError())).toBe(true);
    expect(offline.isNetworkError(new Error('permission denied'))).toBe(false);
  });

  test('withTimeout rejects slow promises', async () => {
    jest.useFakeTimers();
    const pending = offline.withTimeout(new Promise(() => undefined), 1000);
    jest.advanceTimersByTime(1001);
    await expect(pending).rejects.toBeInstanceOf(offline.RequestTimeoutError);
    jest.useRealTimers();
  });
});

describe('pending queue', () => {
  test('queued records survive a restart, newest value per student wins', async () => {
    await offline.enqueueMeasurement({ sessionId: SESSION, studentId: 'a', captureMethod: 'manual', captureSource: 'manual_form', heightCm: 120, weightKg: 22 });
    await offline.enqueueMeasurement({ sessionId: SESSION, studentId: 'a', captureMethod: 'manual', captureSource: 'manual_form', heightCm: 121, weightKg: 23 });

    // Simulated app restart: fresh modules, same phone storage.
    const stored = await storage.getItem('@mysimoka/pending-records');
    jest.resetModules();
    storage = requireStorage();
    await storage.setItem('@mysimoka/pending-records', stored as string);
    offline = require('../src/features/offline');
    await offline.loadPendingRecords();
    const queued = offline.pendingForCurrentUser();
    expect(queued).toHaveLength(1);
    expect(queued[0].kind === 'measurement' && queued[0].payload.heightCm).toBe(121);
    expect(queued[0].kind === 'measurement' && queued[0].payload.measuredAt).toBeTruthy();
  });

  test('sync sends queued records and keeps the measurement time', async () => {
    await offline.enqueueMeasurement({ sessionId: SESSION, studentId: 'a', captureMethod: 'manual', captureSource: 'manual_form', heightCm: 120, weightKg: 22, measuredAt: '2026-10-10T01:00:00.000Z' });
    auth.saveStudentMeasurementRecord.mockResolvedValue(student('a'));

    const result = await offline.syncPendingRecords();

    expect(result).toEqual({ sent: 1, failed: 0, remaining: 0, offline: false });
    expect(auth.saveStudentMeasurementRecord).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'a', measuredAt: '2026-10-10T01:00:00.000Z' }),
    );
  });

  test('sync stops while offline and keeps everything queued', async () => {
    await offline.enqueueMeasurement({ sessionId: SESSION, studentId: 'a', captureMethod: 'manual', captureSource: 'manual_form', heightCm: 120, weightKg: 22 });
    await offline.enqueueImmunization({ sessionId: SESSION, studentId: 'b', vaccineName: 'DT' });
    auth.saveStudentMeasurementRecord.mockRejectedValue(offlineError());

    const result = await offline.syncPendingRecords();

    expect(result.offline).toBe(true);
    expect(result.remaining).toBe(2);
    expect(auth.saveStudentImmunizationRecord).not.toHaveBeenCalled();
  });

  test('a record the server rejects stays queued with its error', async () => {
    await offline.enqueueImmunization({ sessionId: SESSION, studentId: 'b', vaccineName: 'DT' });
    auth.saveStudentImmunizationRecord.mockRejectedValue(new Error('Akses ditolak.'));

    const result = await offline.syncPendingRecords();

    expect(result).toMatchObject({ sent: 0, failed: 1, remaining: 1 });
    expect(offline.pendingForCurrentUser()[0].lastError).toBe('Akses ditolak.');
  });

  test("other users' records are neither shown nor sent", async () => {
    await offline.enqueueMeasurement({ sessionId: SESSION, studentId: 'a', captureMethod: 'manual', captureSource: 'manual_form', heightCm: 120, weightKg: 22 });
    auth.getSessionUserId.mockReturnValue('user-2');

    expect(offline.pendingForCurrentUser()).toHaveLength(0);
    await offline.syncPendingRecords();
    expect(auth.saveStudentMeasurementRecord).not.toHaveBeenCalled();
  });
});

describe('offline reads', () => {
  test('student list falls back to the phone copy with queued values on top', async () => {
    auth.listMeasurementStudents.mockResolvedValueOnce([student('a'), student('b')]);
    const online = await offline.loadSessionStudents('measurement', SESSION);
    expect(online.cachedAt).toBeNull();

    await offline.enqueueMeasurement({ sessionId: SESSION, studentId: 'b', captureMethod: 'manual', captureSource: 'manual_form', heightCm: 130, weightKg: 28 });
    auth.listMeasurementStudents.mockRejectedValueOnce(offlineError());
    const fromPhone = await offline.loadSessionStudents('measurement', SESSION);

    expect(fromPhone.cachedAt).not.toBeNull();
    const b = fromPhone.value.find(item => item.id === 'b');
    expect(b).toMatchObject({ checked: true, syncStatus: 'pending', heightCm: '130', weightKg: '28' });
  });

  test('a list never opened online gives a clear offline error', async () => {
    auth.listImmunizationStudents.mockRejectedValueOnce(offlineError());
    await expect(offline.loadSessionStudents('immunization', 'never-opened')).rejects.toThrow(
      'belum pernah dibuka di HP ini',
    );
  });

  test('server errors are not hidden behind the phone copy', async () => {
    auth.listMeasurementSessions.mockResolvedValueOnce([]);
    await offline.loadMeasurementSessions('school-1');
    auth.listMeasurementSessions.mockRejectedValueOnce(new Error('Akses ditolak.'));
    await expect(offline.loadMeasurementSessions('school-1')).rejects.toThrow('Akses ditolak.');
  });

  test('opening the session list stores open sessions for offline use', async () => {
    auth.listMeasurementSessions.mockResolvedValueOnce([
      { id: 's-open', status: 'active' },
      { id: 's-done', status: 'completed' },
    ] as never);
    auth.listMeasurementStudents.mockResolvedValue([student('a')]);
    await offline.loadMeasurementSessions('school-1');
    await new Promise(resolve => setImmediate(resolve));

    expect(auth.listMeasurementStudents).toHaveBeenCalledWith('s-open');
    expect(auth.listMeasurementStudents).not.toHaveBeenCalledWith('s-done');
    auth.listMeasurementStudents.mockRejectedValueOnce(offlineError());
    const result = await offline.loadSessionStudents('measurement', 's-open');
    expect(result.cachedAt).not.toBeNull();
    expect(result.value).toHaveLength(1);
  });
});
