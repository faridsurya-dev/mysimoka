# Rilis MySimoka ke Google Play — daftar langkah

Dokumen ini berisi urutan langkah merilis aplikasi Android MySimoka (`com.mysimoka_mobile`, versi 1.2 / versionCode 3) ke Google Play. Semua isian dibuat berdasarkan kode di repo per 9 Oktober 2026. Butir bertanda **TODO** wajib diisi atau diputuskan pemilik aplikasi.

Dokumen terkait di folder ini:

- [listing.md](listing.md): nama, deskripsi singkat, dan deskripsi lengkap untuk halaman toko.
- [screenshots.md](screenshots.md): ukuran dan daftar layar untuk tangkapan layar serta feature graphic.
- [release-notes-1.2.md](release-notes-1.2.md): catatan rilis.

URL publik yang dipakai:

- Kebijakan privasi: https://mysimoka.id/kebijakan-privasi.html
- Hapus akun: https://mysimoka.id/hapus-akun.html
- Email kontak: info@mysimoka.id

---

## 0. Sebelum membuka Play Console

### 0.1 Kunci unggah (upload key)

Kunci unggah sudah dibuat di `D:/Proyek/SUNHOUSE_DIGITAL/NEW PT/MySimoka/keystore/mysimoka-upload.jks` (alias `mysimoka`), dan `android/keystore.properties` sudah diisi. Keduanya **tidak boleh** di-commit (`*.jks`, `*.keystore` kecuali `debug.keystore`, dan `keystore.properties` sudah ada di `.gitignore`).

Konfigurasi signing ada di `android/app/build.gradle`. Nilai dibaca dari `android/keystore.properties` (contoh: `android/keystore.properties.example`), atau dari variabel lingkungan yang menimpa isi file:

| Variabel lingkungan | Kunci di keystore.properties |
|---|---|
| `MYSIMOKA_UPLOAD_STORE_FILE` | `storeFile` (relatif ke folder `android/`, atau path absolut) |
| `MYSIMOKA_UPLOAD_STORE_PASSWORD` | `storePassword` |
| `MYSIMOKA_UPLOAD_KEY_ALIAS` | `keyAlias` |
| `MYSIMOKA_UPLOAD_KEY_PASSWORD` | `keyPassword` |

Jika salah satu nilai kosong atau file `.jks` tidak ditemukan, build release tetap jalan tetapi ditandatangani dengan **debug key** dan Gradle mencetak peringatan `WARNING: MySimoka release builds are signed with the DEBUG key`. AAB seperti itu **ditolak** Google Play. Pastikan peringatan ini tidak muncul saat membuat AAB.

