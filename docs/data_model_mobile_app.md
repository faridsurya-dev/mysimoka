# Data Model Mobile App MySimoka

Dokumen ini mendefinisikan model data utama untuk aplikasi mobile MySimoka (auth, sekolah, siswa, pengukuran IoT, dan sinkronisasi offline).

## 1. Scope dan Prinsip

- Model mendukung flow registrasi sekolah:
  - Nama Sekolah
  - NPSN
  - Nama Penanggungjawab
  - Email
  - Password
  - Konfirmasi Password (validasi UI, tidak disimpan)
- Model mendukung dual-device measurement:
  - Device tinggi
  - Device berat
- Model mendukung offline-first:
  - Data operasional disimpan lokal
  - Sinkronisasi ke server lewat outbox queue

## 2. Entitas Utama

### 2.1 `users`

Menyimpan akun operator/guru.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID user |
| full_name | VARCHAR(120) | NOT NULL | Nama penanggungjawab/operator |
| email | VARCHAR(190) | NOT NULL, UNIQUE | Email login |
| password_hash | VARCHAR(255) | NOT NULL | Hash password |
| role | ENUM(`operator`,`teacher`,`admin_school`) | NOT NULL | Peran user |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Status aktif akun |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

### 2.2 `schools`

Menyimpan master sekolah.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID sekolah |
| name | VARCHAR(160) | NOT NULL | Nama sekolah |
| npsn | VARCHAR(20) | NOT NULL, UNIQUE | NPSN nasional |
| address | TEXT | NULL | Alamat |
| phone | VARCHAR(32) | NULL | Telepon |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

### 2.3 `school_memberships`

Relasi user dengan sekolah (mendukung 1 user ke banyak sekolah).

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID membership |
| user_id | UUID | FK -> users.id | User |
| school_id | UUID | FK -> schools.id | Sekolah |
| role_in_school | ENUM(`operator`,`teacher`,`admin_school`) | NOT NULL | Role per sekolah |
| is_default | BOOLEAN | NOT NULL DEFAULT FALSE | Sekolah default saat login |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |

Unique key: (`user_id`, `school_id`)

### 2.4 `classrooms`

Menyimpan kelas dalam sekolah.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID kelas |
| school_id | UUID | FK -> schools.id | Sekolah pemilik |
| name | VARCHAR(60) | NOT NULL | Nama kelas (contoh: 1A) |
| grade_level | SMALLINT | NULL | Tingkat kelas |
| academic_year | VARCHAR(20) | NULL | Tahun ajaran |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

Unique key: (`school_id`, `name`, `academic_year`)

### 2.5 `students`

Master siswa.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID siswa |
| school_id | UUID | FK -> schools.id | Sekolah |
| classroom_id | UUID | FK -> classrooms.id | Kelas aktif |
| nisn | VARCHAR(30) | NULL | NISN |
| student_number | VARCHAR(30) | NULL | Nomor induk internal |
| full_name | VARCHAR(160) | NOT NULL | Nama siswa |
| gender | ENUM(`male`,`female`) | NULL | Jenis kelamin |
| birth_date | DATE | NULL | Tanggal lahir |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Status aktif |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

Index rekomendasi: (`school_id`, `classroom_id`), (`school_id`, `full_name`)

### 2.6 `devices`

Master perangkat IoT (tinggi/berat).

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID perangkat |
| school_id | UUID | FK -> schools.id | Sekolah pemilik |
| device_code | VARCHAR(80) | NOT NULL, UNIQUE | Kode/device serial |
| device_name | VARCHAR(120) | NOT NULL | Nama perangkat |
| device_type | ENUM(`height`,`weight`) | NOT NULL | Jenis alat |
| ble_identifier | VARCHAR(190) | NULL | BLE id/mac/uuid |
| firmware_version | VARCHAR(60) | NULL | Firmware |
| last_seen_at | TIMESTAMP | NULL | Terakhir online |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Status aktif |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

### 2.7 `measurement_sessions`

Satu sesi pengukuran untuk satu kelas dan tanggal tertentu.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID sesi |
| school_id | UUID | FK -> schools.id | Sekolah |
| classroom_id | UUID | FK -> classrooms.id | Kelas |
| session_date | DATE | NOT NULL | Tanggal sesi |
| mode | ENUM(`batch`,`manual`,`mixed`) | NOT NULL | Mode utama sesi |
| status | ENUM(`draft`,`active`,`paused`,`completed`,`archived`) | NOT NULL | Status sesi |
| started_by_user_id | UUID | FK -> users.id | Pembuat sesi |
| started_at | TIMESTAMP | NULL | Mulai sesi |
| ended_at | TIMESTAMP | NULL | Selesai sesi |
| notes | TEXT | NULL | Catatan sesi |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

Index rekomendasi: (`school_id`, `session_date`), (`classroom_id`, `session_date`)

### 2.8 `session_students`

Antrian siswa di sebuah sesi (untuk mode batch/manual tracking).

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID item antrian |
| session_id | UUID | FK -> measurement_sessions.id | Sesi |
| student_id | UUID | FK -> students.id | Siswa |
| queue_order | INT | NOT NULL | Urutan |
| is_skipped | BOOLEAN | NOT NULL DEFAULT FALSE | Siswa dilewati |
| processed_at | TIMESTAMP | NULL | Waktu diproses |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |

Unique key: (`session_id`, `student_id`), (`session_id`, `queue_order`)

