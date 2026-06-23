import { API_BASE_URL, AUTH_BASE_URL, GRAPHQL_URL } from './environment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AverageMetricItem,
  ImmunizationSessionListItem,
  ImmunizationSessionStatus,
  CategoryBarItem,
  MeasurementSessionListItem,
  MeasurementSessionStatus,
  StudentMeasurementItem,
  TrendPoint,
} from '../types';

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

function isUuidString(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function normalizeRoleKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'admin_sekolah') {
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

function readHasuraClaimsFromSession(): Record<string, unknown> | null {
  const jwtPayload =
    authSession.accessToken && authSession.accessToken.trim().length > 0
      ? decodeJwtPayload(authSession.accessToken)
      : null;
  return asObject(jwtPayload?.['https://hasura.io/jwt/claims']);
}

function logHasuraClaimsDebug(scope: string): void {
  if (!__DEV__) {
    return;
  }

  const hasuraClaims = readHasuraClaimsFromSession();
  console.log(`[${scope}][hasuraClaims]`, JSON.stringify(hasuraClaims));
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

function describeRequestBody(body: RequestInit['body']): string | null {
  if (!body) {
    return null;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return 'FormData';
  }

  return typeof body;
}

function describeDebugEndpoint(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

async function fetchWithDevNetworkLog(
  requestUrl: string,
  requestInit: RequestInit,
  context: string,
): Promise<Response> {
  try {
    return await fetch(requestUrl, requestInit);
  } catch (error) {
    if (__DEV__) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('[api][network][error]', JSON.stringify({
        context,
        method: requestInit.method ?? 'GET',
        url: requestUrl,
        body: describeRequestBody(requestInit.body),
        error: errorMessage,
      }));
    }

    throw error;
  }
}

async function retryAfterNetworkError(
  requestUrl: string,
  requestInit: RequestInit,
  originalHeaders: RequestInit['headers'],
  endpoint: string,
): Promise<Response | null> {
  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    return null;
  }

  const retryHeaders = buildRetryHeaders(originalHeaders, refreshedAccessToken);
  if (__DEV__) {
    console.log('[api][network][retry]', JSON.stringify({
      endpoint: describeDebugEndpoint(endpoint),
      method: requestInit.method ?? 'GET',
      body: describeRequestBody(requestInit.body),
    }));
  }

  return fetchWithDevNetworkLog(requestUrl, {
    ...requestInit,
    headers: retryHeaders,
  }, 'network-error-retry');
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
  isActive?: boolean;
  parentName?: string | null;
  parentPhone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  notes?: string | null;
  gender?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DashboardStudentSearchItem = DashboardStudentListItem;

export type ClassroomListItem = {
  id: string;
  name: string;
  total: number;
  teacher: string;
  lastMeasuredAt: string;
  coverage: string;
  students: DashboardStudentListItem[];
};

export type CreateMeasurementSessionPayload = {
  schoolId: string;
  classId: string;
  name: string;
  note?: string | null;
  sessionDate: string;
};

export type SaveStudentMeasurementRecordPayload = {
  sessionId: string;
  studentId: string;
  studentEnrollmentId?: string | null;
  captureMethod: 'manual' | 'automatic';
  captureSource:
    | 'manual_form'
    | 'device_ble'
    | 'face_identification'
    | 'batch'
    | 'height_pose';
  heightCm?: number | null;
  weightKg?: number | null;
  notes?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  devicePayload?: Record<string, unknown> | null;
  clientRecordId?: string | null;
};

export type CreateImmunizationSessionPayload = {
  schoolId: string;
  classId: string;
  name: string;
  vaccineName: string;
  doseLabel?: string | null;
  officerName?: string | null;
  note?: string | null;
  sessionDate: string;
};

export type SaveStudentImmunizationRecordPayload = {
  sessionId: string;
  studentId: string;
  studentEnrollmentId?: string | null;
  vaccineName: string;
  doseLabel?: string | null;
  officerName?: string | null;
  status?: 'given' | 'deferred' | 'refused' | 'absent';
  batchNumber?: string | null;
  injectionSite?: string | null;
  notes?: string | null;
  adverseEventNotes?: string | null;
  clientRecordId?: string | null;
};

export type DashboardMeasurementAnalytics = {
  averageMetrics: AverageMetricItem[];
  bmiCategoryData: CategoryBarItem[];
  heightTrend: TrendPoint[];
  weightTrend: TrendPoint[];
  measuredRecordCount: number;
};

export type GradeLevelItem = {
  id: string;
  levelNumber: number;
  label: string;
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
};

export type UpdateClassroomPayload = {
  classroomId: string;
  name: string;
  gradeLevel: number;
  description?: string | null;
};

export type CreateTeacherPayload = {
  schoolId: string;
  email: string;
  fullName: string;
  password: string;
};

export type CreateStudentPayload = {
  schoolId: string;
  fullName: string;
  classroomId: string;
  nis?: string | null;
  nisn?: string | null;
  gender?: 'male' | 'female' | null;
  birthDate?: string | null;
};

export type FaceBulkImage = {
  uri: string;
  base64?: string;
  name?: string;
  type?: string;
};

export type RegisterStudentFacesBulkPayload = {
  images: FaceBulkImage[];
  studentIds: string[];
};

export type FaceEmbeddingItem = {
  id: string;
  studentId: string;
  submittedBy: string;
  filePath: string;
  detectionScore: number | null;
  createdAt: string | null;
  updatedAt: string | null;
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

export type SchoolProfile = {
  id: string;
  name: string | null;
  number: string | null;
  address: string | null;
  joinCode: string | null;
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
  const userId =
    userIdFromClaims && isUuidString(userIdFromClaims)
      ? userIdFromClaims
      : userIdFromUserObject && isUuidString(userIdFromUserObject)
        ? userIdFromUserObject
        : null;
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

function formatShortDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeClassroomListItem(
  row: unknown,
  responsibleTeacherName = 'Wali kelas belum ditentukan',
): ClassroomListItem | null {
  const source = asObject(row);
  const id = readNullableString(source?.id);
  const name = readNullableString(source?.name);
  if (!id || !name) {
    return null;
  }

  const studentEnrollments = Array.isArray(source?.student_enrollments)
    ? source.student_enrollments
    : [];
  const students = studentEnrollments
    .filter(enrollment => {
      const status = readNullableString(asObject(enrollment)?.status);
      return !status || status === 'active';
    })
    .map(enrollment => normalizeStudentEnrollmentListItem({
      ...(asObject(enrollment) ?? {}),
      class: { name },
    }))
    .filter((item): item is DashboardStudentListItem => item !== null);
  const updatedAt = readNullableString(source?.updated_at);

  return {
    id,
    name,
    total: students.length,
    teacher: responsibleTeacherName,
    lastMeasuredAt: updatedAt ? `Diperbarui ${formatShortDateLabel(updatedAt)}` : 'Belum ada pengukuran',
    coverage: `${students.length} siswa terdaftar`,
    students,
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
    isActive: source?.is_active === true,
    parentName: readNullableString(source?.parent_name),
    parentPhone: readNullableString(source?.parent_phone),
    dateOfBirth: readNullableString(source?.date_of_birth),
    address: readNullableString(source?.address),
    notes: readNullableString(source?.notes),
    gender: readNullableString(source?.gender),
    createdAt: readNullableString(source?.created_at),
    updatedAt: readNullableString(source?.updated_at),
  };
}

function normalizeStudentEnrollmentListItem(row: unknown): DashboardStudentListItem | null {
  const source = asObject(row);
  const student = asObject(source?.student);
  const normalizedStudent = normalizeStudentListItem(student ?? source);
  if (!normalizedStudent) {
    return null;
  }

  const classroom = asObject(source?.class);
  return {
    ...normalizedStudent,
    className: readNullableString(classroom?.name) ?? normalizedStudent.className,
  };
}

export async function createSchool(payload: CreateSchoolPayload): Promise<CurrentSchoolContext> {
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
  return {
    schoolId,
    schoolName,
  };
}

export async function joinSchool(payload: JoinSchoolPayload): Promise<CurrentSchoolContext> {
  const normalizedJoinCode = payload.joinCode.trim().toUpperCase();
  if (!normalizedJoinCode) {
    throw new Error('Kode join wajib diisi.');
  }

  const query = `
    query FindSchoolByJoinCode($joinCode: String!) {
      schools(where: { join_code: { _eq: $joinCode } }, limit: 1) {
        id
        name
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-role': 'user',
    },
    body: JSON.stringify({
      query,
      variables: { joinCode: normalizedJoinCode },
    }),
  })) as
    | {
        data?: { schools?: Array<{ id?: string | null; name?: string | null }> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    logHasuraClaimsDebug('joinSchool');
    const firstMessage = responseBody.errors[0]?.message;
    if (firstMessage?.includes('invalid input syntax for type uuid: "id"')) {
      throw new Error(
        'Permission select schools untuk role user masih memakai literal "id" pada filter UUID.',
      );
    }
    throw new Error(firstMessage || 'Gagal validasi kode join.');
  }

  const foundSchool = responseBody?.data?.schools?.[0] ?? null;
  const schoolId = foundSchool?.id ?? null;
  if (!schoolId) {
    throw new Error('Kode join sekolah tidak ditemukan.');
  }

  await setActiveSchool(schoolId, 'user');
  return {
    schoolId,
    schoolName: foundSchool?.name ?? `Sekolah ${schoolId.slice(0, 8).toUpperCase()}`,
  };
}

function normalizeMembership(item: unknown): SchoolMembership | null {
  const source = asObject(item);
  if (!source) {
    return null;
  }
  const schoolObject = asObject(source.school);

  const schoolId = readNullableString(source.school_id) ?? readNullableString(source.schoolId);
  if (!schoolId || !isUuidString(schoolId)) {
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

function getMembershipRolePriority(role: string): number {
  const normalizedRole = normalizeRoleKey(role);
  if (normalizedRole === 'school_admin') {
    return 3;
  }
  if (normalizedRole === 'teacher') {
    return 2;
  }
  if (normalizedRole === 'user') {
    return 1;
  }
  return 0;
}

function pickPreferredMembership(
  current: SchoolMembership,
  candidate: SchoolMembership,
): SchoolMembership {
  if (candidate.is_active !== current.is_active) {
    return candidate.is_active ? candidate : current;
  }

  const currentRolePriority = getMembershipRolePriority(current.role);
  const candidateRolePriority = getMembershipRolePriority(candidate.role);
  if (candidateRolePriority !== currentRolePriority) {
    return candidateRolePriority > currentRolePriority ? candidate : current;
  }

  return candidate.id.localeCompare(current.id) > 0 ? candidate : current;
}

function dedupeMembershipsBySchool(memberships: SchoolMembership[]): SchoolMembership[] {
  const membershipsBySchool = new Map<string, SchoolMembership>();

  memberships.forEach(membership => {
    const existingMembership = membershipsBySchool.get(membership.school_id);
    membershipsBySchool.set(
      membership.school_id,
      existingMembership
        ? pickPreferredMembership(existingMembership, membership)
        : membership,
    );
  });

  return Array.from(membershipsBySchool.values());
}

async function fetchSchoolDetailsByIds(schoolIds: string[], hasuraRole?: string): Promise<SchoolDetailsById> {
  if (schoolIds.length === 0) {
    return {};
  }

  const query = `
    query GetSchoolByPk($schoolId: uuid!) {
      schools_by_pk(id: $schoolId) {
        id
        name
        number
        address
        join_code
      }
    }
  `;
  const detailsById: SchoolDetailsById = {};

  for (const schoolId of schoolIds.filter(isUuidString)) {
    const responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
        ...(hasuraRole ? { 'x-hasura-role': hasuraRole } : {}),
      },
      body: JSON.stringify({
        query,
        variables: { schoolId },
      }),
    })) as
      | {
          data?: {
            schools_by_pk?: Record<string, unknown> | null;
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
      logHasuraClaimsDebug('schoolsByIds');
      continue;
    }

    const schoolObject = asObject(responseBody?.data?.schools_by_pk);
    if (!schoolObject) {
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

export async function getSchoolProfile(schoolId: string): Promise<SchoolProfile> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    throw new Error('Sekolah aktif tidak ditemukan.');
  }
  if (!isUuidString(normalizedSchoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const query = `
    query GetSchoolProfileByPk($schoolId: uuid!) {
      schools_by_pk(id: $schoolId) {
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
    },
    body: JSON.stringify({
      query,
      variables: { schoolId: normalizedSchoolId },
    }),
  })) as
    | {
        data?: {
          schools_by_pk?: Record<string, unknown> | null;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    const firstMessage = responseBody.errors[0]?.message;
    logHasuraClaimsDebug('getSchoolProfile');
    if (firstMessage?.includes('invalid input syntax for type uuid: "id"')) {
      return {
        id: normalizedSchoolId,
        name: null,
        number: null,
        address: null,
        joinCode: null,
      };
    }
    throw new Error(firstMessage || 'Gagal mengambil profil sekolah dari Hasura.');
  }

  const schoolObject = asObject(responseBody?.data?.schools_by_pk);
  if (!schoolObject) {
    throw new Error('Profil sekolah tidak ditemukan.');
  }

  return normalizeSchoolProfile(schoolObject);
}

function normalizeSchoolProfile(source: Record<string, unknown>): SchoolProfile {
  const id = readNullableString(source.id);
  if (!id) {
    throw new Error('Profil sekolah tidak ditemukan.');
  }

  return {
    id,
    name: readNullableString(source.name),
    number: readNullableString(source.number),
    address: readNullableString(source.address),
    joinCode: readNullableString(source.join_code),
  };
}

export async function listMemberships(): Promise<SchoolMembership[]> {
  const query = `
    query ListMySchoolMemberships {
      school_memberships(order_by: [{ is_active: desc }, { created_at: desc }]) {
        is_active
        role
        status
        created_at
        joined_at
        updated_at
        id
        school_id
        user_id
      }
    }
  `;

  const response = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-role': 'user',
    },
    body: JSON.stringify({
      query,
    }),
  })) as
    | {
        data?: { school_memberships?: unknown[] };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (__DEV__) {
    console.log('[listMemberships][graphql][endpoint]', GRAPHQL_URL);
    console.log('[listMemberships][graphql][raw]', JSON.stringify(response));
  }

  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    const firstMessage = response.errors[0]?.message;
    throw new Error(firstMessage || 'Gagal mengambil membership sekolah dari Hasura.');
  }

  const rawMemberships = response?.data?.school_memberships;
  const memberships = Array.isArray(rawMemberships)
    ? rawMemberships
        .map(normalizeMembership)
        .filter((item): item is SchoolMembership => item !== null)
    : [];
  const uniqueMemberships = dedupeMembershipsBySchool(memberships);
  const uniqueSchoolIds = Array.from(new Set(uniqueMemberships.map(item => item.school_id)));
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

  const hydratedMemberships = uniqueMemberships.map(item => {
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
  if (!isUuidString(normalizedSchoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const queryWithStudents = `
    query ListClassroomsBySchool($schoolId: uuid!) {
      classes(where: { school_id: { _eq: $schoolId } }, order_by: [{ name: asc }]) {
        id
        name
        updated_at
        student_enrollments {
          id
          status
          student_id
          student {
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
          }
        }
      }
    }
  `;
  const queryBasic = `
    query ListClassroomsBySchool($schoolId: uuid!) {
      classes(where: { school_id: { _eq: $schoolId } }, order_by: [{ name: asc }]) {
        id
        name
        updated_at
      }
    }
  `;

  let responseBody: { data?: { classes?: unknown[] }; errors?: Array<{ message?: string }> } | null = null;
  for (const query of [queryWithStudents, queryBasic]) {
    responseBody = (await apiRequest(GRAPHQL_URL, {
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
          data?: { classes?: unknown[] };
          errors?: Array<{ message?: string }>;
        }
      | null;

    if (!Array.isArray(responseBody?.errors) || responseBody.errors.length === 0) {
      break;
    }
  }

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil daftar kelas.');
  }

  const classRows = responseBody?.data?.classes ?? [];
  const classIds = classRows
    .map(row => readNullableString(asObject(row)?.id))
    .filter((item): item is string => item !== null);
  const studentEnrollmentsByClassId = await getStudentEnrollmentsByClassIds(classIds);
  const teachers = await listTeachersBySchool(normalizedSchoolId).catch(() => []);
  const responsibleTeacherName = teachers[0]?.name ?? 'Wali kelas belum ditentukan';

  return classRows
    .map(row => {
      const source = asObject(row);
      const classId = readNullableString(source?.id);
      const rowEnrollments = Array.isArray(source?.student_enrollments)
        ? source.student_enrollments
        : [];
      return normalizeClassroomListItem(
        {
          ...(source ?? {}),
          student_enrollments:
            rowEnrollments.length > 0 || !classId
              ? rowEnrollments
              : studentEnrollmentsByClassId[classId] ?? [],
        },
        responsibleTeacherName,
      );
    })
    .filter((item): item is ClassroomListItem => item !== null);
}

async function getStudentEnrollmentsByClassIds(
  classIds: string[],
): Promise<Record<string, Array<Record<string, unknown>>>> {
  if (classIds.length === 0) {
    return {};
  }

  const query = `
    query GetStudentEnrollmentsByClass($classIds: [uuid!]!) {
      student_enrollments(where: { class_id: { _in: $classIds } }) {
        id
        status
        class_id
        student_id
        student {
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
      variables: { classIds },
    }),
  })) as
    | {
        data?: { student_enrollments?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    return {};
  }

  return (responseBody?.data?.student_enrollments ?? []).reduce<
    Record<string, Array<Record<string, unknown>>>
  >((accumulator, enrollment) => {
    const classId = readNullableString(asObject(enrollment)?.class_id);
    if (!classId) {
      return accumulator;
    }
    accumulator[classId] = [...(accumulator[classId] ?? []), enrollment];
    return accumulator;
  }, {});
}

function toHasuraDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function normalizeMeasurementSessionStatus(value: unknown): MeasurementSessionStatus {
  const status = readNullableString(value);
  if (
    status === 'draft' ||
    status === 'active' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status;
  }

  return 'active';
}

function normalizeImmunizationSessionStatus(value: unknown): ImmunizationSessionStatus {
  const status = readNullableString(value);
  if (
    status === 'draft' ||
    status === 'active' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status;
  }

  return 'active';
}

function buildMeasurementText(heightCm: string, weightKg: string): string {
  const heightDisplay = heightCm.length > 0 ? heightCm : '-';
  const weightDisplay = weightKg.length > 0 ? weightKg : '-';
  return `TB ${heightDisplay} cm • BB ${weightDisplay} kg`;
}

function formatMeasurementTimestamp(value: string | null): string {
  if (!value) {
    return 'Belum diukur';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `Diukur ${value}`;
  }

  return `Diukur ${new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`;
}

function buildImmunizationText(vaccineName: string, doseLabel: string | null, status = 'given') {
  const statusLabel =
    status === 'given'
      ? 'Lengkap'
      : status === 'deferred'
        ? 'Ditunda'
        : status === 'refused'
          ? 'Ditolak'
          : 'Tidak hadir';
  return `${vaccineName} • ${statusLabel}${doseLabel ? ` • ${doseLabel}` : ''}`;
}

function buildEmptyMeasurementAnalytics(): DashboardMeasurementAnalytics {
  return {
    averageMetrics: [
      { label: 'Rata-rata Tinggi', value: '0', unit: 'cm' },
      { label: 'Rata-rata Berat', value: '0', unit: 'kg' },
      { label: 'Rata-rata BMI', value: '0', unit: '' },
    ],
    bmiCategoryData: [
      { value: 0, label: 'Kurus', frontColor: '#E2A93B' },
      { value: 0, label: 'Normal', frontColor: '#27AE60' },
      { value: 0, label: 'Gemuk', frontColor: '#2D9CDB' },
      { value: 0, label: 'Obes', frontColor: '#EB5757' },
    ],
    heightTrend: [{ value: 0, label: '-' }],
    weightTrend: [{ value: 0, label: '-' }],
    measuredRecordCount: 0,
  };
}

function formatDecimal(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return value.toFixed(fractionDigits).replace(/\.0$/, '');
}

function getBmiCategory(heightCm: number | null, weightKg: number | null) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) {
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

function getMonthKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date);
}

function average(values: number[]): number | null {
  const cleanValues = values.filter(value => Number.isFinite(value));
  if (cleanValues.length === 0) {
    return null;
  }

  return cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length;
}

export async function getDashboardMeasurementAnalytics(payload: {
  schoolId: string;
  startDate: string;
  endDate: string;
}): Promise<DashboardMeasurementAnalytics> {
  const schoolId = payload.schoolId.trim();
  if (!isUuidString(schoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const sessionQuery = `
    query DashboardMeasurementSessions($schoolId: uuid!, $startDate: date!, $endDate: date!) {
      measurement_sessions(
        where: {
          school_id: { _eq: $schoolId }
          session_date: { _gte: $startDate, _lte: $endDate }
          status: { _neq: "cancelled" }
        }
      ) {
        id
        session_date
      }
    }
  `;

  const sessionResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sessionQuery,
      variables: {
        schoolId,
        startDate: toHasuraDate(payload.startDate),
        endDate: toHasuraDate(payload.endDate),
      },
    }),
  })) as
    | {
        data?: { measurement_sessions?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(sessionResponse?.errors) && sessionResponse.errors.length > 0) {
    throw new Error(sessionResponse.errors[0]?.message || 'Gagal mengambil sesi pengukuran.');
  }

  const sessions = sessionResponse?.data?.measurement_sessions ?? [];
  const sessionDateById = sessions.reduce<Record<string, string>>((accumulator, row) => {
    const source = asObject(row);
    const id = readNullableString(source?.id);
    const sessionDate = readNullableString(source?.session_date);
    if (id && sessionDate) {
      accumulator[id] = sessionDate;
    }
    return accumulator;
  }, {});
  const sessionIds = Object.keys(sessionDateById);
  if (sessionIds.length === 0) {
    return buildEmptyMeasurementAnalytics();
  }

  const recordQuery = `
    query DashboardMeasurementRecords($sessionIds: [uuid!]!) {
      student_measurement_records(where: { session_id: { _in: $sessionIds } }) {
        session_id
        height_cm
        weight_kg
        measured_at
      }
    }
  `;

  const recordResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: recordQuery,
      variables: { sessionIds },
    }),
  })) as
    | {
        data?: { student_measurement_records?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(recordResponse?.errors) && recordResponse.errors.length > 0) {
    throw new Error(recordResponse.errors[0]?.message || 'Gagal mengambil data pengukuran.');
  }

  const records = recordResponse?.data?.student_measurement_records ?? [];
  if (records.length === 0) {
    return buildEmptyMeasurementAnalytics();
  }

  const heights: number[] = [];
  const weights: number[] = [];
  const bmis: number[] = [];
  const categoryCounts: Record<string, number> = {
    Kurus: 0,
    Normal: 0,
    Gemuk: 0,
    Obes: 0,
  };
  const monthlyBuckets: Record<string, { heights: number[]; weights: number[] }> = {};

  records.forEach(row => {
    const source = asObject(row);
    const heightCm = readNullableNumber(source?.height_cm);
    const weightKg = readNullableNumber(source?.weight_kg);
    const sessionId = readNullableString(source?.session_id);
    const measuredAt = readNullableString(source?.measured_at);
    const monthKey = getMonthKey(measuredAt) ?? getMonthKey(sessionId ? sessionDateById[sessionId] : null);

    if (heightCm !== null) {
      heights.push(heightCm);
    }
    if (weightKg !== null) {
      weights.push(weightKg);
    }
    if (heightCm !== null && weightKg !== null && heightCm > 0 && weightKg > 0) {
      const heightM = heightCm / 100;
      bmis.push(weightKg / (heightM * heightM));
    }

    const category = getBmiCategory(heightCm, weightKg);
    if (category) {
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }

    if (monthKey) {
      monthlyBuckets[monthKey] = monthlyBuckets[monthKey] ?? { heights: [], weights: [] };
      if (heightCm !== null) {
        monthlyBuckets[monthKey].heights.push(heightCm);
      }
      if (weightKg !== null) {
        monthlyBuckets[monthKey].weights.push(weightKg);
      }
    }
  });

  const monthKeys = Object.keys(monthlyBuckets).sort();
  const heightTrend = monthKeys
    .map(monthKey => ({
      value: average(monthlyBuckets[monthKey].heights) ?? 0,
      label: getMonthLabel(monthKey),
    }))
    .filter(point => point.value > 0);
  const weightTrend = monthKeys
    .map(monthKey => ({
      value: average(monthlyBuckets[monthKey].weights) ?? 0,
      label: getMonthLabel(monthKey),
    }))
    .filter(point => point.value > 0);

  return {
    averageMetrics: [
      { label: 'Rata-rata Tinggi', value: formatDecimal(average(heights) ?? 0), unit: 'cm' },
      { label: 'Rata-rata Berat', value: formatDecimal(average(weights) ?? 0), unit: 'kg' },
      { label: 'Rata-rata BMI', value: formatDecimal(average(bmis) ?? 0), unit: '' },
    ],
    bmiCategoryData: [
      { value: categoryCounts.Kurus, label: 'Kurus', frontColor: '#E2A93B' },
      { value: categoryCounts.Normal, label: 'Normal', frontColor: '#27AE60' },
      { value: categoryCounts.Gemuk, label: 'Gemuk', frontColor: '#2D9CDB' },
      { value: categoryCounts.Obes, label: 'Obes', frontColor: '#EB5757' },
    ],
    heightTrend: heightTrend.length > 0 ? heightTrend : [{ value: 0, label: '-' }],
    weightTrend: weightTrend.length > 0 ? weightTrend : [{ value: 0, label: '-' }],
    measuredRecordCount: records.length,
  };
}

export async function listImmunizationSessions(
  schoolId: string,
): Promise<ImmunizationSessionListItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }
  if (!isUuidString(normalizedSchoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const query = `
    query ListImmunizationSessions($schoolId: uuid!) {
      immunization_sessions(
        where: { school_id: { _eq: $schoolId } }
        order_by: [{ session_date: desc }, { created_at: desc }]
      ) {
        id
        school_id
        class_id
        name
        vaccine_name
        dose_label
        officer_name
        note
        session_date
        status
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { schoolId: normalizedSchoolId } }),
  })) as
    | {
        data?: { immunization_sessions?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil sesi imunisasi.');
  }

  const sessionRows = responseBody?.data?.immunization_sessions ?? [];
  if (sessionRows.length === 0) {
    return [];
  }

  const classrooms = await listClassroomsBySchool(normalizedSchoolId).catch(() => []);
  const classroomById = classrooms.reduce<Record<string, ClassroomListItem>>((accumulator, classroom) => {
    accumulator[classroom.id] = classroom;
    return accumulator;
  }, {});
  const sessionIds = sessionRows
    .map(row => readNullableString(asObject(row)?.id))
    .filter((item): item is string => item !== null);
  const recordCountBySessionId = await getImmunizationRecordCountsBySessionIds(sessionIds);

  return sessionRows
    .map(row => {
      const source = asObject(row);
      const id = readNullableString(source?.id);
      const rowSchoolId = readNullableString(source?.school_id);
      const classId = readNullableString(source?.class_id);
      const name = readNullableString(source?.name);
      const vaccineName = readNullableString(source?.vaccine_name);
      const sessionDate = readNullableString(source?.session_date);
      if (!id || !rowSchoolId || !classId || !name || !vaccineName || !sessionDate) {
        return null;
      }

      const classroom = classroomById[classId];
      return {
        id,
        schoolId: rowSchoolId,
        classId,
        className: classroom?.name ?? 'Kelas belum diketahui',
        name,
        vaccineName,
        doseLabel: readNullableString(source?.dose_label),
        officerName: readNullableString(source?.officer_name),
        note: readNullableString(source?.note),
        sessionDate,
        status: normalizeImmunizationSessionStatus(source?.status),
        totalStudents: classroom?.total ?? 0,
        recordedCount: recordCountBySessionId[id] ?? 0,
      };
    })
    .filter((item): item is ImmunizationSessionListItem => item !== null);
}

async function getImmunizationRecordCountsBySessionIds(
  sessionIds: string[],
): Promise<Record<string, number>> {
  if (sessionIds.length === 0) {
    return {};
  }

  const query = `
    query CountImmunizationRecords($sessionIds: [uuid!]!) {
      student_immunization_records(where: { session_id: { _in: $sessionIds } }) {
        session_id
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { sessionIds } }),
  })) as
    | {
        data?: { student_immunization_records?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    return {};
  }

  return (responseBody?.data?.student_immunization_records ?? []).reduce<Record<string, number>>(
    (accumulator, row) => {
      const sessionId = readNullableString(asObject(row)?.session_id);
      if (sessionId) {
        accumulator[sessionId] = (accumulator[sessionId] ?? 0) + 1;
      }
      return accumulator;
    },
    {},
  );
}

export async function createImmunizationSession(
  payload: CreateImmunizationSessionPayload,
): Promise<ImmunizationSessionListItem> {
  const userId = getSessionUserIdOrThrow();
  const schoolId = payload.schoolId.trim();
  const classId = payload.classId.trim();
  const name = payload.name.trim();
  const vaccineName = payload.vaccineName.trim();
  if (!isUuidString(schoolId) || !isUuidString(classId)) {
    throw new Error('Sekolah atau kelas sesi tidak valid.');
  }
  if (!name || !vaccineName) {
    throw new Error('Nama sesi dan jenis imunisasi wajib diisi.');
  }

  const mutation = `
    mutation CreateImmunizationSession($object: immunization_sessions_insert_input!) {
      insert_immunization_sessions_one(object: $object) {
        id
        school_id
        class_id
        name
        vaccine_name
        dose_label
        officer_name
        note
        session_date
        status
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: mutation,
      variables: {
        object: {
          school_id: schoolId,
          class_id: classId,
          name,
          vaccine_name: vaccineName,
          dose_label: payload.doseLabel?.trim() || null,
          officer_name: payload.officerName?.trim() || null,
          note: payload.note?.trim() || null,
          session_date: toHasuraDate(payload.sessionDate),
          status: 'active',
          created_by: userId,
        },
      },
    }),
  })) as
    | {
        data?: { insert_immunization_sessions_one?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal membuat sesi imunisasi.');
  }

  const created = asObject(responseBody?.data?.insert_immunization_sessions_one);
  const id = readNullableString(created?.id);
  const createdSchoolId = readNullableString(created?.school_id);
  const createdClassId = readNullableString(created?.class_id);
  const createdName = readNullableString(created?.name);
  const createdVaccineName = readNullableString(created?.vaccine_name);
  const sessionDate = readNullableString(created?.session_date);
  if (!id || !createdSchoolId || !createdClassId || !createdName || !createdVaccineName || !sessionDate) {
    throw new Error('Respons sesi imunisasi tidak lengkap.');
  }

  const classrooms = await listClassroomsBySchool(createdSchoolId).catch(() => []);
  const classroom = classrooms.find(item => item.id === createdClassId);
  return {
    id,
    schoolId: createdSchoolId,
    classId: createdClassId,
    className: classroom?.name ?? 'Kelas belum diketahui',
    name: createdName,
    vaccineName: createdVaccineName,
    doseLabel: readNullableString(created?.dose_label),
    officerName: readNullableString(created?.officer_name),
    note: readNullableString(created?.note),
    sessionDate,
    status: normalizeImmunizationSessionStatus(created?.status),
    totalStudents: classroom?.total ?? 0,
    recordedCount: 0,
  };
}

export async function listImmunizationStudents(
  sessionId: string,
): Promise<StudentMeasurementItem[]> {
  const normalizedSessionId = sessionId.trim();
  if (!isUuidString(normalizedSessionId)) {
    throw new Error('ID sesi imunisasi tidak valid.');
  }

  const sessionQuery = `
    query GetImmunizationSession($sessionId: uuid!) {
      immunization_sessions_by_pk(id: $sessionId) {
        id
        class_id
        vaccine_name
        dose_label
      }
    }
  `;

  const sessionResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sessionQuery, variables: { sessionId: normalizedSessionId } }),
  })) as
    | {
        data?: { immunization_sessions_by_pk?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(sessionResponse?.errors) && sessionResponse.errors.length > 0) {
    throw new Error(sessionResponse.errors[0]?.message || 'Gagal mengambil sesi imunisasi.');
  }

  const session = asObject(sessionResponse?.data?.immunization_sessions_by_pk);
  const classId = readNullableString(session?.class_id);
  const vaccineName = readNullableString(session?.vaccine_name) ?? 'Imunisasi';
  const doseLabel = readNullableString(session?.dose_label);
  if (!classId) {
    throw new Error('Sesi imunisasi tidak ditemukan.');
  }

  const query = `
    query ListImmunizationStudents($classId: uuid!, $sessionId: uuid!) {
      student_enrollments(
        where: { class_id: { _eq: $classId }, status: { _eq: "active" } }
        order_by: [{ student: { full_name: asc } }]
      ) {
        id
        student_id
        student {
          id
          full_name
          student_number
        }
      }
      student_immunization_records(where: { session_id: { _eq: $sessionId } }) {
        id
        student_id
        student_enrollment_id
        status
        vaccine_name
        dose_label
        administered_at
      }
    }
  `;

  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { classId, sessionId: normalizedSessionId } }),
  })) as
    | {
        data?: {
          student_enrollments?: Array<Record<string, unknown>>;
          student_immunization_records?: Array<Record<string, unknown>>;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil daftar siswa imunisasi.');
  }

  const recordsByStudentId = (responseBody?.data?.student_immunization_records ?? []).reduce<
    Record<string, Record<string, unknown>>
  >((accumulator, record) => {
    const studentId = readNullableString(asObject(record)?.student_id);
    if (studentId) {
      accumulator[studentId] = record;
    }
    return accumulator;
  }, {});

  return (responseBody?.data?.student_enrollments ?? [])
    .map((enrollment): StudentMeasurementItem | null => {
      const source = asObject(enrollment);
      const student = asObject(source?.student);
      const studentId = readNullableString(source?.student_id) ?? readNullableString(student?.id);
      const enrollmentId = readNullableString(source?.id);
      const name = readNullableString(student?.full_name);
      if (!studentId || !enrollmentId || !name) {
        return null;
      }

      const record = asObject(recordsByStudentId[studentId]);
      const recordStatus = readNullableString(record?.status);
      const recordVaccineName = readNullableString(record?.vaccine_name) ?? vaccineName;
      const recordDoseLabel = readNullableString(record?.dose_label) ?? doseLabel;
      const administeredAt = readNullableString(record?.administered_at);

      return {
        recordId: readNullableString(record?.id) ?? undefined,
        studentEnrollmentId: enrollmentId,
        id: studentId,
        name,
        measurement: record
          ? buildImmunizationText(recordVaccineName, recordDoseLabel, recordStatus ?? 'given')
          : 'Belum ada catatan imunisasi',
        timestamp: record ? formatMeasurementTimestamp(administeredAt).replace('Diukur', 'Dicatat') : 'Menunggu input imunisasi',
        checked: Boolean(record),
        syncStatus: 'synced',
        photoUri: null,
      };
    })
    .filter((item): item is StudentMeasurementItem => item !== null);
}

