// Hasura reports missing role permissions as "field ... not found in type" (select)
// or "check constraint of an insert permission has failed" (insert). Teachers
// currently hit these on measurement/immunization tables, so the raw message is
// replaced with something actionable.
const PERMISSION_ERROR_PATTERNS = [
  /not found in type/i,
  /permission/i,
  /access[- ]denied/i,
  /check constraint/i,
  /not allowed/i,
  /forbidden/i,
];

export const RECORDING_PERMISSION_MESSAGE =
  'Akun Anda belum diberi izin untuk pencatatan ini. Hubungi Admin Sekolah agar izin guru diaktifkan.';

export function isPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return PERMISSION_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

export function toRecordingErrorMessage(error: unknown, fallback: string): string {
  if (isPermissionError(error)) {
    return RECORDING_PERMISSION_MESSAGE;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}
