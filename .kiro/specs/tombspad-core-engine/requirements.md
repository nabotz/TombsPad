# Requirements Document

## Introduction

TombsPad is a browser-based musical painting toy for the Kiroween 2026 hackathon. Users paint colored cells on a 3D grid canvas; Halloween-themed creatures from Part B crawl over those cells and trigger musical notes locked to a spooky scale. Part A (this document) specifies the Core Engine: the 3D canvas, Web Audio synthesis, musical scale system, creature-driven note scheduler, and share-link serialization. All audio is synthesized entirely in-browser — no audio files are loaded. The architecture is modular (Canvas, AudioEngine, Scheduler, ShareLink) with a well-defined JavaScript API so Part B creatures can trigger notes without coupling to audio internals.

---

## Glossary

- **Canvas**: The Three.js scene containing the 16×16 grid of paintable cells.
- **Cell**: One square unit of the grid. Identified by a zero-based `(col, row)` pair. Stores a color index or `null` (unpainted).
- **CellId**: A string key `"col,row"` uniquely identifying a cell (e.g. `"3,7"`).
- **AudioEngine**: The Web Audio API module responsible for synthesizing notes from oscillators, filters, and envelopes, with a reverb effect.
- **Scheduler**: The module that quantizes creature-triggered notes to the current beat grid and enforces per-cell mute and master volume.
- **ScaleSystem**: The module that maps color indices to MIDI note numbers using a fixed musical scale.
- **ShareLink**: The module that serializes and deserializes canvas state to/from a URL hash string using LZ-string compression.
- **ColorIndex**: An integer 0–7 representing one of eight paintable colors.
- **ScaleDegree**: A position (0–7) within the selected musical scale (pentatonic minor or harmonic minor).
- **MIDINote**: An integer MIDI note number (0–127) representing an absolute pitch.
- **BPM**: Beats per minute — the tempo of the scheduler's beat grid.
- **Impulse Response**: A short audio buffer synthesized programmatically to emulate reverb without loading any audio files.
- **LZ-string**: A JavaScript compression library (lz-string) that produces URL-safe base64 output.
- **UndoStack**: A LIFO stack of canvas state snapshots used to reverse paint/erase actions.
- **Layer**: Each cell holds one color at a time (single-layer color storage per cell).
- **Part B**: The teammate module responsible for creature visuals and locomotion. It calls the Part A JS API to trigger notes.

---

## Requirements

### Requirement 1: 3D Canvas Rendering

**User Story:** As a user, I want to see and interact with a 3D grid canvas, so that I can paint colored cells and create musical patterns.

#### Acceptance Criteria

1. THE Canvas SHALL initialize a Three.js scene containing a flat 16×16 grid of square cells rendered on a plane.
2. THE Canvas SHALL map each cell to a unique CellId string of the form `"col,row"` where col and row are integers in [0, 15].
3. WHEN the user clicks or drags a pointer over a cell, THE Canvas SHALL paint that cell with the currently selected ColorIndex and store that ColorIndex in the cell's state.
4. WHEN the eraser tool is active and the user clicks or drags over a cell, THE Canvas SHALL clear that cell's ColorIndex to `null` and update the cell's visual to its unpainted appearance.
5. THE Canvas SHALL use raycasting against the Three.js scene to convert pointer screen coordinates to the correct cell for every click and drag event.
6. WHEN the user performs a paint or erase action, THE Canvas SHALL push the previous cell state onto the UndoStack before applying the change.
7. THE UndoStack SHALL retain at least the last 10 paint/erase actions, discarding older entries when the stack exceeds 10.
8. WHEN the user triggers an undo action, THE Canvas SHALL pop the most recent entry from the UndoStack and restore the affected cell to its previous state.
9. IF the UndoStack is empty when undo is triggered, THEN THE Canvas SHALL take no action and produce no error.
10. THE Canvas SHALL store one ColorIndex (or `null`) per cell — multi-cell layers are out of scope; each cell holds exactly one color at a time.

---

### Requirement 2: Web Audio Synthesis Engine

**User Story:** As a user, I want to hear synthesized Halloween-themed sounds when notes are triggered, so that the painting feels musical and atmospheric.

#### Acceptance Criteria

1. THE AudioEngine SHALL synthesize all audio using the Web Audio API with no audio files loaded from disk or network.
2. THE AudioEngine SHALL produce each note using an OscillatorNode connected to a BiquadFilterNode (low-pass filter), then to a GainNode (envelope), then to the master output.
3. THE AudioEngine SHALL apply an ADSR envelope (attack, decay, sustain, release) to the GainNode of each triggered note.
4. THE AudioEngine SHALL apply a reverb effect by routing audio through a ConvolverNode whose impulse response buffer is generated programmatically in JavaScript at engine startup — no impulse-response audio files are loaded.
5. WHEN `AudioEngine.triggerNote(cellId)` is called, THE AudioEngine SHALL look up the ColorIndex stored for that CellId, derive the MIDINote via the ScaleSystem, and synthesize a note at that pitch.
6. WHEN `AudioEngine.triggerNote(cellId)` is called for a cell with ColorIndex `null`, THE AudioEngine SHALL produce no sound and return without error.
7. THE AudioEngine SHALL expose a `setMasterVolume(value)` method accepting a float in [0.0, 1.0] that scales the master GainNode.
8. IF `setMasterVolume` is called with a value outside [0.0, 1.0], THEN THE AudioEngine SHALL clamp the value to the nearest bound without throwing.
9. THE AudioEngine SHALL initialize the AudioContext lazily on the first user gesture to comply with browser autoplay policy.

