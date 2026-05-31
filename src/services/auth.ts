import { API_BASE_URL, AUTH_BASE_URL, GRAPHQL_URL } from './environment';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
  image_url?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string | null;
  user: Record<string, unknown> | null;
  requiresSchoolConnection: boolean;
};

export type AuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  user: Record<string, unknown> | null;
};

export type ApiRequestOptions = RequestInit & {
  requiresAuth?: boolean;
};

type ApiBody = {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[] | string>;
  token?: string;
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  user?: unknown;
  data?: unknown;
  memberships?: unknown;
};

type ApiValidationErrorItem = {
  field?: string;
  message?: string;
};

const REGISTER_ENDPOINT = '/register';
const LOGIN_ENDPOINT = '/login';
const REFRESH_ENDPOINT = '/refresh';
const VERIFY_EMAIL_ENDPOINT = '/verify-email';
const AUTH_SESSION_STORAGE_KEY = 'mysimoka:auth-session';
const CURRENT_SCHOOL_STORAGE_KEY = 'mysimoka:current-school';
export const ROLE_HIERARCHY = ['school_admin', 'teacher', 'user'] as const;
const ROLE_PRIORITY: Record<string, number> = ROLE_HIERARCHY.reduce(
  (accumulator, role, index) => ({
    ...accumulator,
    [role]: index,
  }),
  {} as Record<string, number>,
);

let authSession: AuthSession = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

type PersistedAuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  user: Record<string, unknown> | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readNullableString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
}

export function normalizeRoleKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin_sekolah') {
    return 'school_admin';
  }
  if (normalized === 'school_member' || normalized === 'anggota_sekolah') {
    return 'teacher';
  }
  return normalized;
}

export function sortRolesByPriority(roles: string[]): string[] {
  const uniqueRoles = Array.from(new Set(roles.map(normalizeRoleKey)));
  uniqueRoles.sort((a, b) => {
    const priorityA = ROLE_PRIORITY[a] ?? Number.MAX_SAFE_INTEGER;
    const priorityB = ROLE_PRIORITY[b] ?? Number.MAX_SAFE_INTEGER;
    return priorityA - priorityB;
  });
  return uniqueRoles;
}

function resolveHighestAllowedRoleFromSession(): string | null {
  const jwtPayload =
    authSession.accessToken && authSession.accessToken.trim().length > 0
      ? decodeJwtPayload(authSession.accessToken)
      : null;
  const hasuraClaims = asObject(jwtPayload?.['https://hasura.io/jwt/claims']);
  const jwtAllowedRolesSource =
    hasuraClaims && Array.isArray(hasuraClaims['x-hasura-allowed-roles'])
      ? hasuraClaims['x-hasura-allowed-roles']
      : hasuraClaims && Array.isArray(hasuraClaims.x_hasura_allowed_roles)
        ? hasuraClaims.x_hasura_allowed_roles
        : [];
  const jwtAllowedRoles = jwtAllowedRolesSource
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(role => normalizeRoleKey(role));
  if (jwtAllowedRoles.length > 0) {
    return sortRolesByPriority(jwtAllowedRoles)[0] ?? null;
  }

  const sessionUser = asObject(authSession.user);
  if (!sessionUser) {
    return null;
  }

  const allowedRolesSource = Array.isArray(sessionUser.allowed_roles)
    ? sessionUser.allowed_roles
    : Array.isArray(sessionUser.allowedRoles)
      ? sessionUser.allowedRoles
      : [];
  const normalizedRoles = allowedRolesSource
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(role => normalizeRoleKey(role));
  if (normalizedRoles.length === 0) {
    return null;
  }

  return sortRolesByPriority(normalizedRoles)[0] ?? null;
}

function syncSessionUserRole(role: string): void {
  const normalizedRole = normalizeRoleKey(role);
  const sessionUser = asObject(authSession.user);
  if (!sessionUser) {
    return;
  }

  const allowedRolesSource = Array.isArray(sessionUser.allowed_roles)
    ? sessionUser.allowed_roles
    : Array.isArray(sessionUser.allowedRoles)
      ? sessionUser.allowedRoles
      : [];
  const mergedAllowedRoles = sortRolesByPriority([
    ...allowedRolesSource
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(item => normalizeRoleKey(item)),
    normalizedRole,
  ]);

  setAuthSession({
    user: {
      ...sessionUser,
      allowed_roles: mergedAllowedRoles,
      allowedRoles: mergedAllowedRoles,
      active_school_role: normalizedRole,
      activeSchoolRole: normalizedRole,
    },
  });
}

function normalizePersistedAuthSession(value: unknown): PersistedAuthSession | null {
  const source = asObject(value);
  if (!source) {
    return null;
  }

  const accessToken = readNullableString(source.accessToken);
  const refreshToken = readNullableString(source.refreshToken);
  const user = asObject(source.user);

  if (!accessToken && !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
}

async function persistAuthSession(session: AuthSession): Promise<void> {
  if (!session.accessToken && !session.refreshToken) {
    await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  const payload: PersistedAuthSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  };

  await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function normalizeApiErrorMessage(body: ApiBody | null): string | null {
  if (!body) {
    return null;
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const firstError = body.errors[0];

    if (typeof firstError === 'string') {
      return firstError;
    }

    if (firstError && typeof firstError === 'object' && !Array.isArray(firstError)) {
      const firstErrorObject = firstError as ApiValidationErrorItem;
      if (
        typeof firstErrorObject.message === 'string' &&
        firstErrorObject.message.trim().length > 0
      ) {
        return firstErrorObject.message;
      }
    }
  }

  if (typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message;
  }

  if (typeof body.error === 'string' && body.error.trim().length > 0) {
    return body.error;
  }

  if (body.errors && typeof body.errors === 'object') {
    const firstValue = Object.values(body.errors)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      const firstItem = firstValue[0];
      return typeof firstItem === 'string' ? firstItem : null;
    }

    if (typeof firstValue === 'string' && firstValue.trim().length > 0) {
      return firstValue;
    }
  }

  return null;
}

async function parseResponseBody(response: Response): Promise<ApiBody | null> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text();
    if (text.trim().length === 0) {
      return null;
    }

    return { message: text };
  }

  try {
    return (await response.json()) as ApiBody;
  } catch {
    return null;
  }
}

function createRequestUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

function createAuthRequestUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${AUTH_BASE_URL}${normalizedEndpoint}`;
}

async function parseUnknownResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

function readStringValue(source: ApiBody | null, keys: string[]): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key as keyof ApiBody];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function readObjectValue(source: ApiBody | null, key: string): Record<string, unknown> | null {
  if (!source) {
    return null;
  }

  const value = source[key as keyof ApiBody];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function readFirstNonEmptyString(source: Record<string, unknown> | null, keys: string[]): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = readNullableString(source[key]);
    if (value) {
      return value;
    }
    if (typeof source[key] === 'number' && Number.isFinite(source[key] as number)) {
      return String(source[key]);
    }
  }

  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64Payload.length % 4)) % 4;
  const paddedPayload = `${base64Payload}${'='.repeat(padLength)}`;
  try {
    const atobFn = (globalThis as { atob?: (value: string) => string }).atob;
    if (!atobFn) {
      return null;
    }
    const decoded = atobFn(paddedPayload);
    const parsed = JSON.parse(decoded) as unknown;
    return asObject(parsed);
  } catch {
    return null;
  }
}

function readArrayValue(source: ApiBody | null, key: string): unknown[] | null {
  if (!source) {
    return null;
  }

  const value = source[key as keyof ApiBody];
  return Array.isArray(value) ? value : null;
}

function looksLikeUserObject(source: Record<string, unknown> | null): boolean {
  if (!source) {
    return false;
  }

  const hasId = typeof source.id === 'string' || typeof source.id === 'number';
  const hasEmail = typeof source.email === 'string';
  const hasName = typeof source.name === 'string';
  const hasSchoolId = typeof source.school_id === 'string' || typeof source.schoolId === 'string';
  const hasSchoolObject = Boolean(asObject(source.school));

  return hasId || hasEmail || hasName || hasSchoolId || hasSchoolObject;
}

type LoginMembership = {
  role: string | null;
  status: string | null;
  isDefault: boolean;
  isActive: boolean;
};

function normalizeLoginMembership(item: unknown): LoginMembership | null {
  const source = asObject(item);
  if (!source) {
    return null;
  }

  const role = readNullableString(source.role);
  const status = readNullableString(source.status);
  const isDefault = source.is_default === true || source.isDefault === true;
  const isActive = source.is_active === true || source.isActive === true;

  if (!role && !status && !isDefault && !isActive) {
    return null;
  }

  return {
    role: role ? normalizeRoleKey(role) : null,
    status: status ? status.trim().toLowerCase() : null,
    isDefault,
    isActive,
  };
}

function isConnectedMembershipStatus(status: string | null): boolean {
  if (!status) {
    return false;
  }

  return status === 'active' || status === 'approved' || status === 'accepted';
}

function normalizeLoginResult(body: ApiBody | null): LoginResult | null {
  const nestedData = readObjectValue(body, 'data');
  const accessToken =
    readStringValue(body, ['access_token', 'accessToken', 'token']) ??
    readStringValue(nestedData as ApiBody | null, ['access_token', 'accessToken', 'token']);

  if (!accessToken) {
    return null;
  }

  const refreshToken =
    readStringValue(body, ['refresh_token', 'refreshToken']) ??
    readStringValue(nestedData as ApiBody | null, ['refresh_token', 'refreshToken']);
  const userFromBody = readObjectValue(body, 'user');
  const userFromData = readObjectValue(nestedData as ApiBody | null, 'user');
  const inferredUser = looksLikeUserObject(nestedData) ? nestedData : null;
  const rawMemberships =
    readArrayValue(body, 'memberships') ??
    readArrayValue(nestedData as ApiBody | null, 'memberships') ??
    [];
  const memberships = rawMemberships
    .map(normalizeLoginMembership)
    .filter((item): item is LoginMembership => item !== null);
  const connectedMemberships = memberships.filter(
    item => item.isActive || isConnectedMembershipStatus(item.status),
  );
  const allowedRoles = sortRolesByPriority(
    memberships.map(item => item.role).filter((item): item is string => Boolean(item)),
  );
  const selectedMembership =
    connectedMemberships.find(item => item.isActive || item.isDefault) ??
    connectedMemberships[0] ??
    memberships.find(item => item.isDefault) ??
    memberships[0] ??
    null;
  const selectedRole = selectedMembership?.role ?? null;
  const baseUser = userFromBody ?? userFromData ?? inferredUser;
  const user = baseUser
    ? {
        ...baseUser,
        ...(allowedRoles.length > 0 ? { allowed_roles: allowedRoles, allowedRoles } : {}),
        ...(selectedRole
          ? { active_school_role: selectedRole, activeSchoolRole: selectedRole }
          : {}),
      }
    : baseUser;
  const bodyObject = asObject(body as unknown);
  const nestedDataObject = asObject(nestedData as unknown);
  const rawRequiresSchoolConnection =
    bodyObject?.requiresSchoolConnection ??
    nestedDataObject?.requiresSchoolConnection;
  const rawSchoolFlag =
    readNullableString(bodyObject?.school_status) ??
    readNullableString(bodyObject?.schoolStatus) ??
    readNullableString(bodyObject?.flag) ??
    readNullableString(nestedDataObject?.school_status) ??
    readNullableString(nestedDataObject?.schoolStatus) ??
    readNullableString(nestedDataObject?.flag);
  const hasNoSchoolFlag = rawSchoolFlag?.trim().toUpperCase() === 'NO_SCHOOL';
  const requiresSchoolConnection =
    rawRequiresSchoolConnection === true || hasNoSchoolFlag
      ? true
      : memberships.length > 0
        ? connectedMemberships.length === 0
        : false;

  return {
    accessToken,
    refreshToken,
    user,
    requiresSchoolConnection,
  };
}

export type RegisterResult = {
  verificationToken: string | null;
};

export type VerifyEmailPayload = {
  token: string;
};

export type CreateSchoolPayload = {
  name: string;
  number?: string;
};

export type JoinSchoolPayload = {
  joinCode: string;
};

export type SchoolMembership = {
  id: string;
  school_id: string;
  name: string;
  school_name: string;
  school_number: string | null;
  school_address: string | null;
  school_join_code: string;
  role: string;
  status: string;
  is_active: boolean;
};

export type DashboardStudentListItem = {
  id: string;
  name: string;
  nisn: string;
  className: string;
};

export type DashboardStudentSearchItem = DashboardStudentListItem;

export type ClassroomListItem = {
  id: string;
  name: string;
  total: number;
  teacher: string;
  lastMeasuredAt: string;
  coverage: string;
};

export type TeacherDirectoryItem = {
  id: string;
  name: string;
  email: string;
  password: string;
  code: string;
  homeroom: string;
  handledClasses: string;
  totalStudents: number;
};

export type CreateClassroomPayload = {
  schoolId: string;
  name: string;
  gradeLevel: number;
  description?: string | null;
  homeroomTeacherMembershipId?: string | null;
};

export type UpdateClassroomPayload = {
  classroomId: string;
  name: string;
  gradeLevel: number;
  description?: string | null;
  homeroomTeacherMembershipId?: string | null;
};

export type CreateStudentPayload = {
  schoolId: string;
  fullName: string;
  nis?: string | null;
  nisn?: string | null;
  gender?: 'male' | 'female' | null;
  birthDate?: string | null;
};

type SchoolDetailsById = Record<
  string,
  {
    name: string | null;
    number: string | null;
    address: string | null;
    joinCode: string | null;
  }
>;

export type CurrentSchoolContext = {
  schoolId: string;
  schoolName: string;
};

export type UpdateMyProfilePayload = {
  full_name: string;
};

export type UpdateSchoolProfilePayload = {
  schoolId: string;
  name: string;
  number?: string | null;
  address: string;
};

export type AcademicYear = {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

function getSessionUserIdOrThrow(): string {
  const sessionUser = asObject(authSession.user);
  const userIdFromUserObject = readFirstNonEmptyString(sessionUser, ['id', 'user_id', 'userId']);
  const jwtPayload =
    authSession.accessToken && authSession.accessToken.trim().length > 0
      ? decodeJwtPayload(authSession.accessToken)
      : null;
  const hasuraClaims = asObject(jwtPayload?.['https://hasura.io/jwt/claims']);
  const userIdFromClaims = readFirstNonEmptyString(hasuraClaims, [
    'x-hasura-user-id',
    'x_hasura_user_id',
  ]);
  const userId = userIdFromUserObject ?? userIdFromClaims;
  if (!userId) {
    throw new Error('Data user tidak ditemukan. Silakan login ulang.');
  }
  return userId;
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const response = await fetch(createAuthRequestUrl(REGISTER_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await parseResponseBody(response);
  if (!response.ok) {
    const normalizedMessage = normalizeApiErrorMessage(responseBody);
    throw new Error(normalizedMessage ?? 'Registrasi gagal. Silakan coba lagi.');
  }

  return {
    verificationToken: readStringValue(responseBody, ['verificationToken']),
  };
}

export async function verifyEmailToken(payload: VerifyEmailPayload): Promise<void> {
  const response = await fetch(createAuthRequestUrl(VERIFY_EMAIL_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return;
  }

  const responseBody = await parseResponseBody(response);
  const normalizedMessage = normalizeApiErrorMessage(responseBody);
  throw new Error(normalizedMessage ?? 'Verifikasi email gagal. Silakan coba lagi.');
}

export async function getMyProfile(): Promise<Record<string, unknown>> {
  const userId = getSessionUserIdOrThrow();
  const query = `
    query GetMyProfile($userId: uuid!) {
      auth_users_by_pk(id: $userId) {
        id
        email
        full_name
        image_url
        is_email_verified
        is_blocked
        blocked_at
        blocked_reason
        created_at
        updated_at
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { userId },
    }),
  })) as
    | {
        data?: { auth_users_by_pk?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil profil user.');
  }

  const profile = asObject(responseBody?.data?.auth_users_by_pk);
  if (!profile) {
    throw new Error('Profil user tidak ditemukan.');
  }

  setAuthSession({
    user: {
      ...(authSession.user ?? {}),
      ...profile,
    },
  });

  return profile;
}

