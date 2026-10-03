# Protokol BLE SmartGrowth (stasiun tinggi + berat MySimoka)

Versi protokol: **1** · Status: draf acuan untuk tim firmware · Implementasi aplikasi:
`src/features/device/smartGrowth.ts` (parser + UUID), `src/features/device/weightScale.ts`
(deteksi layanan), uji: `__tests__/smartGrowth.test.ts` (vektor hex di bawah).

Dokumen ini adalah **sumber kebenaran** untuk firmware. Firmware (belum diuji di perangkat):
[`firmware/smartgrowth/`](../firmware/smartgrowth/) — pin, sensor, dan kalibrasi lewat Serial
dijelaskan di README-nya.

> Prinsip produk: alat **opsional**. Aplikasi tetap bisa dipakai penuh tanpa alat (input
> manual). Firmware tidak boleh mensyaratkan aplikasi melakukan langkah khusus agar
> berfungsi minimal (berat via layanan standar).

## 1. Perangkat keras acuan

| Komponen | Keterangan |
| --- | --- |
| MCU | ESP32 DevKit V1 (ESP32-WROOM-32, 30 pin), stack **NimBLE-Arduino** (2.x) |
| Berat | Load cell + HX711 (library `bogde/HX711`) |
| Tinggi | VL53L0X (I2C) atau Sharp GP2Y0A02 (analog) — lihat §10. Unit tanpa sensor tinggi tetap valid (flag bit1 = 0) |
| Daya | Li-ion + TP4056 (USB-C, proteksi) → MT3608 boost 5 V → VIN DevKit |
| Baterai | Tidak ada sensing di papan saat ini. Opsional: pembagi tegangan ke ADC1 (mis. GPIO34) |

Pin di contoh firmware hanya **usulan** dan semuanya `#define`; wajib dicocokkan dengan PCB
sebenarnya. Hindari pin strapping (GPIO0, 2, 5, 12, 15) dan pin input-only (GPIO34–39)
untuk output.

## 2. Advertising

- Nama: `SmartGrowth-XXXX` (XXXX = 2 byte terakhir MAC BLE, hex huruf besar). Aplikasi juga
  menerima prefiks `MYSIMOKA-`. Pencocokan prefiks tidak peka huruf besar/kecil.
- Paket iklan (≤ 31 byte): flags + Complete Local Name + 16-bit UUID `0x181D`.
- Scan response: 128-bit UUID layanan SmartGrowth (tidak muat di paket iklan bersama nama).
- Interval iklan: 100–250 ms saat belum terhubung. Berhenti beriklan saat terhubung
  (1 HP : 1 alat), lanjut lagi setelah putus.
- Connectable, undirected. **Tanpa pairing/bonding** (lihat §8).

## 3. Layanan GATT

### 3.1 Weight Scale standar (wajib)

Agar berat langsung bekerja dengan aplikasi apa pun (dan versi lama MySimoka):

| Item | UUID | Properti |
| --- | --- | --- |
| Weight Scale Service | `0x181D` | — |
| Weight Measurement | `0x2A9D` | Indicate |
| Weight Scale Feature (opsional) | `0x2A9E` | Read |

Format `0x2A9D` (Bluetooth SIG): `flags u8 = 0x00` (SI, tanpa timestamp/user/BMI) +
`weight u16 LE`, resolusi **0,005 kg**. Contoh 25,40 kg → 5080 = `0x13D8` → `00 D8 13`.
Kirim **hanya** saat berat stabil.

### 3.2 Layanan SmartGrowth (kustom, 128-bit)

| Item | UUID | Properti |
| --- | --- | --- |
| SmartGrowth Service | `519e0001-59fe-44b5-828f-34822e2361a9` | — |
| Measurement | `519e0002-59fe-44b5-828f-34822e2361a9` | Notify (+ Read opsional) |
| Device Info | `519e0003-59fe-44b5-828f-34822e2361a9` | Read |
| Control | `519e0004-59fe-44b5-828f-34822e2361a9` | Write (with response) |

UUID ini tetap (sudah dipakai aplikasi). Jangan diubah tanpa menaikkan versi protokol.

Jika layanan SmartGrowth ada, aplikasi **hanya** berlangganan Measurement kustom (tidak
dobel dengan `0x2A9D`). Jika tidak ada, aplikasi otomatis memakai `0x181D`/`0x2A9D`
(lalu `0x181B`/`0x2A9C` Body Composition).

## 4. Characteristic Measurement (notify)

Little-endian, 7 atau 8 byte (≤ 20 byte, muat di MTU default 23):

| Offset | Tipe | Field | Keterangan |
| --- | --- | --- | --- |
| 0 | u8 | `flags` | lihat tabel flags |
| 1–2 | u16 | `weight` | kg × 100 (0,01 kg). `0xFFFF` = tidak ada |
| 3–4 | u16 | `height` | cm × 10 (0,1 cm). `0xFFFF` = tidak ada |
| 5–6 | u16 | `seq` | nomor urut frame, +1 tiap notify, wrap 65535 → 0 |
| 7 | u8 | `battery` | 0–100 %. Opsional; boleh dihilangkan jika bit3 = 0 |

