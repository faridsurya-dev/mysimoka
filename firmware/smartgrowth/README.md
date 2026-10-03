# Firmware SmartGrowth (ESP32, BLE)

Firmware alat ukur tinggi + berat MySimoka. Protokol: [`docs/ble-smartgrowth-protocol.md`](../../docs/ble-smartgrowth-protocol.md).

> **Belum diuji di perangkat keras.** Compile dan flash sendiri, lalu jalankan checklist di
> protokol §13 (nRF Connect + aplikasi MySimoka).

Menggantikan sketch tim v1.1 (Bluetooth Classic SPP "TimbanganBadan", JSON). Aplikasi hanya
memakai BLE, dan iPhone tidak mendukung SPP, jadi alat v1.1 tidak pernah terlihat di aplikasi.
Pin HX711 (DT 33, SCK 32), LED (25/26/27/14), I2C (21/22) dan kalibrasi awal diambil dari v1.1.

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

Saat boot, tare otomatis hanya bila platform hampir kosong (< 3 kg), jadi anak yang berdiri di
timbangan saat alat dinyalakan tidak jadi titik nol.

## Belum ada

- Sensor PPG (`catatan.txt`): belum ada di protokol v1.
- Pembacaan baterai: isi `BATTERY_ADC_PIN` bila PCB punya pembagi tegangan ke ADC1.
