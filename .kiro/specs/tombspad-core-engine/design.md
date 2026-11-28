# Design Document

## Overview

TombsPad Part A delivers four loosely-coupled ES-module singletons — **Canvas**, **ScaleSystem**, **AudioEngine**, and **Scheduler** — plus a stateless **ShareLink** utility. Each module is a plain JavaScript file with no build-time dependencies on the others; they communicate through explicit function calls defined in this document. The Vite dev server and bundler connect everything through `src/main.js`. Part B (creature visuals) imports **Scheduler** and calls exactly one method: `Scheduler.onCreatureStep(cellId)`.

---

## Architecture

```
src/
  main.js              — entry point; wires all modules
  canvas/
    Canvas.js          — Three.js scene, grid, raycasting, undo
    cellState.js       — pure cell-state helpers (get/set/undo stack)
  audio/
    AudioEngine.js     — Web Audio synth + reverb
    impulseResponse.js — programmatic IR generator
  scale/
    ScaleSystem.js     — color → note mapping
  scheduler/
    Scheduler.js       — beat clock, quantization, mute map
  share/
    ShareLink.js       — LZ-string encode/decode
  ui/
    toolbar.js         — color picker, BPM slider, volume, undo button
index.html
vite.config.js
tests/
  scaleSystem.test.js  — fast-check property tests
  shareLink.test.js    — fast-check property tests
  scheduler.test.js    — fast-check property tests (pure logic only)
  canvas.test.js       — fast-check property tests (cell state)
```

---

## Module Design

### 1. Canvas (`src/canvas/Canvas.js`)

**Responsibilities**: Initialize and own the Three.js scene, camera, renderer, and 16×16 mesh grid. Handle pointer events, perform raycasting, dispatch paint/erase, manage the UndoStack, re-render on change.

**Internal state**:
```js
// cellState: flat array of 256 entries
// index = row * 16 + col
// value: ColorIndex (0–7) | null
let cellColors = new Array(256).fill(null);

// undoStack: array of { index, prev } snapshots, max length 10
let undoStack = [];

// activeTool: 'paint' | 'erase'
// activeColor: ColorIndex (0–7)
```

**Key functions**:
```js
export function initCanvas(container) { ... }
export function paintCell(col, row, colorIndex) { ... }
export function eraseCell(col, row) { ... }
export function undo() { ... }
export function getCellColor(col, row) { ... }  // returns ColorIndex | null
export function getFullState() { ... }          // returns { cells: [...256 values] }
export function restoreState(state) { ... }     // used by ShareLink on page load
export function setActiveTool(tool) { ... }     // 'paint' | 'erase'
export function setActiveColor(colorIndex) { ... }
```

**CellId ↔ index conversion** (pure, used across modules):
```js
// CellId "col,row" → flat index
export function cellIdToIndex(cellId) {
  const [col, row] = cellId.split(',').map(Number);
  return row * 16 + col;
}
// flat index → CellId
export function indexToCellId(index) {
  return `${index % 16},${Math.floor(index / 16)}`;
}
```

**Three.js grid construction**: 256 `PlaneGeometry(1,1)` meshes arranged at integer positions (0..15, 0..15) on the XZ plane. Each mesh has a `MeshBasicMaterial` whose color is updated on paint/erase. An `OrthographicCamera` looking down the Y-axis provides an isometric-style top-down view.

**Raycasting**: On `pointerdown` and `pointermove` (while button held), a `THREE.Raycaster` intersects the pointer ray against all 256 plane meshes. The first hit's mesh userData stores `{ col, row }` to identify the cell.

**UndoStack protocol**:
```
paintCell(col, row, color):
  prev = cellColors[row*16+col]
  if undoStack.length >= 10: undoStack.shift()
  undoStack.push({ index: row*16+col, prev })
  cellColors[row*16+col] = color
  updateMesh(col, row, color)

undo():
  if undoStack.length === 0: return
  { index, prev } = undoStack.pop()
  cellColors[index] = prev
  updateMesh(index % 16, floor(index/16), prev)
```

---

### 2. ScaleSystem (`src/scale/ScaleSystem.js`)

**Responsibilities**: Map each ColorIndex (0–7) to a fixed MIDINote. No runtime configuration — the scale is baked in at module initialization.