export async function saveStudentImmunizationRecord(
  payload: SaveStudentImmunizationRecordPayload,
): Promise<StudentMeasurementItem> {
  const userId = getSessionUserIdOrThrow();
  const sessionId = payload.sessionId.trim();
  const studentId = payload.studentId.trim();
  const vaccineName = payload.vaccineName.trim();
  const studentEnrollmentId = payload.studentEnrollmentId?.trim() || null;
  if (!isUuidString(sessionId) || !isUuidString(studentId)) {
    throw new Error('Sesi atau siswa tidak valid.');
  }
  if (!vaccineName) {
    throw new Error('Jenis imunisasi wajib diisi.');
  }

  const mutation = `
    mutation UpsertStudentImmunizationRecord($object: student_immunization_records_insert_input!) {
      insert_student_immunization_records_one(
        object: $object
        on_conflict: {
          constraint: student_immunization_records_one_per_session_student
          update_columns: [
            student_enrollment_id
            recorded_by
            status
            capture_method
            administered_at
            vaccine_name
            dose_label
            officer_name
            batch_number
            injection_site
            notes
            adverse_event_notes
            client_record_id
          ]
        }
      ) {
        id
        student_id
        student_enrollment_id
        status
        vaccine_name
        dose_label
        administered_at
      }
    }
  `;

  const administeredAt = new Date().toISOString();
  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: mutation,
      variables: {
        object: {
          session_id: sessionId,
          student_id: studentId,
          student_enrollment_id: studentEnrollmentId,
          recorded_by: userId,
          status: payload.status ?? 'given',
          capture_method: 'manual',
          administered_at: administeredAt,
          vaccine_name: vaccineName,
          dose_label: payload.doseLabel?.trim() || null,
          officer_name: payload.officerName?.trim() || null,
          batch_number: payload.batchNumber?.trim() || null,
          injection_site: payload.injectionSite?.trim() || null,
          notes: payload.notes?.trim() || null,
          adverse_event_notes: payload.adverseEventNotes?.trim() || null,
          client_record_id: payload.clientRecordId?.trim() || null,
        },
      },
    }),
  })) as
    | {
        data?: { insert_student_immunization_records_one?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal menyimpan data imunisasi.');
  }

  const record = asObject(responseBody?.data?.insert_student_immunization_records_one);
  const returnedStudentId = readNullableString(record?.student_id) ?? studentId;
  const returnedEnrollmentId =
    readNullableString(record?.student_enrollment_id) ?? studentEnrollmentId ?? undefined;
  const returnedVaccineName = readNullableString(record?.vaccine_name) ?? vaccineName;
  const returnedDoseLabel = readNullableString(record?.dose_label) ?? payload.doseLabel ?? null;
  const status = readNullableString(record?.status) ?? payload.status ?? 'given';

  return {
    recordId: readNullableString(record?.id) ?? undefined,
    studentEnrollmentId: returnedEnrollmentId,
    id: returnedStudentId,
    name: '',
    measurement: buildImmunizationText(returnedVaccineName, returnedDoseLabel, status),
    timestamp: formatMeasurementTimestamp(readNullableString(record?.administered_at) ?? administeredAt).replace('Diukur', 'Dicatat'),
    checked: true,
    syncStatus: 'synced',
    photoUri: null,
  };
}