---

### Requirement 3: Musical Scale System

**User Story:** As a user, I want painted colors to map deterministically to pitched notes in a spooky scale, so that any painting sounds musical.

#### Acceptance Criteria

1. THE ScaleSystem SHALL use exactly one musical scale, selectable at build time from either pentatonic minor or harmonic minor.
2. THE ScaleSystem SHALL map each ColorIndex (0–7) to exactly one ScaleDegree and therefore to exactly one MIDINote.
3. THE ScaleSystem SHALL produce MIDINote values in the range [21, 108] (standard piano range).
4. WHEN `ScaleSystem.colorToNote(colorIndex)` is called with an integer in [0, 7], THE ScaleSystem SHALL return the same MIDINote value on every call (deterministic mapping).
5. IF `ScaleSystem.colorToNote(colorIndex)` is called with a value outside [0, 7], THEN THE ScaleSystem SHALL return `null` without throwing.
6. THE ScaleSystem SHALL assign higher MIDINote values to higher ColorIndex values (monotonically non-decreasing mapping across the 8 colors), so the painting has an intuitive low-to-high register layout.
7. THE ScaleSystem SHALL expose a `getScaleName()` method returning the string name of the active scale (e.g. `"pentatonic_minor"` or `"harmonic_minor"`).

---

### Requirement 4: Creature-to-Note Scheduler

**User Story:** As a Part B developer, I want a clean API to trigger notes when a creature steps on a cell, so that creature movement and audio stay synchronized.

#### Acceptance Criteria

1. THE Scheduler SHALL expose a `Scheduler.onCreatureStep(cellId)` method as the primary API for Part B to call when a creature steps on a cell.
2. WHEN `Scheduler.onCreatureStep(cellId)` is called, THE Scheduler SHALL schedule `AudioEngine.triggerNote(cellId)` to fire at the start of the next quantized beat boundary.
3. THE Scheduler SHALL maintain an internal beat clock driven by `AudioContext.currentTime` and the current BPM value.
4. THE Scheduler SHALL expose a `setBPM(value)` method accepting an integer or float in [20, 300] that updates the beat interval without interrupting currently scheduled notes.
5. IF `setBPM(value)` is called with a value outside [20, 300], THEN THE Scheduler SHALL clamp the value to the nearest bound without throwing.
6. THE Scheduler SHALL maintain a per-cell mute map. WHEN a cell is muted, THE Scheduler SHALL suppress note scheduling for that CellId regardless of creature steps.
7. THE Scheduler SHALL expose `Scheduler.muteCell(cellId)` and `Scheduler.unmuteCell(cellId)` to toggle per-cell mute state.
8. WHEN `Scheduler.onCreatureStep(cellId)` is called for a muted cell, THE Scheduler SHALL discard the event silently without producing audio.
9. THE Scheduler SHALL expose a `Scheduler.getBeatPhase()` method returning the fractional position within the current beat (a float in [0.0, 1.0)) so Part B can animate creatures in sync.

---

### Requirement 5: Share Link Serialization

**User Story:** As a user, I want to share my canvas painting via a URL, so that others can open the exact same composition in their browser.

#### Acceptance Criteria

1. THE ShareLink module SHALL serialize the full canvas state (all 256 cells' ColorIndex values, `null` for unpainted cells) into a URL-safe string using LZ-string compression followed by base64 encoding.
2. THE ShareLink module SHALL store the serialized string in the browser's URL hash (`window.location.hash`) when `ShareLink.encode(canvasState)` is called.
3. WHEN the page loads and `window.location.hash` is non-empty, THE ShareLink module SHALL call `ShareLink.decode(hash)` to deserialize the canvas state and restore all 256 cells before the first render frame.
4. WHEN `ShareLink.decode(hash)` is called with a valid encoded hash, THE ShareLink module SHALL return a canvas state object that is structurally identical to the one that was originally encoded (round-trip fidelity).
5. IF `ShareLink.decode(hash)` is called with a malformed or corrupted hash, THEN THE ShareLink module SHALL return `null` and log a console warning without throwing.
6. THE ShareLink module SHALL include an optional `seed` integer field in the serialized state, allowing Part B to store a creature spawn seed in the same URL hash.
7. THE ShareLink module SHALL produce encoded strings that are valid URL hash values without requiring percent-encoding of special characters (using LZ-string's `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`).
8. THE ShareLink module SHALL expose `ShareLink.encode(canvasState)` and `ShareLink.decode(hashString)` as its complete public API.
