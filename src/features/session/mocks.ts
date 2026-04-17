import type {
  CreateSessionClassOption,
  SessionListItem,
  SessionStudentAssignment,
} from '../../types';

export const SESSION_LIST_MOCK: SessionListItem[] = [
  {
    id: 'session-2026-04-10',
    name: 'Session 10 April 2026',
    meta: 'Kelas 3A • 28 siswa • Farid',
    status: 'Aktif',
  },
  {
    id: 'session-2026-04-08',
    name: 'Session 8 April 2026',
    meta: 'Kelas 2B • 30 siswa • Nabila',
    status: 'Belum Sync',
  },
  {
    id: 'session-2026-04-05',
    name: 'Session 5 April 2026',
    meta: 'Kelas 1A • 32 siswa • Rahma',
    status: 'Selesai',
  },
];

export const CLASS_OPTIONS_MOCK: CreateSessionClassOption[] = [
  'Kelas 1A',
  'Kelas 1B',
  'Kelas 2A',
  'Kelas 2B',
  'Kelas 3A',
  'Kelas 3B',
  'Kelas 4A',
  'Kelas 4B',
  'Kelas 5A',
  'Kelas 5B',
  'Kelas 6A',
  'Kelas 6B',
];

export const SESSION_ASSIGNMENT_MOCK: Record<string, SessionStudentAssignment[]> = {
  'session-2026-04-10': [
    { studentId: 'student-001', queueOrder: 1 },
    { studentId: 'student-002', queueOrder: 2 },
    { studentId: 'student-003', queueOrder: 3 },
    { studentId: 'student-004', queueOrder: 4 },
  ],
};