### 2.9 `measurements`

Record final hasil pengukuran siswa per sesi.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID hasil ukur |
| session_id | UUID | FK -> measurement_sessions.id | Sesi |
| student_id | UUID | FK -> students.id | Siswa |
| measured_at | TIMESTAMP | NOT NULL | Waktu pengukuran |
| identification_method | ENUM(`batch`,`manual`,`face_recognition`) | NOT NULL | Cara identifikasi |
| height_cm | DECIMAL(5,2) | NULL | Tinggi (cm) |
| weight_kg | DECIMAL(5,2) | NULL | Berat (kg) |
| bmi | DECIMAL(5,2) | NULL | BMI terhitung |
| completeness_status | ENUM(`complete`,`height_only`,`weight_only`) | NOT NULL | Kelengkapan data |
| source | ENUM(`mobile`) | NOT NULL DEFAULT `mobile` | Sumber input |
| sync_status | ENUM(`local_only`,`syncing`,`synced`,`failed`) | NOT NULL DEFAULT `local_only` | Status sinkronisasi |
| synced_at | TIMESTAMP | NULL | Waktu sinkron sukses |
| created_by_user_id | UUID | FK -> users.id | Operator pengukur |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

Index rekomendasi: (`session_id`, `student_id`), (`sync_status`)

### 2.10 `measurement_device_readings`

Raw reading dari perangkat, bisa lebih dari satu sebelum dikonfirmasi final.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID reading |
| measurement_id | UUID | FK -> measurements.id | Hasil ukur terkait |
| device_id | UUID | FK -> devices.id | Device pengirim |
| device_type | ENUM(`height`,`weight`) | NOT NULL | Jenis device |
| value | DECIMAL(7,3) | NOT NULL | Nilai mentah |
| unit | ENUM(`cm`,`kg`) | NOT NULL | Satuan |
| reading_time | TIMESTAMP | NOT NULL | Timestamp reading device |
| is_selected | BOOLEAN | NOT NULL DEFAULT TRUE | Reading terpilih |
| raw_payload | JSONB | NULL | Payload mentah BLE |
| created_at | TIMESTAMP | NOT NULL | Waktu simpan |

### 2.11 `face_embeddings` (opsional FR)

Template embedding wajah per siswa.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID embedding |
| student_id | UUID | FK -> students.id | Siswa |
| embedding_vector | VECTOR / JSONB | NOT NULL | Vektor embedding |
| model_name | VARCHAR(80) | NOT NULL | Model FR |
| quality_score | DECIMAL(5,2) | NULL | Kualitas template |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |

### 2.12 `sync_outbox`

Queue lokal untuk sinkronisasi offline-first.

| Field | Type | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | ID outbox |
| aggregate_type | ENUM(`measurement`,`session`,`student`) | NOT NULL | Tipe data |
| aggregate_id | UUID | NOT NULL | ID data utama |
| operation | ENUM(`create`,`update`,`delete`) | NOT NULL | Aksi sinkronisasi |
| payload | JSONB | NOT NULL | Payload API |
| retry_count | INT | NOT NULL DEFAULT 0 | Jumlah retry |
| next_retry_at | TIMESTAMP | NULL | Jadwal retry |
| last_error | TEXT | NULL | Pesan error terakhir |
| status | ENUM(`pending`,`processing`,`done`,`failed`) | NOT NULL DEFAULT `pending` | Status item |
| created_at | TIMESTAMP | NOT NULL | Waktu enqueue |
| updated_at | TIMESTAMP | NOT NULL | Waktu update |

Index rekomendasi: (`status`, `next_retry_at`)

## 3. Relasi Antar Entitas

```text
users ---< school_memberships >--- schools
schools ---< classrooms ---< students
schools ---< devices
classrooms ---< measurement_sessions ---< session_students >--- students
measurement_sessions ---< measurements >--- students
measurements ---< measurement_device_readings >--- devices
students ---< face_embeddings
measurements ---< sync_outbox (by aggregate_id, aggregate_type)
```

## 4. Payload Registrasi (API Contract Awal)

Request:

```json
{
  "school_name": "SDN Sukamaju 01",
  "npsn": "12345678",
  "person_in_charge_name": "Aisyah Nur",
  "email": "operator@sdnsukamaju.sch.id",
  "password": "********",
  "confirm_password": "********"
}
```

Catatan:
- `confirm_password` dipakai untuk validasi client/server, tidak disimpan sebagai kolom.
- Saat registrasi sukses, sistem membuat:
  1. `schools`
  2. `users`
  3. `school_memberships` (user sebagai default operator sekolah tersebut)

## 5. Aturan Integritas Data

- `npsn` wajib unik per sekolah.
- Satu `measurement` harus punya minimal salah satu nilai: `height_cm` atau `weight_kg`.
- `completeness_status` harus konsisten dengan isi `height_cm` dan `weight_kg`.
- Untuk mode batch, `session_students.queue_order` wajib unik per sesi.
- Data dengan `sync_status = failed` harus memiliki jejak error pada `sync_outbox.last_error`.

## 6. Rekomendasi Penyimpanan Mobile

- Local DB (SQLite) tabel minimal:
  - `measurement_sessions`
  - `session_students`
  - `measurements`
  - `measurement_device_readings`
  - `devices`
  - `sync_outbox`
- Cache reference:
  - `schools`, `classrooms`, `students`, `users` (read-heavy)

