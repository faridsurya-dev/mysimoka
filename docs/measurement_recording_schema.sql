CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_session_status') THEN
    CREATE TYPE public.measurement_session_status AS ENUM (
      'draft',
      'active',
      'completed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_capture_method') THEN
    CREATE TYPE public.measurement_capture_method AS ENUM (
      'manual',
      'automatic'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_capture_source') THEN
    CREATE TYPE public.measurement_capture_source AS ENUM (
      'manual_form',
      'device_ble',
      'face_identification',
      'batch',
      'height_pose'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.measurement_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name text NOT NULL,
  note text,
  session_date date NOT NULL,
  status public.measurement_session_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT measurement_sessions_name_not_blank CHECK (length(btrim(name)) > 0)
);

DROP TRIGGER IF EXISTS set_public_measurement_sessions_updated_at ON public.measurement_sessions;
CREATE TRIGGER set_public_measurement_sessions_updated_at
BEFORE UPDATE ON public.measurement_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS measurement_sessions_school_id_idx
  ON public.measurement_sessions (school_id);

CREATE INDEX IF NOT EXISTS measurement_sessions_class_id_idx
  ON public.measurement_sessions (class_id);

CREATE INDEX IF NOT EXISTS measurement_sessions_session_date_idx
  ON public.measurement_sessions (session_date DESC);

CREATE INDEX IF NOT EXISTS measurement_sessions_status_idx
  ON public.measurement_sessions (status);

CREATE TABLE IF NOT EXISTS public.student_measurement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.measurement_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  student_enrollment_id uuid REFERENCES public.student_enrollments(id) ON UPDATE CASCADE ON DELETE SET NULL,
  recorded_by uuid REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  capture_method public.measurement_capture_method NOT NULL,
  capture_source public.measurement_capture_source NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  notes text,
  device_id text,
  device_name text,
  device_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_measurement_records_has_value CHECK (
    height_cm IS NOT NULL OR weight_kg IS NOT NULL
  ),
  CONSTRAINT student_measurement_records_height_range CHECK (
    height_cm IS NULL OR (height_cm >= 30 AND height_cm <= 250)
  ),
  CONSTRAINT student_measurement_records_weight_range CHECK (
    weight_kg IS NULL OR (weight_kg >= 1 AND weight_kg <= 300)
  ),
  CONSTRAINT student_measurement_records_source_matches_method CHECK (
    (capture_method = 'manual' AND capture_source = 'manual_form')
    OR
    (capture_method = 'automatic' AND capture_source IN (
      'device_ble',
      'face_identification',
      'batch',
      'height_pose'
    ))
  ),
  CONSTRAINT student_measurement_records_one_per_session_student UNIQUE (
    session_id,
    student_id
  ),
  CONSTRAINT student_measurement_records_client_record_unique UNIQUE (
    client_record_id
  )
);

DROP TRIGGER IF EXISTS set_public_student_measurement_records_updated_at
  ON public.student_measurement_records;
CREATE TRIGGER set_public_student_measurement_records_updated_at
BEFORE UPDATE ON public.student_measurement_records
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS student_measurement_records_session_id_idx
  ON public.student_measurement_records (session_id);

CREATE INDEX IF NOT EXISTS student_measurement_records_student_id_idx
  ON public.student_measurement_records (student_id);

CREATE INDEX IF NOT EXISTS student_measurement_records_measured_at_idx
  ON public.student_measurement_records (measured_at DESC);

CREATE INDEX IF NOT EXISTS student_measurement_records_capture_method_idx
  ON public.student_measurement_records (capture_method);

COMMENT ON TABLE public.measurement_sessions IS
  'Sesi pencatatan antropometri per sekolah dan kelas.';

COMMENT ON TABLE public.student_measurement_records IS
  'Hasil pencatatan tinggi/berat siswa. capture_method membedakan manual dan otomatis.';

COMMENT ON COLUMN public.student_measurement_records.client_record_id IS
  'UUID lokal dari mobile untuk idempotent upsert saat sync offline.';

COMMENT ON COLUMN public.student_measurement_records.device_payload IS
  'Payload mentah/metadata dari perangkat otomatis, BLE, face identification, batch, atau height pose.';