export async function listMeasurementSessions(
  schoolId: string,
): Promise<MeasurementSessionListItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }
  if (!isUuidString(normalizedSchoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const query = `
    query ListMeasurementSessions($schoolId: uuid!) {
      measurement_sessions(
        where: { school_id: { _eq: $schoolId } }
        order_by: [{ session_date: desc }, { created_at: desc }]
      ) {
        id
        school_id
        class_id
        name
        note
        session_date
        status
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
        data?: { measurement_sessions?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil sesi pengukuran.');
  }

  const sessionRows = responseBody?.data?.measurement_sessions ?? [];
  if (sessionRows.length === 0) {
    return [];
  }

  const classrooms = await listClassroomsBySchool(normalizedSchoolId).catch(() => []);
  const classroomById = classrooms.reduce<Record<string, ClassroomListItem>>((accumulator, classroom) => {
    accumulator[classroom.id] = classroom;
    return accumulator;
  }, {});
  const sessionIds = sessionRows
    .map(row => readNullableString(asObject(row)?.id))
    .filter((item): item is string => item !== null);

  const recordCountBySessionId = await getMeasurementRecordCountsBySessionIds(sessionIds);

  return sessionRows
    .map(row => {
      const source = asObject(row);
      const id = readNullableString(source?.id);
      const rowSchoolId = readNullableString(source?.school_id);
      const classId = readNullableString(source?.class_id);
      const name = readNullableString(source?.name);
      const sessionDate = readNullableString(source?.session_date);
      if (!id || !rowSchoolId || !classId || !name || !sessionDate) {
        return null;
      }

      const classroom = classroomById[classId];
      return {
        id,
        schoolId: rowSchoolId,
        classId,
        className: classroom?.name ?? 'Kelas belum diketahui',
        name,
        note: readNullableString(source?.note),
        sessionDate,
        status: normalizeMeasurementSessionStatus(source?.status),
        totalStudents: classroom?.total ?? 0,
        recordedCount: recordCountBySessionId[id] ?? 0,
      };
    })
    .filter((item): item is MeasurementSessionListItem => item !== null);
}

async function getMeasurementRecordCountsBySessionIds(
  sessionIds: string[],
): Promise<Record<string, number>> {
  if (sessionIds.length === 0) {
    return {};
  }

  const query = `
    query CountMeasurementRecords($sessionIds: [uuid!]!) {
      student_measurement_records(where: { session_id: { _in: $sessionIds } }) {
        session_id
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
      variables: { sessionIds },
    }),
  })) as
    | {
        data?: { student_measurement_records?: Array<Record<string, unknown>> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    return {};
  }

  return (responseBody?.data?.student_measurement_records ?? []).reduce<Record<string, number>>(
    (accumulator, row) => {
      const sessionId = readNullableString(asObject(row)?.session_id);
      if (!sessionId) {
        return accumulator;
      }
      accumulator[sessionId] = (accumulator[sessionId] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
}

export async function createMeasurementSession(
  payload: CreateMeasurementSessionPayload,
): Promise<MeasurementSessionListItem> {
  const userId = getSessionUserIdOrThrow();
  const schoolId = payload.schoolId.trim();
  const classId = payload.classId.trim();
  const name = payload.name.trim();

  if (!isUuidString(schoolId) || !isUuidString(classId)) {
    throw new Error('Sekolah atau kelas sesi tidak valid.');
  }
  if (!name) {
    throw new Error('Nama sesi wajib diisi.');
  }

  const mutation = `
    mutation CreateMeasurementSession($object: measurement_sessions_insert_input!) {
      insert_measurement_sessions_one(object: $object) {
        id
        school_id
        class_id
        name
        note
        session_date
        status
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
        object: {
          school_id: schoolId,
          class_id: classId,
          name,
          note: payload.note?.trim() || null,
          session_date: toHasuraDate(payload.sessionDate),
          status: 'active',
          created_by: userId,
        },
      },
    }),
  })) as
    | {
        data?: { insert_measurement_sessions_one?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal membuat sesi pengukuran.');
  }

  const created = asObject(responseBody?.data?.insert_measurement_sessions_one);
  const id = readNullableString(created?.id);
  const createdSchoolId = readNullableString(created?.school_id);
  const createdClassId = readNullableString(created?.class_id);
  const createdName = readNullableString(created?.name);
  const sessionDate = readNullableString(created?.session_date);
  if (!id || !createdSchoolId || !createdClassId || !createdName || !sessionDate) {
    throw new Error('Respons sesi pengukuran tidak lengkap.');
  }

  const classrooms = await listClassroomsBySchool(createdSchoolId).catch(() => []);
  const classroom = classrooms.find(item => item.id === createdClassId);
  return {
    id,
    schoolId: createdSchoolId,
    classId: createdClassId,
    className: classroom?.name ?? 'Kelas belum diketahui',
    name: createdName,
    note: readNullableString(created?.note),
    sessionDate,
    status: normalizeMeasurementSessionStatus(created?.status),
    totalStudents: classroom?.total ?? 0,
    recordedCount: 0,
  };
}

export async function listMeasurementStudents(
  sessionId: string,
): Promise<StudentMeasurementItem[]> {
  const normalizedSessionId = sessionId.trim();
  if (!isUuidString(normalizedSessionId)) {
    throw new Error('ID sesi pengukuran tidak valid.');
  }

  const sessionQuery = `
    query GetMeasurementSession($sessionId: uuid!) {
      measurement_sessions_by_pk(id: $sessionId) {
        id
        class_id
      }
    }
  `;

  const sessionResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sessionQuery,
      variables: { sessionId: normalizedSessionId },
    }),
  })) as
    | {
        data?: { measurement_sessions_by_pk?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(sessionResponse?.errors) && sessionResponse.errors.length > 0) {
    throw new Error(sessionResponse.errors[0]?.message || 'Gagal mengambil sesi pengukuran.');
  }

  const session = asObject(sessionResponse?.data?.measurement_sessions_by_pk);
  const classId = readNullableString(session?.class_id);
  if (!classId) {
    throw new Error('Sesi pengukuran tidak ditemukan.');
  }

  const query = `
    query ListMeasurementStudents($classId: uuid!, $sessionId: uuid!) {
      student_enrollments(
        where: { class_id: { _eq: $classId }, status: { _eq: "active" } }
        order_by: [{ student: { full_name: asc } }]
      ) {
        id
        student_id
        student {
          id
          full_name
          student_number
        }
      }
      student_measurement_records(where: { session_id: { _eq: $sessionId } }) {
        id
        student_id
        student_enrollment_id
        height_cm
        weight_kg
        measured_at
        capture_method
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
      variables: { classId, sessionId: normalizedSessionId },
    }),
  })) as
    | {
        data?: {
          student_enrollments?: Array<Record<string, unknown>>;
          student_measurement_records?: Array<Record<string, unknown>>;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil daftar siswa sesi.');
  }

  const recordsByStudentId = (responseBody?.data?.student_measurement_records ?? []).reduce<
    Record<string, Record<string, unknown>>
  >((accumulator, record) => {
    const studentId = readNullableString(asObject(record)?.student_id);
    if (studentId) {
      accumulator[studentId] = record;
    }
    return accumulator;
  }, {});

  return (responseBody?.data?.student_enrollments ?? [])
    .map((enrollment): StudentMeasurementItem | null => {
      const source = asObject(enrollment);
      const student = asObject(source?.student);
      const studentId = readNullableString(source?.student_id) ?? readNullableString(student?.id);
      const enrollmentId = readNullableString(source?.id);
      const name = readNullableString(student?.full_name);
      if (!studentId || !enrollmentId || !name) {
        return null;
      }

      const record = asObject(recordsByStudentId[studentId]);
      const heightCm = readNullableNumber(record?.height_cm);
      const weightKg = readNullableNumber(record?.weight_kg);
      const heightText = heightCm === null ? '' : String(heightCm);
      const weightText = weightKg === null ? '' : String(weightKg);
      const measuredAt = readNullableString(record?.measured_at);

      return {
        recordId: readNullableString(record?.id) ?? undefined,
        studentEnrollmentId: enrollmentId,
        id: studentId,
        name,
        measurement:
          heightText.length > 0 || weightText.length > 0
            ? buildMeasurementText(heightText, weightText)
            : 'Belum ada data pengukuran',
        timestamp: formatMeasurementTimestamp(measuredAt),
        checked: heightCm !== null && weightKg !== null,
        syncStatus: 'synced' as const,
        photoUri: null,
        heightCm: heightText,
        weightKg: weightText,
      };
    })
    .filter((item): item is StudentMeasurementItem => item !== null);
}

export async function saveStudentMeasurementRecord(
  payload: SaveStudentMeasurementRecordPayload,
): Promise<StudentMeasurementItem> {
  const userId = getSessionUserIdOrThrow();
  const sessionId = payload.sessionId.trim();
  const studentId = payload.studentId.trim();
  const studentEnrollmentId = payload.studentEnrollmentId?.trim() || null;
  if (!isUuidString(sessionId) || !isUuidString(studentId)) {
    throw new Error('Sesi atau siswa tidak valid.');
  }

  const mutation = `
    mutation UpsertStudentMeasurementRecord($object: student_measurement_records_insert_input!) {
      insert_student_measurement_records_one(
        object: $object
        on_conflict: {
          constraint: student_measurement_records_one_per_session_student
          update_columns: [
            student_enrollment_id
            recorded_by
            capture_method
            capture_source
            measured_at
            height_cm
            weight_kg
            notes
            device_id
            device_name
            device_payload
            client_record_id
          ]
        }
      ) {
        id
        student_id
        student_enrollment_id
        height_cm
        weight_kg
        measured_at
        capture_method
      }
    }
  `;

  const measuredAt = new Date().toISOString();
  const responseBody = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        object: {
          session_id: sessionId,
          student_id: studentId,
          student_enrollment_id: studentEnrollmentId,
          recorded_by: userId,
          capture_method: payload.captureMethod,
          capture_source: payload.captureSource,
          measured_at: measuredAt,
          height_cm: payload.heightCm ?? null,
          weight_kg: payload.weightKg ?? null,
          notes: payload.notes?.trim() || null,
          device_id: payload.deviceId?.trim() || null,
          device_name: payload.deviceName?.trim() || null,
          device_payload: payload.devicePayload ?? {},
          client_record_id: payload.clientRecordId?.trim() || null,
        },
      },
    }),
  })) as
    | {
        data?: { insert_student_measurement_records_one?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal menyimpan hasil pengukuran.');
  }

  const record = asObject(responseBody?.data?.insert_student_measurement_records_one);
  const recordId = readNullableString(record?.id);
  const returnedStudentId = readNullableString(record?.student_id) ?? studentId;
  const returnedEnrollmentId =
    readNullableString(record?.student_enrollment_id) ?? studentEnrollmentId ?? undefined;
  const heightCm = readNullableNumber(record?.height_cm);
  const weightKg = readNullableNumber(record?.weight_kg);
  const heightText = heightCm === null ? '' : String(heightCm);
  const weightText = weightKg === null ? '' : String(weightKg);

  return {
    recordId: recordId ?? undefined,
    studentEnrollmentId: returnedEnrollmentId,
    id: returnedStudentId,
    name: '',
    measurement: buildMeasurementText(heightText, weightText),
    timestamp: formatMeasurementTimestamp(readNullableString(record?.measured_at) ?? measuredAt),
    checked: heightCm !== null && weightKg !== null,
    syncStatus: 'synced',
    photoUri: null,
    heightCm: heightText,
    weightKg: weightText,
  };
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizeGradeLevelRows(rows: Array<Record<string, unknown>>): GradeLevelItem[] {
  return rows
    .map((row, index) => {
      const source = asObject(row);
      const id = readNullableString(source?.id);
      const levelNumber = readNullableNumber(source?.level_number ?? source?.level) ?? index + 1;
      const label =
        readNullableString(source?.label) ??
        readNullableString(source?.name) ??
        (levelNumber ? `Kelas ${levelNumber}` : null);

      if (!id || !levelNumber || !label) {
        return null;
      }

      return {
        id,
        levelNumber,
        label,
      } satisfies GradeLevelItem;
    })
    .filter((item): item is GradeLevelItem => item !== null)
    .sort((first, second) => first.levelNumber - second.levelNumber);
}

async function queryGradeLevels(): Promise<GradeLevelItem[]> {
  const queryWithCurrentSchema = `
    query ListGradeLevels {
      grade_levels(order_by: [{ level_number: asc }]) {
        id
        level_number
        label
      }
    }
  `;
  const queryWithMetadata = `
    query ListGradeLevels {
      grade_levels(order_by: [{ name: asc }]) {
        id
        name
        level
      }
    }
  `;
  const queryWithName = `
    query ListGradeLevels {
      grade_levels(order_by: [{ name: asc }]) {
        id
        name
      }
    }
  `;
  const queryById = `
    query ListGradeLevels {
      grade_levels(order_by: [{ id: asc }]) {
        id
      }
    }
  `;

  let lastErrorMessage: string | null = null;

  for (const query of [queryWithCurrentSchema, queryWithMetadata, queryWithName, queryById]) {
    const responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })) as
      | {
          data?: { grade_levels?: Array<Record<string, unknown>> };
          errors?: Array<{ message?: string }>;
        }
      | null;

    if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
      lastErrorMessage = responseBody.errors[0]?.message ?? 'Gagal memuat master grade level.';
      continue;
    }

    const rows = Array.isArray(responseBody?.data?.grade_levels) ? responseBody.data.grade_levels : [];
    const gradeLevels = normalizeGradeLevelRows(rows);
    if (gradeLevels.length > 0) {
      return gradeLevels;
    }
  }

  if (lastErrorMessage) {
    throw new Error(lastErrorMessage);
  }

  return [];
}