function requireAccessToken(): string {
  if (!authSession.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  return authSession.accessToken;
}

function buildTeacherCode(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'GR';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function readCountAggregate(value: unknown): number {
  const source = asObject(value);
  const aggregate = asObject(source?.aggregate);
  const count = aggregate?.count;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function formatClassTeacherName(value: string | null): string {
  return value ? `Wali kelas: ${value}` : 'Wali kelas belum ditentukan';
}

function normalizeClassroomListItem(row: unknown): ClassroomListItem | null {
  const source = asObject(row);
  const id = readNullableString(source?.id);
  const name = readNullableString(source?.name);
  if (!id || !name) {
    return null;
  }

  const membership = asObject(source?.school_membership);
  const membershipUser = asObject(membership?.user);
  const teacherName = readNullableString(membershipUser?.full_name);
  const total = readCountAggregate(source?.student_classrooms_aggregate);

  return {
    id,
    name,
    total,
    teacher: formatClassTeacherName(teacherName),
    lastMeasuredAt: 'Belum ada pengukuran',
    coverage: `${total} siswa terdaftar`,
  };
}

function normalizeStudentListItem(row: unknown): DashboardStudentListItem | null {
  const source = asObject(row);
  const id = readNullableString(source?.id);
  const fullName = readNullableString(source?.full_name);
  if (!id || !fullName) {
    return null;
  }

  const studentClassrooms = Array.isArray(source?.student_classrooms)
    ? source.student_classrooms
    : [];
  const activeClassroom = studentClassrooms
    .map(item => asObject(item))
    .find(item => item?.is_active === true) ?? asObject(studentClassrooms[0]);
  const classroom = asObject(activeClassroom?.classroom);
  const className = readNullableString(classroom?.name) ?? '-';

  return {
    id,
    name: fullName,
    nisn:
      readNullableString(source?.nisn) ??
      readNullableString(source?.student_number) ??
      readNullableString(source?.nis) ??
      '-',
    className,
  };
}

function normalizeTokenResult(body: ApiBody | null): { accessToken: string; refreshToken: string | null } | null {
  const loginResult = normalizeLoginResult(body);
  if (!loginResult) {
    return null;
  }

  return {
    accessToken: loginResult.accessToken,
    refreshToken: loginResult.refreshToken,
  };
}

async function parseSchoolConnectionResponse(response: Response): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const responseBody = await parseResponseBody(response);
  if (!response.ok) {
    const normalizedMessage = normalizeApiErrorMessage(responseBody);
    throw new Error(normalizedMessage ?? 'Permintaan koneksi sekolah gagal.');
  }

  const tokenResult = normalizeTokenResult(responseBody);
  if (!tokenResult) {
    throw new Error('Respons token koneksi sekolah tidak valid.');
  }

  return tokenResult;
}

export async function createSchool(payload: CreateSchoolPayload): Promise<void> {
  const userId = getSessionUserIdOrThrow();
  const schoolName = payload.name.trim();
  if (!schoolName) {
    throw new Error('Nama sekolah wajib diisi.');
  }

  const variables = {
    name: schoolName,
    number: payload.number?.trim() || null,
    createdBy: userId,
  };
  const headers = {
    'Content-Type': 'application/json',
    'x-hasura-role': 'user',
  };
  const insertOneMutation = `
    mutation CreateSchool($name: String!, $number: String, $createdBy: uuid!) {
      insert_schools_one(
        object: {
          name: $name
          number: $number
          created_by: $createdBy
        }
      ) {
        id
      }
    }
  `;
  const insertManyMutation = `
    mutation CreateSchool($name: String!, $number: String, $createdBy: uuid!) {
      insert_schools(
        objects: [
          {
            name: $name
            number: $number
            created_by: $createdBy
          }
        ]
      ) {
        returning {
          id
        }
      }
    }
  `;

  let responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers,
    body: JSON.stringify({
      query: insertOneMutation,
      variables,
    }),
  })) as
    | {
        data?: {
          insert_schools_one?: { id?: string | null } | null;
          insert_schools?: { returning?: Array<{ id?: string | null }> | null } | null;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  const firstErrorMessage = responseBody?.errors?.[0]?.message ?? '';
  if (
    Array.isArray(responseBody?.errors) &&
    firstErrorMessage.includes("field 'insert_schools_one' not found")
  ) {
    responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers,
      body: JSON.stringify({
        query: insertManyMutation,
        variables,
      }),
    })) as typeof responseBody;
  }

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal membuat sekolah.');
  }

  const schoolId =
    responseBody?.data?.insert_schools_one?.id ??
    responseBody?.data?.insert_schools?.returning?.[0]?.id;
  if (!schoolId) {
    throw new Error('Respons pembuatan sekolah tidak valid.');
  }

  await setActiveSchool(schoolId, 'school_admin');
}

