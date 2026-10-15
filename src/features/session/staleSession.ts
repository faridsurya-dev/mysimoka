/**
 * The server keeps one measurement / immunization record per (session,
 * student), so reusing an old session for a new period overwrites the previous
 * period's results. Sessions older than this are flagged before recording.
 */
export const STALE_SESSION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day of a session date ("YYYY-MM-DD" or a full ISO string). */
function toLocalDay(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/** True when the session date is more than `STALE_SESSION_DAYS` days before `now`. */
export function isSessionStale(
  sessionDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sessionDate) {
    return false;
  }
  const day = toLocalDay(sessionDate);
  if (!day) {
    return false;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - day.getTime()) / DAY_MS) > STALE_SESSION_DAYS;
}

export function formatStaleSessionDate(sessionDate: string): string {
  const day = toLocalDay(sessionDate);
  if (!day) {
    return sessionDate;
  }
  return day.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Sessions the operator already answered the warning for in this app run.
const acknowledgedSessionIds = new Set<string>();

export function isStaleSessionAcknowledged(sessionId: string): boolean {
  return acknowledgedSessionIds.has(sessionId);
}

export function acknowledgeStaleSession(sessionId: string): void {
  acknowledgedSessionIds.add(sessionId);
}

/** Whether the warning should be shown for this session right now. */
export function shouldWarnStaleSession(
  sessionId: string | null | undefined,
  sessionDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(
    sessionId && !isStaleSessionAcknowledged(sessionId) && isSessionStale(sessionDate, now),
  );
}
