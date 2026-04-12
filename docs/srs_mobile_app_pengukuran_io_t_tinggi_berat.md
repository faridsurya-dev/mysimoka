# Software Requirements Specification (SRS) – Production Ready

## 1. Pendahuluan
### 1.1 Tujuan
Dokumen ini mendefinisikan kebutuhan perangkat lunak (functional & non-functional) untuk **Mobile App Pengukuran Tinggi & Berat berbasis IoT** yang digunakan oleh guru sebagai operator lapangan. Dokumen ini juga mencakup alur detail, state, edge case, model data, dan kontrak API untuk implementasi produksi.

### 1.2 Ruang Lingkup
Mobile App berfungsi untuk:
- Pairing & komunikasi dengan perangkat IoT (BLE)
- Identifikasi siswa (FR / Manual / Batch)
- Eksekusi pengukuran
- Penyimpanan lokal (offline-first) & sinkronisasi ke server

**Di luar scope mobile:** analitik, dashboard, dan edukasi (ditangani web app).

### 1.3 Definisi
- FR: Face Recognition
- BLE: Bluetooth Low Energy
- Embedding: Vektor fitur wajah (mis. 128/256 dimensi)
- Session: Satu sesi pengukuran per kelas/hari
- Batch: Mode pengukuran berurutan tanpa identifikasi ulang

---

## 2. Arsitektur Sistem

### 2.0 Teknologi Stack (Mobile)
Mobile App menggunakan:
- **React Native (Bare / Expo CNG)** sebagai framework utama
- **react-native-ble-plx** untuk komunikasi BLE
- **react-native-vision-camera** untuk kamera (FR pipeline)
- **react-native-fast-tflite** untuk inference embedding (fase lanjutan)
- **SQLite / MMKV** untuk local storage (offline-first)

Catatan:
- Integrasi BLE dan kamera membutuhkan konfigurasi native (Android Studio / Xcode)
- FR tidak termasuk dalam MVP fase awal

## 2. Arsitektur Sistem
### 2.1 Komponen
- **Mobile App** (Flutter/Android Native)
- **Backend API** (REST)
- **Database** (PostgreSQL + pgvector)
- **IoT Device Tinggi** (BLE device khusus tinggi badan)
- **IoT Device Berat** (BLE device khusus berat badan)

### 2.2 Interaksi
- Mobile ↔ BLE Device Tinggi (lokal)
- Mobile ↔ BLE Device Berat (lokal)
- Mobile ↔ Backend (HTTPS)

### 2.3 Prinsip Integrasi Device
- Sistem harus mendukung **dua perangkat BLE terpisah** dalam satu sesi pengukuran.
- Setiap perangkat memiliki identitas, status koneksi, dan alur pembacaan masing-masing.
- Hasil akhir pengukuran siswa dianggap lengkap jika data tinggi dan berat berhasil diperoleh, baik secara berurutan maupun dengan jeda.
- Sistem harus tetap dapat menyimpan **partial measurement** bila salah satu perangkat gagal atau belum tersedia.

---

## 3. Peran Pengguna
- **Guru (Operator)**: menjalankan pengukuran

---

## 4. Kebutuhan Fungsional

### 4.1 Autentikasi & Konteks
- Login (token-based)
- Pilih sekolah
- Pilih kelas
- Buat/lanjutkan session

### 4.2 Manajemen Perangkat (BLE)
- Scan device tinggi
- Scan device berat
- Pair & connect device tinggi
- Pair & connect device berat
- Disconnect masing-masing device
- Status per device: connected / connecting / disconnected / error
- Health check per device (optional: battery level)
- Sistem menampilkan apakah sesi menggunakan:
  - hanya device tinggi
  - hanya device berat
  - kedua device

### 4.3 Mode Identifikasi
#### 4.3.1 Mode Batch (Primary)
- Generate queue siswa (default: nomor absen)
- Start batch
- Tampilkan siswa aktif
- Next otomatis setelah simpan
- Skip siswa
- Back 1 step (undo terakhir)

#### 4.3.2 Mode Manual
- List siswa
- Search (nama / nomor)
- Select siswa

#### 4.3.3 Mode FR (Optional Accelerator)
- Kamera aktif
- Face detection
- Generate embedding
- Kirim ke server
- Terima kandidat
- Konfirmasi user

### 4.4 Pengukuran
- Sistem dapat memicu pembacaan pada **device tinggi**
- Sistem dapat memicu pembacaan pada **device berat**
- Sistem dapat menjalankan pengukuran dalam urutan:
  - tinggi lalu berat
  - berat lalu tinggi
- Sistem menerima payload dari masing-masing device:
  - tinggi: height, device_id, timestamp
  - berat: weight, device_id, timestamp
- Sistem menggabungkan hasil tinggi dan berat ke dalam satu record measurement per siswa
- Sistem mendukung **partial measurement** jika hanya salah satu data berhasil diperoleh
- Sistem menampilkan status kelengkapan hasil:
  - lengkap
  - hanya tinggi
  - hanya berat
- Sistem memvalidasi range hasil (configurable)
- User dapat retry pengukuran per device

### 4.5 Penyimpanan
- Simpan lokal (SQLite)
- Queue untuk sync
- Background sync
- Retry otomatis

