import type {
  AverageMetricItem,
  CategoryBarItem,
  ClassListItem,
  DemographyCardItem,
  QuickMenuItem,
  StudentSearchResultItem,
  TeacherListItem,
  TrendPoint,
} from '../../types';

export const DASHBOARD_DEMOGRAPHY_CARDS: DemographyCardItem[] = [
  { label: 'Total Siswa', value: '120' },
  { label: 'Laki-laki', value: '70', note: '58.3% populasi aktif' },
  { label: 'Perempuan', value: '50', note: '41.7% populasi aktif' },
];

export const DASHBOARD_AVERAGE_METRICS: AverageMetricItem[] = [
  { label: 'Rata-rata Tinggi', value: '132', unit: 'cm' },
  { label: 'Rata-rata Berat', value: '32', unit: 'kg' },
  { label: 'Rata-rata BMI', value: '18.2', unit: '' },
];

export const DASHBOARD_BMI_CATEGORY_DATA: CategoryBarItem[] = [
  { value: 18, label: 'Kurus', frontColor: '#E2A93B' },
  { value: 74, label: 'Normal', frontColor: '#27AE60' },
  { value: 20, label: 'Gemuk', frontColor: '#2D9CDB' },
  { value: 8, label: 'Obes', frontColor: '#EB5757' },
];

export const DASHBOARD_HEIGHT_TREND: TrendPoint[] = [
  { value: 128, label: 'Jan' },
  { value: 129, label: 'Feb' },
  { value: 129.5, label: 'Mar' },
  { value: 130.2, label: 'Apr' },
  { value: 131, label: 'Mei' },
  { value: 132, label: 'Jun' },
  { value: 132.4, label: 'Jul' },
  { value: 132.9, label: 'Agu' },
  { value: 133.5, label: 'Sep' },
  { value: 134, label: 'Okt' },
  { value: 134.4, label: 'Nov' },
  { value: 134.9, label: 'Des' },
];

export const DASHBOARD_WEIGHT_TREND: TrendPoint[] = [
  { value: 27, label: 'Jan' },
  { value: 27.6, label: 'Feb' },
  { value: 28.1, label: 'Mar' },
  { value: 28.8, label: 'Apr' },
  { value: 29.4, label: 'Mei' },
  { value: 30.1, label: 'Jun' },
  { value: 30.5, label: 'Jul' },
  { value: 30.9, label: 'Agu' },
  { value: 31.2, label: 'Sep' },
  { value: 31.6, label: 'Okt' },
  { value: 31.9, label: 'Nov' },
  { value: 32.3, label: 'Des' },
];

export const DASHBOARD_QUICK_MENUS: QuickMenuItem[] = [
  { label: 'Kelas', badge: 'KL' },
  { label: 'Siswa', badge: 'SW' },
  { label: 'Guru', badge: 'GR' },
  { label: 'Imunisasi', badge: 'IM' },
];

export const DASHBOARD_STUDENT_SEARCH_ITEMS: StudentSearchResultItem[] = [
  { id: 'student-001', name: 'Alya Putri Maharani', nisn: '0093184011', className: 'Kelas 3A' },
  { id: 'student-002', name: 'Bima Saputra', nisn: '0093184399', className: 'Kelas 1B' },
  { id: 'student-003', name: 'Citra Maharani', nisn: '0093184562', className: 'Kelas 3A' },
  { id: 'student-004', name: 'Dimas Pratama', nisn: '0093184750', className: 'Kelas 4B' },
  { id: 'student-005', name: 'Naila Salsabila', nisn: '0093184236', className: 'Kelas 1A' },
  { id: 'student-006', name: 'Rafi Pratama', nisn: '0093184112', className: 'Kelas 1A' },
  { id: 'student-007', name: 'Siti Khadijah', nisn: '0093184451', className: 'Kelas 2A' },
  { id: 'student-008', name: 'Andi Wijaya', nisn: '0093184527', className: 'Kelas 2B' },
];