Untuk membuat kunci baru di mesin lain (jangan menimpa kunci yang sudah ada):

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore mysimoka-upload.jks -alias mysimoka \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=MySimoka, O=TODO nama organisasi, C=ID"
```

`keytool` akan menanyakan password. Simpan password di pengelola password, jangan di repo.

**Cadangkan** file `.jks` dan password-nya di minimal dua tempat terpisah (mis. pengelola password + penyimpanan terenkripsi di luar laptop). Dengan Play App Signing, kunci unggah yang hilang masih bisa di-reset lewat Play Console, tetapi prosesnya butuh waktu dan verifikasi.

### 0.2 Membuat AAB

Dari folder `mysimoka/android` (Git Bash):

```bash
cd android
./gradlew.bat clean
CMAKE_POLICY_VERSION_MINIMUM=3.5 ./gradlew.bat bundleRelease
```

PowerShell:

```powershell
cd android
$env:CMAKE_POLICY_VERSION_MINIMUM = "3.5"; .\gradlew.bat bundleRelease
```

Hasil: `android/app/build/outputs/bundle/release/app-release.aab`.

Konfigurasi yang dipakai:

- `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` (`android/gradle.properties`), jadi AAB berisi keempat ABI. Google Play membagi AAB per perangkat, jadi ukuran unduhan per ponsel tetap kecil.
- Hermes aktif (`hermesEnabled=true`), New Architecture aktif.
- R8/ProGuard **tidak** aktif (`enableProguardInReleaseBuilds = false`). Ini disengaja: mengaktifkannya butuh aturan keep untuk VisionCamera, ML Kit, ble-plx, Reanimated, dan Skia, serta pengujian ulang penuh. Akibatnya Play Console tidak meminta file deobfuscation.
- Tabel simbol native ikut dalam AAB (`ndk { debugSymbolLevel 'SYMBOL_TABLE' }`), supaya crash native di Play Console bisa dibaca.

Verifikasi tanda tangan AAB:

```bash
keytool -printcert -jarfile app/build/outputs/bundle/release/app-release.aab
```

Pemiliknya harus `CN=MySimoka...`, bukan `CN=Android Debug`.

**Masalah yang pernah terjadi di Windows (CMake 4.1):**

- Skia gagal dikonfigurasi tanpa `CMAKE_POLICY_VERSION_MINIMUM=3.5`. Variabel ini wajib diset seperti pada perintah di atas.
- Build `armeabi-v7a` untuk Reanimated pernah gagal dengan pesan `build.ninja still dirty`. Coba urutan berikut:
  1. Hapus `android/app/.cxx`, `android/app/build`, dan `node_modules/react-native-reanimated/android/.cxx` serta `.../android/build`, lalu ulangi `bundleRelease`.
  2. Pakai CMake 3.22.1 dari SDK Manager (Android Studio → SDK Tools → CMake 3.22.1) dan set `cmake.dir` di `android/local.properties`, contoh `cmake.dir=C\:\\Users\\<nama>\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1`.
  3. Jalankan build di path tanpa spasi (mis. salin/clone ke `D:\src\mysimoka`). Path proyek saat ini mengandung spasi (`NEW PT`), dan itu bisa memicu masalah ninja di Windows.
  4. Fallback terakhir, **hanya untuk pengujian internal**: `./gradlew.bat bundleRelease -PreactNativeArchitectures=arm64-v8a,x86_64`. AAB ini tidak bisa dipasang di ponsel 32-bit. Untuk rilis produksi, usahakan keempat ABI ikut, atau minimal `armeabi-v7a` dan `arm64-v8a`.

### 0.3 Cek manifest dan target

Sudah diperiksa di kode:

- `targetSdkVersion 36`, `compileSdk 36`, `minSdk 26` (Android 8.0). Syarat Google Play saat ini adalah target API 35 untuk aplikasi baru dan update sejak 31 Agustus 2025, jadi API 36 memenuhi syarat.
- `android:usesCleartextTraffic` bernilai `false` di build release (diatur plugin React Native). Semua endpoint memakai HTTPS (`api.`, `auth.`, `hasura.mysimoka.id`).
- `debuggable` bernilai false di build release (default buildType release).
- `android:allowBackup="false"`.
- `android:exported`: `MainActivity` bernilai `true` (launcher). Komponen lain dari library bernilai `false`, kecuali `ProfileInstallReceiver` dari AndroidX yang dilindungi permission `DUMP` (standar).
- Ikon: `mipmap-*/ic_launcher.png` dan `ic_launcher_round.png` sudah ada, tetapi **belum ada adaptive icon** (`mipmap-anydpi-v26/ic_launcher.xml`). Ini bukan syarat Play, tetapi ikon bisa tampil dengan bingkai putih di beberapa launcher. **TODO (opsional):** buat adaptive icon lewat Android Studio → New → Image Asset.
- Nama aplikasi di launcher: `Mysimoka` (`res/values/strings.xml`). **TODO:** putuskan apakah diganti menjadi `MySimoka` agar sama dengan nama di toko.

Izin final di APK/AAB setelah perubahan manifest:

| Izin | Alasan |
|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | Komunikasi dengan server MySimoka |
| `CAMERA` | Mengambil foto wajah siswa untuk registrasi dan identifikasi wajah |
| `BLUETOOTH_SCAN` (`neverForLocation`), `BLUETOOTH_CONNECT` | Android 12+: mencari dan menghubungkan alat ukur BLE |
| `BLUETOOTH`, `BLUETOOTH_ADMIN` (maks. API 30) | BLE di Android 8–11 |
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (maks. API 30) | Di Android 8–11, sistem mewajibkan izin lokasi untuk pemindaian BLE. Aplikasi tidak membaca lokasi. |

Izin yang dihapus: `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` (beserta `READ_MEDIA_VIDEO`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `RECORD_AUDIO` sebagai pengaman). Pemilihan foto dari galeri memakai Photo Picker sistem (`launchImageLibrary` → `PickVisualMedia`) yang tidak butuh izin, sehingga tidak perlu mengisi deklarasi *Photo and video permissions* di Play Console.

Setelah AAB dibuat, cek izin finalnya di `android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`, atau di Play Console (App bundle explorer).

### 0.4 Hal yang perlu dibereskan sebelum ditinjau

- [ ] **Akun uji untuk reviewer (wajib).** Seluruh aplikasi ada di balik login. Siapkan akun guru (dan sebaiknya admin sekolah) di sekolah demo yang hanya berisi **data siswa fiktif**. Jangan memakai data anak sungguhan. Isi di *App access*.
- [ ] **Lupa password.** Layar "Reset password" menjanjikan link via email, tetapi backend belum punya endpoint reset password dan belum ada SMTP. Pilih salah satu: sembunyikan tombolnya, ubah teksnya menjadi "Hubungi admin sekolah / info@mysimoka.id", atau buat endpoint-nya. Fitur yang tidak berfungsi bisa membuat aplikasi ditolak karena *Broken functionality*.
- [ ] **Verifikasi email.** Layar Verifikasi Email meminta "token verifikasi dari response register", teks yang masih bersifat teknis. Rapikan teks atau sembunyikan layarnya (login tidak mewajibkan verifikasi).
- [ ] **Penghapusan akun di backend.** Belum ada endpoint hapus akun. Permintaan via email (lihat 2.6) diproses manual oleh admin server. Siapkan prosedur internal: SQL/skrip untuk menghapus baris `auth.users`, `auth.user_roles`, `auth.refresh_tokens`, dan `school_memberships` milik pengguna, serta untuk menghapus data satu sekolah bila diminta.
- [ ] Isi bagian TODO di https://mysimoka.id/hapus-akun.html (jangka waktu proses, dan nasib kaitan catatan pengukuran dengan akun yang dihapus) dan di kebijakan privasi.
- [ ] Pastikan https://mysimoka.id/kebijakan-privasi.html dan https://mysimoka.id/hapus-akun.html sudah ter-deploy dan bisa dibuka tanpa login. Jika path salah, nginx mengembalikan halaman beranda, bukan 404, jadi cek isinya, bukan hanya status 200.

---

## 1. Akun developer

1. Daftar di https://play.google.com/console (biaya pendaftaran satu kali USD 25).
2. Pilih jenis akun:
   - **Organisasi** (disarankan bila ada badan hukum): butuh nomor D-U-N-S untuk organisasi tersebut, dan nama developer yang tampil di toko adalah nama organisasi. Akun organisasi **tidak** terkena kewajiban uji tertutup 12 penguji / 14 hari.
   - **Pribadi**: akun pribadi yang dibuat setelah 13 November 2023 wajib menjalankan **uji tertutup minimal 12 penguji yang ikut terus-menerus selama 14 hari** sebelum bisa mengajukan akses produksi. (Saat kebijakan ini diumumkan angkanya 20 penguji, lalu diturunkan menjadi 12 pada Desember 2024. Cek angka yang tampil di Play Console Anda.)
   - **TODO:** tentukan jenis akun. Untuk aplikasi yang dipakai sekolah dan memproses data anak, akun organisasi lebih tepat.
3. Verifikasi identitas dan nomor telepon developer, serta isi alamat developer. Untuk akun organisasi, alamat dan kontak developer tampil publik.

## 2. Buat aplikasi dan isi App content (Kebijakan → Konten aplikasi)

Buat aplikasi: nama `MySimoka SmartGrowth` (lihat listing.md), bahasa default **Indonesia – id**, tipe **App**, **Gratis**. Centang deklarasi kebijakan developer dan ekspor AS.

Isi bagian berikut secara berurutan.

### 2.1 Kebijakan privasi

URL: `https://mysimoka.id/kebijakan-privasi.html`

