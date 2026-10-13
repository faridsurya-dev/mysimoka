import { decideFaceMatch } from '../src/features/face/faceMatch';

const match = (studentId: string, similarity: number) => ({
  studentId,
  name: studentId.toUpperCase(),
  studentNumber: null,
  similarity,
});

const session = new Set(['a', 'b', 'c']);

describe('decideFaceMatch', () => {
  it('accepts a clear, confident match from the session', () => {
    const decision = decideFaceMatch([match('a', 0.72), match('b', 0.31)], session);
    expect(decision).toEqual({ kind: 'matched', match: match('a', 0.72) });
  });

  it('asks to choose when two students are too close', () => {
    const decision = decideFaceMatch([match('a', 0.6), match('b', 0.57)], session);
    expect(decision.kind).toBe('choose');
    if (decision.kind === 'choose') {
      expect(decision.candidates.map(item => item.studentId)).toEqual(['a', 'b']);
    }
  });

  it('uses the best photo per student, so one student with two photos is not "ambiguous"', () => {
    const decision = decideFaceMatch([match('a', 0.7), match('a', 0.66), match('b', 0.2)], session);
    expect(decision.kind).toBe('matched');
  });

  it('offers weak but plausible candidates instead of guessing', () => {
    const decision = decideFaceMatch([match('c', 0.4)], session);
    expect(decision.kind).toBe('choose');
  });

  it('reports a confident match from another class instead of opening it', () => {
    const decision = decideFaceMatch([match('x', 0.8), match('a', 0.1)], session);
    expect(decision).toEqual({ kind: 'other-class', match: match('x', 0.8) });
  });

  it('returns none when nothing is similar enough', () => {
    expect(decideFaceMatch([match('a', 0.2)], session)).toEqual({ kind: 'none' });
    expect(decideFaceMatch([], session)).toEqual({ kind: 'none' });
  });
});
