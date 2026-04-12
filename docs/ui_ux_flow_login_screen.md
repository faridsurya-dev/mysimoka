# UX Flow and State Mapping - Login Screen

Dokumen ini membahas flow detail dan state mapping untuk `Login Screen` pada fase 3.1.

Referensi:
- [SRS Mobile App Pengukuran IoT Tinggi Berat](./srs_mobile_app_pengukuran_io_t_tinggi_berat.md)
- [UI/UX Information Architecture](./ui_ux_information_architecture.md)
- [UI/UX Design System Foundation](./ui_ux_design_system_foundation.md)
- [Checklist Task UI/UX Development](./ui_ux_checklist.md)

## Tujuan Layar
- Mengizinkan guru masuk ke aplikasi dengan cepat dan jelas
- Menjadi titik awal yang sederhana sebelum user memilih sekolah, kelas, dan session
- Mengurangi hambatan saat operator baru membuka aplikasi di lapangan

## Peran Layar dalam Flow
Posisi login dalam flow utama:

```text
Login
-> Pilih Sekolah
-> Pilih Kelas
-> Session Setup
-> Measurement Home
```

Login bukan layar operasional utama, tetapi tetap penting karena:
- menjadi gerbang autentikasi
- menentukan transisi ke flow setup
- perlu stabil, sederhana, dan tidak membingungkan

## Asumsi MVP
- Login menggunakan `token-based auth`
- Kredensial minimal berupa `email/username` dan `password`
- Belum membahas SSO atau multi-factor authentication
- Setelah login berhasil, token disimpan agar user tidak perlu login berulang terlalu sering

## Objective UX
- Form harus singkat dan mudah dibaca
- Primary CTA hanya satu: `Masuk`
- Feedback error harus jelas dan langsung terkait dengan input
- Loading state harus memberi kepastian bahwa proses sedang berjalan

## Struktur Konten Layar

### Header Area
Konten:
- logo atau identitas aplikasi
- judul singkat
- subjudul ringkas

Copy yang disarankan:
- Judul: `Masuk ke MySimoka`
- Subjudul: `Lanjutkan untuk memulai pengukuran siswa`

### Form Area
Konten:
- input `Email / Username`
- input `Password`
- optional helper text
- CTA `Masuk`

### Footer Area
Konten opsional:
- versi aplikasi
- bantuan singkat bila login bermasalah

Catatan:
- untuk MVP, hindari menaruh terlalu banyak link tambahan
- jangan mengalihkan fokus user dari aksi utama

## Layout Recommendation
- gunakan layout vertikal sederhana
- konten utama diletakkan di tengah atas, bukan full center kaku
- form card cukup ringkas dan jelas
- tombol `Masuk` harus full width
- keyboard handling harus aman agar tombol tetap bisa dijangkau

Urutan visual:
1. branding ringan
2. title dan subtitle
3. input username
4. input password
5. helper / error message
6. tombol `Masuk`

## Komponen yang Dibutuhkan
- `AuthHeader`
- `TextField`
- `PasswordField`
- `PrimaryButton`
- `InlineErrorMessage`
- `Screen`

Catatan:
- `AuthHeader` masih bisa menjadi variasi khusus dari komponen shared nanti
- `TextField` dan `PrimaryButton` sebaiknya reusable lintas layar

## Field Definition

### Field 1 - Email / Username
- label: `Email atau Username`
- placeholder: `Masukkan email atau username`
- keyboard type:
  - `email-address` jika format dipastikan email
  - `default` jika username juga diterima
- autoCapitalize: `none`
- autoCorrect: `false`

### Field 2 - Password
- label: `Password`
- placeholder: `Masukkan password`
- secure input: `true`
- sediakan toggle show/hide password

## Primary Action
- label tombol: `Masuk`
- state tombol:
  - default
  - disabled saat field kosong
  - loading saat request login berjalan

## Flow Utama

### Happy Path
```text
User buka app
-> Login screen tampil
-> User isi email/username
-> User isi password
-> User tap "Masuk"
-> Sistem validasi format dasar
-> Sistem kirim request login
-> Login berhasil
-> Simpan token
-> Arahkan ke Pilih Sekolah atau langsung skip bila hanya satu sekolah
```

