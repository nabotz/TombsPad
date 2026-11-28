/**
 * Scheduler.ts
 * Calls step() once per beat using the AudioContext clock.
 * step() is injected by main.ts once core-model is ready.
 * For now uses a stub that returns no notes.
 */
import { getAudioContext, triggerNote } from '../audio/AudioEngine';
import { getCellColor } from '../render/scene/Canvas';

export interface GameState {
  cells: (number | null)[];
}

export interface StepResult {
  state: GameState;
  notes: string[];
}

export type StepFn = (state: GameState) => StepResult;

const stubStep: StepFn = (state) => ({ state, notes: [] });

let bpm = 120;
let lastBeatTime = 0;
let stepFn: StepFn = stubStep;
let gameState: GameState = { cells: new Array(256).fill(null) };
const muteMap = new Map<string, boolean>();

export function setStepFn(fn: StepFn): void { stepFn = fn; }
export function setGameState(state: GameState): void { gameState = state; }

export function nextBeatTime(currentTime: number, bpmVal: number, lastBeat: number): number {
  const beatDuration = 60 / bpmVal;
  const beatsElapsed = Math.floor((currentTime - lastBeat) / beatDuration);
  return lastBeat + (beatsElapsed + 1) * beatDuration;
}

setInterval(() => {
  const audioCtx = getAudioContext();
  if (audioCtx === null) return;
  const beatDuration = 60 / bpm;
  while (lastBeatTime + beatDuration <= audioCtx.currentTime) {
    lastBeatTime += beatDuration;
    const result = stepFn(gameState);
    gameState = result.state;
    for (const cellId of result.notes) {
      if (muteMap.get(cellId) === true) continue;
      void triggerNote(cellId, lastBeatTime, getCellColor);
    }
  }
}, 16);

export function onCreatureStep(cellId: string): void {
  if (muteMap.get(cellId) === true) return;
  const currentTime = getAudioContext()?.currentTime ?? 0;
  const scheduledTime = nextBeatTime(currentTime, bpm, lastBeatTime);
  void triggerNote(cellId, scheduledTime, getCellColor);
}

export function setBPM(value: number): void { bpm = Math.min(300, Math.max(20, value)); }
export function getBPM(): number { return bpm; }
export function muteCell(cellId: string): void { muteMap.set(cellId, true); }
export function unmuteCell(cellId: string): void { muteMap.delete(cellId); }
export function isCellMuted(cellId: string): boolean { return muteMap.get(cellId) === true; }

export function getBeatPhase(): number {
  const audioCtx = getAudioContext();
  if (audioCtx === null) return 0;
  const beatDuration = 60 / bpm;
  return ((audioCtx.currentTime - lastBeatTime) % beatDuration) / beatDuration;
}
