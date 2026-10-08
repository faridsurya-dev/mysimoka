# Aset grafis untuk Google Play

## Syarat

| Aset | Syarat Google Play | Status |
|---|---|---|
| Ikon aplikasi | 512 × 512 px, PNG 32-bit (dengan alfa), maks. 1 MB | TODO: ekspor dari file sumber ikon. Jangan upscale `ic_launcher` 192 px. |
| Feature graphic | 1024 × 500 px, JPG atau PNG 24-bit (tanpa alfa), maks. 15 MB | TODO |
| Tangkapan layar ponsel | Minimal 2, maksimal 8. JPG/PNG 24-bit, sisi pendek ≥ 320 px, sisi panjang ≤ 3840 px, rasio maks. 2:1. Disarankan 1080 × 1920 (9:16) atau tangkapan asli ponsel. | TODO |
| Tablet 7"/10" | Opsional. Hanya perlu jika ingin tampil sebagai aplikasi tablet. | Lewati |

Untuk rekomendasi di Play Store, Google menyarankan minimal 4 tangkapan layar dengan resolusi ≥ 1080 px.

## Cara mengambil

1. Pasang build release (dari uji internal) di ponsel Android dengan layar 1080 × 2400 atau 1080 × 1920.
2. Login dengan **akun demo yang berisi data siswa fiktif**. Jangan tampilkan nama, wajah, atau data anak sungguhan, termasuk nama sekolah sungguhan bila belum ada izin.
3. Ambil tangkapan dengan tombol ponsel, atau `adb exec-out screencap -p > layar-01.png`.
4. Boleh menambah bingkai ponsel dan judul singkat berbahasa Indonesia di atas gambar, asalkan tidak berisi klaim yang tidak bisa dibuktikan.

## Layar yang diambil (urutan disarankan)

| # | Layar | Isi yang ditampilkan | Judul (opsional) |
|---|---|---|---|
| 1 | Dashboard (`DashboardScreen`) | Ringkasan sekolah, analitik pengukuran, distribusi kategori BMI | Ringkasan pertumbuhan siswa di satu layar |
| 2 | Pengukuran siswa (`StudentMeasurementScreen`) | Sesi kelas, input tinggi dan berat | Catat tinggi dan berat per kelas |
| 3 | Profil siswa (`StudentProfileScreen`) | Pengukuran terakhir, grafik tren tinggi/berat | Pantau tren tiap siswa |
| 4 | Imunisasi (`StudentImmunizationScreen` / riwayat imunisasi) | Daftar catatan imunisasi | Catat imunisasi siswa |
| 5 | Perangkat (`DeviceManagerScreen`) | Daftar alat ukur Bluetooth, status "Opsional" | Alat ukur Bluetooth (opsional) |
| 6 | Daftar kelas / siswa (`ClassListScreen`, `StudentListScreen`) | Manajemen kelas dan siswa | Kelola kelas dan siswa |
| 7 | Registrasi wajah (`FaceRegistrationScreen`) | Tahap pasangkan wajah dengan siswa. Pakai wajah orang dewasa yang sudah memberi izin atau ilustrasi, bukan anak sungguhan. | Registrasi wajah (opsional) |
| 8 | Login (`LoginScreen`) | Halaman masuk | Masuk dengan akun sekolah |

Minimal unggah nomor 1–4.

## Feature graphic (1024 × 500)

- Latar navy/biru sesuai situs (`#17405C` → `#2D9CDB`), logo MySimoka, teks singkat "Pencatatan tinggi, berat, dan imunisasi siswa".
- Taruh elemen penting di tengah, karena tepi bisa terpotong di beberapa tampilan. Jangan menaruh tombol "Unduh" palsu atau badge Google Play di gambar.
- Bisa memakai `mysimoka-web/assets/login_page.png` sebagai mockup ponsel.
