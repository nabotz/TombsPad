import { initCanvas } from './render/scene/Canvas';
import { setMasterVolume } from './audio/AudioEngine';

const container = document.getElementById('canvas-container') as HTMLElement;
initCanvas(container);

// Trigger lazy AudioContext init on first user gesture (browser autoplay policy)
document.addEventListener('pointerdown', () => {
  setMasterVolume(0.8);
}, { once: true });