export async function joinSchool(payload: JoinSchoolPayload): Promise<void> {
  const normalizedJoinCode = payload.joinCode.trim().toUpperCase();
  if (!normalizedJoinCode) {
    throw new Error('Kode join wajib diisi.');
  }

  const query = `
    query FindSchoolByJoinCode($joinCode: String!) {
      schools(where: { join_code: { _eq: $joinCode } }, limit: 1) {
        id
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { joinCode: normalizedJoinCode },
    }),
  })) as
    | {
        data?: { schools?: Array<{ id?: string | null }> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal validasi kode join.');
  }

  const schoolId = responseBody?.data?.schools?.[0]?.id ?? null;
  if (!schoolId) {
    throw new Error('Kode join sekolah tidak ditemukan.');
  }

  await setActiveSchool(schoolId, 'teacher');
}

function normalizeMembership(item: unknown): SchoolMembership | null {
  const source = asObject(item);
  if (!source) {
    return null;
  }
  const schoolObject = asObject(source.school);

  const schoolId = readNullableString(source.school_id) ?? readNullableString(source.schoolId);
  if (!schoolId) {
    return null;
  }

  const id = readNullableString(source.id) ?? schoolId;
  const role = normalizeRoleKey(readNullableString(source.role) ?? 'teacher');
  const status = readNullableString(source.status) ?? 'active';
  const isActive = source.is_active === true || source.isActive === true;

  return {
    id,
    school_id: schoolId,
    name:
      readNullableString(source.name) ??
      readNullableString(schoolObject?.name) ??
      '',
    school_name:
      readNullableString(source.name) ??
      readNullableString(source.school_name) ??
      readNullableString(source.schoolName) ??
      readNullableString(schoolObject?.name) ??
      '',
    school_number:
      readNullableString(source.school_number) ??
      readNullableString(source.schoolNumber) ??
      readNullableString(schoolObject?.number),
    school_address:
      readNullableString(source.school_address) ??
      readNullableString(source.address) ??
      readNullableString(schoolObject?.address),
    school_join_code:
      readNullableString(source.school_join_code) ??
      readNullableString(source.schoolJoinCode) ??
      readNullableString(schoolObject?.join_code) ??
      '',
    role,
    status,
    is_active: isActive,
  };
}

async function fetchSchoolDetailsByIds(schoolIds: string[], hasuraRole?: string): Promise<SchoolDetailsById> {
  if (schoolIds.length === 0) {
    return {};
  }

  const query = `
    query GetSchoolsByIds($schoolIds: [uuid!]!) {
      schools(where: { id: { _in: $schoolIds } }) {
        id
        name
        number
        address
        join_code
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
      ...(hasuraRole ? { 'x-hasura-role': hasuraRole } : {}),
    },
    body: JSON.stringify({
      query,
      variables: { schoolIds },
    }),
  })) as
    | {
        data?: {
          schools?: Array<Record<string, unknown>>;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (__DEV__) {
    console.log('[schoolsByIds][graphql][endpoint]', GRAPHQL_URL);
    console.log('[schoolsByIds][graphql][role]', hasuraRole ?? '(auto/highest)');
    console.log('[schoolsByIds][graphql][raw]', JSON.stringify(responseBody));
  }

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    const firstMessage = responseBody.errors[0]?.message;
    throw new Error(firstMessage || 'Gagal mengambil data sekolah dari Hasura.');
  }

  const schools = Array.isArray(responseBody?.data?.schools) ? responseBody.data.schools : [];
  const detailsById: SchoolDetailsById = {};
  for (const school of schools) {
    const schoolObject = asObject(school);
    const schoolId = readNullableString(schoolObject?.id);
    if (!schoolId) {
      continue;
    }

    detailsById[schoolId] = {
      name: readNullableString(schoolObject?.name),
      number: readNullableString(schoolObject?.number),
      address: readNullableString(schoolObject?.address),
      joinCode: readNullableString(schoolObject?.join_code),
    };
  }

  return detailsById;
}

export async function listMemberships(): Promise<SchoolMembership[]> {
  const userId = getSessionUserIdOrThrow();
  const query = `
    query ListMySchoolMemberships($userId: uuid!) {
      school_memberships(
        where: { user_id: { _eq: $userId } }
        order_by: [{ is_active: desc }, { created_at: desc }]
      ) {
        id
        user_id
        school_id
        role
        status
        is_active
        school {
          name
          number
          address
          join_code
        }
      }
    }
  `;

  const response = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { userId },
    }),
  })) as
    | {
        data?: { school_memberships?: unknown[] };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (__DEV__) {
    console.log('[listMemberships][userId]', userId);
    console.log('[listMemberships][graphql][endpoint]', GRAPHQL_URL);
    console.log('[listMemberships][graphql][raw]', JSON.stringify(response));
  }

  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    const firstMessage = response.errors[0]?.message;
    throw new Error(firstMessage || 'Gagal mengambil membership sekolah dari Hasura.');
  }

  const memberships = Array.isArray(response?.data?.school_memberships)
    ? response.data.school_memberships
        .map(normalizeMembership)
        .filter((item): item is SchoolMembership => item !== null)
    : [];
  const uniqueSchoolIds = Array.from(new Set(memberships.map(item => item.school_id)));
  const highestRole = resolveHighestAllowedRoleFromSession();
  let schoolDetailsById: SchoolDetailsById = {};
  try {
    schoolDetailsById = await fetchSchoolDetailsByIds(uniqueSchoolIds, highestRole ?? undefined);
  } catch (error) {
    if (__DEV__) {
      console.log(
        '[schoolsByIds][graphql][error]',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
    schoolDetailsById = {};
  }

  const hydratedMemberships = memberships.map(item => {
    const schoolDetails = schoolDetailsById[item.school_id];
    if (!schoolDetails) {
      return item;
    }

    return {
      ...item,
      name: schoolDetails.name ?? item.name,
      school_name: schoolDetails.name ?? item.school_name,
      school_number: schoolDetails.number ?? item.school_number,
      school_address: schoolDetails.address ?? item.school_address,
      school_join_code: schoolDetails.joinCode ?? item.school_join_code,
    };
  });

  if (__DEV__) {
    console.log('[listMemberships][mapped]', JSON.stringify(hydratedMemberships));
  }
  return hydratedMemberships;
}

export async function listClassroomsBySchool(schoolId: string): Promise<ClassroomListItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }

  const query = `
    query ListClassroomsBySchool($schoolId: uuid!) {
      classrooms(
        where: {
          school_id: { _eq: $schoolId },
          is_active: { _eq: true }
        }
        order_by: [{ grade_level: asc }, { name: asc }]
      ) {
        id
        name
        grade_level
        updated_at
        school_membership {
          id
          user {
            full_name
            email
          }
        }
        student_classrooms_aggregate(where: { is_active: { _eq: true } }) {
          aggregate {
            count
          }
        }
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { schoolId: normalizedSchoolId },
    }),
  })) as
    | {
        data?: { classrooms?: unknown[] };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil daftar kelas.');
  }

  return (responseBody?.data?.classrooms ?? [])
    .map(normalizeClassroomListItem)
    .filter((item): item is ClassroomListItem => item !== null);
}

async function getActiveAcademicYearIdOrThrow(schoolId: string): Promise<string> {
  const academicYears = await listAcademicYears(schoolId);
  const activeAcademicYear = academicYears.find(item => item.is_active) ?? academicYears[0];
  if (!activeAcademicYear) {
    throw new Error('Tahun akademik aktif belum tersedia. Tambahkan tahun akademik dulu.');
  }
  return activeAcademicYear.id;
}

export async function createClassroom(payload: CreateClassroomPayload): Promise<ClassroomListItem> {
  const userId = getSessionUserIdOrThrow();
  const schoolId = payload.schoolId.trim();
  const name = payload.name.trim();
  if (!schoolId || !name || !Number.isFinite(payload.gradeLevel)) {
    throw new Error('Data kelas tidak valid.');
  }

  const academicYearId = await getActiveAcademicYearIdOrThrow(schoolId);
  const mutation = `
    mutation CreateClassroom(
      $schoolId: uuid!,
      $academicYearId: uuid!,
      $createdBy: uuid!,
      $name: String!,
      $gradeLevel: Int!,
      $description: String,
      $homeroomTeacherMembershipId: uuid
    ) {
      insert_classrooms_one(
        object: {
          school_id: $schoolId,
          academic_year_id: $academicYearId,
          created_by: $createdBy,
          name: $name,
          grade_level: $gradeLevel,
          description: $description,
          homeroom_teacher_membership_id: $homeroomTeacherMembershipId,
          is_active: true
        }
      ) {
        id
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        schoolId,
        academicYearId,
        createdBy: userId,
        name,
        gradeLevel: payload.gradeLevel,
        description: payload.description?.trim() || null,
        homeroomTeacherMembershipId: payload.homeroomTeacherMembershipId?.trim() || null,
      },
    }),
  })) as
    | {
        data?: { insert_classrooms_one?: { id?: string | null } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal membuat kelas.');
  }

  const createdId = responseBody?.data?.insert_classrooms_one?.id;
  if (!createdId) {
    throw new Error('Respons pembuatan kelas tidak valid.');
  }

  const classrooms = await listClassroomsBySchool(schoolId);
  const created = classrooms.find(item => item.id === createdId);
  if (!created) {
    throw new Error('Kelas berhasil dibuat, tetapi tidak bisa dimuat ulang.');
  }
  return created;
}