export async function listGradeLevels(): Promise<GradeLevelItem[]> {
  return queryGradeLevels();
}

async function getGradeLevelIdOrThrow(gradeLevel: number): Promise<string> {
  const rows = await queryGradeLevels();
  const exactMatch = rows.find(row => row.levelNumber === gradeLevel || row.label === String(gradeLevel) || row.label === `Kelas ${gradeLevel}`);
  const fallbackByOrder = rows[gradeLevel - 1];
  const gradeLevelId = exactMatch?.id ?? fallbackByOrder?.id;
  if (gradeLevelId) {
    return gradeLevelId;
  }

  throw new Error('Grade level belum tersedia di Hasura. Tambahkan data grade_levels dulu.');
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
  const schoolId = payload.schoolId.trim();
  const name = payload.name.trim();
  if (!schoolId || !name || !Number.isFinite(payload.gradeLevel)) {
    throw new Error('Data kelas tidak valid.');
  }

  const academicYearId = await getActiveAcademicYearIdOrThrow(schoolId);
  const gradeLevelId = await getGradeLevelIdOrThrow(payload.gradeLevel);
  const mutation = `
    mutation CreateClassroom(
      $schoolId: uuid!,
      $academicYearId: uuid!,
      $gradeLevelId: uuid!,
      $name: String!
    ) {
      insert_classes_one(
        object: {
          school_id: $schoolId,
          academic_year_id: $academicYearId,
          grade_level_id: $gradeLevelId,
          name: $name
        }
      ) {
        id
        name
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
        academicYearId,
        gradeLevelId,
        name,
      },
    }),
  })) as
    | {
        data?: { insert_classes_one?: Record<string, unknown> | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal membuat kelas.');
  }

  const teachers = await listTeachersBySchool(schoolId).catch(() => []);
  const created = normalizeClassroomListItem(
    responseBody?.data?.insert_classes_one,
    teachers[0]?.name ?? 'Wali kelas belum ditentukan',
  );
  if (!created) {
    throw new Error('Respons pembuatan kelas tidak valid.');
  }
  return created;
}

export async function updateClassroom(payload: UpdateClassroomPayload): Promise<void> {
  const classroomId = payload.classroomId.trim();
  const name = payload.name.trim();
  if (!classroomId || !name || !Number.isFinite(payload.gradeLevel)) {
    throw new Error('Data kelas tidak valid.');
  }
  const gradeLevelId = await getGradeLevelIdOrThrow(payload.gradeLevel);

  const mutation = `
    mutation UpdateClassroom(
      $classroomId: uuid!,
      $name: String!,
      $gradeLevelId: uuid!
    ) {
      update_classes_by_pk(
        pk_columns: { id: $classroomId },
        _set: {
          name: $name,
          grade_level_id: $gradeLevelId
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
        gradeLevelId,
      },
    }),
  })) as
    | {
        data?: { update_classes_by_pk?: { id?: string | null } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengubah kelas.');
  }

  if (!responseBody?.data?.update_classes_by_pk?.id) {
    throw new Error('Kelas tidak ditemukan atau tidak memiliki akses untuk mengubahnya.');
  }
}

