const DEFAULT_API_BASE_URL = 'https://api.mysimoka.sunhouse.co.id/';

type RuntimeEnv = {
  MYSIMOKA_API_BASE_URL?: string;
};

const runtimeEnv: RuntimeEnv | undefined = (
  globalThis as { process?: { env?: RuntimeEnv } }
).process?.env;

const rawApiBaseUrl = runtimeEnv?.MYSIMOKA_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');
