// TombsPad entry point
import { initCanvas } from './render/scene/Canvas';
import { decode } from './core/share';
import { getAudioContext } from './audio/AudioEngine';
import { initToolbar } from './ui/toolbar';
import * as ShareLink from './core/share';
import * as Scheduler from './scheduler/Scheduler';
import * as AudioEngine from './audio/AudioEngine';
import * as ScaleSystem from './core/scale';

const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
const canvasAPI = initCanvas(canvasContainer);

if (window.location.hash && window.location.hash.length > 1) {
  const restored = decode(window.location.hash);
  if (restored) canvasAPI.restoreState(restored);
}

initToolbar(canvasAPI, ShareLink, Scheduler, AudioEngine, ScaleSystem);

document.addEventListener('pointerdown', () => {
  getAudioContext();
}, { once: true });
