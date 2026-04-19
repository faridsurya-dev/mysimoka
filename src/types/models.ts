export type SyncStatus = 'synced' | 'pending';

export type SessionUiStatus = 'Aktif' | 'Belum Sync' | 'Selesai';

export interface SessionListItem {
  id: string;
  name: string;
  meta: string;
  status: SessionUiStatus;
}

export type CreateSessionClassOption = string;

export interface SessionStudentAssignment {
  studentId: string;
  queueOrder: number;
  isSkipped?: boolean;
  processedAt?: string;
}

export interface CreateSessionPayload {
  sessionName: string;
  className: string;
  note: string;
  sessionDate: string;
  immunizationType?: string;
  immunizationDose?: string;
  immunizationOfficer?: string;
  assignedStudents?: SessionStudentAssignment[];
}

export interface StudentMeasurementItem {
  id: string;
  name: string;
  measurement: string;
  timestamp: string;
  checked: boolean;
  syncStatus: SyncStatus;
  photoUri: string | null;
  heightCm?: string;
  weightKg?: string;
}

export type MeasurementCaptureMethod =
  | 'manual'
  | 'batch'
  | 'face-identification'
  | 'height-pose';

export interface MeasurementRecord {
  id: string;
  sessionId: string;
  studentId: string;
  measuredAt: string;
  heightCm: number | null;
  weightKg: number | null;
  syncStatus: SyncStatus;
}

export interface MeasurementLocalSave {
  record: MeasurementRecord;
  // Method hanya metadata proses pencatatan, bukan pembeda struktur data measurement.
  captureMethod: MeasurementCaptureMethod;
  savedLocallyAt: string;
}

export interface SessionSyncBundle {
  sessionId: string;
  measurements: MeasurementRecord[];
}

export interface BatchActiveStudentPreview {
  name: string;
  photoUri: string | null;
}

export interface StudentSearchResultItem {
  id: string;
  name: string;
  nisn: string;
  className: string;
}

export interface ClassListItem {
  id: string;
  name: string;
  total: number;
  teacher: string;
  lastMeasuredAt: string;
  coverage: string;
}

export interface TeacherListItem {
  id: string;
  name: string;
  email: string;
  password: string;
  code: string;
  homeroom: string;
  handledClasses: string;
  totalStudents: number;
}

export interface DemographyCardItem {
  label: string;
  value: string;
  note?: string;
}

export interface AverageMetricItem {
  label: string;
  value: string;
  unit: string;
}

export interface CategoryBarItem {
  value: number;
  label: string;
  frontColor: string;
}

export interface TrendPoint {
  value: number;
  label: string;
}

export interface QuickMenuItem {
  label: string;
  badge: string;
}