export async function updateClassroom(payload: UpdateClassroomPayload): Promise<void> {
  const classroomId = payload.classroomId.trim();
  const name = payload.name.trim();
  if (!classroomId || !name || !Number.isFinite(payload.gradeLevel)) {
    throw new Error('Data kelas tidak valid.');
  }

  const mutation = `
    mutation UpdateClassroom(
      $classroomId: uuid!,
      $name: String!,
      $gradeLevel: Int!,
      $description: String,
      $homeroomTeacherMembershipId: uuid
    ) {
      update_classrooms_by_pk(
        pk_columns: { id: $classroomId },
        _set: {
          name: $name,
          grade_level: $gradeLevel,
          description: $description,
          homeroom_teacher_membership_id: $homeroomTeacherMembershipId
        }
      ) {
        id
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        classroomId,
        name,
        gradeLevel: payload.gradeLevel,
        description: payload.description?.trim() || null,
        homeroomTeacherMembershipId: payload.homeroomTeacherMembershipId?.trim() || null,
      },
    }),
  })) as
    | {
        data?: { update_classrooms_by_pk?: { id?: string | null } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengubah kelas.');
  }

  if (!responseBody?.data?.update_classrooms_by_pk?.id) {
    throw new Error('Kelas tidak ditemukan atau tidak memiliki akses untuk mengubahnya.');
  }
}

export async function listTeachersBySchool(schoolId: string): Promise<TeacherDirectoryItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }

  const query = `
    query ListTeachersBySchool($schoolId: uuid!) {
      school_memberships(
        where: {
          school_id: { _eq: $schoolId },
          role: { _eq: "teacher" }
        }
        order_by: [{ created_at: desc }]
      ) {
        id
        role
        is_active
        user {
          id
          email
          full_name
        }
        classrooms(where: { is_active: { _eq: true } }) {
          id
          name
          student_classrooms_aggregate(where: { is_active: { _eq: true } }) {
            aggregate {
              count
            }
          }
        }
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { schoolId: normalizedSchoolId },
    }),
  })) as
    | {
        data?: { school_memberships?: unknown[] };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil daftar guru.');
  }

  return (responseBody?.data?.school_memberships ?? [])
    .map(item => {
      const membership = asObject(item);
      const user = asObject(membership?.user);
      const id = readNullableString(membership?.id);
      const name = readNullableString(user?.full_name);
      if (!id || !name) {
        return null;
      }

      const classrooms = Array.isArray(membership?.classrooms) ? membership.classrooms : [];
      const classroomNames = classrooms
        .map(classroom => readNullableString(asObject(classroom)?.name))
        .filter((value): value is string => Boolean(value));
      const totalStudents = classrooms.reduce(
        (total, classroom) =>
          total + readCountAggregate(asObject(classroom)?.student_classrooms_aggregate),
        0,
      );

      return {
        id,
        name,
        email: readNullableString(user?.email) ?? '-',
        password: '',
        code: buildTeacherCode(name),
        homeroom: classroomNames[0] ? `Wali kelas ${classroomNames[0]}` : 'Belum ditentukan',
        handledClasses: classroomNames.length > 0 ? classroomNames.join(', ') : 'Belum ada kelas',
        totalStudents,
      } satisfies TeacherDirectoryItem;
    })
    .filter((item): item is TeacherDirectoryItem => item !== null);
}

export async function listStudentsBySchool(schoolId: string): Promise<DashboardStudentListItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }

  const query = `
    query ListStudentsBySchool($schoolId: uuid!) {
      students(
        where: {
          school_id: { _eq: $schoolId },
          is_active: { _eq: true }
        }
        order_by: [{ full_name: asc }, { created_at: desc }]
      ) {
        id
        full_name
        nis
        nisn
        student_number
        student_classrooms(
          where: { is_active: { _eq: true } }
          order_by: [{ created_at: desc }]
          limit: 1
        ) {
          is_active
          classroom {
            name
          }
        }
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { schoolId: normalizedSchoolId },
    }),
  })) as
    | {
        data?: { students?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (__DEV__) {
    console.log('[studentsBySchool][graphql][endpoint]', GRAPHQL_URL);
    console.log('[studentsBySchool][graphql][raw]', JSON.stringify(responseBody));
  }

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil data siswa dari Hasura.');
  }

  const rows = Array.isArray(responseBody?.data?.students) ? responseBody.data.students : [];
  return rows
    .map(normalizeStudentListItem)
    .filter((item): item is DashboardStudentListItem => item !== null);
}

export async function searchStudentsBySchool(
  schoolId: string,
  keyword: string,
): Promise<DashboardStudentSearchItem[]> {
  const normalizedSchoolId = schoolId.trim();
  const normalizedKeyword = `%${keyword.trim()}%`;
  if (!normalizedSchoolId) {
    return [];
  }

  const query = `
    query SearchStudentsBySchool($schoolId: uuid!, $keyword: String!) {
      students(
        where: {
          school_id: { _eq: $schoolId },
          is_active: { _eq: true },
          _or: [
            { full_name: { _ilike: $keyword } },
            { nis: { _ilike: $keyword } },
            { nisn: { _ilike: $keyword } },
            { student_number: { _ilike: $keyword } }
          ]
        }
        order_by: [{ full_name: asc }]
        limit: 50
      ) {
        id
        full_name
        nis
        nisn
        student_number
        student_classrooms(
          where: { is_active: { _eq: true } }
          order_by: [{ created_at: desc }]
          limit: 1
        ) {
          is_active
          classroom {
            name
          }
        }
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { schoolId: normalizedSchoolId, keyword: normalizedKeyword },
    }),
  })) as
    | {
        data?: { students?: unknown[] };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mencari siswa.');
  }

  return (responseBody?.data?.students ?? [])
    .map(normalizeStudentListItem)
    .filter((item): item is DashboardStudentSearchItem => item !== null);
}

export async function createStudent(payload: CreateStudentPayload): Promise<void> {
  const userId = getSessionUserIdOrThrow();
  const normalizedSchoolId = payload.schoolId.trim();
  const normalizedName = payload.fullName.trim();
  if (!normalizedSchoolId || !normalizedName) {
    throw new Error('Nama siswa wajib diisi.');
  }

  const normalizedNis = payload.nis?.trim() ?? '';
  const normalizedNisn = payload.nisn?.trim() ?? '';
  const resolvedStudentNumber = normalizedNisn || normalizedNis || undefined;

  const mutation = `
    mutation CreateStudent(
      $schoolId: uuid!,
      $fullName: String!,
      $studentNumber: String,
      $nis: String,
      $nisn: String,
      $gender: String,
      $birthDate: date,
      $createdBy: uuid!
    ) {
      insert_students_one(
        object: {
          school_id: $schoolId,
          created_by: $createdBy,
          full_name: $fullName,
          student_number: $studentNumber,
          nis: $nis,
          nisn: $nisn,
          gender: $gender,
          birth_date: $birthDate,
          status: "active",
          is_active: true
        }
      ) {
        id
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        schoolId: normalizedSchoolId,
        fullName: normalizedName,
        studentNumber: resolvedStudentNumber ?? null,
        nis: normalizedNis || null,
        nisn: normalizedNisn || null,
        gender: payload.gender ?? null,
        birthDate: payload.birthDate?.trim() || null,
        createdBy: userId,
      },
    }),
  })) as
    | {
        data?: { insert_students_one?: { id?: string | null } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (__DEV__) {
    console.log('[createStudent][graphql][endpoint]', GRAPHQL_URL);
    console.log('[createStudent][graphql][raw]', JSON.stringify(responseBody));
  }

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal menyimpan data siswa.');
  }

  const createdId = responseBody?.data?.insert_students_one?.id;
  if (!createdId) {
    throw new Error('Respons simpan siswa tidak valid.');
  }
}

export async function listAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }

  const query = `
    query ListAcademicYears($schoolId: uuid!) {
      academic_years(
        where: { school_id: { _eq: $schoolId } }
        order_by: [{ start_date: desc }, { created_at: desc }]
      ) {
        id
        school_id
        name
        start_date
        end_date
        is_active
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { schoolId: normalizedSchoolId },
    }),
  })) as
    | {
        data?: { academic_years?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil data tahun akademik.');
  }

  const rows = Array.isArray(responseBody?.data?.academic_years) ? responseBody.data.academic_years : [];
  return rows
    .map(row => {
      const source = asObject(row);
      const id = readNullableString(source?.id);
      const rowSchoolId = readNullableString(source?.school_id);
      const name = readNullableString(source?.name);
      const startDate = readNullableString(source?.start_date);
      const endDate = readNullableString(source?.end_date);
      if (!id || !rowSchoolId || !name || !startDate || !endDate) {
        return null;
      }
      return {
        id,
        school_id: rowSchoolId,
        name,
        start_date: startDate,
        end_date: endDate,
        is_active: source?.is_active === true,
      } satisfies AcademicYear;
    })
    .filter((item): item is AcademicYear => item !== null);
}

