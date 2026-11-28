# Implementation Plan: TombsPad Core Engine (Part A)

## Overview

Build the five core modules of TombsPad — Canvas, ScaleSystem, AudioEngine, Scheduler, and ShareLink — as plain JavaScript ES modules for a Vite project, with Vitest + fast-check property tests. Each task builds on the previous ones. No TypeScript; no audio files; synthesis only.

---

## Tasks

- [x] 1. Bootstrap Vite project and install dependencies
  - Run `npm create vite@latest . -- --template vanilla` in the repo root (skip if `index.html` already exists)
  - Install runtime deps: `npm install three lz-string`
  - Install dev deps: `npm install -D vitest @vitest/coverage-v8 fast-check jsdom`
  - Create `vite.config.js` with `root: '.'`, `build.target: 'es2020'`, and `test.environment: 'jsdom'`
  - Create the `src/` directory structure: `canvas/`, `audio/`, `scale/`, `scheduler/`, `share/`, `ui/`
  - Create the `tests/` directory
  - _Requirements: all modules need a working Vite scaffold_

- [x] 2. Implement ScaleSystem
  - [x] 2.1 Create `src/scale/ScaleSystem.js`
    - Define the `SCALE_TABLE` constant array: `[45, 48, 50, 52, 55, 57, 60, 64]` (A harmonic minor, A3–E5)
    - Implement `colorToNote(colorIndex)`: return `SCALE_TABLE[colorIndex]` for valid input (integer in [0,7]), `null` otherwise
    - Implement `getScaleName()`: return `'harmonic_minor'`
    - Implement `midiToHz(midiNote)`: return `440 * Math.pow(2, (midiNote - 69) / 12)`
    - Export all three functions as named exports
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.2 Write property tests for ScaleSystem
    - File: `tests/scaleSystem.test.js`
    - **Property 6: colorToNote is total on [0,7]** — `fc.integer({min:0,max:7})` → result is non-null integer in [21,108]
    - **Property 7: colorToNote is deterministic** — same input always returns same output
    - **Property 8: colorToNote is monotonically non-decreasing** — for `i < j` in [0,7], `colorToNote(i) <= colorToNote(j)`
    - **Property 9: colorToNote returns null for out-of-range** — `fc.oneof(fc.integer({max:-1}), fc.integer({min:8}), fc.double())` → returns null, no throw
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Implement Canvas cell-state helpers
  - [x] 3.1 Create `src/canvas/cellState.js`
    - Implement `cellIdToIndex(cellId)`: parse `"col,row"` → `row*16+col`
    - Implement `indexToCellId(index)`: `index → "col,row"` where col=index%16, row=floor(index/16)
    - Implement `createCellState()`: return a 256-element array filled with `null`
    - Implement `setCellColor(cells, index, colorOrNull)`: return new array with the cell updated
    - Implement `getCellColorByIndex(cells, index)`: return `cells[index]`
    - Export all five functions as named exports
    - _Requirements: 1.2, 1.3, 1.4, 1.10_

  - [ ]* 3.2 Write property tests for cell-state helpers
    - File: `tests/canvas.test.js`
    - **Property 1: CellId uniqueness** — `fc.integer({min:0,max:15})` × 2 → `cellIdToIndex(indexToCellId(n)) === n` and `indexToCellId(cellIdToIndex(id)) === id`
    - **Property 2: Paint stores correct color** — after `setCellColor(cells, idx, color)`, `getCellColorByIndex(result, idx) === color`
    - **Property 3: Erase clears to null** — after `setCellColor(cells, idx, null)`, result is `null`
    - **Property 5: Cell state is always a valid value** — after any sequence of set operations, every cell value is `null` or integer in [0,7]
    - _Requirements: 1.2, 1.3, 1.4, 1.10_

