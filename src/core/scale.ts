// scale.ts — color → MIDI note mapping for TombsPad
// Scales are stored as data so the user can pick between them.

export type ScaleId = 'pentatonic_minor' | 'harmonic_minor' | 'phrygian';

export interface ScaleDef {
  id: ScaleId;
  name: string;
  notes: number[]; // 8 MIDI note numbers, one per color index
}

export const SCALES: Record<ScaleId, ScaleDef> = {
  pentatonic_minor: {
    id: 'pentatonic_minor',
    name: 'Minor Pentatonic',
    notes: [45, 48, 50, 52, 55, 57, 60, 64],
  },
  harmonic_minor: {
    id: 'harmonic_minor',
    name: 'Harmonic Minor',
    notes: [57, 59, 60, 62, 64, 65, 68, 69],
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    notes: [52, 53, 55, 57, 59, 60, 62, 64],
  },
};

let activeScaleId: ScaleId = 'pentatonic_minor';

export function setScale(id: ScaleId): void {
  activeScaleId = id;
}

export function getActiveScale(): ScaleDef {
  return SCALES[activeScaleId];
}

export function colorToNote(colorIndex: number): number | null {
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > 7) return null;
  return SCALES[activeScaleId].notes[colorIndex] ?? null;
}

export function getScaleName(): string {
  return SCALES[activeScaleId].name;
}

export function midiToHz(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
