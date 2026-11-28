/**
 * AudioEngine.ts
 * Web Audio API synthesis engine for TombsPad.
 *
 * All audio is synthesized in-browser — no audio files are loaded.
 * The AudioContext is initialized lazily on the first call to ensureContext()
 * to comply with browser autoplay policy.
 *
 * Signal chain per note:
 *   OscillatorNode (sawtooth)
 *     → BiquadFilterNode (lowpass, 800 Hz, Q=2)
 *       → GainNode (ADSR envelope)
 *         → ConvolverNode (programmatic reverb)
 *           → masterGain
 *             → AudioContext.destination
 */

import { generateImpulseResponse } from './impulseResponse';
import { colorToNote, midiToHz } from '../core/scale';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let convolver: ConvolverNode | null = null;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Lazily initialize the AudioContext and shared audio graph nodes.
 * No-op if the context is already created.
 * Must be called from within a user gesture for browser autoplay compliance.
 */
function ensureContext(): void {
  if (ctx !== null) return;

  ctx = new AudioContext();

  masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;

  convolver = ctx.createConvolver();
  convolver.buffer = generateImpulseResponse(ctx, 2.0, 2.0, false);

  // Wire shared nodes: convolver → masterGain → destination
  convolver.connect(masterGain);
  masterGain.connect(ctx.destination);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synthesize a note for the given cell, scheduled at an optional future time.
 *
 * Derives the pitch via ScaleSystem, then builds and schedules an oscillator +
 * filter + ADSR envelope chain through the shared ConvolverNode.
 *
 * Returns immediately (no sound) if getCellColorFn is not provided, or if the
 * cell has no color (ColorIndex is null).
 *
 * @param cellId          - "col,row" string identifying the cell
 * @param scheduledTime   - AudioContext time (seconds) to start the note; defaults to now
 * @param getCellColorFn  - Injected by the caller (Scheduler) to read the live grid state.
 *                          Keeps AudioEngine free of render/ imports.
 */
export async function triggerNote(
  cellId: string,
  scheduledTime?: number,
  getCellColorFn?: (col: number, row: number) => number | null,
): Promise<void> {
  if (!getCellColorFn) return;

  ensureContext();
  if (!ctx || !convolver) return;

  const [col, row] = cellId.split(',').map(Number);
  const colorIndex = getCellColorFn(col, row);

  // No sound and no error for null-color cells
  if (colorIndex === null || colorIndex === undefined) return;

  const midiNote = colorToNote(colorIndex);
  if (midiNote === null) return;

  const hz = midiToHz(midiNote);

  // --- Build per-note signal chain ---

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = hz;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 2;

  const envGain = ctx.createGain();

  // osc → filter → envGain → convolver (shared reverb)
  osc.connect(filter);
  filter.connect(envGain);
  envGain.connect(convolver);

  // --- ADSR envelope scheduling ---
  const t = scheduledTime ?? ctx.currentTime;

  // Attack: 0 → 1.0 over 10 ms
  envGain.gain.setValueAtTime(0, t);
  envGain.gain.linearRampToValueAtTime(1.0, t + 0.01);

  // Decay: 1.0 → 0.4 over 70 ms
  envGain.gain.linearRampToValueAtTime(0.4, t + 0.08);

  // Release: 0.4 → 0 by t + 0.5 (total note duration 500 ms)
  envGain.gain.linearRampToValueAtTime(0, t + 0.5);

  // --- Schedule oscillator ---
  osc.start(t);
  osc.stop(t + 0.5);
}

/**
 * Set the master output volume.
 * Values outside [0.0, 1.0] are silently clamped.
 */
export function setMasterVolume(value: number): void {
  ensureContext();
  if (!masterGain) return;
  masterGain.gain.value = Math.min(1.0, Math.max(0.0, value));
}

/**
 * Return the current AudioContext instance.
 * Returns null before the first user gesture triggers lazy initialization.
 *
 * Used by the Scheduler to access AudioContext.currentTime without coupling
 * it directly to AudioEngine internals.
 */
export function getAudioContext(): AudioContext | null {
  return ctx;
}