- [x] 4. Implement Canvas module (Three.js scene + undo)
  - [x] 4.1 Create `src/canvas/Canvas.js`
    - Initialize Three.js scene, `OrthographicCamera` looking down Y-axis, `WebGLRenderer` attached to `container`
    - Build 256 `PlaneGeometry(1,1)` meshes at positions `(col - 7.5, 0, row - 7.5)` with `userData = { col, row }`; use `MeshBasicMaterial`
    - Add all meshes to the scene; store in a `meshGrid` array indexed by `row*16+col`
    - Import and use `createCellState`, `setCellColor`, `getCellColorByIndex`, `cellIdToIndex`, `indexToCellId` from `cellState.js`
    - Implement `getCellColor(col, row)` → returns `ColorIndex | null`
    - Implement `paintCell(col, row, colorIndex)`: push `{index, prev}` to UndoStack (cap at 10), update `cellColors`, update mesh material color using a `COLOR_PALETTE` hex array of 8 Halloween colors, call `renderer.render`
    - Implement `eraseCell(col, row)`: same UndoStack protocol, sets color to `null`, resets mesh material to unpainted color
    - Implement `undo()`: pop from UndoStack, restore cell, re-render; no-op if stack empty
    - Implement `getFullState()`: return `{ cells: [...cellColors] }`
    - Implement `restoreState(state)`: write all 256 values from `state.cells` into `cellColors`, update all meshes, re-render
    - Implement `setActiveTool(tool)` and `setActiveColor(colorIndex)`
    - Export all public functions
    - _Requirements: 1.1, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 4.2 Add raycasting pointer interaction to Canvas
    - Set up `Raycaster` and listen for `pointerdown` and `pointermove` (while button pressed) on the renderer's canvas element
    - On each event, convert pointer coords to NDC, run `raycaster.intersectObjects(meshGrid)`, read `userData.col/row` from first hit
    - If `activeTool === 'paint'`, call `paintCell(col, row, activeColor)`; if `'erase'`, call `eraseCell(col, row)`
    - _Requirements: 1.5_

  - [ ]* 4.3 Write property test for undo round-trip
    - File: `tests/canvas.test.js` (add to existing)
    - **Property 4: Undo restores prior state** — generate random sequence of paint actions on a cell, then undo once; verify cell returns to its pre-last-action value
    - _Requirements: 1.6, 1.8_

- [x] 5. Checkpoint — ScaleSystem and Canvas core are done
  - Ensure all tests pass (`vitest --run`), ask the user if questions arise.

- [x] 6. Implement AudioEngine
  - [x] 6.1 Create `src/audio/impulseResponse.js`
    - Implement `generateImpulseResponse(ctx, duration, decay, reverse)` as described in the design: allocate a stereo buffer, fill with exponentially decaying white noise, optionally reverse
    - Export `generateImpulseResponse`
    - _Requirements: 2.4_

  - [x] 6.2 Create `src/audio/AudioEngine.js`
    - Implement lazy `ensureContext()`: creates `AudioContext`, master `GainNode` (default 0.8), `ConvolverNode` with IR from `generateImpulseResponse(ctx, 2.0, 2.0, false)`; wires convolver → masterGain → destination
    - Implement `triggerNote(cellId, scheduledTime)`: import `getCellColor` from Canvas, `colorToNote` and `midiToHz` from ScaleSystem; return early if color is `null`; build OscillatorNode → BiquadFilterNode(lowpass, 800Hz, Q=2) → GainNode (ADSR: attack 10ms, decay 70ms, sustain 0.4, release total 500ms) → convolver; schedule start/stop
    - Implement `setMasterVolume(value)`: call `ensureContext()`, clamp value to [0.0,1.0], set `masterGain.gain.value`
    - Implement `getAudioContext()`: return `ctx` (may be `null` before first gesture)
    - Export `triggerNote`, `setMasterVolume`, `getAudioContext`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 6.3 Write example tests for AudioEngine
    - File: `tests/audioEngine.test.js` (use Vitest mock for AudioContext)
    - Example: `triggerNote` on a null-color cell calls no AudioContext methods
    - Example: `setMasterVolume(1.5)` sets gain to 1.0 (clamped)
    - **Property 10: setMasterVolume clamping** — `fc.double()` → resulting gain is in [0.0, 1.0]
    - _Requirements: 2.6, 2.7, 2.8_

- [x] 7. Implement Scheduler
  - [x] 7.1 Create `src/scheduler/Scheduler.js`
    - Export pure function `nextBeatTime(currentTime, bpm, lastBeatTime)`: compute next beat boundary as `lastBeatTime + (floor((currentTime - lastBeatTime) / (60/bpm)) + 1) * (60/bpm)`
    - Maintain module-level state: `bpm = 120`, `lastBeatTime = 0`, `muteMap = new Map()`
    - Set up a 16ms interval that polls `getAudioContext()?.currentTime` and advances `lastBeatTime` by beat durations as needed
    - Implement `onCreatureStep(cellId)`: skip if `muteMap.get(cellId)`, call `nextBeatTime`, call `triggerNote(cellId, t)`
    - Implement `setBPM(value)`: clamp to [20,300], update `bpm`
    - Implement `getBPM()`: return `bpm`
    - Implement `muteCell(cellId)`, `unmuteCell(cellId)`, `isCellMuted(cellId)`
    - Implement `getBeatPhase()`: compute `(elapsed % beatDuration) / beatDuration`; return 0 if no AudioContext yet
    - Export all public functions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 7.2 Write property tests for Scheduler pure logic
    - File: `tests/scheduler.test.js`
    - **Property 11: setBPM clamping** — `fc.oneof(fc.double({max:300}), fc.double({min:20}))` → `getBPM()` is in [20,300]
    - **Property 12: nextBeatTime is in the future** — `fc.tuple(fc.double({min:0}), fc.double({min:20,max:300}), fc.double({min:0}))` constrained to `lastBeat <= current` → result > currentTime and ≤ currentTime + 60/bpm
    - **Property 13: getBeatPhase is in [0,1)** — test pure computation with injected currentTime and bpm
    - **Property 14: Mute suppresses scheduling** — after `muteCell(id)`, `isCellMuted(id)` is true; after `unmuteCell(id)`, it's false
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.9_

