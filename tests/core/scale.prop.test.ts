import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { colorToNote, midiToHz } from '../../src/core/scale';

describe('ScaleSystem property tests', () => {
  it('colorToNote returns non-null integer in [21,108] for valid input [0,7]', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 7 }), (i) => {
      const note = colorToNote(i);
      return note !== null && Number.isInteger(note) && note >= 21 && note <= 108;
    }));
  });

  it('colorToNote is deterministic', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 7 }), (i) => {
      return colorToNote(i) === colorToNote(i);
    }));
  });

  it('colorToNote is monotonically non-decreasing', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 6 }),
      (i) => {
        const a = colorToNote(i);
        const b = colorToNote(i + 1);
        return a !== null && b !== null && a <= b;
      }
    ));
  });

  it('colorToNote returns null for out-of-range input', () => {
    fc.assert(fc.property(
      fc.oneof(fc.integer({ max: -1 }), fc.integer({ min: 8 })),
      (i) => colorToNote(i) === null
    ));
  });

  it('midiToHz(69) equals 440Hz', () => {
    expect(Math.abs(midiToHz(69) - 440)).toBeLessThan(0.001);
  });
});
