# Requirements Document

## Introduction

The Critters system brings TombsPad to life with Halloween-themed creatures that crawl across the painted canvas, triggering musical notes as they move. This feature is the heart of the user experience, transforming static paintings into dynamic musical performances. The system must provide predictable, deterministic movement that allows users to intentionally compose melodies by designing paths through their colored cells.

design.md is too long for a 3-day build. Trim it to what the MVP
needs: remove duplicated explanations, keep module APIs, data shapes,
algorithms and the testing strategy. Keep stretch goals brief. Edit
only .kiro/specs/critters/design.md.**Note:** This spec covers movement rules, creatures, visual effects, and placement logic. UI controls (toolbar, palette, play/pause, tempo, scale picker, share button, start screen, onboarding, critter type picker, direction selector, special cell palette) are covered in a separate spec: ui-onboarding (also owned by B/zenquessence).

## Glossary

- **Critter**: A Halloween creature (pumpkin, ghost, bat, or spider) that moves across the grid and triggers notes
- **Grid**: The playing field made up of cells, provided by Part C's shared data model
- **Cell**: A single square on the grid that can be painted with a color or contain special properties
- **Step_Function**: The pure function `step(state) → { state, notes }` in `src/core/model/` (owned by Part C) that calls Part B's movement rules once per beat
- **Beat**: A unit of musical time controlled by the audio scheduler from Part A
- **Direction**: One of four cardinal directions (up, down, left, right) that a critter faces and moves toward (no diagonal directions)
- **Boundary_Behavior**: How a critter responds when reaching the edge of the grid
- **Part_B**: The critters, movement rules, creature rendering, lighting and post-processing in src/render/effects/ owned by zenquessence (this spec)rtal)
- **Critter_Type**: One of four creatures, each with unique visual appearance and optional unique movement behavior
- **Part_A**: The audio engine, canvas painting and pointer/raycast system in src/render/scene/, and scale/tempo functions owned by sendori
- **Part_B**: The critters, movement rules, creature rendering, and visual effects owned by zenquessence (this spec)
- **Part_C**: The core model, Step_Function skeleton, sharing system, and project foundation owned by nabotz
- **Critter_Placement_Logic**: The pure functions that validate and modify state when placing or removing critters (owned by Part B, included in this spec)
- **Cell_Clicked_Event**: An event from Part A's pointer/raycast system containing grid coordinates (x, y) when a user clicks a cell

## Requirements

### Requirement 1: Core Movement System

**User Story:** As a user, I want critters to move predictably across the grid in straight lines, so that I can intentionally design musical sequences by arranging colored cells.

#### Acceptance Criteria

1. WHEN a critter moves, THE Movement_Rules SHALL advance the critter exactly one cell in its current direction
2. THE Movement_Rules SHALL be implemented as pure TypeScript in `src/core/critters/` with no Three.js, Web Audio, DOM, Math.random(), Date, setTimeout, or setInterval
3. FOR ALL valid states, calling the movement logic with identical state parameters SHALL produce identical output state and note events (deterministic behavior)
4. WHEN a critter moves to a new cell, THE Movement_Rules SHALL generate a note event containing the critter type and cell position
5. THE Movement_Rules SHALL ensure critters remain within grid bounds at all times
6. THE Movement_Rules SHALL be called by the Step_Function from Part C once per beat
7. UNTIL Part C delivers the shared data model, THE Movement_Rules MAY use temporary local types clearly marked with comments like `// TEMP: Replace with shared model from src/core/model/`

### Requirement 2: Boundary Handling

**User Story:** As a user, I want critters to bounce at grid edges, so that my musical patterns continue smoothly without creatures disappearing.

#### Acceptance Criteria

1. WHEN a critter at position (x, y) with direction D would move outside the grid, THE Boundary_Handler SHALL prevent the out-of-bounds movement
2. WHEN a critter reaches a vertical edge (left or right), THE Boundary_Handler SHALL reverse the critter's horizontal direction component (left becomes right, right becomes left)
3. WHEN a critter reaches a horizontal edge (top or bottom), THE Boundary_Handler SHALL reverse the critter's vertical direction component (up becomes down, down becomes up)
4. WHEN a critter is at a corner, THE Boundary_Handler SHALL reverse only the one direction component that hit the edge (not both components)
5. THE Boundary_Handler SHALL execute all logic as pure TypeScript with no randomness or side effects

### Requirement 3: Critter Placement Logic

**User Story:** As a user, I want to place and remove critters on the grid with specific starting directions, so that I can control how my musical composition unfolds.