Flags:

| Bit | Arti |
| --- | --- |
| 0 | weight ada |
| 1 | height ada (unit tanpa sensor tinggi: selalu 0) |
| 2 | **stabil/final** — aplikasi hanya mengisi otomatis bila bit ini 1 |
| 3 | battery ada (byte 7 valid) |
| 4–7 | cadangan, kirim 0 (aplikasi mengabaikan) |

Field yang bit-nya 0 diabaikan aplikasi (isi `0x0000` atau `0xFFFF`, disarankan `0xFFFF`).

### Contoh frame (dipakai juga sebagai vektor uji)

| Hex | Arti |
| --- | --- |
| `0F EC 09 D2 04 07 00 57` | stabil, 25,40 kg, 123,4 cm, seq 7, baterai 87 % |
| `01 51 07 00 00 2A 00` | mengukur (belum stabil), 18,73 kg, tanpa tinggi, seq 42, tanpa baterai |
| `06 FF FF F7 03 2B 00` | stabil, tinggi saja 101,5 cm, seq 43 |
| `05 A8 61 FF FF 2C 00` | stabil, 250,00 kg → **ditolak** (di luar rentang) |
| `06 FF FF 2C 01 2D 00` | stabil, 30,0 cm → **ditolak** (di luar rentang) |
| `05 EC 09 FF FF 08 00 57` | bit3 = 0 → byte baterai diabaikan |

## 5. Characteristic Device Info (read)

| Offset | Tipe | Field |
| --- | --- | --- |
| 0 | u8 | versi protokol (= `0x01`) |
| 1–3 | u8×3 | firmware major, minor, patch |
| 4.. | ASCII | serial, maks 16 byte (total ≤ 20 byte), tanpa terminator |

Contoh: `01 01 02 03 53 47 2D 30 30 30 31 32 33` → protokol 1, firmware 1.2.3, serial
`SG-000123`.

## 6. Characteristic Control (write with response)

Format: `cmd u8` + parameter (opsional). Perintah tak dikenal diabaikan (tetap ACK).

| Cmd | Nama | Parameter | Perilaku |
| --- | --- | --- | --- |
| `0x01` | Tare | — | nol-kan timbangan (platform harus kosong) |
| `0x02` | Start measurement | — | reset status stabil, mulai siklus ukur baru |
| `0x03` | Stop measurement | — | berhenti mengirim frame "mengukur" |
| `0x10` | Set unit | cadangan | belum dipakai; unit protokol selalu kg/cm |
| `0x20` | Kalibrasi | cadangan | belum dipakai; kalibrasi lewat Serial (§11) |

Aplikasi menampilkan tombol **Tare** dan **Mulai ukur** di layar Perangkat bila terhubung ke
SmartGrowth.

## 7. Timing

- Saat ada beban (berat ≥ 2 kg) tapi belum stabil: notify frame bit2 = 0, **≤ 5 Hz**
  (≥ 200 ms antar frame).
- Saat stabil: kirim **satu** frame bit2 = 1 (+ indicate `0x2A9D`). Jangan ulang frame
  stabil yang sama terus-menerus; boleh ulang maks 1×/detik bila nilainya tetap.
- Stabil berat: 5 pembacaan berturut-turut dalam ±0,05 kg. Stabil tinggi: 5 pembacaan
  dalam ±0,5 cm.
- Siklus baru setelah beban turun < 1 kg (anak turun) atau perintah `0x02`.
- Unit dengan berat + tinggi: kirim frame stabil saat **keduanya** stabil; bila sensor tinggi
  gagal/time-out > 3 s, kirim berat stabil saja (bit1 = 0).

## 8. MTU, koneksi, keamanan

- Asumsi MTU 23 (payload notify ≤ 20 byte). Jangan bergantung pada negosiasi MTU.
- Interval koneksi 30–50 ms cukup.
- **Tanpa bonding/pairing**, tanpa enkripsi (data antropometri tidak berisi identitas; anak
  diidentifikasi di aplikasi). Jangan memakai passkey.
- Satu koneksi pada satu waktu.

## 9. Validasi rentang

| Besaran | Rentang valid | Di luar rentang |
| --- | --- | --- |
| Berat | 2–200 kg | firmware tidak menandai stabil; aplikasi menolak nilai |
| Tinggi | 45–220 cm | firmware tidak menandai stabil; aplikasi menolak nilai |

Aplikasi juga memvalidasi ulang saat menyimpan (form). Operator selalu bisa mengetik manual.

## 10. Pilihan sensor tinggi

> **PCB v1 (tim hardware):** VL53L0X (I2C) atau Sharp GP2Y0A02 (analog 20–150 cm), sensor di
> platform menghadap **ke atas** ke papan kepala (`tinggi = jarak + offset`). Firmware mendukung
> kedua arah pemasangan; kalibrasi offset lewat perintah Serial `h <cm>`. Uraian di bawah adalah
> kajian awal (pemasangan ke bawah).

