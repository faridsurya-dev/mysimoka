# Store listing — MySimoka (Bahasa Indonesia)

Bahasa default listing: **Indonesia (id-ID)**. Semua fitur di bawah ada di kode versi 1.2. Pencocokan wajah otomatis saat pengukuran **tidak** disebut sebagai fitur jadi, karena di aplikasi masih berlabel uji coba ("Pencocokan wajah otomatis masih tahap uji coba dan belum menyimpan data", `FaceCropPreviewScreen.tsx`).

## Nama aplikasi (maks. 30 karakter)

```
MySimoka SmartGrowth
```

20 karakter. Alternatif yang lebih deskriptif: `MySimoka: Tinggi & Berat Siswa` (30 karakter).

## Deskripsi singkat (maks. 80 karakter)

```
Catat tinggi, berat, dan imunisasi siswa SD. Untuk guru dan admin sekolah.
```

74 karakter.

## Deskripsi lengkap (maks. 4000 karakter)

```
MySimoka SmartGrowth adalah aplikasi untuk guru dan admin sekolah dasar yang mencatat pertumbuhan siswa: tinggi badan, berat badan, dan riwayat imunisasi. Aplikasi ini dipakai oleh staf sekolah, bukan oleh siswa.

Akun dan sekolah
• Daftar dan masuk dengan email dan password.
• Bergabung ke sekolah dengan kode gabung dari admin sekolah, atau pilih sekolah lain bila Anda terdaftar di lebih dari satu sekolah.
• Admin sekolah dapat mengelola profil sekolah, tahun akademik, kelas, data siswa, dan akun guru.

Data siswa
• Simpan biodata siswa: nama, NISN, kelas, jenis kelamin, tanggal lahir, serta data orang tua/wali bila diperlukan.
• Lihat profil siswa beserta pengukuran terakhir, grafik tren tinggi dan berat badan, riwayat pengukuran, dan riwayat imunisasi.

Pengukuran
• Buat sesi pengukuran per kelas, lalu catat tinggi dan berat setiap siswa.
• Isi data secara manual, tanpa alat tambahan.
• Alat ukur Bluetooth bersifat opsional. Aplikasi dapat terhubung ke alat ukur tinggi SmartGrowth dan ke beberapa timbangan Bluetooth agar hasil terisi otomatis, serta menyambung ulang ke alat terakhir yang dipakai.
• Cek akurasi dan kalibrasi alat SmartGrowth langsung dari aplikasi.

Imunisasi
• Catat imunisasi siswa: jenis vaksin, dosis, tanggal, petugas, dan catatan kejadian ikutan bila ada.

Ringkasan sekolah
• Lihat ringkasan jumlah siswa, analitik pengukuran, distribusi kategori BMI, serta grafik tinggi dan berat badan per periode.

Registrasi wajah (opsional)
• Ambil foto siswa dengan kamera atau pilih foto dari galeri, lalu pasangkan wajah dengan data siswa. Server menyimpan representasi numerik wajah, bukan fotonya.

Privasi
• Data hanya dapat diakses oleh anggota sekolah yang bersangkutan, dan dikirim melalui koneksi terenkripsi (HTTPS).
• Kebijakan privasi: https://mysimoka.id/kebijakan-privasi.html
• Permintaan hapus akun: https://mysimoka.id/hapus-akun.html

Persyaratan
• Android 8.0 atau lebih baru dan koneksi internet.
• Akun yang terhubung ke sekolah.
• Bluetooth hanya diperlukan bila memakai alat ukur.

Pertanyaan dan masukan: info@mysimoka.id
```

Sekitar 2.000 karakter. Hitung ulang di Play Console setelah diedit.

## Catatan

- Jangan tambahkan angka, statistik, testimoni, atau klaim seperti "akurat", "terbaik", atau "disetujui Kemenkes/WHO", karena tidak ada buktinya di repo.
- Timbangan pihak ketiga (mis. Xiaomi S400) sengaja tidak disebut namanya untuk menghindari masalah merek dagang. Jika ingin disebut, gunakan bentuk "kompatibel dengan ...".
- "Lupa password" tidak disebut sebagai fitur, karena backend-nya belum ada (lihat README 0.4).
- Bila fitur pencocokan wajah otomatis sudah selesai, perbarui deskripsi **dan** Data safety.
