/**
 * Helper data sekolah untuk modul dashboard (kelas, siswa, guru, riwayat).
 * Semua query memakai kontrak Hasura yang sudah ada — tidak menambah endpoint baru.
 */
import {
  apiRequest,
  getAuthSession,
  listMemberships,
  normalizeRoleKey,
  searchStudentsBySchool,
  type DashboardStudentListItem,
} from './auth';
import { GRAPHQL_URL } from './environment';

type UnknownRecord = Record<string, unknown>;
type GraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
} | null;

export type SchoolRole = 'school_admin' | 'teacher' | 'user';

export type BmiCategory = 'Kurus' | 'Normal' | 'Gemuk' | 'Obes';

export type StudentMeasurementEntry = {
  id: string;
  measuredAt: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  bmiCategory: BmiCategory | null;
  captureMethod: string | null;
  notes: string | null;
};

export type StudentImmunizationEntry = {
  id: string;
  vaccineName: string;
  doseLabel: string | null;
  status: string | null;
  administeredAt: string | null;
  officerName: string | null;
  batchNumber: string | null;
  notes: string | null;
};

export type StudentDetail = DashboardStudentListItem & {
  classId: string | null;
  enrollmentId: string | null;
};

export type ClassroomDetail = {
  id: string;
  name: string;
  gradeLevelNumber: number | null;
  gradeLevelLabel: string | null;
  academicYearLabel: string | null;
};

export type ClassMeasurementSummary = {
  sessionCount: number;
  measuredStudentCount: number;
  lastMeasuredAt: string | null;
  bmiDistribution: Record<BmiCategory, number>;
  averageHeightCm: number | null;
  averageWeightKg: number | null;
};

export type UpdateStudentPayload = {
  studentId: string;
  fullName: string;
  nisn: string;
  gender: 'male' | 'female' | null;
  birthDate: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
  classId?: string | null;
  previousClassId?: string | null;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

async function graphql<TData>(
  query: string,
  variables: UnknownRecord | undefined,
  fallbackMessage: string,
): Promise<TData> {
  const response = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  })) as GraphqlResponse<TData>;

  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    throw new Error(toFriendlyGraphqlError(response.errors[0]?.message, fallbackMessage));
  }
  if (!response?.data) {
    throw new Error(fallbackMessage);
  }
  return response.data;
}

/** Pesan Hasura "field not found" biasanya berarti peran tidak punya izin. */
function toFriendlyGraphqlError(message: string | undefined, fallback: string): string {
  if (!message) {
    return fallback;
  }
  if (/not found in type|permission|access/i.test(message)) {
    return 'Data ini belum dapat diakses dengan peran akun Anda.';
  }
  return message;
}

export function isPermissionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === 'Data ini belum dapat diakses dengan peran akun Anda.'
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// Peran pengguna di sekolah aktif
// ---------------------------------------------------------------------------

const roleCache = new Map<string, SchoolRole>();

function toSchoolRole(value: string | null | undefined): SchoolRole | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeRoleKey(value);
  if (normalized === 'school_admin' || normalized === 'teacher' || normalized === 'user') {
    return normalized;
  }
  return null;
}

/** Peran cepat (sinkron) dari sesi login, dipakai sebelum membership termuat. */
export function getCachedSchoolRole(schoolId: string | null): SchoolRole | null {
  if (schoolId && roleCache.has(schoolId)) {
    return roleCache.get(schoolId) ?? null;
  }
  const user = asRecord(getAuthSession().user);
  return toSchoolRole(readString(user?.active_school_role));
}

export async function resolveSchoolRole(schoolId: string | null): Promise<SchoolRole | null> {
  if (!schoolId) {
    return getCachedSchoolRole(null);
  }
  const memberships = await listMemberships();
  const membership =
    memberships.find(item => item.school_id === schoolId && item.status === 'active') ??
    memberships.find(item => item.school_id === schoolId) ??
    null;
  const role = toSchoolRole(membership?.role) ?? getCachedSchoolRole(null);
  if (role) {
    roleCache.set(schoolId, role);
  }
  return role;
}

