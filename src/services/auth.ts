import { API_BASE_URL } from './environment';

export type RegisterSchoolPayload = {
  name: string;
  number: string;
  pic_email: string;
  pic_name: string;
  pic_password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string | null;
  user: Record<string, unknown> | null;
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

const REGISTER_SCHOOL_ENDPOINT = '/api/schools/register';
const LOGIN_ENDPOINT = '/api/auth/login';
const REFRESH_ENDPOINT = '/api/auth/refresh';

let authSession: AuthSession = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

function normalizeApiErrorMessage(body: ApiBody | null): string | null {
  if (!body) {
    return null;
  }

  if (typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message;
  }

  if (typeof body.error === 'string' && body.error.trim().length > 0) {
    return body.error;
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const firstError = body.errors[0];
    return typeof firstError === 'string' ? firstError : null;
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
  const user =
    readObjectValue(body, 'user') ??
    readObjectValue(nestedData as ApiBody | null, 'user');

  return {
    accessToken,
    refreshToken,
    user,
  };
}

export async function registerSchool(payload: RegisterSchoolPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${REGISTER_SCHOOL_ENDPOINT}`, {
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
  throw new Error(normalizedMessage ?? 'Registrasi gagal. Silakan coba lagi.');
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
}

export function clearAuthSession(): void {
  authSession = {
    accessToken: null,
    refreshToken: null,
    user: null,
  };
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