export async function listTeachersBySchool(schoolId: string): Promise<TeacherDirectoryItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }
  if (!isUuidString(normalizedSchoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const query = `
    query ListTeachersBySchool($schoolId: uuid!) {
      school_memberships(
        where: {
          school_id: { _eq: $schoolId },
          role: { _eq: "teacher" },
          status: { _eq: "active" }
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

      return {
        id,
        name,
        email: readNullableString(user?.email) ?? '-',
        password: '',
        code: buildTeacherCode(name),
        homeroom: 'Belum ditentukan',
        handledClasses: 'Belum ada kelas',
        totalStudents: 0,
      } satisfies TeacherDirectoryItem;
    })
    .filter((item): item is TeacherDirectoryItem => item !== null);
}

async function findUserByEmail(email: string): Promise<Record<string, unknown> | null> {
  const queryAuthUsers = `
    query FindUserByEmail($email: String!) {
      auth_users(where: { email: { _eq: $email } }, limit: 1) {
        id
        email
        full_name
      }
    }
  `;
  const queryUsers = `
    query FindUserByEmail($email: String!) {
      users(where: { email: { _eq: $email } }, limit: 1) {
        id
        email
        full_name
      }
    }
  `;
  const queries = [
    { field: 'auth_users', query: queryAuthUsers },
    { field: 'users', query: queryUsers },
  ];
  let missingRootFieldMessage: string | null = null;

  for (const { field, query } of queries) {
    const responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { email },
      }),
    })) as
      | {
          data?: Record<string, Array<Record<string, unknown>> | undefined>;
          errors?: Array<{ message?: string }>;
        }
      | null;

    if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
      const firstMessage = responseBody.errors[0]?.message ?? '';
      if (firstMessage.includes(`field '${field}' not found in type: 'query_root'`)) {
        missingRootFieldMessage = firstMessage;
        continue;
      }
      throw new Error(firstMessage || 'Gagal mencari data user guru.');
    }

    return asObject(responseBody?.data?.[field]?.[0]);
  }

  throw new Error(
    missingRootFieldMessage ??
      'Tabel user auth belum terbuka di GraphQL untuk role school_admin. Aktifkan select auth.users.',
  );
}

async function findAuthRoleIdByCode(codes: string[]): Promise<string | null> {
  const queryRoles = `
    query FindAuthRole($codes: [String!]!) {
      roles(where: { code: { _in: $codes } }, limit: 1) {
        id
        code
      }
    }
  `;
  const queryAuthRoles = `
    query FindAuthRole($codes: [String!]!) {
      auth_roles(where: { code: { _in: $codes } }, limit: 1) {
        id
        code
      }
    }
  `;
  const queries = [
    { field: 'roles', query: queryRoles },
    { field: 'auth_roles', query: queryAuthRoles },
  ];

  for (const { field, query } of queries) {
    const responseBody = (await apiRequest(GRAPHQL_URL, {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { codes },
      }),
    })) as
      | {
          data?: Record<string, Array<Record<string, unknown>> | undefined>;
          errors?: Array<{ message?: string }>;
        }
      | null;

    if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
      const firstMessage = responseBody.errors[0]?.message ?? '';
      if (firstMessage.includes(`field '${field}' not found in type: 'query_root'`)) {
        continue;
      }
      throw new Error(firstMessage || 'Gagal mencari role guru.');
    }

    const roleId = readNullableString(responseBody?.data?.[field]?.[0]?.id);
    if (roleId) {
      return roleId;
    }
  }

  return null;
}

async function setUserDefaultAuthRole(userId: string, roleId: string): Promise<void> {
  const findPublicDefaultRoleQuery = `
    query FindDefaultUserRole($userId: uuid!) {
      user_roles(where: { user_id: { _eq: $userId }, is_default: { _eq: true } }, limit: 1) {
        user_id
        role_id
      }
    }
  `;
  const findAuthDefaultRoleQuery = `
    query FindDefaultUserRole($userId: uuid!) {
      auth_user_roles(where: { user_id: { _eq: $userId }, is_default: { _eq: true } }, limit: 1) {
        user_id
        role_id
      }
    }
  `;
  const lookupQueries = [
    { field: 'user_roles', query: findPublicDefaultRoleQuery, schemaPrefix: '' },
    { field: 'auth_user_roles', query: findAuthDefaultRoleQuery, schemaPrefix: 'auth_' },
  ];
  let selectedSchemaPrefix = '';
  let hasDefaultRole = false;

  for (const { field, query, schemaPrefix } of lookupQueries) {
    const defaultRoleResponse = (await apiRequest(GRAPHQL_URL, {
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
          data?: Record<string, Array<Record<string, unknown>> | undefined>;
          errors?: Array<{ message?: string }>;
        }
      | null;

    if (Array.isArray(defaultRoleResponse?.errors) && defaultRoleResponse.errors.length > 0) {
      const firstMessage = defaultRoleResponse.errors[0]?.message ?? '';
      if (firstMessage.includes(`field '${field}' not found in type: 'query_root'`)) {
        continue;
      }
      throw new Error(firstMessage || 'Gagal membaca role user.');
    }

    selectedSchemaPrefix = schemaPrefix;
    hasDefaultRole = Boolean(defaultRoleResponse?.data?.[field]?.[0]);
    break;
  }

  const insertField = `insert_${selectedSchemaPrefix}user_roles_one`;
  const updateField = `update_${selectedSchemaPrefix}user_roles`;
  const mutation = hasDefaultRole
    ? `
      mutation UpdateDefaultUserRole($userId: uuid!, $roleId: uuid!) {
        ${updateField}(
          where: { user_id: { _eq: $userId }, is_default: { _eq: true } }
          _set: { role_id: $roleId, is_default: true }
        ) {
          affected_rows
        }
      }
    `
    : `
      mutation InsertDefaultUserRole($userId: uuid!, $roleId: uuid!) {
        ${insertField}(
          object: {
            user_id: $userId
            role_id: $roleId
            is_default: true
          }
        ) {
          user_id
          role_id
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
      variables: { userId, roleId },
    }),
  })) as
    | {
      data?: Record<string, { id?: string | null } | null | undefined>;
      errors?: Array<{ message?: string }>;
    }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal menyimpan role guru.');
  }
}

