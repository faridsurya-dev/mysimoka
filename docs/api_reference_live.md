# MySimoka API Reference (Live)

Dokumen ini dibuat dari dokumentasi live:
`https://api.mysimoka.sunhouse.co.id/api/docs`

Snapshot OpenAPI tersimpan di:
`docs/openapi.mysimoka.yaml`

Tanggal sinkronisasi: `2026-04-19`

## Base URL

- `https://api.mysimoka.sunhouse.co.id`

## Authentication

- Protected route menggunakan `Authorization: Bearer <access_token>`
- Skema keamanan pada OpenAPI: `bearerAuth`
- Endpoint refresh token:
  - `POST /api/auth/refresh`

## Environment Mobile App

Konfigurasi base URL aplikasi mobile:

- Env key: `MYSIMOKA_API_BASE_URL`
- Fallback default: `https://api.mysimoka.sunhouse.co.id/`
- Implementasi: `src/services/environment.ts`

## Daftar Endpoint

### Public

- `GET /api/health`
- `POST /api/schools/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Users (Protected)

- `GET /api/users`
- `GET /api/users/{id}`
- `PATCH /api/users/{id}`

### Students (Protected)

- `GET /api/students`
- `POST /api/students`
- `GET /api/students/{id}`
- `PATCH /api/students/{id}`
- `DELETE /api/students/{id}`

### Teachers (Protected)

- `GET /api/teachers`
- `POST /api/teachers`
- `GET /api/teachers/{id}`

### Classes (Protected)

- `GET /api/classes`
- `POST /api/classes`
- `GET /api/classes/{id}`
- `PATCH /api/classes/{id}`
- `POST /api/classes/{id}/enroll`
- `POST /api/classes/{id}/assign-teacher`

### Measurements (Protected)

- `GET /api/measurements/sessions`
- `POST /api/measurements/sessions`
- `POST /api/measurements`
- `GET /api/measurements/students/{id}`

### Face Embeddings (Protected)

- `POST /api/face-embeddings`
- `GET /api/face-embeddings/students/{id}`
- `DELETE /api/face-embeddings/{id}`
- `POST /api/face-embeddings/search`

## Catatan Integrasi

- Semua endpoint pada dokumen live saat ini memakai prefix `/api` (bukan `/api/v1`).
- Dokumen lama `docs/api_contract.md` masih berisi kontrak versi sebelumnya (`/api/v1`) dan perlu diperlakukan sebagai referensi historis.
- Gunakan file `docs/openapi.mysimoka.yaml` sebagai sumber sinkronisasi untuk update SDK/service layer berikutnya.

## Cara Sinkron Ulang

Perintah untuk memperbarui snapshot OpenAPI lokal:

```powershell
Invoke-WebRequest -Uri "https://api.mysimoka.sunhouse.co.id/api/docs/openapi.yaml" `
  -OutFile "docs/openapi.mysimoka.yaml" -UseBasicParsing
```