- [x] 8. Implement ShareLink
  - [x] 8.1 Create `src/share/ShareLink.js`
    - Import `LZString` from `'lz-string'`
    - Implement `encode(canvasState)`: `JSON.stringify(canvasState)` → `LZString.compressToEncodedURIComponent(json)` → set `window.location.hash` → return compressed string
    - Implement `decode(hashString)`: strip leading `#`, call `LZString.decompressFromEncodedURIComponent`, parse JSON; return `null` and `console.warn` on any failure
    - Export both functions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 8.2 Write property tests for ShareLink
    - File: `tests/shareLink.test.js`
    - **Property 15: encode/decode round-trip** — `fc.record({ cells: fc.array(fc.oneof(fc.constant(null), fc.integer({min:0,max:7})), {minLength:256,maxLength:256}), seed: fc.option(fc.integer()) })` → `decode(encode(state))` deeply equals original state (test without actual `window.location.hash` by extracting pure compress/decompress logic or mocking `window`)
    - **Property 16: Encoded string is URI-safe** — same generator → `encodeURIComponent(encode(state)) === encode(state)` (after stripping the `#`)
    - Example: `decode("not-a-valid-hash")` returns `null` without throwing
    - _Requirements: 5.1, 5.4, 5.5, 5.7_

- [x] 9. Checkpoint — All modules implemented
  - Ensure all tests pass (`vitest --run`), ask the user if questions arise.

- [x] 10. Wire everything in main.js and toolbar
  - [x] 10.1 Create `src/ui/toolbar.js`
    - Build or mount DOM elements: 8 color swatches, eraser button, undo button, BPM slider (20–300), volume slider (0.0–1.0), share button, label for current scale name
    - Wire each control to the appropriate module function: color swatch → `setActiveColor(i)`, eraser → `setActiveTool('erase')`, undo → `undo()`, BPM slider → `setBPM(v)`, volume → `setMasterVolume(v)`, share → `encode(getFullState())`
    - Wire right-click on canvas container to toggle `muteCell`/`unmuteCell` for the clicked cell (call `getCellColor` to identify CellId from pointer)
    - Display `getScaleName()` in a toolbar label
    - _Requirements: 2.7, 3.7, 4.4, 4.6, 4.7, 5.2_

  - [x] 10.2 Create `src/main.js`
    - Import `initCanvas` from Canvas; `initCanvas(document.getElementById('canvas-container'))`
    - Import ShareLink; if `window.location.hash` is non-empty, call `decode(window.location.hash)` and pass result to `restoreState` before first render
    - Import and call toolbar wiring from `toolbar.js`
    - Add a first-gesture listener (`pointerdown` on document, once) that calls `getAudioContext()` to trigger lazy AudioContext init
    - _Requirements: 2.9, 5.3_

  - [x] 10.3 Update `index.html`
    - Add `<div id="canvas-container">` and `<div id="toolbar">` to the body
    - Include `<script type="module" src="/src/main.js"></script>`
    - Add minimal CSS: dark Halloween background, flex layout, toolbar above or beside canvas

- [x] 11. Final checkpoint — Full integration
  - Ensure all tests pass (`vitest --run`), ask the user if questions arise.

---

## Notes

- Tasks marked `*` are optional property/unit tests — skip for a faster MVP, but they validate the core correctness properties.
- Checkpoints at tasks 5, 9, and 11 ensure incremental validation.
- Part B teammates should import only: `onCreatureStep` and `getBeatPhase` from `Scheduler.js`, and `getCellColor` from `Canvas.js`.
- All audio synthesis is in-browser — zero audio files are loaded at any point.
- Run tests with `npx vitest --run` (not watch mode) to avoid blocking the terminal.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["5"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2"] },
    { "id": 9, "tasks": ["6.3", "7.1"] },
    { "id": 10, "tasks": ["7.2"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2"] },
    { "id": 13, "tasks": ["9"] },
    { "id": 14, "tasks": ["10.1", "10.2"] },
    { "id": 15, "tasks": ["10.3"] },
    { "id": 16, "tasks": ["11"] }
  ]
}
```
