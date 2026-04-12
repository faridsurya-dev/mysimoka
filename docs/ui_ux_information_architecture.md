# UI/UX Information Architecture

Dokumen ini adalah versi final information architecture hasil riset untuk mobile app pengukuran IoT tinggi dan berat. Dokumen ini menggantikan versi IA sebelumnya yang masih berfokus pada scope MVP awal.

Referensi:
- [SRS Mobile App Pengukuran IoT Tinggi Berat](./srs_mobile_app_pengukuran_io_t_tinggi_berat.md)
- [Checklist Task UI/UX Development](./ui_ux_checklist.md)

## 1. High-Level IA

```text
App Root
├── Auth Stack
│   ├── Login
│   ├── Register
│   └── Forgot Password
└── Main App
    ├── Top Context Bar
    │   └── School Switcher
    ├── Bottom Navigation
    │   ├── Dashboard
    │   │   └── Class List
    │   │       └── Class Detail
    │   │           └── Student List
    │   │               └── Student Profile (Growth)
    │   ├── Pengukuran
    │   │   ├── Session List
    │   │   │   └── Session Detail
    │   │   │       ├── Batch Measurement
    │   │   │       └── Manual Measurement
    │   │   └── Create New Session (Entry Point)
    │   └── Profil
    │       ├── Profile Overview
    │       ├── Edit Profile
    │       ├── Account & Access
    │       └── Logout
    └── Global Access
        ├── Device Manager
        └── Sync / History (attached to session)
```

## 2. Struktur Menu Utama

### A. Dashboard

Fungsi:
- Monitoring kondisi siswa berbasis kelas

Konten utama:
- Ringkasan global di bagian atas:
  - rata-rata tinggi badan
  - rata-rata berat badan
  - rata-rata BMI
  - distribusi kategori: kurus, normal, overweight, obesitas
- `Class List` sebagai entry utama analisis:
  - daftar kelas
  - jumlah siswa
  - status kelengkapan data

Catatan penting:
- Ringkasan global harus langsung terlihat tanpa scroll
- Gunakan visual sederhana agar cepat dipahami dalam 3 detik

Drill-down:
- `Class Detail`:
  - ringkasan kelas di bagian atas
  - rata-rata tinggi
  - rata-rata berat
  - rata-rata BMI
  - distribusi kategori
  - CTA `Mulai Pengukuran Kelas Ini`
  - daftar siswa
- `Student Profile`:
  - riwayat tinggi dan berat
  - grafik pertumbuhan untuk fase berikutnya

Catatan UX:
- Dashboard bersifat read-only
- Hierarki utama: global -> kelas -> siswa
- Fokus pada insight yang glanceable

### B. Pengukuran

Fungsi:
- Area operasional utama

Konten utama:
- Daftar session
- Status session: aktif, selesai, belum sync
- Jumlah siswa
- Progress
- CTA `Buat Sesi Baru`

### C. Profil

Fungsi:
- Mengelola informasi pengguna dan akses sistem

Konten utama:
- Informasi personal:
  - nama
  - peran: guru atau operator
  - sekolah terhubung
- Edit profil
- Pengaturan akun:
  - ubah password
  - logout

Catatan UX:
- Area non-operasional dengan frekuensi akses rendah
- Harus mudah ditemukan, tetapi tidak mengganggu flow utama

## 3. Struktur Session

```text
Session Detail
├── Info Session
│   ├── Sekolah
│   ├── Kelas
│   ├── Tanggal
│   └── Progress
├── Batch Measurement (Primary)
├── Manual Measurement (Fallback)
└── Sync Status
```

## 4. Flow Utama

```text
Login / Register
-> Dashboard (default landing)
-> Pengukuran
-> Pilih / Buat Session
-> Session Detail
-> Batch Measurement
-> Loop:
   - Ukur
   - Simpan
   - Next Student
```

Tambahan flow auth:

```text
Login
├── Lupa Password -> Reset Password Flow
└── Belum punya akun -> Register
```

## 5. Flow Alternatif

### Manual Mode

```text
Session Detail
-> Manual Measurement
-> Student Search
-> Ukur & Simpan
```

### Device Handling

```text
Any Screen
-> Device Manager
-> Back
```

### Sync Monitoring

```text
Session Detail
-> Lihat Status Sync
```

## 6. Navigation Structure

```text
RootNavigator
├── AuthStack
│   ├── Login
│   ├── Register
│   └── ForgotPassword
└── MainTabs
    ├── DashboardStack
    │   └── Dashboard
    ├── MeasurementStack
    │   ├── SessionList
    │   ├── SessionDetail
    │   ├── Batch
    │   ├── Manual
    │   ├── StudentSearch
    │   └── DeviceManager
    └── ProfileStack
        ├── ProfileOverview
        ├── EditProfile
        └── AccountSettings
```

Struktur minimal yang juga masih valid untuk fase implementasi awal:

```text
RootNavigator
├── AuthStack
│   └── Login
└── MainTabs
    ├── DashboardStack
    │   └── Dashboard
    └── MeasurementStack
        ├── SessionList
        ├── SessionDetail
        ├── Batch
        ├── Manual
        ├── StudentSearch
        └── DeviceManager
```

## 7. Context Persistence Layer

```text
Global Context
- Sekolah aktif (switchable)

View Context (Dashboard)
- Kelas terpilih sebagai konteks navigasi, bukan global state

Session Context
- Session aktif
- Progress
- Device status
- Pending sync
```

## 8. Interaction Priority Map

```text
HIGH
- Batch Measurement

MEDIUM
- Session List
- Manual Measurement

LOW
- Dashboard
```

## 9. UX Insight

- Dashboard menampilkan global awareness lebih dulu sehingga user cepat memahami kondisi umum
- `Class Detail` memiliki mini-dashboard sendiri agar pola global -> kelas tetap konsisten
- CTA `Mulai Pengukuran` pada `Class Detail` menjadi jembatan insight ke aksi
- Kelas menjadi unit analisis utama karena sesuai mental model guru
- Class switcher global dihilangkan untuk menghindari ambiguity state
- Dashboard berbasis hierarki global -> kelas -> siswa mendukung eksplorasi dan pemahaman
- Sekolah tetap global untuk mendukung multi-sekolah
- Session tetap menjadi unit operasional dan tidak bercampur dengan analisis
- Profil dipisahkan sebagai area low-frequency agar tidak mengganggu task utama
- Batch tetap menjadi core flow

## 10. Next Step

- Wireframe `Dashboard` yang glanceable
- Wireframe `Session List`
- Wireframe `Session Detail`
- Wireframe `Batch Measurement` sebagai layar paling kritikal
