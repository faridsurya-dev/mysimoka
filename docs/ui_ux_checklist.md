# Checklist Task UI/UX Development

Dokumen ini dipakai untuk memantau progres pengembangan UI/UX mobile app pengukuran tinggi dan berat berbasis IoT.

Referensi utama:
- [SRS Mobile App Pengukuran IoT Tinggi Berat](./srs_mobile_app_pengukuran_io_t_tinggi_berat.md)

## Cara Pakai
- Gunakan `[ ]` untuk task yang belum dikerjakan
- Ubah menjadi `[x]` saat task selesai
- Tambahkan catatan singkat jika ada keputusan penting atau perubahan scope

---

## Phase 0 - Discovery dan Alignment
- [x] Review ulang SRS dan tandai kebutuhan yang masuk MVP UI
- [x] Finalisasi prioritas flow utama: Batch, Manual, Device, Riwayat
- [x] Tetapkan asumsi fase 1: FR tidak masuk implementasi UI awal
- [ ] Buat daftar edge case yang wajib terlihat di UI
- [x] Definisikan target usability: max 3 tap per siswa, one-hand operation

## Phase 1 - Information Architecture
- [x] Susun screen map / sitemap aplikasi
- [x] Tentukan arsitektur navigasi utama
- [x] Definisikan entry flow dari login sampai session aktif
- [x] Definisikan hubungan antar layar Batch, Manual, Device Manager, dan Riwayat
- [x] Tentukan pola navigasi kembali tanpa membingungkan operator

## Phase 2 - Design System Foundation
- [x] Tentukan color palette utama
- [x] Tentukan semantic colors untuk status `connected`, `connecting`, `disconnected`, `error`
- [x] Tentukan semantic colors untuk status `synced`, `pending`, `failed`, `offline`
- [x] Tentukan typography scale
- [x] Tentukan spacing scale
- [x] Tentukan border radius, shadow, dan elevation
- [x] Definisikan style button primer, sekunder, danger, dan disabled
- [x] Definisikan style input, search bar, badge, card, modal, banner
- [x] Definisikan aturan layout untuk one-hand operation
- [x] Dokumentasikan token UI agar siap dipakai di React Native

## Phase 3 - UX Flow dan State Mapping
- [x] Buat flow detail Login
- [ ] Buat flow Pilih Sekolah
- [ ] Buat flow Pilih Kelas
- [ ] Buat flow Buat / Lanjutkan Session
- [ ] Buat flow Pairing device tinggi
- [ ] Buat flow Pairing device berat
- [ ] Buat flow Batch measurement happy path
- [ ] Buat flow Batch measurement partial result
- [ ] Buat flow Manual measurement
- [ ] Buat flow Penyimpanan lokal dan pending sync
- [ ] Buat flow Retry untuk device gagal
- [ ] Buat flow Timeout pembacaan device
- [ ] Buat flow Duplicate measurement warning
- [ ] Buat flow Out-of-range confirmation
- [ ] Buat flow Offline mode

## Phase 4 - Wireframe Layar Inti
- [ ] Wireframe Login
- [ ] Wireframe Pilih Sekolah
- [ ] Wireframe Pilih Kelas
- [ ] Wireframe Session Setup
- [ ] Wireframe Device Manager
- [ ] Wireframe Batch Measurement
- [ ] Wireframe Manual Measurement
- [ ] Wireframe Student Search / Select
- [ ] Wireframe Measurement Result
- [ ] Wireframe Riwayat Measurement
- [ ] Wireframe Sync Status / Queue

## Phase 5 - High-Fidelity UI
- [ ] Finalisasi visual Login
- [ ] Finalisasi visual Pilih Sekolah dan Kelas
- [ ] Finalisasi visual Session Setup
- [ ] Finalisasi visual Device Manager
- [ ] Finalisasi visual Batch Measurement
- [ ] Finalisasi visual Manual Measurement
- [ ] Finalisasi visual Riwayat
- [ ] Finalisasi visual empty states
- [ ] Finalisasi visual loading states
- [ ] Finalisasi visual offline states
- [ ] Finalisasi visual error states
- [ ] Finalisasi visual modal dan confirmation states