### 4.6 Riwayat
- List measurement
- Status: synced / pending / failed

---

## 5. Sequence Flow

### 5.1 Batch Mode (Primary Flow)
1. Login
2. Pilih kelas
3. Start session
4. Generate queue
5. Show siswa[0]
6. User tap “Ukur”
7. Trigger device tinggi
8. Trigger device berat
9. Device tinggi dan berat mengirim data secara terpisah
10. Sistem menampilkan hasil parsial atau lengkap
11. User tap “Simpan”
12. Save local
13. Increment index
14. Repeat

### 5.2 Manual Mode
1. Open list
2. Search/select siswa
3. Ukur
4. Simpan

### 5.3 FR Mode
1. Kamera aktif
2. Detect wajah
3. Generate embedding
4. POST /face/match
5. Receive candidate
6. Confirm
7. Ukur
8. Simpan

---

## 6. State Machine

### 6.1 Measurement State
- IDLE
- WAITING_HEIGHT_DEVICE
- WAITING_WEIGHT_DEVICE
- MEASURING_HEIGHT
- MEASURING_WEIGHT
- PARTIAL_RESULT_READY
- RESULT_READY
- SAVING
- SAVED
- ERROR

### 6.2 Sync State
- LOCAL_ONLY
- SYNCING
- SYNCED
- FAILED

### 6.3 Device State
Untuk masing-masing device:
- DISCONNECTED
- SCANNING
- CONNECTING
- CONNECTED
- BUSY
- ERROR

## 7. Edge Cases

### 7.1 Device Issues
- Device tinggi disconnect during measuring → show error + retry tinggi
- Device berat disconnect during measuring → show error + retry berat
- Hanya satu device terhubung → sistem tetap berjalan untuk partial measurement
- No data from salah satu device → timeout (5s configurable)
- Data datang ganda dari device → gunakan pembacaan terakhir yang dikonfirmasi user

### 7.2 FR Issues
- No face detected → fallback manual
- Multiple faces → prompt retry
- Low confidence → force confirm

### 7.3 Data Issues
- Duplicate measurement → warn user
- Out-of-range value → confirm override

### 7.4 Network Issues
- Offline → store local
- Sync fail → retry exponential backoff

---

## 8. Data Model

### 8.1 Student
```
{
  id: UUID,
  name: string,
  class_id: UUID,
  face_embedding: vector
}
```

### 8.2 Measurement
```
{
  id: UUID,
  student_id: UUID,
  height: float | null,
  weight: float | null,
  height_device_id: string | null,
  weight_device_id: string | null,
  measured_at: datetime,
  completeness_status: enum, // complete | height_only | weight_only
  sync_status: enum
}
```

### 8.3 Session
```
{
  id: UUID,
  class_id: UUID,
  date: date
}
```

---

## 9. API Contract

### 9.1 Face Match
POST /face/match
```
{
  embedding: number[],
  school_id: UUID
}
```
Response:
```
{
  candidates: [
    { student_id, score }
  ]
}
```

### 9.2 Submit Measurement
POST /measurement
```
{
  student_id,
  height,
  weight,
  height_device_id,
  weight_device_id,
  measured_at,
  completeness_status
}
```

### 9.3 Sync Batch
POST /measurement/bulk
```
{
  measurements: []
}
```

---

## 10. Non-Fungsional

### 10.1 Performance
- FR < 3 detik
- Measurement cycle < 8 detik

### 10.2 Reliability
- Offline-first
- Data loss = 0 tolerance

### 10.3 Security
- HTTPS
- Token auth
- Embedding encrypted at rest

### 10.4 Usability
- Max 3 tap per siswa
- One-hand operation

---

## 11. MVP Scope

### Included
- React Native mobile app
- Batch mode (primary)
- Manual mode
- BLE integration untuk dua device terpisah
- Partial measurement handling
- Local storage + sync

### Deferred
- Face Recognition (fase 2)
- VisionCamera integration
- TFLite embedding
- Advanced device diagnostics

## 12. Roadmap

### Phase 1
- Core measurement (Batch + Manual)

### Phase 2
- FR integration

### Phase 3
- Optimization + analytics integration

---

## 13. Catatan Implementasi
- Gunakan React Native bare workflow untuk fleksibilitas native
- Pisahkan modul BLE, Measurement, dan Sync
- Hindari blocking UI thread
- Gunakan queue untuk semua network call
- Gunakan background sync service
- FR pipeline harus diisolasi sebagai modul terpisah

## 14. Risiko Teknis
- BLE multi-device handling complexity
- Native module dependency (VisionCamera, TFLite)
- Device compatibility (Android fragmentation)
- Sinkronisasi offline conflict

## 15. Kesimpulan
Sistem dirancang untuk operasional cepat berbasis React Native, dengan Batch sebagai mode utama dan FR sebagai akselerator opsional pada fase lanjutan.
- Prioritaskan Batch flow
- Hindari blocking UI
- Gunakan queue untuk semua network call

---

## 14. Kesimpulan
Sistem dirancang untuk **operasional cepat, tahan gangguan, dan scalable**, dengan Batch sebagai mode utama dan FR sebagai akselerator opsional.

