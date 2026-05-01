const DEV_LAN_BASE_URL = 'http://192.168.0.150:4001/';
const DEV_LAN_GRAPHQL_URL = 'http://192.168.0.150:8080/v1/graphql';
const DEV_LOCAL_BASE_URL = DEV_LAN_BASE_URL;
const DEFAULT_API_BASE_URL = __DEV__
  ? DEV_LOCAL_BASE_URL
  : 'https://api.mysimoka.sunhouse.co.id/';

type RuntimeEnv = {
  MYSIMOKA_API_BASE_URL?: string;
  MYSIMOKA_GRAPHQL_URL?: string;
};

const runtimeEnv: RuntimeEnv | undefined = (
  globalThis as { process?: { env?: RuntimeEnv } }
).process?.env;

const rawApiBaseUrl = runtimeEnv?.MYSIMOKA_API_BASE_URL ?? DEFAULT_API_BASE_URL;

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

const rawGraphqlUrl = runtimeEnv?.MYSIMOKA_GRAPHQL_URL ?? (__DEV__
  ? DEV_LAN_GRAPHQL_URL
  : deriveGraphqlUrlFromApiBase(API_BASE_URL));

export const GRAPHQL_URL = rawGraphqlUrl.replace(/\/+$/, '');
