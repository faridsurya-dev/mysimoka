# Initial Project Structure

Dokumen ini menjelaskan struktur awal project React Native agar scalable untuk fase UI/UX, integrasi BLE, offline storage, dan sinkronisasi ke backend.

## Struktur Folder
```text
src/
├── app/
│   ├── App.tsx
│   └── providers/
├── navigation/
├── screens/
│   └── measurement-home/
├── features/
│   ├── device/
│   ├── history/
│   ├── measurement/
│   └── session/
├── shared/
│   └── components/
├── theme/
├── services/
├── store/
├── lib/
├── types/
└── assets/
```

## Prinsip Struktur
- `app/` untuk root app, provider, dan bootstrap
- `navigation/` untuk root navigator dan stack navigator
- `screens/` untuk layar level tinggi
- `features/` untuk domain bisnis yang akan berkembang terpisah
- `shared/` untuk komponen generik lintas domain
- `theme/` untuk design tokens dan styling foundation
- `services/` untuk API, BLE, storage, sync, dan integrasi eksternal
- `store/` untuk state global saat nanti dibutuhkan
- `lib/` untuk helper umum yang tidak terikat domain
- `types/` untuk type bersama lintas modul
- `assets/` untuk icon, image, dan resource statis

## Kenapa Struktur Ini Scalable
- UI bisa tumbuh tanpa semua file menumpuk di root project
- Domain seperti `device`, `measurement`, `history`, dan `session` bisa dikembangkan mandiri
- Shared layer tetap kecil dan hanya berisi hal yang benar-benar reusable
- Mudah dipakai untuk transisi dari mock UI ke integrasi data nyata

## Aturan Kerja
- Screen tetap tipis, logika domain nanti didorong ke `features/`
- Theme tidak dicampur dengan komponen bisnis
- Shared component hanya untuk elemen generik, bukan komponen yang terlalu domain-specific
- Service eksternal seperti BLE dan API tidak langsung dipanggil dari screen