export async function createAcademicYear(payload: {
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<AcademicYear> {
  const userId = getSessionUserIdOrThrow();
  const schoolId = payload.schoolId.trim();
  const name = payload.name.trim();
  if (!schoolId || !name) {
    throw new Error('Data tahun akademik tidak valid.');
  }

  const mutation = `
    mutation CreateAcademicYear(
      $schoolId: uuid!,
      $userId: uuid!,
      $name: String!,
      $startDate: date!,
      $endDate: date!
    ) {
      insert_academic_years_one(
        object: {
          school_id: $schoolId,
          created_by: $userId,
          name: $name,
          start_date: $startDate,
          end_date: $endDate,
          is_active: false
        }
      ) {
        id
        school_id
        name
        start_date
        end_date
        is_active
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        schoolId,
        userId,
        name,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
    }),
  })) as
    | {
        data?: { insert_academic_years_one?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal menambah tahun akademik.');
  }

  const created = asObject(responseBody?.data?.insert_academic_years_one);
  const id = readNullableString(created?.id);
  const rowSchoolId = readNullableString(created?.school_id);
  const createdName = readNullableString(created?.name);
  const startDate = readNullableString(created?.start_date);
  const endDate = readNullableString(created?.end_date);
  if (!id || !rowSchoolId || !createdName || !startDate || !endDate) {
    throw new Error('Respons tambah tahun akademik tidak valid.');
  }

  return {
    id,
    school_id: rowSchoolId,
    name: createdName,
    start_date: startDate,
    end_date: endDate,
    is_active: created?.is_active === true,
  };
}

export async function setActiveAcademicYear(payload: {
  schoolId: string;
  academicYearId: string;
}): Promise<void> {
  const userId = getSessionUserIdOrThrow();
  const schoolId = payload.schoolId.trim();
  const academicYearId = payload.academicYearId.trim();
  if (!schoolId || !academicYearId) {
    throw new Error('Data aktivasi tahun akademik tidak valid.');
  }

  const deactivateMutation = `
    mutation DeactivateAcademicYears($schoolId: uuid!, $userId: uuid!) {
      update_academic_years(
        where: {
          school_id: { _eq: $schoolId },
          created_by: { _eq: $userId },
          is_active: { _eq: true }
        }
        _set: { is_active: false }
      ) {
        affected_rows
      }
    }
  `;
  const activateMutation = `
    mutation ActivateAcademicYear($academicYearId: uuid!, $userId: uuid!) {
      update_academic_years(
        where: {
          id: { _eq: $academicYearId },
          created_by: { _eq: $userId }
        }
        _set: { is_active: true }
      ) {
        affected_rows
      }
    }
  `;

  const deactivateResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: deactivateMutation,
      variables: { schoolId, userId },
    }),
  })) as { errors?: Array<{ message?: string }> } | null;
  if (Array.isArray(deactivateResponse?.errors) && deactivateResponse.errors.length > 0) {
    throw new Error(deactivateResponse.errors[0]?.message || 'Gagal menonaktifkan tahun akademik lama.');
  }

  const activateResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: activateMutation,
      variables: { academicYearId, userId },
    }),
  })) as
    | {
        data?: { update_academic_years?: { affected_rows?: number } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(activateResponse?.errors) && activateResponse.errors.length > 0) {
    throw new Error(activateResponse.errors[0]?.message || 'Gagal mengaktifkan tahun akademik.');
  }

  const affectedRows = activateResponse?.data?.update_academic_years?.affected_rows ?? 0;
  if (affectedRows < 1) {
    throw new Error('Tahun akademik tidak ditemukan atau tidak memiliki akses untuk mengubahnya.');
  }
}

export async function deleteAcademicYear(payload: { academicYearId: string }): Promise<void> {
  const userId = getSessionUserIdOrThrow();
  const academicYearId = payload.academicYearId.trim();
  if (!academicYearId) {
    throw new Error('Data tahun akademik tidak valid.');
  }

  const mutation = `
    mutation DeleteAcademicYear($academicYearId: uuid!, $userId: uuid!) {
      delete_academic_years(
        where: {
          id: { _eq: $academicYearId },
          created_by: { _eq: $userId }
        }
      ) {
        affected_rows
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: { academicYearId, userId },
    }),
  })) as
    | {
        data?: { delete_academic_years?: { affected_rows?: number } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal menghapus tahun akademik.');
  }

  const affectedRows = responseBody?.data?.delete_academic_years?.affected_rows ?? 0;
  if (affectedRows < 1) {
    throw new Error('Tahun akademik tidak ditemukan atau tidak memiliki akses untuk menghapusnya.');
  }
}

