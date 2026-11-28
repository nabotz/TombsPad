/**
 * toolbar.ts
 * UI toolbar for TombsPad.
 *
 * Renders color swatches, eraser, undo, BPM slider, volume slider,
 * and a share button into the existing #toolbar element.
 */

import type { initCanvas } from '../render/scene/Canvas';
import type * as ShareLinkModule from '../core/share';
import type * as SchedulerModule from '../scheduler/Scheduler';
import type * as AudioEngineModule from '../audio/AudioEngine';
import type * as ScaleSystemModule from '../core/scale';

/** 8 Halloween-themed colors matching Canvas.ts COLOR_PALETTE */
const COLOR_PALETTE: string[] = [
  '#ff6b00', // orange
  '#8b00ff', // purple
  '#00ff41', // green
  '#ff0040', // red
  '#ffff00', // yellow
  '#00cfff', // cyan
  '#ff69b4', // pink
  '#ffffff', // white
];

type CanvasAPI = ReturnType<typeof initCanvas>;

/**
 * Initialize and mount all toolbar controls.
 *
 * @param canvasAPI    - API returned by initCanvas
 * @param shareLinkAPI - Namespace import of src/core/share
 * @param schedulerAPI - Namespace import of src/scheduler/Scheduler
 * @param audioAPI     - Namespace import of src/audio/AudioEngine
 * @param scaleAPI     - Namespace import of src/core/scale (reserved for future use)
 */
export function initToolbar(
  canvasAPI: CanvasAPI,
  shareLinkAPI: typeof ShareLinkModule,
  schedulerAPI: typeof SchedulerModule,
  audioAPI: typeof AudioEngineModule,
  _scaleAPI: typeof ScaleSystemModule
): void {
  const toolbar = document.getElementById('toolbar') as HTMLElement;

  // ----- Separator helper -----
  function sep(): HTMLSpanElement {
    const s = document.createElement('span');
    s.style.cssText = 'width:1px;height:28px;background:#3d1a5a;margin:0 4px;';
    return s;
  }

  // ----- Color swatches -----
  let activeColorIndex = 0;
  const swatches: HTMLButtonElement[] = [];

  COLOR_PALETTE.forEach((hex, i) => {
    const btn = document.createElement('button');
    btn.title = `Color ${i}`;
    btn.style.cssText = `
      width: 28px; height: 28px;
      border-radius: 4px;
      border: 2px solid ${i === 0 ? '#fff' : 'transparent'};
      background: ${hex};
      cursor: pointer;
      flex-shrink: 0;
    `;
    btn.addEventListener('click', () => {
      canvasAPI.setActiveTool('paint');
      canvasAPI.setActiveColor(i);
      activeColorIndex = i;
      swatches.forEach((s, idx) => {
        s.style.border = `2px solid ${idx === i ? '#fff' : 'transparent'}`;
      });
      eraserBtn.style.border = '2px solid transparent';
    });
    swatches.push(btn);
    toolbar.appendChild(btn);
  });

  toolbar.appendChild(sep());

  // ----- Eraser -----
  const eraserBtn = document.createElement('button');
  eraserBtn.textContent = '🧹';
  eraserBtn.title = 'Eraser';
  eraserBtn.style.cssText = `
    font-size: 1.1rem;
    background: #2a1a3e;
    border: 2px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    color: #ff6b00;
  `;
  eraserBtn.addEventListener('click', () => {
    canvasAPI.setActiveTool('erase');
    swatches.forEach(s => { s.style.border = '2px solid transparent'; });
    eraserBtn.style.border = '2px solid #fff';
  });
  toolbar.appendChild(eraserBtn);

  // ----- Undo -----
  const undoBtn = document.createElement('button');
  undoBtn.textContent = '↩';
  undoBtn.title = 'Undo';
  undoBtn.style.cssText = `
    font-size: 1.1rem;
    background: #2a1a3e;
    border: 2px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    color: #ff6b00;
  `;
  undoBtn.addEventListener('click', () => {
    canvasAPI.undo();
    // Restore paint tool and active color highlight after undo
    canvasAPI.setActiveTool('paint');
    canvasAPI.setActiveColor(activeColorIndex);
  });
  toolbar.appendChild(undoBtn);

  toolbar.appendChild(sep());

  // ----- BPM label + slider -----
  const bpmLabel = document.createElement('span');
  bpmLabel.style.cssText = 'font-size: 0.75rem; color: #ff6b00; white-space: nowrap;';
  bpmLabel.textContent = `BPM: ${schedulerAPI.getBPM()}`;

  const bpmSlider = document.createElement('input');
  bpmSlider.type = 'range';
  bpmSlider.min = '20';
  bpmSlider.max = '300';
  bpmSlider.value = String(schedulerAPI.getBPM());
  bpmSlider.style.cssText = 'width: 80px; cursor: pointer; accent-color: #ff6b00;';
  bpmSlider.addEventListener('input', () => {
    const val = Number(bpmSlider.value);
    schedulerAPI.setBPM(val);
    bpmLabel.textContent = `BPM: ${val}`;
  });

  toolbar.appendChild(bpmLabel);
  toolbar.appendChild(bpmSlider);

  toolbar.appendChild(sep());

  // ----- Volume label + slider -----
  const volLabel = document.createElement('span');
  volLabel.style.cssText = 'font-size: 0.75rem; color: #ff6b00; white-space: nowrap;';
  volLabel.textContent = 'Vol: 80%';

  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '100';
  volSlider.value = '80';
  volSlider.style.cssText = 'width: 70px; cursor: pointer; accent-color: #ff6b00;';
  volSlider.addEventListener('input', () => {
    const val = Number(volSlider.value) / 100;
    audioAPI.setMasterVolume(val);
    volLabel.textContent = `Vol: ${Number(volSlider.value)}%`;
  });

  toolbar.appendChild(volLabel);
  toolbar.appendChild(volSlider);

  toolbar.appendChild(sep());

  // ----- Share button -----
  const shareBtn = document.createElement('button');
  shareBtn.textContent = '🔗 Share';
  shareBtn.title = 'Copy share link';
  shareBtn.style.cssText = `
    font-size: 0.8rem;
    background: #2a1a3e;
    border: 2px solid #3d1a5a;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    color: #ff6b00;
  `;
  shareBtn.addEventListener('click', () => {
    const state = canvasAPI.getFullState();
    shareLinkAPI.encode(state);
    navigator.clipboard?.writeText(window.location.href).catch(() => {/* clipboard unavailable */});
    shareBtn.textContent = '✅ Copied!';
    setTimeout(() => { shareBtn.textContent = '🔗 Share'; }, 2000);
  });
  toolbar.appendChild(shareBtn);
}