#### Acceptance Criteria

1. WHEN Part A's pointer/raycast system emits a Cell_Clicked_Event with coordinates (x, y), THE Critter_Placement_Logic SHALL receive the event
2. WHEN a Cell_Clicked_Event is received with a selected critter type and direction, THE Critter_Placement_Logic SHALL add a critter of that type at position (x, y) with the specified direction to the game state
3. WHEN a Cell_Clicked_Event is received for a cell already occupied by a critter, THE Critter_Placement_Logic SHALL replace the existing critter with the new critter type and direction
4. WHEN a Cell_Clicked_Event is received in critter removal mode, THE Critter_Placement_Logic SHALL remove the critter at position (x, y) from the game state
5. THE Critter_Placement_Logic SHALL validate that position (x, y) is within grid bounds before adding or removing a critter
6. THE Critter_Placement_Logic SHALL validate that the direction is one of four valid values (up, down, left, right) before adding a critter

**Note:** Visual controls for critter type selection and direction selection are owned by the ui-onboarding spec. This spec covers only the placement logic (state validation and modification).

**Dependency:** Part A provides the Cell_Clicked_Event from the pointer/raycast system in `src/render/scene/`. Part B consumes this event to execute placement logic.

### Requirement 4: Visual Representation

**User Story:** As a user, I want to see distinct, visually appealing Halloween creatures moving across the grid, so that the experience is engaging and thematic.

#### Acceptance Criteria

1. THE Creature_Renderer SHALL create four distinct procedural 3D models for pumpkin, ghost, bat, and spider using Three.js geometry primitives (BoxGeometry, SphereGeometry, CylinderGeometry, etc.)
2. THE Creature_Renderer SHALL NOT use external model files or restrictive third-party assets
3. THE Creature_Renderer SHALL NOT use SimTunes or Maxis names, art, or sounds
4. WHEN a critter moves between cells, THE Creature_Renderer SHALL interpolate the movement smoothly using the time between beats without advancing game state
5. WHEN a note event is received, THE Creature_Renderer SHALL display a visual effect (particle burst, glow pulse, or animation) driven by that event
6. THE Creature_Renderer SHALL apply consistent art direction with a dark-warm color palette across all creature models
7. THE Creature_Renderer SHALL ensure creatures are visually distinct from one another at a glance

### Requirement 5: Integration with Shared Model

**User Story:** As a developer, I want the critters system to integrate seamlessly with the shared data model from Part C, so that all three parts of the system work together cohesively.

#### Acceptance Criteria

1. THE Movement_Rules SHALL read grid dimensions from the shared data model provided by Part C
2. THE Movement_Rules SHALL read and update critter state (type, position, direction) using the data structures defined in `src/core/model/` by Part C
3. WHEN generating note events, THE Movement_Rules SHALL use the event format defined by Part C
4. THE Movement_Rules SHALL be called by the Step_Function in `src/core/model/` (owned by Part C)
5. THE System SHALL wait for Part C to deliver the shared data model on Day 1 before beginning implementation of movement logic
6. UNTIL the shared model is delivered, THE Movement_Rules MAY define temporary types in `src/core/critters/` with clear comments marking them for replacement

### Requirement 6: Property-Based Testing Support

**User Story:** As a developer, I want the critters system to be testable with property-based tests, so that edge cases and invariants are automatically verified.

#### Acceptance Criteria

1. THE Movement_Rules SHALL implement movement logic that can be tested using fast-check generators for random states
2. FOR ALL randomly generated valid states, after calling the movement logic, all critters SHALL have positions (x, y) where 0 ≤ x < grid.width and 0 ≤ y < grid.height
3. FOR ALL randomly generated valid states S, calling the movement logic with S SHALL produce identical next state S' and identical note events every time (determinism property)
4. THE Movement_Rules SHALL handle edge cases (empty grid, single-cell grid, all cells occupied, critters at boundaries) without throwing exceptions
5. THE test suite SHALL include property tests in `tests/core/critters/*.prop.test.ts` that verify the grid bounds invariant and determinism property
6. WHERE the Movement_Rules use seeded pseudo-random generation (stretch goals only), FOR ALL seeds, the same seed SHALL produce the same sequence of states

### Requirement 7: Scene Lighting and Effects

**User Story:** As a user, I want atmospheric lighting and visual effects, so that the Halloween theme feels immersive and polished.

#### Acceptance Criteria

