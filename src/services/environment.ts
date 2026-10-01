import { normalizeS400BindKey } from '../features/device/bindKey';

const DEFAULT_API_BASE_URL = 'https://api.mysimoka.id/';
const DEFAULT_AUTH_BASE_URL = 'https://auth.mysimoka.id/';
const DEFAULT_GRAPHQL_URL = 'https://hasura.mysimoka.id/v1/graphql';
const DEFAULT_DEV_API_PORT = '4001';
const DEFAULT_DEV_HASURA_PORT = '8080';
const DEFAULT_DEV_DEVICE_HOST = '192.168.0.150';

type RuntimeEnv = {
  MYSIMOKA_API_BASE_URL?: string;
  MYSIMOKA_AUTH_BASE_URL?: string;
  MYSIMOKA_GRAPHQL_URL?: string;
  MYSIMOKA_S400_BLE_KEY?: string;
};

// `process.env.MYSIMOKA_*` is replaced with string literals (or `undefined`)
// at build time by babel/inline-mysimoka-env.js, so these reads never touch a
// runtime `process` object (absent in RN release bundles and on web).
const runtimeEnv: RuntimeEnv = {
  MYSIMOKA_API_BASE_URL: process.env.MYSIMOKA_API_BASE_URL,
  MYSIMOKA_AUTH_BASE_URL: process.env.MYSIMOKA_AUTH_BASE_URL,
  MYSIMOKA_GRAPHQL_URL: process.env.MYSIMOKA_GRAPHQL_URL,
  MYSIMOKA_S400_BLE_KEY: process.env.MYSIMOKA_S400_BLE_KEY,
};

function buildDevApiBaseUrl(): string | null {
  return DEFAULT_API_BASE_URL;
}

function buildDevGraphqlUrl(): string | null {
  return DEFAULT_GRAPHQL_URL;
}

const rawApiBaseUrl = __DEV__
  ? runtimeEnv.MYSIMOKA_API_BASE_URL ??
    buildDevApiBaseUrl() ??
    `http://${DEFAULT_DEV_DEVICE_HOST}:${DEFAULT_DEV_API_PORT}`
  : runtimeEnv.MYSIMOKA_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

const rawAuthBaseUrl = __DEV__
  ? runtimeEnv.MYSIMOKA_AUTH_BASE_URL ?? DEFAULT_AUTH_BASE_URL
  : runtimeEnv.MYSIMOKA_AUTH_BASE_URL ?? DEFAULT_AUTH_BASE_URL;

export const AUTH_BASE_URL = rawAuthBaseUrl.replace(/\/+$/, '');

const rawGraphqlUrl = __DEV__
  ? runtimeEnv.MYSIMOKA_GRAPHQL_URL ??
    buildDevGraphqlUrl() ??
    `http://${DEFAULT_DEV_DEVICE_HOST}:${DEFAULT_DEV_HASURA_PORT}/v1/graphql`
  : runtimeEnv.MYSIMOKA_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL;

export const GRAPHQL_URL = rawGraphqlUrl.replace(/\/+$/, '');

// Build-time fallback S400 bind key. Per-scale keys entered in the device
// screen (AsyncStorage) take precedence; see features/device/bindKeyStore.ts.
export const S400_BIND_KEY = normalizeS400BindKey(runtimeEnv.MYSIMOKA_S400_BLE_KEY);