export async function createTeacherForSchool(payload: CreateTeacherPayload): Promise<TeacherDirectoryItem> {
  const schoolId = payload.schoolId.trim();
  const email = payload.email.trim().toLowerCase();
  const fullName = payload.fullName.trim();
  const password = payload.password;
  if (!schoolId || !isUuidString(schoolId) || !email || !fullName || !password) {
    throw new Error('Data guru tidak valid.');
  }

  const existingUser = await findUserByEmail(email);
  if (!existingUser) {
    await register({
      email,
      password,
      full_name: fullName,
    });
  }

  const user = existingUser ?? (await findUserByEmail(email));
  const userId = readNullableString(user?.id);
  if (!userId) {
    throw new Error('User guru berhasil dibuat, tetapi belum bisa ditemukan.');
  }
  const teacherRoleId = await findAuthRoleIdByCode(['teacher', 'school_member']);
  if (!teacherRoleId) {
    throw new Error('Role school_member/teacher belum tersedia di tabel roles Hasura.');
  }
  await setUserDefaultAuthRole(userId, teacherRoleId);

  const findMembershipQuery = `
    query FindTeacherMembership($userId: uuid!, $schoolId: uuid!) {
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
  const membershipLookup = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: findMembershipQuery,
      variables: { userId, schoolId },
    }),
  })) as
    | {
        data?: { school_memberships?: Array<{ id?: string | null }> };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(membershipLookup?.errors) && membershipLookup.errors.length > 0) {
    throw new Error(membershipLookup.errors[0]?.message || 'Gagal mengecek membership guru.');
  }

  const existingMembershipId = membershipLookup?.data?.school_memberships?.[0]?.id ?? null;
  const mutation = existingMembershipId
    ? `
      mutation UpdateTeacherMembership($membershipId: uuid!) {
        update_school_memberships_by_pk(
          pk_columns: { id: $membershipId }
          _set: { role: "teacher", status: "active", is_active: true }
        ) {
          id
        }
      }
    `
    : `
      mutation InsertTeacherMembership($userId: uuid!, $schoolId: uuid!) {
        insert_school_memberships_one(
          object: {
            user_id: $userId
            school_id: $schoolId
            role: "teacher"
            status: "active"
            is_active: true
          }
        ) {
          id
        }
      }
    `;

  const membershipResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: existingMembershipId ? { membershipId: existingMembershipId } : { userId, schoolId },
    }),
  })) as
    | {
        data?: {
          insert_school_memberships_one?: { id?: string | null } | null;
          update_school_memberships_by_pk?: { id?: string | null } | null;
        };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(membershipResponse?.errors) && membershipResponse.errors.length > 0) {
    throw new Error(membershipResponse.errors[0]?.message || 'Gagal menambahkan guru ke sekolah.');
  }

  const membershipId =
    membershipResponse?.data?.insert_school_memberships_one?.id ??
    membershipResponse?.data?.update_school_memberships_by_pk?.id ??
    existingMembershipId;
  if (!membershipId) {
    throw new Error('Membership guru tidak valid.');
  }

  return {
    id: membershipId,
    name: readNullableString(user?.full_name) ?? fullName,
    email,
    password,
    code: buildTeacherCode(fullName),
    homeroom: 'Belum ditentukan',
    handledClasses: 'Belum ada kelas',
    totalStudents: 0,
  };
}

export async function listStudentsBySchool(schoolId: string): Promise<DashboardStudentListItem[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }

  const query = `
    query GetStudentEnrollments {
      student_enrollments {
        enrolled_at
        created_at
        updated_at
        status
        class_id
        id
        student_id
        class {
          name
        }
        student {
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
          id
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
    }),
  })) as
    | {
        data?: { student_enrollments?: Array<Record<string, unknown>> };
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

  const rows = Array.isArray(responseBody?.data?.student_enrollments)
    ? responseBody.data.student_enrollments
    : [];
  return rows
    .map(normalizeStudentEnrollmentListItem)
    .filter((item): item is DashboardStudentListItem => item !== null)
    .sort((first, second) => first.name.localeCompare(second.name, 'id-ID'));
}

