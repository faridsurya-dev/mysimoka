# MySimoka API Contract

## Overview

Aplikasi ini menggunakan pola **Multi-Tenant (Per Sekolah)** dan **Temporal (Per Tahun Ajaran)**. Semua request (kecuali auth) wajib menyertakan konteks sekolah dan tahun ajaran aktif melalui custom headers.

---

## Global Headers

| Header | Value | Requirement |
|---|---|---|
| `Authorization` | `Bearer <token>` | Required for protected routes |
| `X-School-ID` | `UUID` | Required to scope data |
| `X-Academic-Year-ID` | `UUID` | Required to scope classrooms/history |

---

## 1. Authentication & Context

### Login
`POST /api/v1/auth/login`
- **Request**: `{ "email": "", "password": "" }`
- **Response**: `{ "token": "", "user": { ... }, "memberships": [ { "school_id": "", "role": "", "is_default": true } ] }`

### Academic Years
`GET /api/v1/academic-years`
- **Response**: `[ { "id": "", "label": "2025/2026", "is_active": true } ]`

---

## 2. Master Data

### Classrooms
`GET /api/v1/classrooms`
- **Query Params**: `academic_year_id` (optional, defaults to X-Academic-Year-ID)
- **Response**: `[ { "id": "", "name": "Kelas 3A", "grade_level": 3, "homeroom_teacher": "Aisyah" } ]`

### Students in Classroom
`GET /api/v1/classrooms/{id}/students`
- **Query Params**: `search`
- **Response**: `[ { "id": "", "nisn": "", "name": "", "gender": "" } ]`

---

## 3. Measurement Sessions

### Create Session
`POST /api/v1/measurement-sessions`
- **Request**:
```json
{
  "classroom_id": "UUID",
  "session_date": "YYYY-MM-DD",
  "mode": "batch",
  "notes": ""
}
```

### Get Session Queue
`GET /api/v1/measurement-sessions/{id}/students`
- **Response**:
```json
[
  {
    "id": "UUID (session_student_id)",
    "student_id": "UUID",
    "queue_order": 1,
    "is_skipped": false,
    "student": { "name": "", "nisn": "" }
  }
]
```

---

## 4. Measurement & Syncing

### Batch Sync Measurement (Offline-First)
`POST /api/v1/measurements/sync`
- **Request**:
```json
{
  "measurements": [
    {
      "session_id": "UUID",
      "student_id": "UUID",
      "measured_at": "ISO8601",
      "height_cm": 125.5,
      "weight_kg": 28.2,
      "identification_method": "face_recognition",
      "device_readings": [
        {
          "device_id": "UUID",
          "device_type": "height",
          "value": 125.5,
          "is_selected": true
        }
      ]
    }
  ]
}
```
- **Response**: `201 Created` with success summary.

---

## 5. Devices

### List Devices
`GET /api/v1/devices`
- **Response**: `[ { "id": "", "device_code": "", "device_type": "height", "status": "active" } ]`
