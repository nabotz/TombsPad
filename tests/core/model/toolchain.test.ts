import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

// Smoke test for the test setup (Vitest + fast-check).
// Delete it once real core-model tests exist.
describe('test toolchain', () => {
  it('runs unit tests', () => {
    expect([1, 2, 3]).toContain(2);
  });

  it('runs property-based tests', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        expect([...xs].reverse().reverse()).toEqual(xs);
      }),
    );
  });
});