### 2.2 App access (akses aplikasi)

Pilih **"All or some functionality is restricted"**, lalu tambahkan instruksi:

- Nama: Akun guru demo
- Username: **TODO** (mis. `reviewer@mysimoka.id`)
- Password: **TODO** (isi langsung di Play Console, jangan di repo)
- Instruksi: "Login dengan akun ini. Akun sudah terhubung ke sekolah demo berisi data siswa fiktif. Alat ukur Bluetooth bersifat opsional; tinggi dan berat dapat diisi manual dari menu Pengukuran. Registrasi wajah memakai kamera; Anda dapat memotret wajah orang dewasa atau gambar wajah apa pun untuk mencoba alurnya."

### 2.3 Ads

**No, my app does not contain ads.** Tidak ada SDK iklan di `package.json`.

### 2.4 Content rating (kuesioner IARC)

- Email kontak: info@mysimoka.id
- Kategori: **All Other App Types** (bukan game, bukan media sosial/komunikasi).
- Draf jawaban:

| Pertanyaan | Jawaban |
|---|---|
| Kekerasan, darah, ketakutan | Tidak |
| Konten seksual / ketelanjangan | Tidak |
| Bahasa kasar | Tidak |
| Narkoba, alkohol, tembakau | Tidak |
| Perjudian (termasuk simulasi) | Tidak |
| Interaksi pengguna / konten buatan pengguna yang bisa dilihat publik | Tidak. Data hanya terlihat oleh anggota sekolah yang sama, tidak ada chat atau konten publik. |
| Berbagi lokasi pengguna dengan pengguna lain | Tidak |
| Pembelian digital | Tidak |
| Aplikasi adalah browser web / mesin pencari | Tidak |