1. THE Scene_Lighting SHALL implement a dark-warm lighting setup that complements the Halloween aesthetic
2. THE Scene_Lighting SHALL apply subtle bloom effect to glowing elements (critters, note triggers, special cells)
3. THE Scene_Lighting SHALL ensure all critters and cells are clearly visible against the background
4. THE Visual_Effects_System SHALL render particle effects when note events are received without causing frame drops below 30fps on target hardware
5. THE Visual_Effects_System SHALL implement effects using Three.js particle systems or shaders
6. THE Scene_Lighting and post-processing effects SHALL be implemented in `src/render/effects/` (owned by Part B)
7. THE particle effects for creature note triggers SHALL be implemented in `src/render/creatures/` alongside creature models

### Requirement 8: Special Halloween Cells (Stretch Goal - Priority 1)

**User Story:** As a user, I want special cell types that change how critters behave, so that I can create more varied and interesting musical patterns.

#### Acceptance Criteria

1. WHERE the special cells feature is enabled, WHEN a critter moves onto a tombstone cell, THE Movement_Rules SHALL stop the critter's movement until the tombstone is removed or the critter is manually relocated
2. WHERE the special cells feature is enabled, WHEN a critter moves onto a spider web cell, THE Movement_Rules SHALL mark the critter as slowed and skip that critter's movement every other beat (counter stored in critter state)
3. WHERE the special cells feature is enabled, WHEN a critter moves onto a candle cell, THE Movement_Rules SHALL rotate the critter's direction 90 degrees clockwise
4. WHERE the special cells feature is enabled, WHEN a critter moves onto a portal cell, THE Movement_Rules SHALL teleport the critter to the paired portal cell's location
5. WHERE the special cells feature is enabled, THE System SHALL provide placement logic for adding and removing special cells from grid state
6. WHERE the special cells feature is enabled, THE Creature_Renderer SHALL display distinct visual indicators for each special cell type
7. WHERE the special cells feature is enabled, THE Movement_Rules SHALL maintain deterministic behavior (same state produces same next state)

**Note:** Visual controls for special cell placement (palette UI) are owned by the ui-onboarding spec. This spec covers the placement logic and visual rendering.

### Requirement 9: Unique Critter Behaviors (Stretch Goal - Priority 2)

**User Story:** As a user, I want each creature type to have unique movement personality, so that different critters create different musical patterns on the same painting.

#### Acceptance Criteria

1. WHERE unique behaviors are enabled, WHEN a ghost reaches a grid boundary, THE Ghost_Behavior SHALL wrap to the opposite edge instead of bouncing
2. WHERE unique behaviors are enabled, WHEN a bat moves, THE Bat_Behavior SHALL alternate between moving one cell forward and moving one cell sideways (alternating left then right), using only cardinal directions (counter stored in bat state)
3. WHERE unique behaviors are enabled, WHEN a spider moves, THE Spider_Behavior SHALL leave a web trail on previously visited cells that slows down other critters
4. WHERE unique behaviors are enabled, THE Pumpkin_Behavior SHALL maintain the standard bounce behavior as the baseline
5. WHERE unique behaviors are enabled, FOR ALL critter types, THE Movement_Rules SHALL maintain deterministic movement (same state always produces same sequence)
6. WHERE unique behaviors use seeded randomness, THE seed SHALL be stored in state and produce identical sequences for identical seeds

---

## Dependency Notes

**Critter_Placement_Logic Implementation**: The Critter_Placement_Logic SHALL be implemented as pure TypeScript functions in src/core/critters/ with no DOM, UI, or side effects. These functions SHALL be callable from UI event handlers (owned by ui-onboarding spec) or from automated tests.

**Cell_Clicked_Event from Part A**: The Critter_Placement_Logic depends on Part A's pointer/raycast system in `src/render/scene/` to provide Cell_Clicked_Event with grid coordinates (x, y) when a user clicks a cell. Part A owns the raycast and pointer handling; Part B owns the placement logic that responds to these events.

**Scene Access for Effects**: Part A's code in `src/render/scene/` SHALL expose the Three.js renderer, camera, and scene objects to Part B through a getter function (e.g., `getSceneContext()`). Part B's effects code in `src/render/effects/` SHALL consume these objects for lighting and post-processing setup but MUST NOT modify `src/render/scene/` files. Part A owns scene initialization; Part B owns effects that operate on that scene.

**Day 1 blocker**: Movement implementation cannot begin until Part C delivers the shared data model in `src/core/model/`. Temporary types may be used in the interim with clear comments marking them for replacement.

