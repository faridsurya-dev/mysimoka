import type { BatchActiveStudentPreview, StudentMeasurementItem } from '../../types';

export const INITIAL_MEASUREMENT_STUDENTS: StudentMeasurementItem[] = [
  {
    id: 'student-001',
    name: 'Alya Putri Maharani',
    measurement: 'TB 128 cm • BB 29 kg',
    timestamp: 'Diukur 10 Apr 2026, 08:45',
    checked: true,
    syncStatus: 'pending',
    photoUri: null,
    heightCm: '128',
    weightKg: '29',
  },
  {
    id: 'student-002',
    name: 'Bima Saputra',
    measurement: 'TB 125 cm • BB 27 kg',
    timestamp: 'Diukur 10 Apr 2026, 08:52',
    checked: true,
    syncStatus: 'synced',
    photoUri: null,
    heightCm: '125',
    weightKg: '27',
  },
  {
    id: 'student-003',
    name: 'Citra Maharani',
    measurement: 'Belum ada hasil pengukuran',
    timestamp: 'Menunggu input manual',
    checked: false,
    syncStatus: 'synced',
    photoUri: null,
  },
  {
    id: 'student-004',
    name: 'Dimas Pratama',
    measurement: 'Belum ada hasil pengukuran',
    timestamp: 'Belum diukur pada sesi ini',
    checked: false,
    syncStatus: 'synced',
    photoUri: null,
  },
];

export const MANUAL_SEARCH_STUDENTS = ['Alya Putri', 'Bima Saputra', 'Citra Maharani'];

export const DEFAULT_BATCH_ACTIVE_STUDENT: BatchActiveStudentPreview = {
  name: 'Bima Saputra',
  photoUri: null,
};