// ---------------------------------------------------------------------------
// BMI
// ---------------------------------------------------------------------------

export function computeBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** Kategori sama dengan analitik dashboard (ambang dewasa sederhana). */
export function getBmiCategory(bmi: number | null): BmiCategory | null {
  if (bmi === null) {
    return null;
  }
  if (bmi < 18.5) {
    return 'Kurus';
  }
  if (bmi < 25) {
    return 'Normal';
  }
  if (bmi < 30) {
    return 'Gemuk';
  }
  return 'Obes';
}

// ---------------------------------------------------------------------------
// Siswa
// ---------------------------------------------------------------------------

const STUDENT_FIELDS = `
  id
  is_active
  full_name
  parent_name
  parent_phone
  student_number
  date_of_birth
  address
  notes
  created_at
  updated_at
  gender
`;

function normalizeStudent(row: unknown): StudentDetail | null {
  const source = asRecord(row);
  const id = readString(source?.id);
  const name = readString(source?.full_name);
  if (!id || !name) {
    return null;
  }
  const enrollments = Array.isArray(source?.enrollments)
    ? source.enrollments.map(asRecord).filter((item): item is UnknownRecord => item !== null)
    : [];
  const enrollment =
    enrollments.find(item => readString(item.status) === 'active') ?? enrollments[0] ?? null;
  const classRecord = asRecord(enrollment?.class);

  return {
    id,
    name,
    nisn: readString(source?.student_number) ?? '-',
    className: readString(classRecord?.name) ?? '-',
    classId: readString(enrollment?.class_id),
    enrollmentId: readString(enrollment?.id),
    isActive: source?.is_active !== false,
    parentName: readString(source?.parent_name),
    parentPhone: readString(source?.parent_phone),
    dateOfBirth: readString(source?.date_of_birth),
    address: readString(source?.address),
    notes: readString(source?.notes),
    gender: readString(source?.gender),
    createdAt: readString(source?.created_at),
    updatedAt: readString(source?.updated_at),
  };
}

export async function getStudentDetail(studentId: string): Promise<StudentDetail | null> {
  const withEnrollments = `
    query StudentDetail($id: uuid!) {
      students_by_pk(id: $id) {
        ${STUDENT_FIELDS}
        enrollments(order_by: [{ created_at: desc }]) {
          id
          status
          class_id
          class { name }
        }
      }
    }
  `;
  const basic = `
    query StudentDetailBasic($id: uuid!) {
      students_by_pk(id: $id) {
        ${STUDENT_FIELDS}
      }
    }
  `;
  try {
    const data = await graphql<{ students_by_pk?: unknown }>(
      withEnrollments,
      { id: studentId },
      'Gagal memuat detail siswa.',
    );
    return normalizeStudent(data.students_by_pk);
  } catch {
    const data = await graphql<{ students_by_pk?: unknown }>(
      basic,
      { id: studentId },
      'Gagal memuat detail siswa.',
    );
    return normalizeStudent(data.students_by_pk);
  }
}

