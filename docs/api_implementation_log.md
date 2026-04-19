# API Implementation Log

## 2026-04-19 - Sinkronisasi Dokumentasi API Live

Sumber:
- `https://api.mysimoka.sunhouse.co.id/api/docs`
- `https://api.mysimoka.sunhouse.co.id/api/docs/openapi.yaml`

Perubahan yang diterapkan:
- Menambahkan snapshot OpenAPI lokal: `docs/openapi.mysimoka.yaml`
- Menambahkan dokumentasi referensi live: `docs/api_reference_live.md`
- Memverifikasi konfigurasi environment base URL di mobile app:
  - `src/services/environment.ts`
  - Env key: `MYSIMOKA_API_BASE_URL`
  - Fallback: `https://api.mysimoka.sunhouse.co.id/`

Temuan penting:
- Endpoint live saat ini menggunakan prefix `/api`.
- Dokumen kontrak lama `docs/api_contract.md` menggunakan `/api/v1`, sehingga ada potensi mismatch bila dipakai sebagai acuan implementasi baru.

Tindak lanjut yang disarankan:
- Update service client mobile agar mengikuti endpoint live `/api`.
- Tambahkan peta endpoint per fitur (auth, students, classes, measurements, face embeddings) sebelum implementasi penuh.

## 2026-04-19 - Implementasi Registrasi Sekolah (Mobile)

Endpoint yang diterapkan:
- `POST /api/schools/register`

Perubahan kode:
- Menambahkan service registrasi:
  - `src/services/auth.ts`
  - Fungsi: `registerSchool(payload)`
- Mengekspor service di:
  - `src/services/index.ts`
- Menghubungkan form registrasi UI ke API:
  - `src/screens/auth/register/RegisterScreen.tsx`
  - Menambahkan `loading state`, `error state`, dan `success alert`

Mapping payload ke API:
- `schoolName` -> `name`
- `npsn` -> `number`
- `email` -> `pic_email`
- `personInChargeName` -> `pic_name`
- `password` -> `pic_password`

Validasi dan UX:
- Tombol `Daftar` aktif jika semua field terisi dan konfirmasi password cocok.
- Saat submit berjalan, tombol menampilkan loading.
- Jika API gagal, pesan error ditampilkan di bawah form.
