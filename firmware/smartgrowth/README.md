# Firmware SmartGrowth (ESP32, BLE)

Firmware alat ukur tinggi + berat MySimoka. Protokol: [`docs/ble-smartgrowth-protocol.md`](../../docs/ble-smartgrowth-protocol.md).

> **Belum diuji di perangkat keras.** Compile dan flash sendiri, lalu jalankan checklist di
> protokol §13 (nRF Connect + aplikasi MySimoka).

Menggantikan sketch tim v1.1 (Bluetooth Classic SPP "TimbanganBadan", JSON). Aplikasi hanya
memakai BLE, dan iPhone tidak mendukung SPP, jadi alat v1.1 tidak pernah terlihat di aplikasi.
Pin mengikuti PCB `Esp32_Sensorjarak`: HX711 DT 16 / SCK 4, Sharp GP2Y0A02 di GPIO 34, I2C (VL53L0X) 21/22. LED (25/26/27/14) dari v1.1, tidak ada di PCB. Kalibrasi awal diambil dari v1.1.

## Build

1. Arduino IDE → Boards Manager: **esp32** (Espressif). Board: **ESP32 Dev Module**.
2. Library Manager: **NimBLE-Arduino** 2.x, **VL53L0X** (Pololu, 1.3.x). HX711 dibaca langsung tanpa library (library HX711 umum macet selamanya bila HX711 tidak terpasang).
3. Buka `smartgrowth.ino`, sesuaikan blok *Hardware configuration* dengan PCB, upload.

## Sensor tinggi

`HEIGHT_SENSOR_AUTO` (default): VL53L0X di I2C dipakai bila terdeteksi; kalau tidak, Sharp
GP2Y0A02 bila `SHARP_ADC_PIN` diisi (pin ADC1, GPIO 32–39); kalau tidak ada keduanya, alat
tetap jalan sebagai timbangan saja. Sensor rusak/lepas tidak lagi membuat alat macet.

Pemasangan default (sejak 2.2.0): sensor di rangka atas menghadap **ke bawah** ke papan
kepala (`HEIGHT_MOUNT HEIGHT_MOUNT_DOWN`, `tinggi = offset − jarak`; offset diisi oleh
kalibrasi tinggi). Geometri v1.1 (sensor di platform menghadap ke atas, `tinggi = jarak +
offset`): set `HEIGHT_MOUNT HEIGHT_MOUNT_UP`. VL53L0X memakai mode high accuracy (±1,2 m).

## Kalibrasi (Serial Monitor 115200, akhir baris "Newline")

Nilai tersimpan di flash (NVS), tetap ada setelah alat mati.

| Perintah | Fungsi |
| --- | --- |
| `t` | tare, platform kosong |
| `pw 46.25` | tambah titik latih berat: beban acuan 46,25 kg di timbangan (fw 2.3+) |
| `ph 170.0` | tambah titik latih tinggi: tinggi acuan 170,0 cm di bawah papan kepala (fw 2.3+) |
| `l` | daftar titik + model (rumus, RMSE, selisih tiap titik) |
| `xw 2` / `xw *` | hapus titik berat ke-2 / semua titik berat (`xh` untuk tinggi) |
| `c 10.00` | kalibrasi berat 1 titik: taruh beban acuan 10,00 kg dulu (mengganti semua titik berat) |
| `h 100.0` | kalibrasi tinggi 1 titik: balok acuan 100,0 cm + papan kepala di atasnya |
| `r` | kembalikan kalibrasi ke default (titik ikut terhapus) |
| `i` | status (model, jumlah titik, sensor, bacaan terakhir) |

### Penstabil sensor (firmware 2.3+, regresi linier)

Berat dan tinggi tidak lagi memakai satu faktor/offset tetap. Alat menyimpan titik latih
(nilai sensor + nilai acuan dari timbangan/meteran terkalibrasi, maks. 10 per jenis) dan
menghitung sendiri rumus koreksi dengan regresi linier (least squares) plus galatnya (RMSE):
`kg = slope × (raw − zero) + intercept`, `cm = slope × jarak + intercept`. Bacaan tetap
disaring dulu (median, jendela stabil, modus 5 detik) seperti 2.2.4.

- Tanpa titik: nilai kalibrasi lama (faktor/offset dari `c`/`h` atau firmware < 2.3) tetap
  dipakai, jadi update firmware tidak mengubah hasil ukur sampai titik pertama ditambah.
- Regresi butuh ≥ 2 titik yang berjauhan (berat ≥ 10 kg, tinggi ≥ 20 cm). Kurang dari itu:
  berat lewat titik nol, tinggi hanya offset. Regresi berat selalu ikut memakai titik nol
  (tare) sebagai jangkar, supaya titik dari orang dewasa saja tidak membuat berat anak meleset.
- Disarankan 3–5 titik merata, mis. 10, 30, 60 kg dan 80, 120, 160 cm.
- Titik ditambah/dihapus dari aplikasi (Mode teknisi → Cek akurasi & kalibrasi) lewat BLE:
  melatih ulang tidak perlu kabel USB. Model + titik: characteristic `519e0007` (protokol §6c).

### Kalibrasi dari aplikasi (firmware 2.1+, BLE)

Di aplikasi: Perangkat → SmartGrowth terhubung → **Cek akurasi & kalibrasi**. Langkah utama
adalah *cek akurasi* (beban/balok acuan, 5 bacaan, bias/kesalahan/SD dibanding toleransi);
penyesuaian alat opsional, lalu cek ulang. Semua cek dan perintah kalibrasi tercatat di server
(`device_calibrations`).

| Control (`519e0004`) | Fungsi |
| --- | --- |
| `01` | tare (ditolak bila platform tidak kosong, seperti v1) |
| `01 01` | tare paksa (wizard aplikasi) |
| `20` + float32 LE kg | kalibrasi berat, mis. 10 kg = `20 00 00 20 41` |
| `21` + float32 LE cm | kalibrasi tinggi |
| `22 A5` | reset kalibrasi ke default |
| `23` + float32 LE kg | tambah titik latih berat (fw 2.3+) |
| `24` + float32 LE cm | tambah titik latih tinggi (fw 2.3+) |
| `25` + u8 jenis + u8 indeks | hapus titik (jenis 1 berat / 2 tinggi, indeks `FF` = semua) (fw 2.3+) |

Hasil + nilai kalibrasi aktif: characteristic Calibration `519e0006-59fe-44b5-828f-34822e2361a9`
(read + notify, 20 byte), detail di protokol §6b. Perintah Serial di atas tetap jalan dan ikut
memperbarui characteristic ini. Flag "tinggi dikalibrasi" disimpan di NVS (`hcal`).

Saat boot, tare otomatis hanya bila platform hampir kosong (< 3 kg), jadi anak yang berdiri di
timbangan saat alat dinyalakan tidak jadi titik nol.

## Belum ada

- Sensor PPG (`catatan.txt`): belum ada di protokol v1.
- Pembacaan baterai: isi `BATTERY_ADC_PIN` bila PCB punya pembagi tegangan ke ADC1.