/** Pencarian siswa lengkap dengan nama kelas; fallback ke pencarian lama. */
export async function searchStudentsWithClass(
  schoolId: string,
  keyword: string,
): Promise<DashboardStudentListItem[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }
  const query = `
    query SearchStudentsWithClass($keyword: String!) {
      students(
        where: {
          _or: [
            { full_name: { _ilike: $keyword } },
            { student_number: { _ilike: $keyword } },
            { parent_name: { _ilike: $keyword } }
          ]
        }
        order_by: [{ full_name: asc }]
        limit: 50
      ) {
        ${STUDENT_FIELDS}
        enrollments(order_by: [{ created_at: desc }]) {
          id
          status
          class_id
          class { name school_id }
        }
      }
    }
  `;
  try {
    const data = await graphql<{ students?: unknown[] }>(
      query,
      { keyword: `%${trimmed}%` },
      'Gagal mencari siswa.',
    );
    const rows = Array.isArray(data.students) ? data.students : [];
    return rows
      .filter(row => {
        // Pastikan siswa terdaftar di kelas sekolah aktif bila informasi tersedia.
        const enrollments = asRecord(row)?.enrollments;
        if (!Array.isArray(enrollments) || enrollments.length === 0) {
          return true;
        }
        return enrollments.some(item => {
          const classSchoolId = readString(asRecord(asRecord(item)?.class)?.school_id);
          return !classSchoolId || classSchoolId === schoolId;
        });
      })
      .map(normalizeStudent)
      .filter((item): item is StudentDetail => item !== null);
  } catch {
    return searchStudentsBySchool(schoolId, trimmed);
  }
}

export async function updateStudent(payload: UpdateStudentPayload): Promise<void> {
  const fullName = payload.fullName.trim();
  const nisn = payload.nisn.trim();
  if (!payload.studentId || !fullName) {
    throw new Error('Nama siswa wajib diisi.');
  }
  if (!nisn) {
    throw new Error('NISN wajib diisi.');
  }

  const mutation = `
    mutation UpdateStudent($id: uuid!, $set: students_set_input!) {
      update_students_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
      }
    }
  `;
  const set: UnknownRecord = {
    full_name: fullName,
    student_number: nisn,
    gender: payload.gender,
    date_of_birth: emptyToNull(payload.birthDate),
    parent_name: emptyToNull(payload.parentName),
    parent_phone: emptyToNull(payload.parentPhone),
    address: emptyToNull(payload.address),
    notes: emptyToNull(payload.notes),
  };
  if (typeof payload.isActive === 'boolean') {
    set.is_active = payload.isActive;
  }

  const data = await graphql<{ update_students_by_pk?: { id?: string } | null }>(
    mutation,
    { id: payload.studentId, set },
    'Gagal menyimpan data siswa.',
  );
  if (!data.update_students_by_pk?.id) {
    throw new Error('Siswa tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya.');
  }

  if (payload.classId && payload.classId !== payload.previousClassId) {
    await moveStudentToClass(payload.studentId, payload.classId, payload.previousClassId ?? null);
  }
}

/** Pindahkan enrollment aktif siswa ke kelas lain (atau buat baru bila belum ada). */
export async function moveStudentToClass(
  studentId: string,
  classId: string,
  previousClassId: string | null,
): Promise<void> {
  if (previousClassId) {
    const mutation = `
      mutation MoveStudentEnrollment($studentId: uuid!, $fromClassId: uuid!, $toClassId: uuid!) {
        update_student_enrollments(
          where: { student_id: { _eq: $studentId }, class_id: { _eq: $fromClassId } }
          _set: { class_id: $toClassId, status: "active" }
        ) {
          affected_rows
        }
      }
    `;
    const data = await graphql<{ update_student_enrollments?: { affected_rows?: number } | null }>(
      mutation,
      { studentId, fromClassId: previousClassId, toClassId: classId },
      'Gagal memindahkan siswa ke kelas baru.',
    );
    if ((data.update_student_enrollments?.affected_rows ?? 0) > 0) {
      return;
    }
  }

  const insertMutation = `
    mutation EnrollStudent($studentId: uuid!, $classId: uuid!) {
      insert_student_enrollments_one(
        object: { student_id: $studentId, class_id: $classId, status: "active" }
      ) {
        id
      }
    }
  `;
  await graphql(insertMutation, { studentId, classId }, 'Gagal memasukkan siswa ke kelas.');
}

