# UI/UX Design System Foundation

Dokumen ini mendefinisikan fondasi visual dan aturan dasar UI untuk MVP mobile app pengukuran tinggi dan berat berbasis IoT.

Referensi:
- [SRS Mobile App Pengukuran IoT Tinggi Berat](./srs_mobile_app_pengukuran_io_t_tinggi_berat.md)
- [UI/UX Information Architecture](./ui_ux_information_architecture.md)
- [Checklist Task UI/UX Development](./ui_ux_checklist.md)

## Tujuan
- Membangun bahasa visual yang jelas, cepat dipahami, dan konsisten
- Membantu operator membaca status device dan sync tanpa effort berlebih
- Menjadi dasar implementasi token UI di React Native

## Prinsip Visual
- Fokus pada kejelasan operasional, bukan dekorasi berlebihan
- Status penting harus terbaca dalam sekali lihat
- Aksi utama harus mudah dijangkau satu tangan
- Kontras visual harus cukup kuat untuk penggunaan lapangan
- Komponen harus sederhana, repeatable, dan scalable

## Arah Visual
- Gaya visual: bersih, tegas, dan fungsional
- Nuansa: profesional, tenang, dan tidak klinis
- Prioritas visual: data siswa, hasil ukur, status device, status sync, aksi utama
- Hindari tampilan yang terlalu mirip dashboard desktop

## Color Palette Utama

### Brand / Primary
- `primary-900`: `#113A5C`
- `primary-700`: `#1F5F8B`
- `primary-600`: `#2977A8`
- `primary-500`: `#318CC4`
- `primary-100`: `#D9EDF8`

Penggunaan:
- tombol primer
- link penting
- highlight konteks aktif
- header section tertentu

### Neutral
- `neutral-950`: `#111827`
- `neutral-900`: `#1F2937`
- `neutral-700`: `#4B5563`
- `neutral-500`: `#6B7280`
- `neutral-300`: `#D1D5DB`
- `neutral-200`: `#E5E7EB`
- `neutral-100`: `#F3F4F6`
- `neutral-50`: `#F8FAFC`
- `white`: `#FFFFFF`

Penggunaan:
- background
- text
- divider
- stroke
- disabled state

### Accent
- `accent-amber`: `#D97706`
- `accent-teal`: `#0F766E`

Penggunaan:
- info sekunder
- penanda konteks atau ringkasan non-kritis

## Semantic Colors

### Device Status
- `device-connected`: `#15803D`
- `device-connecting`: `#D97706`
- `device-disconnected`: `#6B7280`
- `device-error`: `#B91C1C`
- `device-busy`: `#1D4ED8`

### Sync Status
- `sync-synced`: `#15803D`
- `sync-pending`: `#B45309`
- `sync-failed`: `#B91C1C`
- `sync-offline`: `#475569`
- `sync-syncing`: `#2563EB`

### Measurement Status
- `measurement-complete`: `#15803D`
- `measurement-partial`: `#B45309`
- `measurement-idle`: `#64748B`
- `measurement-error`: `#B91C1C`

### Feedback Surface
- `success-bg`: `#ECFDF3`
- `warning-bg`: `#FFF7ED`
- `error-bg`: `#FEF2F2`
- `info-bg`: `#EFF6FF`

## Background dan Surface
- `app-background`: `#F8FAFC`
- `surface-primary`: `#FFFFFF`
- `surface-secondary`: `#F3F4F6`
- `surface-muted`: `#EEF2F7`
- `surface-inverse`: `#113A5C`

Penggunaan:
- app background pakai `app-background`
- card utama pakai `surface-primary`
- section sekunder pakai `surface-secondary`
- area emphasis atau summary panel bisa pakai `surface-inverse`

## Typography Scale
Typeface belum difinalisasi ke font family tertentu. Untuk fase ini kita tetapkan scale dan hierarchy dulu.

### Font Weight
- `regular`: 400
- `medium`: 500
- `semibold`: 600
- `bold`: 700

### Type Scale
- `display-lg`: 32 / 38 / bold
- `display-md`: 28 / 34 / bold
- `heading-xl`: 24 / 30 / semibold
- `heading-lg`: 20 / 26 / semibold
- `heading-md`: 18 / 24 / semibold
- `body-lg`: 16 / 24 / regular
- `body-md`: 15 / 22 / regular
- `body-sm`: 14 / 20 / regular
- `label-lg`: 16 / 20 / semibold
- `label-md`: 14 / 18 / semibold
- `caption`: 12 / 16 / medium

Aturan penggunaan:
- nama siswa aktif minimal `heading-xl`
- hasil ukur utama minimal `display-md`
- status dan metadata gunakan `body-sm` atau `caption`
- hindari body text terlalu kecil untuk penggunaan lapangan

## Spacing Scale
- `space-2`: 2
- `space-4`: 4
- `space-8`: 8
- `space-12`: 12
- `space-16`: 16
- `space-20`: 20
- `space-24`: 24
- `space-32`: 32
- `space-40`: 40

Aturan penggunaan:
- padding layar utama: `24`
- gap antarkomponen utama: `16`
- gap antar elemen dalam card: `12`
- gap icon dan label kecil: `8`