## Phase 6 - Component Planning
- [ ] Definisikan `AppHeader`
- [ ] Definisikan `PrimaryActionBar`
- [ ] Definisikan `DeviceStatusCard`
- [ ] Definisikan `MeasurementResultCard`
- [ ] Definisikan `StudentQueueCard`
- [ ] Definisikan `StudentListItem`
- [ ] Definisikan `SyncStatusBadge`
- [ ] Definisikan `OfflineBanner`
- [ ] Definisikan `EmptyState`
- [ ] Definisikan `ErrorState`
- [ ] Definisikan `ConfirmModal`
- [ ] Definisikan `RetryActionSheet` atau alternatifnya

## Phase 7 - React Native UI Setup
- [ ] Tentukan struktur folder untuk `screens`, `components`, `theme`, `navigation`
- [ ] Setup theme constants
- [ ] Setup typography constants
- [ ] Setup spacing constants
- [ ] Setup reusable screen container
- [ ] Setup navigation skeleton
- [ ] Setup dummy data / mock state untuk pengembangan UI

## Phase 8 - Implementasi Layar Prioritas
- [ ] Implement Login screen
- [ ] Implement School selection screen
- [ ] Implement Class selection screen
- [ ] Implement Session setup screen
- [ ] Implement Device Manager screen
- [ ] Implement Batch Measurement screen
- [ ] Implement Manual Measurement screen
- [ ] Implement Student Search / Select screen
- [ ] Implement History / Riwayat screen
- [ ] Implement Sync Queue screen atau section terkait

## Phase 9 - State dan Feedback UI
- [ ] Tampilkan status koneksi per device secara real-time
- [ ] Tampilkan status measurement: idle, measuring, partial, complete, error
- [ ] Tampilkan status sync: local, syncing, synced, failed
- [ ] Tampilkan banner offline saat tidak ada jaringan
- [ ] Tampilkan timeout feedback saat device tidak merespons
- [ ] Tampilkan error feedback saat device disconnect
- [ ] Tampilkan warning untuk duplicate measurement
- [ ] Tampilkan konfirmasi override untuk nilai out-of-range
- [ ] Pastikan partial measurement tetap bisa disimpan dengan jelas

## Phase 10 - Usability dan QA UI
- [ ] Review konsistensi komponen antar layar
- [ ] Review keterbacaan teks di ukuran layar kecil
- [ ] Review area tap agar nyaman dipakai satu tangan
- [ ] Review kecepatan flow Batch sesuai target operasional
- [ ] Review visibilitas status device dan sync
- [ ] Review edge case utama bersama flow normal
- [ ] Lakukan polish copywriting tombol, label, dan pesan error
- [ ] Catat gap sebelum masuk integrasi BLE dan data layer

## Backlog / Nice to Have
- [ ] Placeholder UI untuk FR mode fase 2
- [ ] Device diagnostics detail
- [ ] Animasi transisi ringan untuk feedback pengukuran
- [ ] Optimasi aksesibilitas dasar
- [ ] Empty state edukatif untuk koneksi device

## Catatan
- Fokus MVP UI ada pada `Batch Mode`, `Manual Mode`, `BLE dual-device`, `partial measurement`, dan `offline/sync`.
- Face Recognition tetap diposisikan sebagai fase lanjutan, kecuali ada perubahan prioritas.
- Hasil Phase 1 terdokumentasi di `docs/ui_ux_information_architecture.md`.
- Hasil Phase 2 terdokumentasi di `docs/ui_ux_design_system_foundation.md`.
- Hasil Phase 3.1 login terdokumentasi di `docs/ui_ux_flow_login_screen.md`.
