import { describe, expect, it } from 'vitest';
import { formatIntervention, isStalledReflection, openHypothesisPresentation } from './diagnostic-display';

describe('diagnostic display helpers', () => {
  it('formats nested intervention identity and statement', () => {
    expect(formatIntervention({
      id: 'intervention-cart-guard',
      kind: 'CODE_CHANGE',
      statement: 'Add a guarded parse-and-discard path for malformed persisted carts.',
      hypothesisRefs: ['h-cart-parser'],
      reversible: true,
    })).toBe('intervention-cart-guard — Add a guarded parse-and-discard path for malformed persisted carts.');
  });

  it('treats only the canonical stalled status as stalled', () => {
    expect(isStalledReflection({ status: 'STALLED' })).toBe(true);
    expect(isStalledReflection({ status: 'WATCH' })).toBe(false);
  });

  it('surfaces identity-unavailable copy when the count is known but the ids are absent', () => {
    expect(openHypothesisPresentation(2, [])).toEqual({
      summary: '2 open hypotheses',
      items: ['Exact hypothesis IDs unavailable in continuity projection.'],
    });
  });
});