### Returning User
```text
App dibuka
-> Token valid masih tersedia
-> Skip login
-> Lanjut ke flow setup atau home sesuai context session
```

Catatan:
- flow returning user tidak harus divisualisasikan di layar login, tapi harus dipertimbangkan dalam logic

## State Mapping

### 1. Initial State
Kondisi:
- field kosong
- tombol `Masuk` disabled
- belum ada pesan error

Tujuan UX:
- user langsung paham apa yang perlu diisi

### 2. Typing State
Kondisi:
- user sedang mengisi satu atau dua field
- tombol aktif jika syarat minimum terpenuhi

Tujuan UX:
- hindari distraksi
- jangan tampilkan error terlalu agresif sebelum user submit

### 3. Validation Error State
Contoh:
- email kosong
- password kosong
- format email tidak valid jika email diwajibkan

Respons UI:
- field bermasalah diberi border error
- tampilkan helper/error text dekat field
- fokus diarahkan ke input pertama yang bermasalah

### 4. Submitting State
Kondisi:
- user sudah menekan `Masuk`
- request sedang berjalan

Respons UI:
- tombol berubah ke loading
- cegah multi-tap
- field boleh tetap terlihat tapi tidak perlu editable bila ingin lebih aman

### 5. Auth Failed State
Contoh:
- username/password salah
- akun tidak ditemukan
- token tidak bisa dibuat

Respons UI:
- tampilkan error message umum yang jelas
- jangan expose detail sensitif
- pertahankan input username
- password bisa tetap dipertahankan atau dikosongkan, tetapi untuk UX cepat di lapangan sebaiknya dipertahankan

Contoh copy:
- `Email atau password tidak sesuai`

### 6. Network Error State
Contoh:
- tidak ada koneksi
- server timeout
- server tidak dapat dihubungi

Respons UI:
- tampilkan banner atau inline message
- jelaskan bahwa login butuh koneksi internet
- sediakan CTA retry lewat tombol `Masuk` yang aktif kembali

Contoh copy:
- `Koneksi bermasalah. Periksa internet lalu coba lagi.`

### 7. Success State
Kondisi:
- login berhasil
- token berhasil disimpan

Respons UI:
- transisi langsung ke layar berikutnya
- tidak perlu menampilkan success message terpisah yang memperlambat flow

## Validasi Form

### Validasi Minimal MVP
- `Email/Username` wajib diisi
- `Password` wajib diisi

### Validasi Opsional
- jika produk memutuskan hanya menerima email, validasi format email dilakukan sebelum submit

Rekomendasi MVP:
- gunakan validasi minimal dulu agar tidak menghambat operator

## Edge Case yang Harus Diantisipasi
- user menekan `Masuk` saat field kosong
- user menekan `Masuk` berkali-kali
- request login lambat
- jaringan terputus saat submit
- kredensial salah
- token tersimpan gagal
- app dibuka ulang dengan token invalid

## Copy Guidelines
- Gunakan bahasa yang singkat dan langsung
- Hindari istilah teknis seperti `authentication failed`
- Fokus pada tindakan yang bisa dilakukan user

Contoh:
- `Masuk`
- `Masukkan email atau username`
- `Masukkan password`
- `Email atau password tidak sesuai`
- `Koneksi bermasalah. Coba lagi.`

## Success Transition Rules
- Jika user hanya punya satu sekolah, arahkan langsung ke `Class Selection`
- Jika tidak, arahkan ke `School Selection`
- Jangan tampilkan layar perantara yang tidak perlu

## Analytics / Event Tracking yang Nanti Berguna
- login_submit_clicked
- login_success
- login_failed_invalid_credentials
- login_failed_network

Ini belum wajib diimplementasikan sekarang, tetapi baik jika sudah dipikirkan sejak awal.

## Output Fase 3.1
Dengan dokumen ini, login screen sudah memiliki:
- tujuan layar
- daftar komponen yang dibutuhkan
- flow utama dan alternate flow
- state mapping
- edge case dasar
- aturan transisi setelah sukses

## Lanjutan yang Disarankan
Setelah login flow selesai, urutan berikutnya:
1. `Pilih Sekolah`
2. `Pilih Kelas`
3. `Buat / Lanjutkan Session`

Tiga layar ini perlu dibahas berurutan karena saling terkait langsung setelah login.
