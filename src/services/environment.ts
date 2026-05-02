const DEFAULT_API_BASE_URL = 'https://api.mysimoka.sunhouse.co.id/';
const DEFAULT_DEV_API_PORT = '4001';
const DEFAULT_DEV_HASURA_PORT = '8080';
const DEFAULT_DEV_DEVICE_HOST = '192.168.0.150';

type RuntimeEnv = {
  MYSIMOKA_API_BASE_URL?: string;
  MYSIMOKA_GRAPHQL_URL?: string;
};

const runtimeEnv: RuntimeEnv | undefined = (
  globalThis as { process?: { env?: RuntimeEnv } }
).process?.env;

function buildDevApiBaseUrl(): string | null {
  const host = DEFAULT_DEV_DEVICE_HOST;
  return `http://${host}:${DEFAULT_DEV_API_PORT}`;
}

function buildDevGraphqlUrl(): string | null {
  const host = DEFAULT_DEV_DEVICE_HOST;
  return `http://${host}:${DEFAULT_DEV_HASURA_PORT}/v1/graphql`;
}

const rawApiBaseUrl = __DEV__
  ? runtimeEnv?.MYSIMOKA_API_BASE_URL ??
    buildDevApiBaseUrl() ??
    `http://${DEFAULT_DEV_DEVICE_HOST}:${DEFAULT_DEV_API_PORT}`
  : runtimeEnv?.MYSIMOKA_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

function deriveGraphqlUrlFromApiBase(apiBaseUrl: string): string {
  try {
    const parsedUrl = new URL(apiBaseUrl);
    if (parsedUrl.port === '4001') {
      parsedUrl.port = '8080';
    }
    parsedUrl.pathname = '/v1/graphql';
    parsedUrl.search = '';
    parsedUrl.hash = '';
    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    return `${apiBaseUrl.replace(/\/+$/, '')}/v1/graphql`;
  }
}

const rawGraphqlUrl = __DEV__
  ? runtimeEnv?.MYSIMOKA_GRAPHQL_URL ??
    buildDevGraphqlUrl() ??
    `http://${DEFAULT_DEV_DEVICE_HOST}:${DEFAULT_DEV_HASURA_PORT}/v1/graphql`
  : runtimeEnv?.MYSIMOKA_GRAPHQL_URL ?? deriveGraphqlUrlFromApiBase(API_BASE_URL);

export const GRAPHQL_URL = rawGraphqlUrl.replace(/\/+$/, '');