Hasil yang diharapkan: rating terendah (mis. IARC 3+ / "Semua umur"). Rating ini menggambarkan konten, bukan target pengguna.

### 2.5 Target audience and content (target audiens)

- Kelompok usia target: **pilih hanya "18 and over"**.
- Alasan: pengguna aplikasi adalah guru dan admin sekolah. Anak tidak memakai aplikasi; anak adalah *subjek data* yang datanya dicatat oleh sekolah.
- "Could your app unintentionally appeal to children?" → **No**. Tampilan bersifat administratif, tanpa karakter atau permainan.
- Karena 18+ saja, aplikasi **tidak** masuk program *Designed for Families* dan tidak wajib memenuhi Families Policy. Data anak tetap harus diungkapkan dengan benar di Data safety dan kebijakan privasi (lihat 2.8).
- Jangan menaruh kata seperti "untuk anak" di judul atau ikon yang bisa ditafsirkan bahwa aplikasi ditujukan untuk anak. Deskripsi di listing.md sudah menyebut bahwa pengguna adalah guru/sekolah.
- **Implikasi data anak:** sekolah memasukkan data siswa SD (nama, NISN, tanggal lahir, jenis kelamin, nama dan nomor HP orang tua/wali, alamat, tinggi/berat, imunisasi, serta embedding wajah). Berdasarkan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, data anak dan data biometrik termasuk **data pribadi yang bersifat spesifik**, dan pemrosesan data anak memerlukan persetujuan orang tua/wali. **TODO (legal):** pastikan perjanjian dengan sekolah menyatakan bahwa sekolah memperoleh persetujuan orang tua/wali, khususnya untuk registrasi wajah, dan tentukan siapa pengendali data dan siapa prosesor.

### 2.6 Data deletion (bagian dari Data safety)

- "Does your app allow users to create an account?" → **Yes** (layar Daftar → `POST /register`; admin sekolah juga dapat membuat akun guru).
- URL penghapusan akun: `https://mysimoka.id/hapus-akun.html`
- Jalur di aplikasi: **Profil → Pengaturan Akun → Hapus Akun**. Menu ini menampilkan penjelasan lalu membuka URL di atas.
- "Do you provide a way for users to request that some or all of their data is deleted without deleting their account?" → **Yes**: data siswa bisa diminta dihapus lewat sekolah atau email (dijelaskan di halaman hapus akun). Wajah siswa bisa dihapus satu per satu oleh guru/admin (`DELETE /api/faces/:id` di backend). **TODO:** cek apakah ada tombolnya di UI aplikasi; jika belum ada, jawaban ini tetap valid lewat permintaan email.

### 2.7 Government apps / News apps / Financial features / Health

- **Government app:** No. Aplikasi tidak dibuat oleh atau atas nama instansi pemerintah. **TODO:** ubah jawaban ini jika aplikasi dirilis untuk dinas atau instansi tertentu.
- **News app:** No.
- **Financial features:** "My app doesn't provide any financial features".
- **Health apps declaration:** aplikasi mencatat tinggi badan, berat badan, kategori BMI, dan imunisasi siswa, jadi **isi deklarasi ini**. Draf: pilih fitur yang sesuai, mis. *Nutrition and weight management* atau kategori kesehatan masyarakat/medis yang paling mendekati pencatatan imunisasi (**TODO:** cocokkan dengan daftar kategori yang tampil di Play Console). Aplikasi **bukan** perangkat medis, tidak memberi diagnosis, dan tidak terhubung dengan Health Connect.
- **COVID-19 contact tracing:** tidak berlaku.

### 2.8 Data safety — draf

Pertanyaan umum:

| Pertanyaan | Jawaban |
|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna jenis apa pun? | Ya |
| Semua data dienkripsi saat transit? | Ya (HTTPS, TLS 1.2/1.3) |
| Pengguna bisa meminta penghapusan data? | Ya (https://mysimoka.id/hapus-akun.html) |
| Komitmen Families Policy | Tidak berlaku (target 18+) |
| Validasi keamanan independen (MASA) | Tidak |

"Collected" berarti data dikirim dari perangkat ke server kami. "Shared" berarti data diberikan ke pihak ketiga; tidak ada data yang diberikan ke pihak ketiga, kecuali catatan ML Kit di bawah.

Data siswa diketik oleh guru. Menurut definisi Play, itu tetap "data pengguna" yang dikumpulkan aplikasi, sehingga harus diungkapkan.

| Kategori Play | Tipe data | Dikumpulkan | Dibagikan | Opsional? | Tujuan | Sumber di kode |
|---|---|---|---|---|---|---|
| Personal info | Name | Ya | Tidak | Wajib | Account management, App functionality | Nama guru (`full_name`), nama siswa, nama orang tua/wali, nama petugas imunisasi |
| Personal info | Email address | Ya | Tidak | Wajib | Account management, App functionality | Login/registrasi |
| Personal info | User IDs | Ya | Tidak | Wajib | Account management, App functionality | ID akun, NISN siswa (`student_number`) |
| Personal info | Address | Ya | Tidak | Opsional | App functionality | Alamat siswa, alamat sekolah |
| Personal info | Phone number | Ya | Tidak | Opsional | App functionality | No. HP orang tua/wali |
| Personal info | Other info | Ya | Tidak | Wajib | App functionality | Tanggal lahir, jenis kelamin, kelas siswa, catatan |
| Health and fitness | Health info | Ya | Tidak | Wajib | App functionality | Tinggi, berat, kategori BMI, catatan imunisasi (vaksin, dosis, tanggal, KIPI) |
| Photos and videos | Photos | Ya | Tidak | Opsional | App functionality | Foto wajah dikirim ke server untuk registrasi wajah. Foto tidak disimpan, hanya embedding. Tetap dihitung "collected" karena dikirim dari perangkat. |
| Personal info → (biometrik) | Lihat catatan | Ya | Tidak | Opsional | App functionality | Embedding wajah 512 dimensi (ArcFace) disimpan di server |
| App info and performance | Diagnostics / Other | **TODO cek** | **TODO cek** | — | Analytics (oleh Google) | Lihat catatan ML Kit |
| Device or other IDs | Device or other IDs | Ya | Tidak | Opsional | App functionality | ID BLE dan nama alat ukur yang terdaftar ke sekolah (`devices`) |
| Location | Approximate/Precise | **Tidak** | Tidak | — | — | Izin lokasi hanya untuk pemindaian BLE di Android ≤ 11; lokasi tidak dibaca |

Catatan:

- **Biometrik:** formulir Data safety tidak punya tipe "biometrik" tersendiri. Ungkapkan foto wajah di *Photos*, dan jelaskan embedding wajah di kebijakan privasi. **TODO:** jika Play Console menampilkan kategori "Personal info → Other info" sebagai tempat yang sesuai untuk template wajah, centang juga di sana. Lebih baik mengungkapkan terlalu banyak daripada kurang.
- **ML Kit (Google):** aplikasi memuat ML Kit Face Detection dan Barcode (lewat `react-native-vision-camera-face-detector` / VisionCamera), yang berjalan di perangkat. ML Kit dapat mengirim metrik penggunaan/diagnostik ke Google (komponen `datatransport` ada di manifest gabungan). **TODO:** cek https://developers.google.com/ml-kit/android-data-disclosure dan ikuti panduan Data safety untuk ML Kit. Biasanya ini masuk *App info and performance → Diagnostics* untuk *Analytics*, dan dihitung collected (bukan shared) bila diproses oleh penyedia layanan.
- **Penyimpanan di perangkat** (sesi login, kunci pairing timbangan S400) tidak dikirim keluar, jadi tidak perlu diungkapkan.
- **Enkripsi saat transit:** ya. Jangan mengklaim enkripsi saat disimpan (at rest), karena belum dikonfigurasi.

### 2.9 Advertising ID

Pilih **No**. Aplikasi tidak memakai Advertising ID. Jika Play Console mendeteksi izin `com.google.android.gms.permission.AD_ID` dari library, periksa manifest gabungan. Saat ini izin itu tidak ada.

### 2.10 Kategori dan detail kontak

- Kategori aplikasi: **Pendidikan** (Education). Alternatif: Medis atau Kesehatan & Kebugaran, tetapi kategori itu memicu peninjauan tambahan. **TODO:** pilih salah satu.
- Tag: pilih yang relevan (mis. "Manajemen sekolah", "Kesehatan").
- Email: info@mysimoka.id, Situs: https://mysimoka.id, Telepon: **TODO** (opsional).

## 3. Main store listing

Isi dari [listing.md](listing.md) dan aset dari [screenshots.md](screenshots.md):

- Ikon aplikasi 512×512 PNG (32-bit, maks. 1 MB). **TODO:** ekspor dari aset ikon sumber (`ic_launcher` xxxhdpi hanya 192 px, jadi jangan di-upscale).
- Feature graphic 1024×500.
- Minimal 2 tangkapan layar ponsel (disarankan 4–8).

## 4. Uji internal / tertutup

1. **Testing → Internal testing**: buat rilis, unggah `app-release.aab`, isi catatan rilis, lalu tambahkan email penguji. Saat diminta, terima **Play App Signing** (Google menyimpan kunci aplikasi; kita hanya memegang kunci unggah).
2. Setelah upload pertama, buka **Setup → App signing** dan catat SHA-256 *App signing key certificate*. Kunci ini yang dipakai di perangkat pengguna, bukan kunci unggah.
3. Pasang dari link uji internal di beberapa ponsel (Android 8, 11, dan 12+), lalu uji: login, sambung ke sekolah, pengukuran manual, BLE (izin Bluetooth di Android 12+ dan izin lokasi di Android 8–11), kamera dan registrasi wajah, pilih foto dari galeri (Photo Picker), Profil → Pengaturan Akun → Kebijakan Privasi / Hapus Akun.
4. Akun pribadi: buat rilis **Closed testing**, undang minimal 12 penguji (lihat angka di Console) yang tetap ikut selama 14 hari berturut-turut, lalu ajukan *Apply for production* dan jawab pertanyaan tentang hasil pengujian.
5. Akun organisasi: bisa langsung ke produksi setelah uji internal.

**Penting:** APK yang selama ini dibagikan dari https://mysimoka.id/download/ ditandatangani dengan **debug key**. Versi dari Play ditandatangani dengan kunci berbeda, sehingga pengguna harus **mencopot APK lama** sebelum memasang dari Play (data login lokal ikut hilang; data di server aman). **TODO:** setelah aplikasi tayang di Play, ganti tombol "Unduh APK" di situs dengan link Play Store, atau tanda tangani APK di situs dengan kunci yang sama.

## 5. Produksi

1. **Production → Create new release** → pilih AAB yang sudah diuji (promote dari track uji).
2. Negara: **Indonesia** saja (disarankan, karena aplikasi khusus sekolah di Indonesia).
3. Catatan rilis dari [release-notes-1.2.md](release-notes-1.2.md).
4. Kirim untuk ditinjau. Peninjauan pertama bisa memakan waktu beberapa hari sampai lebih dari seminggu.

## 6. Setiap rilis berikutnya

1. Naikkan `versionCode` (harus selalu lebih besar) dan `versionName` di `android/app/build.gradle`.
2. Jalankan `bundleRelease` (lihat 0.2) dan pastikan peringatan debug key tidak muncul.
3. Unggah ke track uji, lalu promote ke produksi.
4. Perbarui Data safety jika ada data baru yang dikumpulkan (mis. fitur pencocokan wajah otomatis yang menyimpan data).

## Ringkasan TODO

- [ ] Jenis akun developer (organisasi/pribadi) dan D-U-N-S bila organisasi
- [ ] Akun reviewer + sekolah demo dengan data fiktif
- [ ] Perbaiki/sembunyikan "Lupa password" dan rapikan layar verifikasi email
- [ ] Prosedur internal penghapusan akun/data sekolah (belum ada endpoint)
- [ ] TODO di hapus-akun.html dan kebijakan-privasi.html (jangka waktu proses, lokasi server, entitas hukum)
- [ ] Persetujuan orang tua/wali untuk data anak & wajah (perjanjian dengan sekolah, UU PDP)
- [ ] Cek pengungkapan Data safety untuk ML Kit
- [ ] Kategori aplikasi dan jawaban deklarasi Health apps
- [ ] Ikon 512×512, feature graphic, tangkapan layar
- [ ] (Opsional) adaptive icon; label launcher "Mysimoka" → "MySimoka"
- [ ] Rencana untuk pengguna APK lama yang ditandatangani debug key