## Radius, Border, dan Elevation

### Border Radius
- `radius-xs`: 8
- `radius-sm`: 12
- `radius-md`: 16
- `radius-lg`: 20
- `radius-pill`: 999

### Border
- `border-subtle`: `1px solid neutral-200`
- `border-strong`: `1px solid neutral-300`
- `border-status`: `1px solid semantic color terkait`

### Elevation
- `elevation-0`: flat
- `elevation-1`: card default
- `elevation-2`: modal / floating action area

Aturan:
- jangan terlalu mengandalkan shadow tebal
- lebih baik gunakan kontras surface + border ringan

## Style Token Komponen Inti

### Button Primer
- background: `primary-700`
- text: `white`
- radius: `16`
- min height: `52`
- horizontal padding: `20`
- pressed state: `primary-900`
- disabled background: `neutral-300`
- disabled text: `neutral-500`

### Button Sekunder
- background: `primary-100`
- text: `primary-900`
- border: none
- pressed state: `#C7E4F4`

### Button Danger
- background: `#DC2626`
- text: `white`
- pressed state: `#B91C1C`

### Button Ghost
- background: transparent
- text: `neutral-900`
- border: `neutral-200`

### Input Field
- background: `white`
- border: `neutral-300`
- focus border: `primary-600`
- error border: `device-error`
- min height: `52`
- radius: `16`
- padding horizontal: `16`

### Search Bar
- gunakan style input yang sama
- tambahkan leading icon
- clear action opsional di sisi kanan

### Badge
- size compact
- radius pill
- gunakan semantic color dengan background tint ringan

### Card
- background: `surface-primary`
- border radius: `16`
- padding: `16`
- border: `neutral-200`
- elevation: `elevation-1`

### Modal / Bottom Sheet
- background: `white`
- radius top: `20`
- padding: `20`
- drag handle jika berbentuk sheet

### Banner
- full width
- radius: `16`
- padding: `12` atau `16`
- gunakan background semantic sesuai tipe feedback

## Semantic Styling Rules

### Device Status Presentation
- `connected`: hijau dengan label tegas
- `connecting`: amber dengan indikator progres ringan
- `disconnected`: abu-abu netral
- `busy`: biru agar terasa aktif namun tidak seperti error
- `error`: merah dengan CTA perbaikan yang jelas

### Sync Status Presentation
- `synced`: hijau
- `pending`: amber
- `syncing`: biru
- `failed`: merah
- `offline`: slate / abu gelap

### Measurement Result Presentation
- hasil lengkap diberi emphasis paling kuat
- hasil parsial tetap tampak valid, jangan terlihat seperti gagal total
- nilai out-of-range diberi warning state, bukan langsung merah fatal

## Aturan Layout One-Hand Operation
- CTA primer ditempatkan di area bawah layar
- aksi yang sering digunakan harus ada dalam jangkauan ibu jari
- informasi penting ditaruh di atas fold, aksi utama di bawah fold
- hindari tombol kecil yang terlalu rapat
- gunakan min touch target `44x44`, disarankan `48x48` ke atas
- untuk Batch screen, urutan visual ideal:
  1. siswa aktif
  2. status device
  3. hasil ukur
  4. action bar bawah

## Content Priority Per Screen

### Measurement Home
- context session
- status device
- pending sync
- CTA ke flow utama

### Batch Measurement
- identitas siswa aktif
- hasil ukur
- status device
- CTA `Ukur` dan `Simpan`
- aksi sekunder `Skip`, `Undo`, `Retry`

### Device Manager
- card device tinggi
- card device berat
- state scanning / connecting / connected
- aksi connect dan disconnect

### History / Sync
- list item measurement
- badge sync status
- informasi waktu dan kelengkapan hasil

## Accessibility Dasar
- kontras teks dan background harus aman untuk penggunaan luar ruang
- jangan hanya mengandalkan warna untuk membedakan status
- setiap badge status perlu label teks
- hasil ukur utama harus terbaca cepat pada layar kecil

## Mapping Token ke React Native
Struktur yang disarankan:
- `src/theme/colors.ts`
- `src/theme/spacing.ts`
- `src/theme/typography.ts`
- `src/theme/radius.ts`
- `src/theme/shadows.ts`
- `src/theme/components.ts`

Contoh kelompok token:
- `colors.brand.primary`
- `colors.surface.primary`
- `colors.text.primary`
- `colors.status.device.connected`
- `colors.status.sync.pending`
- `spacing.lg`
- `radius.md`

## Keputusan Fase Ini
- Gaya visual MVP diposisikan sebagai `functional clarity`
- Biru digunakan sebagai warna utama karena terasa stabil dan operasional
- Status device, sync, dan measurement punya semantic color terpisah
- Layout didorong untuk penggunaan cepat satu tangan
- Komponen inti diarahkan ke card-based layout yang ringkas

## Lanjutan Setelah Fase Ini
Setelah design system foundation selesai, fase berikutnya adalah:
1. Menurunkan token ini ke component planning
2. Menyusun state mapping per flow
3. Membuat wireframe layar inti