export async function getStudentMeasurementHistory(
  studentId: string,
): Promise<StudentMeasurementEntry[]> {
  const query = `
    query StudentMeasurementHistory($studentId: uuid!) {
      student_measurement_records(
        where: { student_id: { _eq: $studentId } }
        order_by: [{ measured_at: asc }, { created_at: asc }]
      ) {
        id
        height_cm
        weight_kg
        measured_at
        created_at
        capture_method
        notes
      }
    }
  `;
  const data = await graphql<{ student_measurement_records?: unknown[] }>(
    query,
    { studentId },
    'Gagal memuat riwayat pengukuran.',
  );
  return (data.student_measurement_records ?? [])
    .map(row => {
      const source = asRecord(row);
      const id = readString(source?.id);
      if (!id) {
        return null;
      }
      const heightCm = readNumber(source?.height_cm);
      const weightKg = readNumber(source?.weight_kg);
      const bmi = computeBmi(heightCm, weightKg);
      return {
        id,
        measuredAt: readString(source?.measured_at) ?? readString(source?.created_at),
        heightCm,
        weightKg,
        bmi,
        bmiCategory: getBmiCategory(bmi),
        captureMethod: readString(source?.capture_method),
        notes: readString(source?.notes),
      } satisfies StudentMeasurementEntry;
    })
    .filter((item): item is StudentMeasurementEntry => item !== null);
}

export async function getStudentImmunizationHistory(
  studentId: string,
): Promise<StudentImmunizationEntry[]> {
  const query = `
    query StudentImmunizationHistory($studentId: uuid!) {
      student_immunization_records(
        where: { student_id: { _eq: $studentId } }
        order_by: [{ administered_at: desc }, { created_at: desc }]
      ) {
        id
        vaccine_name
        dose_label
        status
        administered_at
        created_at
        officer_name
        batch_number
        notes
      }
    }
  `;
  const data = await graphql<{ student_immunization_records?: unknown[] }>(
    query,
    { studentId },
    'Gagal memuat riwayat imunisasi.',
  );
  return (data.student_immunization_records ?? [])
    .map(row => {
      const source = asRecord(row);
      const id = readString(source?.id);
      if (!id) {
        return null;
      }
      return {
        id,
        vaccineName: readString(source?.vaccine_name) ?? 'Vaksin',
        doseLabel: readString(source?.dose_label),
        status: readString(source?.status),
        administeredAt: readString(source?.administered_at) ?? readString(source?.created_at),
        officerName: readString(source?.officer_name),
        batchNumber: readString(source?.batch_number),
        notes: readString(source?.notes),
      } satisfies StudentImmunizationEntry;
    })
    .filter((item): item is StudentImmunizationEntry => item !== null);
}

// ---------------------------------------------------------------------------
// Kelas
// ---------------------------------------------------------------------------

export async function getClassroomDetail(classId: string): Promise<ClassroomDetail | null> {
  const query = `
    query ClassroomDetail($id: uuid!) {
      classes_by_pk(id: $id) {
        id
        name
        grade_level { level_number label }
        academic_year { label }
      }
    }
  `;
  const data = await graphql<{ classes_by_pk?: unknown }>(
    query,
    { id: classId },
    'Gagal memuat detail kelas.',
  );
  const source = asRecord(data.classes_by_pk);
  const id = readString(source?.id);
  const name = readString(source?.name);
  if (!id || !name) {
    return null;
  }
  const gradeLevel = asRecord(source?.grade_level);
  return {
    id,
    name,
    gradeLevelNumber: readNumber(gradeLevel?.level_number),
    gradeLevelLabel: readString(gradeLevel?.label),
    academicYearLabel: readString(asRecord(source?.academic_year)?.label),
  };
}

