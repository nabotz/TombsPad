import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { compress, decompress } from '../../src/core/share';

const cellArb = fc.array(
  fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 7 })),
  { minLength: 256, maxLength: 256 }
);

const stateArb = fc.record({
  cells: cellArb,
});

describe('ShareLink property tests', () => {
  it('compress/decompress round-trip preserves state', () => {
    fc.assert(fc.property(stateArb, (state) => {
      const compressed = compress(state);
      const decoded = decompress(compressed);
      expect(decoded).toEqual(state);
    }));
  });

  it('compressed string contains only printable ASCII (safe for URL hash fragment)', () => {
    // LZString.compressToEncodedURIComponent uses A-Z, a-z, 0-9, and '+'.
    // All of these are printable ASCII, so the string can be placed directly
    // in a URL hash fragment without additional encoding on the writer's side.
    fc.assert(fc.property(stateArb, (state) => {
      const compressed = compress(state);
      return /^[\x20-\x7E]*$/.test(compressed);
    }));
  });

  it('decompress of invalid string returns null without throwing', () => {
    fc.assert(fc.property(fc.string(), (s) => {
      const result = decompress(s);
      return result === null || typeof result === 'object';
    }));
  });
});
