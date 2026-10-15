import {
  acknowledgeStaleSession,
  isSessionStale,
  shouldWarnStaleSession,
} from '../src/features/session/staleSession';

const NOW = new Date(2026, 9, 16, 9, 0); // 16 Oct 2026, local time

describe('isSessionStale', () => {
  it('is false within 7 days and true after', () => {
    expect(isSessionStale('2026-10-16', NOW)).toBe(false);
    expect(isSessionStale('2026-10-09', NOW)).toBe(false);
    expect(isSessionStale('2026-10-08', NOW)).toBe(true);
    expect(isSessionStale('2026-01-15', NOW)).toBe(true);
  });

  it('accepts full ISO strings and ignores missing or invalid dates', () => {
    expect(isSessionStale(new Date(2026, 8, 1).toISOString(), NOW)).toBe(true);
    expect(isSessionStale(null, NOW)).toBe(false);
    expect(isSessionStale('bukan tanggal', NOW)).toBe(false);
  });
});

describe('shouldWarnStaleSession', () => {
  it('warns once per session after it is acknowledged', () => {
    expect(shouldWarnStaleSession('s-1', '2026-01-15', NOW)).toBe(true);
    acknowledgeStaleSession('s-1');
    expect(shouldWarnStaleSession('s-1', '2026-01-15', NOW)).toBe(false);
    expect(shouldWarnStaleSession('s-2', '2026-01-15', NOW)).toBe(true);
    expect(shouldWarnStaleSession(null, '2026-01-15', NOW)).toBe(false);
  });
});