**Scale choice** (Halloween vibe — harmonic minor, A root, octaves 3–5):

| ColorIndex | Note Name | MIDI |
|-----------|-----------|------|
| 0 | A3 | 45 |
| 1 | C4 | 48 |
| 2 | D4 | 50 |
| 3 | E4 | 52 |
| 4 | G4 | 55 |
| 5 | A4 | 57 |
| 6 | C5 | 60 |
| 7 | E5 | 64 |

This is A harmonic minor (A B C D E F G# A) restricted to the 8 degrees that best evoke the Halloween atmosphere, spanning two octaves with monotonically increasing MIDI numbers.

**Public API**:
```js
export function colorToNote(colorIndex) {
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > 7) return null;
  return SCALE_TABLE[colorIndex]; // deterministic lookup
}

export function getScaleName() {
  return 'harmonic_minor';
}

export function midiToHz(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
```

**No mutable state**. The module is a pure lookup table.

---

### 3. AudioEngine (`src/audio/AudioEngine.js`)

**Responsibilities**: Own the `AudioContext`, synthesize notes on demand, provide reverb, expose master volume control.

**Signal chain per note**:
```
OscillatorNode (sawtooth)
  → BiquadFilterNode (lowpass, freq=800Hz, Q=2)
    → GainNode (ADSR envelope)
      → ConvolverNode (reverb)
        → masterGain
          → AudioContext.destination
```

**Lazy AudioContext initialization**:
```js
let ctx = null;
let masterGain = null;
let convolver = null;

function ensureContext() {
  if (ctx) return;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;
  convolver = ctx.createConvolver();
  convolver.buffer = generateImpulseResponse(ctx, 2.0, 2.0, false);
  convolver.connect(masterGain);
  masterGain.connect(ctx.destination);
}
```

**Impulse response generation** (`src/audio/impulseResponse.js`):
```js
export function generateImpulseResponse(ctx, duration, decay, reverse) {
  const rate = ctx.sampleRate;
  const length = Math.round(rate * duration);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    if (reverse) data.reverse();
  }
  return buffer;
}
```

**Note synthesis**:
```js
export function triggerNote(cellId, scheduledTime) {
  ensureContext();
  const color = getCellColor(...cellId.split(',').map(Number));
  if (color === null) return;
  const midi = colorToNote(color);
  const hz = midiToHz(midi);
  const now = scheduledTime ?? ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = hz;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 2;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.8, now + 0.01);  // attack 10ms
  env.gain.linearRampToValueAtTime(0.4, now + 0.08);  // decay 70ms
  env.gain.setValueAtTime(0.4, now + 0.3);             // sustain
  env.gain.linearRampToValueAtTime(0, now + 0.5);      // release

  osc.connect(filter);
  filter.connect(env);
  env.connect(convolver);

  osc.start(now);
  osc.stop(now + 0.5);
}
```

**Public API**:
```js
export function triggerNote(cellId, scheduledTime) { ... }
export function setMasterVolume(value) {
  ensureContext();
  masterGain.gain.value = Math.min(1.0, Math.max(0.0, value));
}
export function getAudioContext() { return ctx; }  // used by Scheduler for currentTime
```

---

### 4. Scheduler (`src/scheduler/Scheduler.js`)

**Responsibilities**: Maintain the beat clock, quantize creature-step events to beat boundaries, enforce per-cell mute, expose `getBeatPhase()`.

**Beat quantization logic** (pure function, fully testable):
```js
export function nextBeatTime(currentTime, bpm, lastBeatTime) {
  const beatDuration = 60 / bpm;
  const elapsed = currentTime - lastBeatTime;
  const beatsElapsed = Math.floor(elapsed / beatDuration);
  return lastBeatTime + (beatsElapsed + 1) * beatDuration;
}
```

**Internal state**:
```js
let bpm = 120;
let lastBeatTime = 0;    // AudioContext time of last beat
let muteMap = new Map(); // cellId → boolean
```

**Beat clock maintenance**: A `setInterval` running at ~16ms polls `AudioContext.currentTime` and updates `lastBeatTime` whenever a full beat has elapsed:
```js
setInterval(() => {
  if (!audioCtx) return;
  const beatDuration = 60 / bpm;
  while (audioCtx.currentTime >= lastBeatTime + beatDuration) {
    lastBeatTime += beatDuration;
  }
}, 16);
```

**Public API (the Part B interface)**:
```js
// PRIMARY API for Part B — call when a creature steps on a cell
export function onCreatureStep(cellId) {
  if (muteMap.get(cellId)) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = nextBeatTime(ctx.currentTime, bpm, lastBeatTime);
  triggerNote(cellId, t);
}

export function setBPM(value) {
  bpm = Math.min(300, Math.max(20, Number(value)));
}

export function getBPM() { return bpm; }

export function muteCell(cellId) { muteMap.set(cellId, true); }
export function unmuteCell(cellId) { muteMap.delete(cellId); }
export function isCellMuted(cellId) { return muteMap.get(cellId) === true; }

export function getBeatPhase() {
  const ctx = getAudioContext();
  if (!ctx) return 0;
  const beatDuration = 60 / bpm;
  const elapsed = ctx.currentTime - lastBeatTime;
  return (elapsed % beatDuration) / beatDuration;
}
```

---

### 5. ShareLink (`src/share/ShareLink.js`)

**Responsibilities**: Serialize and deserialize the full canvas state (256 ColorIndex values + optional seed) to/from a URL-safe string using LZ-string.

**State shape**:
```js
// canvasState object passed to encode:
{
  cells: [/* 256 entries: ColorIndex (0–7) | null */],
  seed: 42  // optional integer, for Part B creature spawn
}
```

**Encode**:
```js
import LZString from 'lz-string';

export function encode(canvasState) {
  const json = JSON.stringify(canvasState);
  const compressed = LZString.compressToEncodedURIComponent(json);
  window.location.hash = compressed;
  return compressed;
}
```

**Decode**:
```js
export function decode(hashString) {
  try {
    const clean = hashString.startsWith('#') ? hashString.slice(1) : hashString;
    const json = LZString.decompressFromEncodedURIComponent(clean);
    if (!json) throw new Error('decompression failed');
    return JSON.parse(json);
  } catch (e) {
    console.warn('[ShareLink] Failed to decode hash:', e.message);
    return null;
  }
}
```

**Page load integration** (in `main.js`):
```js
if (window.location.hash) {
  const state = decode(window.location.hash);
  if (state) restoreState(state);
}
```

---

### 6. UI / Toolbar (`src/ui/toolbar.js`)

No novel logic — wires DOM controls to module APIs:
- Color swatches (8 colors) → `setActiveColor(index)`
- Eraser button → `setActiveTool('erase')`
- Undo button → `undo()`
- BPM slider (20–300) → `setBPM(value)`
- Volume slider (0–1) → `setMasterVolume(value)`
- Share button → `encode(getFullState())`
- Per-cell mute: right-click on cell → `muteCell(cellId)` / `unmuteCell(cellId)`

---

## Components and Interfaces

| Component | File | Responsibility | Consumes | Exposes |
|-----------|------|----------------|----------|---------|
| Canvas | `src/canvas/Canvas.js` | Three.js scene, raycasting, cell state, undo | — | `paintCell`, `eraseCell`, `undo`, `getCellColor`, `getFullState`, `restoreState`, `setActiveTool`, `setActiveColor`, `cellIdToIndex`, `indexToCellId` |
| CellState helpers | `src/canvas/cellState.js` | Pure cell-state array operations | — | `createCellState`, `setCellColor`, `getCellColor` |
| ScaleSystem | `src/scale/ScaleSystem.js` | Color → MIDI note lookup table | — | `colorToNote`, `getScaleName`, `midiToHz` |
| AudioEngine | `src/audio/AudioEngine.js` | Web Audio synthesis, reverb, master volume | ScaleSystem, Canvas | `triggerNote`, `setMasterVolume`, `getAudioContext` |
| ImpulseResponse | `src/audio/impulseResponse.js` | Programmatic reverb IR buffer generation | — | `generateImpulseResponse` |
| Scheduler | `src/scheduler/Scheduler.js` | Beat clock, quantization, mute map | AudioEngine, Canvas | `onCreatureStep`, `setBPM`, `getBPM`, `muteCell`, `unmuteCell`, `isCellMuted`, `getBeatPhase`, `nextBeatTime` |
| ShareLink | `src/share/ShareLink.js` | LZ-string encode/decode, URL hash I/O | — | `encode`, `decode` |
| Toolbar UI | `src/ui/toolbar.js` | DOM event wiring | All modules | — |
| Main entry | `src/main.js` | Module wiring, page-load hash restore | All modules | — |

---

## Data Models

### CanvasState
Serializable snapshot of the painting, used by ShareLink.
```js
{
  cells: Array(256),  // flat array; index = row*16+col; value: 0–7 (ColorIndex) | null
  seed: Number | undefined  // optional integer for Part B creature spawn
}
```

### UndoEntry
One entry on the UndoStack, capturing the state of a single cell before a paint or erase.
```js
{
  index: Number,  // flat cell index (0–255)
  prev: Number | null  // ColorIndex before the action
}
```

### MuteMap
Internal to Scheduler. A `Map<string, boolean>` keyed by CellId strings (`"col,row"`). A key present and `true` means the cell is muted; absent or `false` means unmuted.

### ColorIndex
An integer in [0, 7] identifying one of eight paintable colors. Maps to a fixed MIDI note via ScaleSystem's lookup table.

### ScaleTable
An immutable array of 8 MIDI note numbers defined in ScaleSystem. Index 0–7 → MIDI note numbers [45, 48, 50, 52, 55, 57, 60, 64] (A harmonic minor, A3–E5).

---

## Data Flow

```
User paints cell
  → Canvas.paintCell(col, row, colorIndex)
    → cellColors[index] = colorIndex
    → updates Three.js mesh material color

Part B creature steps on cell
  → Scheduler.onCreatureStep("col,row")
    → check muteMap → skip if muted
    → nextBeatTime(currentTime, bpm, lastBeatTime) → scheduledTime
    → AudioEngine.triggerNote("col,row", scheduledTime)
      → Canvas.getCellColor(col, row) → colorIndex
      → ScaleSystem.colorToNote(colorIndex) → midiNote
      → ScaleSystem.midiToHz(midiNote) → hz
      → synthesize note at scheduledTime

User clicks Share
  → Canvas.getFullState() → { cells: [...], seed: N }
  → ShareLink.encode(state) → writes window.location.hash

Page load with hash
  → ShareLink.decode(hash) → state
  → Canvas.restoreState(state)
```

---

## Part B Integration Contract

Part B only needs to import one function:

```js
import { onCreatureStep } from './scheduler/Scheduler.js';
import { getBeatPhase } from './scheduler/Scheduler.js';
import { getCellColor } from './canvas/Canvas.js';
```

| Call | When | Returns |
|------|------|---------|
| `onCreatureStep(cellId)` | Creature's locomotion lands on a cell | `void` |
| `getBeatPhase()` | Each animation frame, to sync creature animation | `float` in [0.0, 1.0) |
| `getCellColor(col, row)` | To decide creature visual/behavior per cell color | `ColorIndex` or `null` |

Part B must **not** call `AudioEngine` directly — always go through `Scheduler.onCreatureStep`.

---

## Vite Configuration

```js
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({
  root: '.',
  build: { target: 'es2020' },
  test: {
    environment: 'jsdom',
    globals: true,
  }
});
```

**Dependencies** (package.json):
```json
{
  "dependencies": {
    "three": "^0.165.0",
    "lz-string": "^1.5.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "fast-check": "^3.0.0"
  }
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `triggerNote` on null cell | Returns immediately, no error |
| `setMasterVolume` out of range | Clamps to [0.0, 1.0] |
| `setBPM` out of range | Clamps to [20, 300] |
| Undo on empty stack | Returns immediately, no error |
| `colorToNote` out of range | Returns `null` |
| `ShareLink.decode` on bad input | Returns `null`, logs console.warn |
| AudioContext before user gesture | Deferred via `ensureContext()` guard |

---

## Testing Strategy

All tests run via Vitest (`vitest --run`) with `jsdom` environment. No browser is required for unit or property tests because all tested functions are pure JS with no DOM/Three.js/AudioContext dependencies.

**Property-based tests** use fast-check and cover the universally quantified properties in the Correctness Properties section below. Each property test runs ≥ 100 iterations.

**Unit/example tests** cover specific behaviors: AudioContext lazy init, `triggerNote` on a null cell, page-load hash restoration, and tool/toolbar wiring.

**What is NOT tested at the unit level** (relies on manual/integration verification):
- Three.js rendering fidelity (mesh colors, raycasting accuracy)
- Web Audio node graph wiring (OscillatorNode → filter → envelope chain)
- Convolver reverb perceptual quality
- Browser autoplay policy compliance

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CellId Uniqueness

*For any* valid (col, row) pair in the 16×16 grid, the CellId string `"col,row"` uniquely identifies exactly one cell, and the round-trip `cellIdToIndex` → `indexToCellId` returns the original CellId.

**Validates: Requirements 1.2**

---

### Property 2: Paint stores correct color

*For any* cell (col, row) in [0,15]² and any ColorIndex in [0,7], after calling `paintCell(col, row, color)`, `getCellColor(col, row)` returns that exact color.

**Validates: Requirements 1.3**

---

### Property 3: Erase clears to null

*For any* cell that has been painted with any ColorIndex, calling `eraseCell(col, row)` causes `getCellColor(col, row)` to return `null`.

**Validates: Requirements 1.4**

---

### Property 4: Undo restores prior state

*For any* cell and any sequence of paint actions, calling `undo()` once restores the cell to the ColorIndex it held immediately before the last paint/erase action on that cell.

**Validates: Requirements 1.6, 1.8**

---

### Property 5: Cell state is always a valid value

*For any* sequence of paint, erase, and undo operations, every cell's stored value is either `null` or an integer in [0, 7] — never any other value.

**Validates: Requirements 1.10**

---

### Property 6: colorToNote is total on [0,7]

*For any* integer colorIndex in [0, 7], `colorToNote(colorIndex)` returns a non-null integer in [21, 108].

**Validates: Requirements 3.2, 3.3**

---

### Property 7: colorToNote is deterministic

*For any* integer colorIndex in [0, 7], calling `colorToNote(colorIndex)` twice returns the same value both times.

**Validates: Requirements 3.4**

---

### Property 8: colorToNote is monotonically non-decreasing

*For any* two integers i and j in [0, 7] where i < j, `colorToNote(i) <= colorToNote(j)`.

**Validates: Requirements 3.6**

---

### Property 9: colorToNote returns null for out-of-range input

*For any* value outside [0, 7] (negative integers, integers > 7, non-integers), `colorToNote(value)` returns `null` without throwing.

**Validates: Requirements 3.5**

---

### Property 10: setMasterVolume clamping

*For any* float value passed to `setMasterVolume(value)`, the resulting master gain is always in [0.0, 1.0].

**Validates: Requirements 2.7, 2.8**

---

### Property 11: setBPM clamping

*For any* numeric value passed to `setBPM(value)`, the stored BPM returned by `getBPM()` is always in [20, 300].

**Validates: Requirements 4.4, 4.5**

---

### Property 12: nextBeatTime is always in the future

*For any* currentTime ≥ 0, BPM in [20, 300], and lastBeatTime ≤ currentTime, `nextBeatTime(currentTime, bpm, lastBeatTime)` returns a value strictly greater than currentTime and within one beat duration from currentTime.

**Validates: Requirements 4.2**

---

### Property 13: getBeatPhase is in [0.0, 1.0)

*For any* AudioContext currentTime and BPM in [20, 300], `getBeatPhase()` returns a float in [0.0, 1.0).

**Validates: Requirements 4.9** *(cross-reference: 4.8 in req doc)*

---

### Property 14: Mute suppresses scheduling

*For any* CellId, after calling `muteCell(cellId)`, calling `onCreatureStep(cellId)` triggers no audio (the note is not scheduled). After `unmuteCell(cellId)`, the cell is no longer muted.

**Validates: Requirements 4.6, 4.7**

---

### Property 15: ShareLink encode/decode round-trip

*For any* canvas state object (256 cells with ColorIndex values or null, plus an optional integer seed), `decode(encode(state))` returns an object deeply equal to the original state.

**Validates: Requirements 5.1, 5.4, 5.6**

---

### Property 16: Encoded string is URI-safe

*For any* canvas state, the string returned by `encode(state)` satisfies `encodeURIComponent(result) === result` — it contains no characters requiring percent-encoding.

**Validates: Requirements 5.7**