export async function registerStudentFacesBulk(
  payload: RegisterStudentFacesBulkPayload,
): Promise<unknown> {
  if (payload.images.length === 0) {
    throw new Error('Minimal satu foto wajah wajib dipilih.');
  }

  if (payload.images.length !== payload.studentIds.length) {
    throw new Error('Jumlah foto wajah dan siswa harus sama.');
  }

  const normalizedPairs = payload.images.map((image, index) => {
    const studentId = payload.studentIds[index]?.trim();
    if (!image.uri || !studentId) {
      throw new Error('Data foto wajah dan siswa tidak lengkap.');
    }

    if (!isUuidString(studentId)) {
      throw new Error('ID siswa tidak valid.');
    }

    return { image, studentId };
  });

  const enrollResponse =
    normalizedPairs.length === 1
      ? await enrollSingleFace(normalizedPairs[0])
      : await enrollFaceBulk(normalizedPairs);
  const enrollmentResults = normalizeFaceEnrollmentResults(enrollResponse, normalizedPairs.length);
  const failedEnrollment = enrollmentResults.find(result => {
    const status = readNullableString(asObject(result)?.status)?.toLowerCase();
    return status === 'error' || status === 'failed';
  });
  if (failedEnrollment) {
    const errorMessage =
      readNullableString(asObject(failedEnrollment)?.error) ??
      'Face service gagal memproses salah satu foto wajah.';
    throw new Error(errorMessage);
  }

  return enrollResponse;
}

type FaceMultipartPart = {
  image: FaceBulkImage;
  studentId: string;
  fileFieldName: string;
  studentFieldName: string;
};

type FaceMultipartPayload = {
  boundary: string;
  body: Uint8Array;
};

function sanitizeMultipartFilename(fileName: string): string {
  return fileName.replace(/[\\/\r\n"]/g, '_');
}

function normalizeBase64ImagePayload(base64Value: string): string {
  const dataUriPrefixIndex = base64Value.indexOf(',');
  const rawBase64 = base64Value.startsWith('data:') && dataUriPrefixIndex >= 0
    ? base64Value.slice(dataUriPrefixIndex + 1)
    : base64Value;

  return rawBase64.replace(/\s/g, '');
}

function asciiToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) % 256;
  }

  return bytes;
}

function base64ToBytes(base64Value: string): Uint8Array {
  const atobFn = (globalThis as { atob?: (value: string) => string }).atob;
  if (!atobFn) {
    throw new Error('Perangkat tidak mendukung encoding upload wajah.');
  }

  const binaryString = atobFn(normalizeBase64ImagePayload(base64Value));
  const bytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach(part => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function buildFaceMultipartPayload(parts: FaceMultipartPart[]): FaceMultipartPayload | null {
  if (parts.some(({ image }) => !image.base64)) {
    return null;
  }

  const boundary = `mysimoka-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const bodyParts: Uint8Array[] = [];

  parts.forEach(({ image, studentId, fileFieldName, studentFieldName }, index) => {
    const fileName = sanitizeMultipartFilename(image.name ?? `face-${index + 1}.jpg`);
    const contentType = image.type ?? 'image/jpeg';
    const imageBytes = base64ToBytes(image.base64 ?? '');

    bodyParts.push(asciiToBytes(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ));
    bodyParts.push(imageBytes);
    bodyParts.push(asciiToBytes(
      `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${studentFieldName}"\r\n\r\n` +
        `${studentId}\r\n`,
    ));
  });

  bodyParts.push(asciiToBytes(`--${boundary}--\r\n`));

  return {
    boundary,
    body: concatBytes(bodyParts),
  };
}

async function enrollSingleFace(pair: { image: FaceBulkImage; studentId: string }): Promise<unknown> {
  if (__DEV__) {
    console.log('[faces][single][upload]', JSON.stringify({
      endpoint: '/faces',
      uri: pair.image.uri,
      name: pair.image.name ?? 'face.jpg',
      type: pair.image.type ?? 'image/jpeg',
    }));
  }

  const multipartPayload = buildFaceMultipartPayload([
    {
      image: pair.image,
      studentId: pair.studentId,
      fileFieldName: 'image',
      studentFieldName: 'student_id',
    },
  ]);

  if (multipartPayload) {
    return apiRequest('/faces', {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${multipartPayload.boundary}`,
      },
      body: multipartPayload.body,
    });
  }

  const formData = new FormData();
  formData.append('image', {
    uri: pair.image.uri,
    name: pair.image.name ?? 'face.jpg',
    type: pair.image.type ?? 'image/jpeg',
  } as unknown as Blob);
  formData.append('student_id', pair.studentId);

  return apiRequest('/faces', {
    method: 'POST',
    requiresAuth: true,
    body: formData,
  });
}

async function enrollFaceBulk(
  pairs: Array<{ image: FaceBulkImage; studentId: string }>,
): Promise<unknown> {
  if (__DEV__) {
    console.log('[faces][bulk][upload]', JSON.stringify({
      endpoint: '/faces/bulk',
      count: pairs.length,
      images: pairs.map(({ image }) => ({
        uri: image.uri,
        name: image.name,
        type: image.type,
      })),
    }));
  }

  const multipartPayload = buildFaceMultipartPayload(
    pairs.map(({ image, studentId }) => ({
      image,
      studentId,
      fileFieldName: 'images',
      studentFieldName: 'student_ids',
    })),
  );

  if (multipartPayload) {
    return apiRequest('/faces/bulk', {
      method: 'POST',
      requiresAuth: true,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${multipartPayload.boundary}`,
      },
      body: multipartPayload.body,
    });
  }

  const formData = new FormData();
  pairs.forEach(({ image, studentId }, index) => {
    const fallbackName = `face-${index + 1}.jpg`;
    formData.append('images', {
      uri: image.uri,
      name: image.name ?? fallbackName,
      type: image.type ?? 'image/jpeg',
    } as unknown as Blob);
    formData.append('student_ids', studentId);
  });

  return apiRequest('/faces/bulk', {
    method: 'POST',
    requiresAuth: true,
    body: formData,
  });
}

