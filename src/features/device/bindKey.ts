// Pure helpers for Xiaomi S400 bind keys (no React Native imports, safe in
// services/environment.ts and unit tests). Never log a bind key.

const BIND_KEY_PATTERN = /^[0-9a-f]{32}$/;

/** Returns the lowercase 32-hex key, or null when the input is not a valid key. */
export function normalizeS400BindKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  // Tolerate spaces/colons/dashes from copy-paste (e.g. "AB:CD:..."), nothing else.
  const normalized = value.trim().toLowerCase().replace(/[\s:-]/g, '');
  return BIND_KEY_PATTERN.test(normalized) ? normalized : null;
}

/** Masked form for UI: only the last 4 characters are shown. */
export function maskS400BindKey(key: string) {
  return `••••••••${key.slice(-4)}`;
}
