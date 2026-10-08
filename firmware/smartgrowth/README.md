# Firmware SmartGrowth (ESP32, BLE)

Firmware alat ukur tinggi + berat MySimoka. Protokol: [`docs/ble-smartgrowth-protocol.md`](../../docs/ble-smartgrowth-protocol.md).

> **Belum diuji di perangkat keras.** Compile dan flash sendiri, lalu jalankan checklist di
> protokol §13 (nRF Connect + aplikasi MySimoka).

Menggantikan sketch tim v1.1 (Bluetooth Classic SPP "TimbanganBadan", JSON). Aplikasi hanya
memakai BLE, dan iPhone tidak mendukung SPP, jadi alat v1.1 tidak pernah terlihat di aplikasi.
Pin mengikuti PCB `Esp32_Sensorjarak`: HX711 DT 16 / SCK 4, Sharp GP2Y0A02 di GPIO 34, I2C (VL53L0X) 21/22. LED (25/26/27/14) dari v1.1, tidak ada di PCB. Kalibrasi awal diambil dari v1.1.

## Build

1. Arduino IDE → Boards Manager: **esp32** (Espressif). Board: **ESP32 Dev Module**.
2. Library Manager: **NimBLE-Arduino** 2.x, **Adafruit_VL53L0X**. HX711 dibaca langsung tanpa library (library HX711 umum macet selamanya bila HX711 tidak terpasang).
3. Buka `smartgrowth.ino`, sesuaikan blok *Hardware configuration* dengan PCB, upload.

## Sensor tinggi

`HEIGHT_SENSOR_AUTO` (default): VL53L0X di I2C dipakai bila terdeteksi; kalau tidak, Sharp
GP2Y0A02 bila `SHARP_ADC_PIN` diisi (pin ADC1, GPIO 32–39); kalau tidak ada keduanya, alat
tetap jalan sebagai timbangan saja. Sensor rusak/lepas tidak lagi membuat alat macet.

Pemasangan default sama dengan v1.1: sensor di platform menghadap **ke atas** ke papan di
kepala anak (`tinggi = jarak + offset`). Sensor di atas menghadap ke bawah: set
`HEIGHT_MOUNT HEIGHT_MOUNT_DOWN` (`tinggi = offset − jarak`).

## Kalibrasi (Serial Monitor 115200, akhir baris "Newline")

Nilai tersimpan di flash (NVS), tetap ada setelah alat mati.

| Perintah | Fungsi |
| --- | --- |
| `t` | tare, platform kosong |
| `c 10.00` | kalibrasi berat: taruh beban acuan 10,00 kg dulu |
| `h 100.0` | kalibrasi tinggi: balok acuan 100,0 cm + papan kepala di atasnya |
| `r` | kembalikan kalibrasi ke default |
| `i` | status (offset, faktor, sensor, bacaan terakhir) |

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

Hasil + nilai kalibrasi aktif: characteristic Calibration `519e0006-59fe-44b5-828f-34822e2361a9`
(read + notify, 20 byte), detail di protokol §6b. Perintah Serial di atas tetap jalan dan ikut
memperbarui characteristic ini. Flag "tinggi dikalibrasi" disimpan di NVS (`hcal`).

Saat boot, tare otomatis hanya bila platform hampir kosong (< 3 kg), jadi anak yang berdiri di
timbangan saat alat dinyalakan tidak jadi titik nol.

## Belum ada

- Sensor PPG (`catatan.txt`): belum ada di protokol v1.
- Pembacaan baterai: isi `BATTERY_ADC_PIN` bila PCB punya pembagi tegangan ke ADC1.
