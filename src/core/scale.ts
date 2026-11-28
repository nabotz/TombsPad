// scale.ts — color → MIDI note mapping for TombsPad
// Scale: A harmonic minor, A3–E5 (Halloween vibe)

const SCALE_TABLE: number[] = [45, 48, 50, 52, 55, 57, 60, 64];

/**
 * Map a ColorIndex (0–7) to its MIDI note number.
 * Returns null for any input outside [0, 7] or non-integer.
 */
export function colorToNote(colorIndex: number): number | null {
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > 7) return null;
  return SCALE_TABLE[colorIndex] ?? null;
}

/**
 * Returns the name of the active musical scale.
 */
export function getScaleName(): string {
  return 'harmonic_minor';
}

/**
 * Convert a MIDI note number to its frequency in Hz.
 * Uses A4 = 440 Hz as the tuning reference.
 */
export function midiToHz(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