export async function updateAcademicYear(payload: {
  academicYearId: string;
  name: string;
}): Promise<void> {
  const userId = getSessionUserIdOrThrow();
  const academicYearId = payload.academicYearId.trim();
  const name = payload.name.trim();
  if (!academicYearId || !name) {
    throw new Error('Data tahun akademik tidak valid.');
  }

  const mutation = `
    mutation UpdateAcademicYear($academicYearId: uuid!, $userId: uuid!, $name: String!) {
      update_academic_years(
        where: {
          id: { _eq: $academicYearId },
          created_by: { _eq: $userId }
        }
        _set: { name: $name }
      ) {
        affected_rows
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: { academicYearId, userId, name },
    }),
  })) as
    | {
        data?: { update_academic_years?: { affected_rows?: number } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengubah tahun akademik.');
  }

  const affectedRows = responseBody?.data?.update_academic_years?.affected_rows ?? 0;
  if (affectedRows < 1) {
    throw new Error('Tahun akademik tidak ditemukan atau tidak memiliki akses untuk mengubahnya.');
  }
}

export async function setActiveSchool(schoolId: string, role = 'teacher'): Promise<void> {
  const userId = getSessionUserIdOrThrow();
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    throw new Error('Sekolah aktif tidak valid.');
  }

  const findMembershipQuery = `
    query FindSchoolMembership($userId: uuid!, $schoolId: uuid!) {
      school_memberships(
        where: {
          user_id: { _eq: $userId }
          school_id: { _eq: $schoolId }
        }
        limit: 1
      ) {
        id
      }
    }
  `;

  const insertMembershipMutation = `
    mutation InsertSchoolMembership(
      $userId: uuid!,
      $schoolId: uuid!,
      $role: String!
    ) {
      insert_school_memberships_one(
        object: {
          user_id: $userId
          school_id: $schoolId
          role: $role
          status: "active"
          is_active: true
        }
      ) {
        id
      }
    }
  `;

  const deactivateOtherMembershipsMutation = `
    mutation DeactivateOtherMemberships($userId: uuid!, $schoolId: uuid!) {
      update_school_memberships(
        where: {
          user_id: { _eq: $userId }
          school_id: { _neq: $schoolId }
          is_active: { _eq: true }
        }
        _set: { is_active: false }
      ) {
        affected_rows
      }
    }
  `;

  const membershipHeaders = {
    'Content-Type': 'application/json',
    'x-hasura-role': 'user',
  };
  const membershipLookupVariables = {
    userId,
    schoolId: normalizedSchoolId,
  };
  const membershipInsertVariables = {
    userId,
    schoolId: normalizedSchoolId,
    role,
  };

  const existingMembershipResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: membershipHeaders,
    body: JSON.stringify({
      query: findMembershipQuery,
      variables: membershipLookupVariables,
    }),
  })) as
    | {
        data?: { school_memberships?: Array<{ id?: string | null }> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (
    Array.isArray(existingMembershipResponse?.errors) &&
    existingMembershipResponse.errors.length > 0
  ) {
    throw new Error(
      existingMembershipResponse.errors[0]?.message || 'Gagal mengecek koneksi sekolah.',
    );
  }

  const existingMembershipId = existingMembershipResponse?.data?.school_memberships?.[0]?.id;
  if (!existingMembershipId) {
    const insertResponse = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: membershipHeaders,
      body: JSON.stringify({
        query: insertMembershipMutation,
        variables: membershipInsertVariables,
      }),
    })) as { errors?: Array<{ message?: string }> } | null;

    if (Array.isArray(insertResponse?.errors) && insertResponse.errors.length > 0) {
      throw new Error(insertResponse.errors[0]?.message || 'Gagal menghubungkan sekolah.');
    }
  }

  const deactivateResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: deactivateOtherMembershipsMutation,
      variables: {
        userId,
        schoolId: normalizedSchoolId,
      },
    }),
  })) as { errors?: Array<{ message?: string }> } | null;

  if (Array.isArray(deactivateResponse?.errors) && deactivateResponse.errors.length > 0) {
    if (__DEV__) {
      console.log(
        '[setActiveSchool][warn][deactivate]',
        deactivateResponse.errors[0]?.message || 'unknown error',
      );
    }
  }

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    if (__DEV__) {
      console.log('[setActiveSchool][warn][refresh]', 'token refresh skipped/failed after school switch');
    }
  }

  syncSessionUserRole(role);
}

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<Record<string, unknown>> {
  const userId =
    readNullableString(authSession.user?.id) ??
    (typeof authSession.user?.id === 'number' ? String(authSession.user.id) : null);
  if (!userId) {
    throw new Error('Data user tidak ditemukan. Silakan login ulang.');
  }

  const mutation = `
    mutation UpdateMyProfile($userId: uuid!, $fullName: String!) {
      update_auth_users_by_pk(
        pk_columns: { id: $userId }
        _set: { full_name: $fullName }
      ) {
        id
        email
        full_name
        image_url
        is_email_verified
        is_blocked
        blocked_at
        blocked_reason
        created_at
        updated_at
      }
    }
  `;

  let responseBody:
    | {
        data?: {
          update_auth_users_by_pk?: Record<string, unknown> | null;
        };
        errors?: Array<{ message?: string }>;
      }
    | null = null;

  try {
    responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          userId,
          fullName: payload.full_name,
        },
      }),
    })) as
      | {
          data?: {
            update_auth_users_by_pk?: Record<string, unknown> | null;
          };
          errors?: Array<{ message?: string }>;
        }
      | null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Permintaan ke server gagal.';
    throw new Error(`${message} (endpoint: ${GRAPHQL_URL})`);
  }

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    const firstMessage = responseBody.errors[0]?.message;
    throw new Error(firstMessage || 'Update profil ditolak oleh server.');
  }

  const updatedUser = asObject(responseBody?.data?.update_auth_users_by_pk);
  if (!updatedUser) {
    throw new Error('Respons update profil tidak valid.');
  }

  setAuthSession({
    user: {
      ...(authSession.user ?? {}),
      ...updatedUser,
    },
  });

  return updatedUser;
}

export async function updateSchoolProfile(
  payload: UpdateSchoolProfilePayload,
): Promise<Record<string, unknown>> {
  const schoolId = payload.schoolId.trim();
  const schoolName = payload.name.trim();
  const schoolNumber = payload.number?.trim() ?? '';
  const schoolAddress = payload.address.trim();

  if (!schoolId) {
    throw new Error('Sekolah aktif tidak ditemukan.');
  }
  if (!schoolName) {
    throw new Error('Nama sekolah wajib diisi.');
  }
  if (!schoolAddress) {
    throw new Error('Alamat sekolah wajib diisi.');
  }

  const mutation = `
    mutation UpdateSchoolProfile($schoolId: uuid!, $name: String!, $number: String, $address: String!) {
      update_schools_by_pk(
        pk_columns: { id: $schoolId }
        _set: { name: $name, number: $number, address: $address }
      ) {
        id
        name
        number
        address
        join_code
        created_by
        created_at
        updated_at
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        schoolId,
        name: schoolName,
        number: schoolNumber.length > 0 ? schoolNumber : null,
        address: schoolAddress,
      },
    }),
  })) as
    | {
        data?: {
          update_schools_by_pk?: Record<string, unknown> | null;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    const firstMessage = responseBody.errors[0]?.message;
    throw new Error(firstMessage || 'Update profil sekolah ditolak oleh server.');
  }

  const school = asObject(responseBody?.data?.update_schools_by_pk);
  if (!school) {
    throw new Error('Respons update profil sekolah tidak valid.');
  }

  return school;
}

export async function regenerateSchoolJoinCode(schoolId: string): Promise<Record<string, unknown>> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    throw new Error('Sekolah aktif tidak ditemukan.');
  }

  const mutation = `
    mutation RegenerateSchoolJoinCode($schoolId: uuid!, $joinCode: String!) {
      update_schools_by_pk(
        pk_columns: { id: $schoolId }
        _set: { join_code: $joinCode }
      ) {
        id
        name
        number
        address
        join_code
        created_by
        created_at
        updated_at
      }
    }
  `;

  const buildJoinCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let value = '';
    for (let index = 0; index < 8; index += 1) {
      value += chars[Math.floor(Math.random() * chars.length)];
    }
    return value;
  };

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidateJoinCode = buildJoinCode();
    const responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          schoolId: normalizedSchoolId,
          joinCode: candidateJoinCode,
        },
      }),
    })) as
      | {
          data?: {
            update_schools_by_pk?: Record<string, unknown> | null;
          };
          errors?: Array<{ message?: string }>;
        }
      | null;

    if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
      const firstMessage = responseBody.errors[0]?.message ?? 'Gagal memperbarui kode gabung.';
      const lowerFirstMessage = firstMessage.toLowerCase();
      const isUniqueViolation =
        lowerFirstMessage.includes('unique') ||
        lowerFirstMessage.includes('duplicate') ||
        lowerFirstMessage.includes('constraint');
      if (isUniqueViolation && attempt < maxAttempts) {
        continue;
      }
      throw new Error(firstMessage);
    }

    const school = asObject(responseBody?.data?.update_schools_by_pk);
    if (!school) {
      throw new Error('Respons generate kode gabung tidak valid.');
    }

    return school;
  }

  throw new Error('Gagal generate kode gabung. Silakan coba lagi.');
}

export async function saveCurrentSchoolContext(context: CurrentSchoolContext): Promise<void> {
  await AsyncStorage.setItem(CURRENT_SCHOOL_STORAGE_KEY, JSON.stringify(context));
}

