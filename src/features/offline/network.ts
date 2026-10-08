// Distinguishes "no / bad connection" from server-side rejections, so only
// the former are queued for a later retry.

export class RequestTimeoutError extends Error {
  constructor() {
    super('Koneksi terlalu lambat.');
    this.name = 'RequestTimeoutError';
  }
}

/** React Native fetch rejects with TypeError('Network request failed') when offline. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof RequestTimeoutError) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === 'AbortError') {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    (error instanceof TypeError && message.includes('network')) ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error')
  );
}

/**
 * Rejects with RequestTimeoutError when `promise` takes longer than `ms`.
 * The request itself keeps running; that is fine for the idempotent record
 * upserts this is used for (a late success and the queued retry write the
 * same row).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RequestTimeoutError()), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
