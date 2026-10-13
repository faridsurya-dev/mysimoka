import type { FaceSearchMatch } from '../../services/auth';

/**
 * Cut-offs on cosine similarity of aligned ArcFace embeddings. A student is
 * taken as identified only when the best match is clearly similar AND clearly
 * ahead of the next student; otherwise the operator picks from candidates.
 * Calibrate with `face-recognition compare` on real photos before changing.
 */
export const FACE_MATCH_ACCEPT = 0.45;
export const FACE_MATCH_MARGIN = 0.07;
export const FACE_MATCH_CANDIDATE = 0.32;
/** Sent to the server so weaker candidates still come back for the picker. */
export const FACE_SEARCH_THRESHOLD = 0.25;

export type FaceMatchDecision =
  | { kind: 'matched'; match: FaceSearchMatch }
  | { kind: 'choose'; candidates: FaceSearchMatch[] }
  | { kind: 'other-class'; match: FaceSearchMatch }
  | { kind: 'none' };

/** Best similarity per student (a student can have several enrolled photos). */
function bestPerStudent(matches: FaceSearchMatch[]): FaceSearchMatch[] {
  const byStudent = new Map<string, FaceSearchMatch>();
  matches.forEach(match => {
    const current = byStudent.get(match.studentId);
    if (!current || match.similarity > current.similarity) {
      byStudent.set(match.studentId, match);
    }
  });
  return Array.from(byStudent.values()).sort((a, b) => b.similarity - a.similarity);
}

/**
 * Decides what a face search means for the session on screen: only students
 * of the session's class can be opened; a confident match from another class
 * is reported so the operator is not silently sent to the wrong student.
 */
export function decideFaceMatch(
  matches: FaceSearchMatch[],
  sessionStudentIds: ReadonlySet<string>,
): FaceMatchDecision {
  const ranked = bestPerStudent(matches);
  const inSession = ranked.filter(match => sessionStudentIds.has(match.studentId));
  const best = inSession[0];
  const runnerUp = inSession[1];

  if (best && best.similarity >= FACE_MATCH_ACCEPT) {
    const clearlyAhead = !runnerUp || best.similarity - runnerUp.similarity >= FACE_MATCH_MARGIN;
    if (clearlyAhead) {
      return { kind: 'matched', match: best };
    }
  }

  const candidates = inSession
    .filter(match => match.similarity >= FACE_MATCH_CANDIDATE)
    .slice(0, 3);
  if (candidates.length > 0) {
    return { kind: 'choose', candidates };
  }

  const overall = ranked[0];
  if (overall && overall.similarity >= FACE_MATCH_ACCEPT && !sessionStudentIds.has(overall.studentId)) {
    return { kind: 'other-class', match: overall };
  }
  return { kind: 'none' };
}
