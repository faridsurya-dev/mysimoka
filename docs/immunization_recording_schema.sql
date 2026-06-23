CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'immunization_session_status') THEN
    CREATE TYPE public.immunization_session_status AS ENUM (
      'draft',
      'active',
      'completed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'immunization_record_status') THEN
    CREATE TYPE public.immunization_record_status AS ENUM (
      'given',
      'deferred',
      'refused',
      'absent'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'immunization_capture_method') THEN
    CREATE TYPE public.immunization_capture_method AS ENUM (
      'manual',
      'batch'
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

CREATE TABLE IF NOT EXISTS public.immunization_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name text NOT NULL,
  vaccine_name text NOT NULL,
  dose_label text,
  officer_name text,
  note text,
  session_date date NOT NULL,
  status public.immunization_session_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT immunization_sessions_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT immunization_sessions_vaccine_name_not_blank CHECK (length(btrim(vaccine_name)) > 0),
  CONSTRAINT immunization_sessions_dose_label_not_blank CHECK (
    dose_label IS NULL OR length(btrim(dose_label)) > 0
  ),
  CONSTRAINT immunization_sessions_officer_name_not_blank CHECK (
    officer_name IS NULL OR length(btrim(officer_name)) > 0
  )
);

DROP TRIGGER IF EXISTS set_public_immunization_sessions_updated_at ON public.immunization_sessions;
CREATE TRIGGER set_public_immunization_sessions_updated_at
BEFORE UPDATE ON public.immunization_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS immunization_sessions_school_id_idx
  ON public.immunization_sessions (school_id);

CREATE INDEX IF NOT EXISTS immunization_sessions_class_id_idx
  ON public.immunization_sessions (class_id);

CREATE INDEX IF NOT EXISTS immunization_sessions_session_date_idx
  ON public.immunization_sessions (session_date DESC);

CREATE INDEX IF NOT EXISTS immunization_sessions_status_idx
  ON public.immunization_sessions (status);

CREATE INDEX IF NOT EXISTS immunization_sessions_vaccine_name_idx
  ON public.immunization_sessions (vaccine_name);

CREATE TABLE IF NOT EXISTS public.student_immunization_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.immunization_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  student_enrollment_id uuid REFERENCES public.student_enrollments(id) ON UPDATE CASCADE ON DELETE SET NULL,
  recorded_by uuid REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status public.immunization_record_status NOT NULL DEFAULT 'given',
  capture_method public.immunization_capture_method NOT NULL DEFAULT 'manual',
  administered_at timestamptz NOT NULL DEFAULT now(),
  vaccine_name text NOT NULL,
  dose_label text,
  officer_name text,
  batch_number text,
  injection_site text,
  notes text,
  adverse_event_notes text,
  client_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_immunization_records_vaccine_name_not_blank CHECK (length(btrim(vaccine_name)) > 0),
  CONSTRAINT student_immunization_records_dose_label_not_blank CHECK (
    dose_label IS NULL OR length(btrim(dose_label)) > 0
  ),
  CONSTRAINT student_immunization_records_batch_number_not_blank CHECK (
    batch_number IS NULL OR length(btrim(batch_number)) > 0
  ),
  CONSTRAINT student_immunization_records_one_per_session_student UNIQUE (
    session_id,
    student_id
  ),
  CONSTRAINT student_immunization_records_client_record_unique UNIQUE (
    client_record_id
  )
);

DROP TRIGGER IF EXISTS set_public_student_immunization_records_updated_at
  ON public.student_immunization_records;
CREATE TRIGGER set_public_student_immunization_records_updated_at
BEFORE UPDATE ON public.student_immunization_records
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS student_immunization_records_session_id_idx
  ON public.student_immunization_records (session_id);

CREATE INDEX IF NOT EXISTS student_immunization_records_student_id_idx
  ON public.student_immunization_records (student_id);

CREATE INDEX IF NOT EXISTS student_immunization_records_administered_at_idx
  ON public.student_immunization_records (administered_at DESC);

CREATE INDEX IF NOT EXISTS student_immunization_records_status_idx
  ON public.student_immunization_records (status);

CREATE INDEX IF NOT EXISTS student_immunization_records_vaccine_name_idx
  ON public.student_immunization_records (vaccine_name);

COMMENT ON TABLE public.immunization_sessions IS
  'Sesi pencatatan imunisasi per sekolah dan kelas.';

COMMENT ON TABLE public.student_immunization_records IS
  'Hasil pencatatan imunisasi siswa pada satu sesi.';

COMMENT ON COLUMN public.student_immunization_records.client_record_id IS
  'UUID lokal dari mobile untuk idempotent upsert saat sync offline.';

COMMENT ON COLUMN public.student_immunization_records.status IS
  'Status pencatatan imunisasi: given, deferred, refused, atau absent.';

