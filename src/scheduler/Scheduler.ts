/**
 * Scheduler.ts
 * Beat scheduler that quantizes creature steps to the grid beat.
 *
 * Maintains a 16 ms polling interval that tracks the current beat boundary
 * using the AudioContext clock. `onCreatureStep` schedules a note at the
 * next beat boundary so that all creatures stay locked to the tempo grid.
 */
import { getAudioContext, triggerNote } from '../audio/AudioEngine';
import { getCellColor } from '../render/scene/Canvas';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
let bpm = 120;
let lastBeatTime = 0;
const muteMap = new Map<string, boolean>();

// ---------------------------------------------------------------------------
// Pure helper (also exported for property tests)
// ---------------------------------------------------------------------------

/**
 * Compute the next beat boundary strictly after `currentTime`.
 *
 * @param currentTime  - AudioContext.currentTime (seconds)
 * @param bpmVal       - Beats per minute
 * @param lastBeat     - Time of the most-recently-passed beat (seconds)
 */
export function nextBeatTime(currentTime: number, bpmVal: number, lastBeat: number): number {
  const beatDuration = 60 / bpmVal;
  const elapsed = currentTime - lastBeat;
  const beatsElapsed = Math.floor(elapsed / beatDuration);
  return lastBeat + (beatsElapsed + 1) * beatDuration;
}

// ---------------------------------------------------------------------------
// Beat-tracking interval (runs continuously at module load)
// ---------------------------------------------------------------------------

setInterval(() => {
  const audioCtx = getAudioContext();
  if (audioCtx === null) return;

  const beatDuration = 60 / bpm;
  while (lastBeatTime + beatDuration <= audioCtx.currentTime) {
    lastBeatTime += beatDuration;
  }
}, 16);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule a note for `cellId` at the next beat boundary.
 * No-op if the cell is muted.
 *
 * `triggerNote` is async; we fire-and-forget intentionally.
 */
export function onCreatureStep(cellId: string): void {
  if (muteMap.get(cellId) === true) return;

  const currentTime = getAudioContext()?.currentTime ?? 0;
  const scheduledTime = nextBeatTime(currentTime, bpm, lastBeatTime);
  void triggerNote(cellId, scheduledTime, getCellColor);
}

/**
 * Set the tempo, clamped to [20, 300] BPM.
 */
export function setBPM(value: number): void {
  bpm = Math.min(300, Math.max(20, value));
}

/** Return the current BPM. */
export function getBPM(): number {
  return bpm;
}

/** Mute a cell so that `onCreatureStep` skips it. */
export function muteCell(cellId: string): void {
  muteMap.set(cellId, true);
}

/** Unmute a previously muted cell. */
export function unmuteCell(cellId: string): void {
  muteMap.delete(cellId);
}

/** Return whether a cell is currently muted. */
export function isCellMuted(cellId: string): boolean {
  return muteMap.get(cellId) === true;
}

/**
 * Return the current phase within the beat as a value in [0, 1).
 * Returns 0 when no AudioContext is available.
 */
export function getBeatPhase(): number {
  const audioCtx = getAudioContext();
  if (audioCtx === null) return 0;

  const beatDuration = 60 / bpm;
  const elapsed = audioCtx.currentTime - lastBeatTime;
  return (elapsed % beatDuration) / beatDuration;
}