export async function loadCurrentSchoolContext(): Promise<CurrentSchoolContext | null> {
  const rawValue = await AsyncStorage.getItem(CURRENT_SCHOOL_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const source = asObject(parsed);
    const schoolId = readNullableString(source?.schoolId);
    const schoolName = readNullableString(source?.schoolName);
    if (!schoolId || !schoolName) {
      return null;
    }
    return {
      schoolId,
      schoolName,
    };
  } catch {
    return null;
  }
}

export async function clearCurrentSchoolContext(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_SCHOOL_STORAGE_KEY);
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const response = await fetch(createAuthRequestUrl(LOGIN_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const normalizedMessage = normalizeApiErrorMessage(responseBody);
    throw new Error(normalizedMessage ?? 'Login gagal. Periksa email dan password Anda.');
  }

  const loginResult = normalizeLoginResult(responseBody);
  if (!loginResult) {
    throw new Error('Login berhasil, tetapi respons token tidak valid.');
  }

  return loginResult;
}

export function getAuthSession(): AuthSession {
  return { ...authSession };
}

export function setAuthSession(session: Partial<AuthSession>): void {
  const hasAccessToken = Object.prototype.hasOwnProperty.call(session, 'accessToken');
  const hasRefreshToken = Object.prototype.hasOwnProperty.call(session, 'refreshToken');
  const hasUser = Object.prototype.hasOwnProperty.call(session, 'user');

  authSession = {
    accessToken: hasAccessToken ? (session.accessToken ?? null) : authSession.accessToken,
    refreshToken: hasRefreshToken ? (session.refreshToken ?? null) : authSession.refreshToken,
    user: hasUser ? (session.user ?? null) : authSession.user,
  };

  persistAuthSession(authSession).catch(() => {
    // Abaikan kegagalan persist agar flow login tidak terblokir.
  });
}

export function clearAuthSession(): void {
  authSession = {
    accessToken: null,
    refreshToken: null,
    user: null,
  };

  persistAuthSession(authSession).catch(() => {
    // Abaikan kegagalan hapus sesi lokal.
  });
}

export async function hydrateAuthSession(): Promise<AuthSession> {
  try {
    const persisted = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!persisted) {
      return getAuthSession();
    }

    const parsed = JSON.parse(persisted) as unknown;
    const normalized = normalizePersistedAuthSession(parsed);

    if (!normalized) {
      clearAuthSession();
      return getAuthSession();
    }

    authSession = {
      accessToken: normalized.accessToken,
      refreshToken: normalized.refreshToken,
      user: normalized.user,
    };

    if (!authSession.accessToken && authSession.refreshToken) {
      const refreshedAccessToken = await refreshAccessToken();
      if (!refreshedAccessToken) {
        clearAuthSession();
        return getAuthSession();
      }
    }

    return getAuthSession();
  } catch {
    clearAuthSession();
    return getAuthSession();
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!authSession.refreshToken) {
    return null;
  }

  const response = await fetch(createAuthRequestUrl(REFRESH_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      refreshToken: authSession.refreshToken,
      refresh_token: authSession.refreshToken,
    }),
  });

  const responseBody = await parseResponseBody(response);
  if (!response.ok) {
    return null;
  }

  const refreshedResult = normalizeLoginResult(responseBody);
  if (!refreshedResult) {
    return null;
  }

  setAuthSession({
    accessToken: refreshedResult.accessToken,
    refreshToken: refreshedResult.refreshToken ?? authSession.refreshToken,
    user: refreshedResult.user ?? authSession.user,
  });

  return refreshedResult.accessToken;
}

function withAuthorizationHeader(headers: Headers, token: string): Headers {
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function hasGraphqlAuthError(responseBody: unknown): boolean {
  const source = asObject(responseBody);
  const graphqlErrors = source?.errors;
  if (!Array.isArray(graphqlErrors) || graphqlErrors.length === 0) {
    return false;
  }

  return graphqlErrors.some(errorItem => {
    const errorObject = asObject(errorItem);
    const message = readNullableString(errorObject?.message)?.toLowerCase() ?? '';
    const extensionCode = readNullableString(asObject(errorObject?.extensions)?.code)?.toLowerCase() ?? '';

    return (
      message.includes('jwt') ||
      message.includes('unauthorized') ||
      message.includes('invalid token') ||
      message.includes('access denied') ||
      extensionCode.includes('jwt') ||
      extensionCode.includes('unauthorized')
    );
  });
}

function buildRetryHeaders(originalHeaders: RequestInit['headers'], accessToken: string): Headers {
  const retryHeaders = new Headers(originalHeaders);
  retryHeaders.set('Accept', 'application/json');
  withAuthorizationHeader(retryHeaders, accessToken);
  if (!retryHeaders.has('x-hasura-role')) {
    const highestAllowedRole = resolveHighestAllowedRoleFromSession();
    if (highestAllowedRole) {
      retryHeaders.set('x-hasura-role', highestAllowedRole);
    }
  }
  return retryHeaders;
}

export async function apiRequest<TResponse = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { requiresAuth = false, headers, ...requestInit } = options;
  const requestUrl = createRequestUrl(endpoint);
  const requestHeaders = new Headers(headers);

  requestHeaders.set('Accept', 'application/json');

  let activeAccessToken = authSession.accessToken;
  if (requiresAuth) {
    if (!activeAccessToken) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    }

    withAuthorizationHeader(requestHeaders, activeAccessToken);
    if (!requestHeaders.has('x-hasura-role')) {
      const highestAllowedRole = resolveHighestAllowedRoleFromSession();
      if (highestAllowedRole) {
        requestHeaders.set('x-hasura-role', highestAllowedRole);
      }
    }
  }

  let response = await fetch(requestUrl, {
    ...requestInit,
    headers: requestHeaders,
  });

  if (requiresAuth && response.status === 401) {
    const refreshedAccessToken = await refreshAccessToken();
    if (!refreshedAccessToken) {
      clearAuthSession();
      throw new Error('Sesi berakhir. Silakan login ulang.');
    }

    activeAccessToken = refreshedAccessToken;
    const retryHeaders = buildRetryHeaders(headers, activeAccessToken);

    response = await fetch(requestUrl, {
      ...requestInit,
      headers: retryHeaders,
    });
  }

  if (!response.ok) {
    const responseBody = (await parseUnknownResponseBody(response)) as ApiBody | null;
    const normalizedMessage = normalizeApiErrorMessage(responseBody);
    throw new Error(normalizedMessage ?? 'Permintaan ke server gagal.');
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  let parsedResponseBody = await parseUnknownResponseBody(response);

  if (requiresAuth && hasGraphqlAuthError(parsedResponseBody)) {
    const refreshedAccessToken = await refreshAccessToken();
    if (!refreshedAccessToken) {
      clearAuthSession();
      throw new Error('Sesi berakhir. Silakan login ulang.');
    }

    activeAccessToken = refreshedAccessToken;
    const retryHeaders = buildRetryHeaders(headers, activeAccessToken);
    const retryResponse = await fetch(requestUrl, {
      ...requestInit,
      headers: retryHeaders,
    });

    if (!retryResponse.ok) {
      const retryResponseBody = (await parseUnknownResponseBody(retryResponse)) as ApiBody | null;
      const retryMessage = normalizeApiErrorMessage(retryResponseBody);
      throw new Error(retryMessage ?? 'Permintaan ke server gagal.');
    }

    if (retryResponse.status === 204) {
      return undefined as TResponse;
    }

    parsedResponseBody = await parseUnknownResponseBody(retryResponse);
  }

  return parsedResponseBody as TResponse;
}