function normalizeFaceEnrollmentResults(response: unknown, expectedCount: number): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const source = asObject(response);
  if (!source) {
    return [];
  }

  const directArrayKeys = ['data', 'results', 'faces', 'embeddings', 'returning'];
  for (const key of directArrayKeys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const key of directArrayKeys) {
    const nested = asObject(source[key]);
    if (!nested) {
      continue;
    }
    for (const nestedKey of directArrayKeys) {
      const value = nested[nestedKey];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  const dataObject = asObject(source.data);
  const dataResults = Array.isArray(dataObject?.results) ? dataObject.results : null;
  if (dataResults) {
    return dataResults;
  }

  return expectedCount === 1 ? [dataObject ?? source] : [];
}

function normalizeFaceEmbeddingItem(row: unknown): FaceEmbeddingItem | null {
  const source = asObject(row);
  const id = readNullableString(source?.id);
  const studentId = readNullableString(source?.student_id);
  const submittedBy = readNullableString(source?.submitted_by);
  const filePath = readNullableString(source?.file_path);
  if (!id || !studentId || !submittedBy || !filePath) {
    return null;
  }

  return {
    id,
    studentId,
    submittedBy,
    filePath,
    detectionScore: readNullableNumber(source?.detection_score),
    createdAt: readNullableString(source?.created_at),
    updatedAt: readNullableString(source?.updated_at),
  };
}

export async function listFaceEmbeddings(): Promise<FaceEmbeddingItem[]> {
  const query = `
    query GetFaceEmbeddings {
      face_embeddings {
        id
        student_id
        submitted_by
        file_path
        detection_score
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
    body: JSON.stringify({ query }),
  })) as
    | {
        data?: { face_embeddings?: unknown[] };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
    throw new Error(responseBody.errors[0]?.message || 'Gagal mengambil data face embedding.');
  }

  return (responseBody?.data?.face_embeddings ?? [])
    .map(normalizeFaceEmbeddingItem)
    .filter((item): item is FaceEmbeddingItem => item !== null);
}

export async function searchStudentsBySchool(
  schoolId: string,
  keyword: string,
): Promise<DashboardStudentSearchItem[]> {
  const normalizedSchoolId = schoolId.trim();
  const normalizedKeyword = `%${keyword.trim()}%`;
  if (!normalizedSchoolId || keyword.trim().length === 0) {
    return [];
  }

  const query = `
    query SearchStudents($keyword: String!) {
      students(
        where: {
          _or: [
            { full_name: { _ilike: $keyword } },
            { student_number: { _ilike: $keyword } },
            { parent_name: { _ilike: $keyword } },
            { parent_phone: { _ilike: $keyword } }
          ]
        }
        order_by: [{ full_name: asc }]
        limit: 50
      ) {
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
      variables: { keyword: normalizedKeyword },
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

export async function createStudent(payload: CreateStudentPayload): Promise<DashboardStudentListItem> {
  const normalizedSchoolId = payload.schoolId.trim();
  const classroomId = payload.classroomId.trim();
  const normalizedName = payload.fullName.trim();
  if (!normalizedSchoolId || !classroomId || !normalizedName) {
    throw new Error('Nama siswa wajib diisi.');
  }

  const normalizedNisn = payload.nisn?.trim() ?? '';
  if (!normalizedNisn) {
    throw new Error('NISN wajib diisi.');
  }

  const studentInsertObject: Record<string, unknown> = {
    full_name: normalizedName,
    student_number: normalizedNisn,
    gender: payload.gender ?? null,
    date_of_birth: payload.birthDate?.trim() || null,
    is_active: true,
  };

  const mutation = `
    mutation CreateStudent($object: students_insert_input!) {
      insert_students_one(object: $object) {
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
        object: studentInsertObject,
      },
    }),
  })) as
    | {
        data?: { insert_students_one?: Record<string, unknown> | null };
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

  const created = normalizeStudentListItem(responseBody?.data?.insert_students_one);
  if (!created) {
    throw new Error('Respons simpan siswa tidak valid.');
  }

  const enrollmentMutation = `
    mutation CreateStudentEnrollment($studentId: uuid!, $classroomId: uuid!) {
      insert_student_enrollments_one(
        object: {
          student_id: $studentId,
          class_id: $classroomId,
          status: "active"
        }
      ) {
        id
      }
    }
  `;

  const enrollmentResponse = (await apiRequest(GRAPHQL_URL, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: enrollmentMutation,
      variables: {
        studentId: created.id,
        classroomId,
      },
    }),
  })) as
    | {
        data?: { insert_student_enrollments_one?: { id?: string | null } | null };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (Array.isArray(enrollmentResponse?.errors) && enrollmentResponse.errors.length > 0) {
    throw new Error(enrollmentResponse.errors[0]?.message || 'Gagal memasukkan siswa ke kelas.');
  }

  if (!enrollmentResponse?.data?.insert_student_enrollments_one?.id) {
    throw new Error('Respons enrollment siswa tidak valid.');
  }

  return created;
}

export async function listAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return [];
  }
  if (!isUuidString(normalizedSchoolId)) {
    throw new Error('ID sekolah aktif tidak valid. Silakan pilih sekolah ulang.');
  }

  const query = `
    query ListAcademicYears {
      academic_years(order_by: [{ start_year: desc }, { created_at: desc }]) {
        id
        label
        start_year
        end_year
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
  return normalizeAcademicYearRows(rows, normalizedSchoolId);
}

function normalizeAcademicYearRows(
  rows: Array<Record<string, unknown>>,
  fallbackSchoolId: string,
): AcademicYear[] {
  return rows
    .map(row => {
      const source = asObject(row);
      const id = readNullableString(source?.id);
      const rowSchoolId = readNullableString(source?.school_id) ?? fallbackSchoolId;
      const name = readNullableString(source?.name) ?? readNullableString(source?.label);
      const startYear = readNullableString(source?.start_year);
      const endYear = readNullableString(source?.end_year);
      const startDate = readNullableString(source?.start_date) ?? (startYear ? `${startYear}-07-01` : null);
      const endDate = readNullableString(source?.end_date) ?? (endYear ? `${endYear}-06-30` : null);
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
  const schoolId = payload.schoolId.trim();
  const name = payload.name.trim();
  if (!schoolId || !name) {
    throw new Error('Data tahun akademik tidak valid.');
  }

  const mutation = `
    mutation CreateAcademicYear(
      $label: String!,
      $startYear: String!,
      $endYear: String!
    ) {
      insert_academic_years_one(
        object: {
          label: $label,
          start_year: $startYear,
          end_year: $endYear
        }
      ) {
        id
        label
        start_year
        end_year
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
        label: name,
        startYear: payload.startDate.slice(0, 4),
        endYear: payload.endDate.slice(0, 4),
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
  const createdRows = normalizeAcademicYearRows(created ? [created] : [], schoolId);
  const createdYear = createdRows[0];
  if (!createdYear) {
    throw new Error('Respons tambah tahun akademik tidak valid.');
  }

  return createdYear;
}

export async function setActiveAcademicYear(payload: {
  schoolId: string;
  academicYearId: string;
}): Promise<void> {
  const schoolId = payload.schoolId.trim();
  const academicYearId = payload.academicYearId.trim();
  if (!schoolId || !academicYearId) {
    throw new Error('Data aktivasi tahun akademik tidak valid.');
  }
}

export async function deleteAcademicYear(payload: { academicYearId: string }): Promise<void> {
  const academicYearId = payload.academicYearId.trim();
  if (!academicYearId) {
    throw new Error('Data tahun akademik tidak valid.');
  }

  const mutation = `
    mutation DeleteAcademicYear($academicYearId: uuid!) {
      delete_academic_years(
        where: { id: { _eq: $academicYearId } }
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
      variables: { academicYearId },
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
  const academicYearId = payload.academicYearId.trim();
  const name = payload.name.trim();
  if (!academicYearId || !name) {
    throw new Error('Data tahun akademik tidak valid.');
  }
  const [startYear, endYear] = name.split('/');

  const mutation = `
    mutation UpdateAcademicYear(
      $academicYearId: uuid!,
      $label: String!,
      $startYear: String!,
      $endYear: String!
    ) {
      update_academic_years(
        where: { id: { _eq: $academicYearId } }
        _set: { label: $label, start_year: $startYear, end_year: $endYear }
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
      variables: { academicYearId, label: name, startYear, endYear },
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
      if (firstMessage.includes("field 'join_code' not found")) {
        throw new Error('Kolom join_code belum diizinkan pada update permission schools di Hasura.');
      }
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
    if (!schoolId || !schoolName || !isUuidString(schoolId)) {
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

  let response: Response;
  try {
    response = await fetchWithDevNetworkLog(requestUrl, {
      ...requestInit,
      headers: requestHeaders,
    }, 'initial');
  } catch (error) {
    if (!requiresAuth) {
      throw error;
    }

    const retryResponse = await retryAfterNetworkError(requestUrl, requestInit, headers, endpoint);
    if (!retryResponse) {
      clearAuthSession();
      throw error;
    }

    response = retryResponse;
  }

  if (requiresAuth && response.status === 401) {
    const refreshedAccessToken = await refreshAccessToken();
    if (!refreshedAccessToken) {
      clearAuthSession();
      throw new Error('Sesi berakhir. Silakan login ulang.');
    }

    activeAccessToken = refreshedAccessToken;
    const retryHeaders = buildRetryHeaders(headers, activeAccessToken);

    response = await fetchWithDevNetworkLog(requestUrl, {
      ...requestInit,
      headers: retryHeaders,
    }, 'status-401-retry');
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
    const retryResponse = await fetchWithDevNetworkLog(requestUrl, {
      ...requestInit,
      headers: retryHeaders,
    }, 'graphql-auth-retry');

    if (!retryResponse.ok) {
      const retryResponseBody = (await parseUnknownResponseBody(retryResponse)) as ApiBody | null;
      const retryMessage = normalizeApiErrorMessage(retryResponseBody);
      throw new Error(retryMessage ?? 'Permintaan ke server gagal.');
    }

    if (retryResponse.status === 204) {
      return undefined as TResponse;
    }

    parsedResponseBody = await parseUnknownResponseBody(retryResponse);
    if (hasGraphqlAuthError(parsedResponseBody)) {
      clearAuthSession();
      throw new Error('Sesi berakhir. Silakan login ulang.');
    }
  }

  return parsedResponseBody as TResponse;
}
