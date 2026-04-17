# Frontend Canonical Model (Screen-First)

## Status
- Source of truth dokumen ini adalah behavior dan state pada screen yang sudah ada di aplikasi mobile.
- Dokumen SRS, ERD backend, dan API contract diperlakukan sebagai target alignment berikutnya.

## Prinsip
- Model di bawah ini hanya memuat field yang benar-benar dipakai UI saat ini.
- Jika ada perbedaan dengan backend model, frontend model tetap dipertahankan dulu sampai adapter tersedia.
- Semua mock data UI dipusatkan di `src/features/*/mocks.ts`.

## Flow Pengukuran (Disepakati)
1. Buat session, termasuk assign siswa ke session pengukuran.
2. Lakukan pengukuran; metode pengukuran hanya cara pencatatan, struktur data hasil tetap sama.
3. Simpan default ke lokal terlebih dahulu.
4. Sinkronisasi mengirim data session pengukuran (beserta measurement di dalamnya) ke server.

## Canonical Types

### Session (list view)
```ts
type SessionUiStatus = 'Aktif' | 'Belum Sync' | 'Selesai';

interface SessionListItem {
  id: string;
  name: string;
  meta: string;
  status: SessionUiStatus;
}
```

### Session (create payload)
```ts
interface SessionStudentAssignment {
  studentId: string;
  queueOrder: number;
  isSkipped?: boolean;
  processedAt?: string;
}

interface CreateSessionPayload {
  sessionName: string;
  className: string;
  note: string;
  sessionDate: string; // ISO string
  assignedStudents?: SessionStudentAssignment[];
}
```

### Measurement Student (manual mode)
```ts
type SyncStatus = 'synced' | 'pending';

interface StudentMeasurementItem {
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
```

### Measurement Record (canonical)
```ts
type MeasurementCaptureMethod = 'manual' | 'batch' | 'face-identification' | 'height-pose';

interface MeasurementRecord {
  id: string;
  sessionId: string;
  studentId: string;
  measuredAt: string;
  heightCm: number | null;
  weightKg: number | null;
  syncStatus: 'synced' | 'pending';
}

interface MeasurementLocalSave {
  record: MeasurementRecord;
  captureMethod: MeasurementCaptureMethod; // metadata proses saja
  savedLocallyAt: string;
}

interface SessionSyncBundle {
  sessionId: string;
  measurements: MeasurementRecord[];
}
```

### Student Search (dashboard)
```ts
interface StudentSearchResultItem {
  id: string;
  name: string;
  nisn: string;
  className: string;
}
```

### Class List
```ts
interface ClassListItem {
  id: string;
  name: string;
  total: number;
  teacher: string;
  lastMeasuredAt: string;
  coverage: string;
}
```

### Teacher List
```ts
interface TeacherListItem {
  id: string;
  name: string;
  code: string;
  homeroom: string;
  handledClasses: string;
  totalStudents: number;
}
```

### Dashboard Analytics Cards
```ts
interface DemographyCardItem {
  label: string;
  value: string;
  note?: string;
}

interface AverageMetricItem {
  label: string;
  value: string;
  unit: string;
}

interface CategoryBarItem {
  value: number;
  label: string;
  frontColor: string;
}

interface TrendPoint {
  value: number;
  label: string;
}
```

## Lokasi Implementasi
- Type canonical: `src/types/models.ts`
- Export type: `src/types/index.ts`
- Mock session: `src/features/session/mocks.ts`
- Mock measurement: `src/features/measurement/mocks.ts`
- Mock dashboard/master data: `src/features/dashboard/mocks.ts`

## Gap Yang Disengaja
- Belum ada adapter API (`api -> canonical model` dan `canonical model -> api payload`).
- Belum ada persistensi offline (SQLite/MMKV) untuk model canonical.
- Belum ada global store untuk state canonical lintas screen.
- Assignment siswa ke session baru terdefinisi di model, belum terhubung penuh ke UI create session.

## Langkah Lanjut
1. Tambahkan adapter layer untuk endpoint pertama (`measurement-sessions` dan `measurements/sync`).
2. Ganti source mock di screen menjadi repository/service berbasis canonical type.
3. Jalankan alignment bertahap ke dokumen backend setelah adapter stabil.