export const CLASS_LIST_ITEMS: ClassListItem[] = [
  {
    id: 'class-1a',
    name: 'Kelas 1A',
    total: 28,
    teacher: 'Wali kelas: Ibu Rina',
    lastMeasuredAt: 'Pengukuran terakhir 8 Apr 2026',
    coverage: '26/28 siswa sudah diukur',
  },
  {
    id: 'class-1b',
    name: 'Kelas 1B',
    total: 30,
    teacher: 'Wali kelas: Pak Dedi',
    lastMeasuredAt: 'Pengukuran terakhir 6 Apr 2026',
    coverage: '27/30 siswa sudah diukur',
  },
  {
    id: 'class-2a',
    name: 'Kelas 2A',
    total: 27,
    teacher: 'Wali kelas: Ibu Maya',
    lastMeasuredAt: 'Pengukuran terakhir 9 Apr 2026',
    coverage: '24/27 siswa sudah diukur',
  },
  {
    id: 'class-2b',
    name: 'Kelas 2B',
    total: 35,
    teacher: 'Wali kelas: Pak Arif',
    lastMeasuredAt: 'Pengukuran terakhir 5 Apr 2026',
    coverage: '30/35 siswa sudah diukur',
  },
  {
    id: 'class-3a',
    name: 'Kelas 3A',
    total: 29,
    teacher: 'Wali kelas: Ibu Sinta',
    lastMeasuredAt: 'Pengukuran terakhir 10 Apr 2026',
    coverage: '29/29 siswa sudah diukur',
  },
  {
    id: 'class-3b',
    name: 'Kelas 3B',
    total: 31,
    teacher: 'Wali kelas: Pak Yoga',
    lastMeasuredAt: 'Pengukuran terakhir 4 Apr 2026',
    coverage: '23/31 siswa sudah diukur',
  },
];

export const TEACHER_NAME_OPTIONS = [
  'Ibu Rina',
  'Pak Dedi',
  'Ibu Maya',
  'Pak Arif',
  'Ibu Sinta',
  'Pak Yoga',
  'Ibu Lestari',
  'Pak Bimo',
];

export const TEACHER_LIST_ITEMS: TeacherListItem[] = [
  {
    id: 'teacher-rn',
    name: 'Ibu Rina Wardani',
    email: 'rina.wardani@mysimoka.id',
    password: 'Rina@123',
    code: 'RN',
    homeroom: 'Wali kelas 1A',
    handledClasses: 'Kelas 1A, 2A',
    totalStudents: 55,
  },
  {
    id: 'teacher-ds',
    name: 'Pak Dedi Santoso',
    email: 'dedi.santoso@mysimoka.id',
    password: 'Dedi@123',
    code: 'DS',
    homeroom: 'Wali kelas 1B',
    handledClasses: 'Kelas 1B',
    totalStudents: 30,
  },
  {
    id: 'teacher-mp',
    name: 'Ibu Maya Putri',
    email: 'maya.putri@mysimoka.id',
    password: 'Maya@123',
    code: 'MP',
    homeroom: 'Wali kelas 2A',
    handledClasses: 'Kelas 2A',
    totalStudents: 27,
  },
  {
    id: 'teacher-ah',
    name: 'Pak Arif Hidayat',
    email: 'arif.hidayat@mysimoka.id',
    password: 'Arif@123',
    code: 'AH',
    homeroom: 'Wali kelas 2B',
    handledClasses: 'Kelas 2B, 3B',
    totalStudents: 66,
  },
  {
    id: 'teacher-sl',
    name: 'Ibu Sinta Lestari',
    email: 'sinta.lestari@mysimoka.id',
    password: 'Sinta@123',
    code: 'SL',
    homeroom: 'Wali kelas 3A',
    handledClasses: 'Kelas 3A',
    totalStudents: 29,
  },
  {
    id: 'teacher-yp',
    name: 'Pak Yoga Pratama',
    email: 'yoga.pratama@mysimoka.id',
    password: 'Yoga@123',
    code: 'YP',
    homeroom: 'Wali kelas 3B',
    handledClasses: 'Kelas 3B',
    totalStudents: 31,
  },
];