Prinsip: sensor dipasang menghadap ke bawah pada ketinggian tetap yang diketahui di atas
platform timbangan, lalu `tinggi_cm = mount_height_cm − jarak_terukur_cm`. Gunakan **papan
penyiku kepala** (head plate) berwarna terang yang diturunkan ke kepala anak, seperti
mikrotoise, agar target pantul rata dan tidak terpengaruh rambut.

| Kriteria | HC-SR04 / JSN-SR04T (ultrasonik) | VL53L1X (ToF laser, I2C) |
| --- | --- | --- |
| Harga | sangat murah | sedang |
| Tegangan | 5 V; pin ECHO 5 V → **wajib pembagi tegangan/level shifter** ke ESP32 (3,3 V). Varian HC-SR04P bisa 3,3 V | 3,3 V, I2C langsung |
| Lebar berkas | lebar (±15°): pantul dari bahu/benda sekitar | sempit (FoV ~27°, ROI bisa dipersempit) |
| Akurasi | ±0,3–1 cm; dipengaruhi suhu (±0,17 %/°C) | ±0,5 cm tipikal pada jarak < 1,3 m |
| Gangguan | permukaan miring/lembut (rambut) menyerap | rambut gelap & sinar matahari langsung menurunkan jangkauan |
| JSN-SR04T | tahan air tapi blind zone ~20–25 cm dan berkas lebih lebar | — |
| Jangkauan | 2–400 cm | hingga 4 m (mode long), 1,3 m (short) |

**Rekomendasi: VL53L1X + head plate terang**, dipakai di dalam ruangan. Alasannya: berkas
sempit (tidak memantul ke bahu), 3,3 V/I2C tanpa level shifting, tidak bergantung suhu, dan
dengan head plate masalah rambut gelap hilang. Dengan pemasangan ±220–230 cm, jarak ke
head plate untuk anak 45–180 cm adalah ~40–185 cm (pakai mode long, timing budget ≥ 50 ms).
HC-SR04 tetap didukung di firmware sebagai opsi hemat biaya.

### Kalibrasi tinggi pemasangan

1. Pasang sensor kaku (tidak goyang), tegak lurus ke platform.
2. Letakkan balok acuan dengan tinggi diketahui (mis. 100,0 cm, diukur meteran baja) di
   atas platform, head plate di atasnya.
3. Baca jarak rata-rata 20 sampel di Serial Monitor (`d=...`).
4. `MOUNT_HEIGHT_CM = 100,0 + jarak_rata_rata_cm`. Simpan di `#define`.
5. Verifikasi dengan balok kedua (mis. 50 cm); selisih harus ≤ 0,5 cm.

## 11. Kalibrasi berat (HX711)

1. Set `CALIBRATION_FACTOR` = 1, unggah, platform kosong → tare otomatis saat boot.
2. Letakkan beban acuan (mis. 10,00 kg). Baca nilai mentah `raw` di Serial Monitor.
3. `CALIBRATION_FACTOR = raw / 10.00`. Simpan, unggah ulang, verifikasi dengan beban lain
   (mis. 20 kg); kesalahan ≤ 0,1 kg.
4. Tanda faktor negatif berarti kabel A+/A− terbalik (boleh pakai faktor negatif).

## 12. Perilaku aplikasi (ringkas)

- Layar Perangkat: Pengaturan › Perangkat, kartu "Alat ukur" di Pencatatan, atau "Atur alat"
  di form siswa. Scan 7 detik → Hubungkan.
- Saat terhubung, aplikasi membaca Device Info, berlangganan Measurement, menampilkan berat,
  tinggi, status stabil, baterai.
- Mode "Alat ukur (opsional)" di form siswa mengisi otomatis berat **dan** tinggi hanya dari
  frame stabil; angka tetap bisa diubah manual.
- Rekaman tersimpan dengan `capture_source = device_ble`; `device_payload` berisi nilai
  terurai, `stable`, `sequence`, `batteryPct`, dan `rawHex` frame terakhir.

## 13. Checklist uji firmware

- [ ] Nama `SmartGrowth-XXXX` terlihat di nRF Connect; UUID `0x181D` di iklan, UUID kustom di
      scan response.
- [ ] `0x2A9D` indicate `00 D8 13` saat beban 25,40 kg stabil.
- [ ] Measurement: frame "mengukur" ≤ 5 Hz, satu frame stabil per siklus, `seq` naik.
- [ ] Unit tanpa sensor tinggi: bit1 selalu 0.
- [ ] Device Info terbaca sesuai §5.
- [ ] Control `01` men-tare; `02` memulai siklus baru.
- [ ] Putus koneksi → kembali beriklan.
- [ ] Aplikasi: kartu "Alat ukur" menampilkan berat/tinggi; form terisi otomatis saat stabil.
