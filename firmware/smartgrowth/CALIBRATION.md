# Catatan kalibrasi SmartGrowth

Kalibrasi tersimpan di NVS ESP32. Flash `smartgrowth.ino.merged.bin` menghapus NVS (kembali ke
default), jadi untuk update program pakai `smartgrowth.ino.bin` saja di alamat `0x10000`, atau
masukkan ulang nilai di bawah lewat Serial (`c <kg>` / `h <cm>`).

## SG-14F13A (prototipe, PCB Esp32_Sensorjarak)

Tanggal: 2026-10-11, dikalibrasi di firmware 2.2.0, terpasang firmware 2.2.3 (tag `firmware-v2.2.3`).

| Nilai | Isi | Asal |
| --- | --- | --- |
| Faktor berat | 23357.62 | `t` lalu `c 92.6`, pembanding timbangan Mijia S400 (92,6 kg, orang dewasa) |
| Offset tinggi | 204.3 cm | sensor di atas menghadap ke bawah; cek orang 181 cm terbaca 180,5–180,9 |
| Zero (tare) | ≈1453138 | berubah tiap tare, tare otomatis saat boot bila platform kosong. Tare HANYA saat alat berdiri tegak: tiang + rangka atas ≈5,3 kg ikut ditimbang, tare saat alat ditidurkan membuat semua berat +5,3 kg |

Hasil sebelum kalibrasi berat: faktor 23666 membaca 91,4 kg untuk 92,6 kg (−1,3%).

Belum dicek: berat ringan (10–30 kg) dengan beban acuan pasti.

Uji 2026-10-11 di 2.2.3: orang 92,4 kg (Mijia) → hasil 92,20 kg, tinggi 181 cm → 180,0–180,9 cm;
orang 61,4 kg / 175 cm → 61,9 kg / 174,2 cm (berat acuan orang ini belum ditimbang ulang).
