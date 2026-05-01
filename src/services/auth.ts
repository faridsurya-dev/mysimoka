import { API_BASE_URL, GRAPHQL_URL } from './environment';
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
};

type ApiValidationErrorItem = {
  field?: string;
  message?: string;
};

const REGISTER_ENDPOINT = '/register';
const LOGIN_ENDPOINT = '/login';
const REFRESH_ENDPOINT = '/refresh';
const VERIFY_EMAIL_ENDPOINT = '/verify-email';
const CREATE_SCHOOL_ENDPOINT = '/schools';
const JOIN_SCHOOL_ENDPOINT = '/schools/join';
const MEMBERSHIPS_ENDPOINT = '/me/memberships';
const ACTIVE_SCHOOL_ENDPOINT = '/me/active-school';
const AUTH_SESSION_STORAGE_KEY = 'mysimoka:auth-session';
const CURRENT_SCHOOL_STORAGE_KEY = 'mysimoka:current-school';

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
  const user = userFromBody ?? userFromData ?? inferredUser;
  const rawRequiresSchoolConnection = asObject(body)?.requiresSchoolConnection;
  const requiresSchoolConnection = rawRequiresSchoolConnection === true;

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
  school_name: string;
  school_number: string | null;
  school_address: string | null;
  school_join_code: string;
  role: string;
  status: string;
  is_active: boolean;
};

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

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE_URL}${REGISTER_ENDPOINT}`, {
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
  const response = await fetch(createRequestUrl(VERIFY_EMAIL_ENDPOINT), {
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

function requireAccessToken(): string {
  if (!authSession.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  return authSession.accessToken;
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
  const response = await apiRequest<{
    accessToken?: string;
    access_token?: string;
    refreshToken?: string | null;
    refresh_token?: string | null;
    data?: {
      accessToken?: string;
      access_token?: string;
      refreshToken?: string | null;
      refresh_token?: string | null;
    };
  }>(CREATE_SCHOOL_ENDPOINT, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const tokenResult = normalizeTokenResult(response as ApiBody | null);
  if (!tokenResult) {
    throw new Error('Respons token koneksi sekolah tidak valid.');
  }

  setAuthSession({
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken ?? authSession.refreshToken,
  });
}

export async function joinSchool(payload: JoinSchoolPayload): Promise<void> {
  const response = await apiRequest<{
    accessToken?: string;
    access_token?: string;
    refreshToken?: string | null;
    refresh_token?: string | null;
    data?: {
      accessToken?: string;
      access_token?: string;
      refreshToken?: string | null;
      refresh_token?: string | null;
    };
  }>(JOIN_SCHOOL_ENDPOINT, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const tokenResult = normalizeTokenResult(response as ApiBody | null);
  if (!tokenResult) {
    throw new Error('Respons token koneksi sekolah tidak valid.');
  }

  setAuthSession({
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken ?? authSession.refreshToken,
  });
}

export async function listMemberships(): Promise<SchoolMembership[]> {
  const response = await apiRequest<{ memberships?: SchoolMembership[] }>(MEMBERSHIPS_ENDPOINT, {
    method: 'GET',
    requiresAuth: true,
  });

  return Array.isArray(response?.memberships) ? response.memberships : [];
}

export async function setActiveSchool(schoolId: string): Promise<void> {
  const response = await apiRequest<{
    accessToken?: string;
    access_token?: string;
    refreshToken?: string | null;
    refresh_token?: string | null;
    data?: {
      accessToken?: string;
      access_token?: string;
      refreshToken?: string | null;
      refresh_token?: string | null;
    };
  }>(ACTIVE_SCHOOL_ENDPOINT, {
    method: 'POST',
    requiresAuth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ schoolId }),
  });

  const tokenResult = normalizeTokenResult(response as ApiBody | null);
  if (!tokenResult) {
    throw new Error('Respons token koneksi sekolah tidak valid.');
  }

  setAuthSession({
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken ?? authSession.refreshToken,
  });
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
      'x-hasura-role': 'school_admin',
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

  const responseBody = (await apiRequest(`/schools/${normalizedSchoolId}/regenerate-join-code`, {
    method: 'POST',
    requiresAuth: true,
  })) as { school?: Record<string, unknown> } | null;

  const school = asObject(responseBody?.school);
  if (!school) {
    throw new Error('Respons generate kode gabung tidak valid.');
  }

  return school;
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
  const response = await fetch(`${API_BASE_URL}${LOGIN_ENDPOINT}`, {
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

  const response = await fetch(createRequestUrl(REFRESH_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      refreshToken: authSession.refreshToken,
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
  });

  return refreshedResult.accessToken;
}

function withAuthorizationHeader(headers: Headers, token: string): Headers {
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
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
    const retryHeaders = new Headers(headers);
    retryHeaders.set('Accept', 'application/json');
    withAuthorizationHeader(retryHeaders, activeAccessToken);

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

  return (await parseUnknownResponseBody(response)) as TResponse;
}