export async function getClassMeasurementSummary(
  classId: string,
): Promise<ClassMeasurementSummary> {
  const sessionQuery = `
    query ClassMeasurementSessions($classId: uuid!) {
      measurement_sessions(
        where: { class_id: { _eq: $classId }, status: { _neq: "cancelled" } }
      ) {
        id
        session_date
      }
    }
  `;
  const sessionData = await graphql<{ measurement_sessions?: unknown[] }>(
    sessionQuery,
    { classId },
    'Gagal memuat sesi pengukuran kelas.',
  );
  const sessionIds = (sessionData.measurement_sessions ?? [])
    .map(row => readString(asRecord(row)?.id))
    .filter((id): id is string => id !== null);

  const summary: ClassMeasurementSummary = {
    sessionCount: sessionIds.length,
    measuredStudentCount: 0,
    lastMeasuredAt: null,
    bmiDistribution: { Kurus: 0, Normal: 0, Gemuk: 0, Obes: 0 },
    averageHeightCm: null,
    averageWeightKg: null,
  };
  if (sessionIds.length === 0) {
    return summary;
  }

  const recordQuery = `
    query ClassMeasurementRecords($sessionIds: [uuid!]!) {
      student_measurement_records(
        where: { session_id: { _in: $sessionIds } }
        order_by: [{ measured_at: asc }]
      ) {
        student_id
        height_cm
        weight_kg
        measured_at
      }
    }
  `;
  const recordData = await graphql<{ student_measurement_records?: unknown[] }>(
    recordQuery,
    { sessionIds },
    'Gagal memuat data pengukuran kelas.',
  );

  // Ambil pengukuran terakhir per siswa (urutan asc -> timpa).
  const latestByStudent = new Map<string, { height: number | null; weight: number | null }>();
  (recordData.student_measurement_records ?? []).forEach(row => {
    const source = asRecord(row);
    const studentId = readString(source?.student_id);
    if (!studentId) {
      return;
    }
    const measuredAt = readString(source?.measured_at);
    if (measuredAt && (!summary.lastMeasuredAt || measuredAt > summary.lastMeasuredAt)) {
      summary.lastMeasuredAt = measuredAt;
    }
    latestByStudent.set(studentId, {
      height: readNumber(source?.height_cm),
      weight: readNumber(source?.weight_kg),
    });
  });

  const heights: number[] = [];
  const weights: number[] = [];
  latestByStudent.forEach(({ height, weight }) => {
    if (height !== null) {
      heights.push(height);
    }
    if (weight !== null) {
      weights.push(weight);
    }
    const category = getBmiCategory(computeBmi(height, weight));
    if (category) {
      summary.bmiDistribution[category] += 1;
    }
  });
  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  summary.measuredStudentCount = latestByStudent.size;
  summary.averageHeightCm = average(heights);
  summary.averageWeightKg = average(weights);
  return summary;
}

// ---------------------------------------------------------------------------
// Guru
// ---------------------------------------------------------------------------

/** Ubah nama lengkap akun guru (berdasarkan id membership sekolah). */
export async function updateTeacherName(membershipId: string, fullName: string): Promise<void> {
  const name = fullName.trim();
  if (!name) {
    throw new Error('Nama guru wajib diisi.');
  }
  const lookup = await graphql<{ school_memberships_by_pk?: { user_id?: string | null } | null }>(
    `
      query TeacherMembership($id: uuid!) {
        school_memberships_by_pk(id: $id) { user_id }
      }
    `,
    { id: membershipId },
    'Data guru tidak ditemukan.',
  );
  const userId = readString(lookup.school_memberships_by_pk?.user_id);
  if (!userId) {
    throw new Error('Data guru tidak ditemukan.');
  }
  const data = await graphql<{ update_auth_users_by_pk?: { id?: string } | null }>(
    `
      mutation UpdateTeacherName($userId: uuid!, $fullName: String!) {
        update_auth_users_by_pk(pk_columns: { id: $userId }, _set: { full_name: $fullName }) {
          id
        }
      }
    `,
    { userId, fullName: name },
    'Gagal menyimpan nama guru.',
  );
  if (!data.update_auth_users_by_pk?.id) {
    throw new Error('Anda tidak memiliki akses untuk mengubah data guru ini.');
  }
}
