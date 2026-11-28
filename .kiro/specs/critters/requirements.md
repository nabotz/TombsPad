# Requirements Document

## Introduction

The Critters system brings TombsPad to life with Halloween-themed creatures that crawl across the painted canvas, triggering musical notes as they move. This feature is the heart of the user experience, transforming static paintings into dynamic musical performances. The system must provide predictable, deterministic movement that allows users to intentionally compose melodies by designing paths through their colored cells.

## Glossary

- **Critter**: A Halloween creature (pumpkin, ghost, bat, or spider) that moves across the grid and triggers notes
- **Grid**: The playing field made up of cells, provided by Part C's shared data model
- **Cell**: A single square on the grid that can be painted with a color or contain special properties
- **Step_Function**: The pure function `step(state) → { state, notes }` that advances all critters one cell per beat
- **Beat**: A unit of musical time controlled by the audio scheduler from Part A
- **Direction**: One of four cardinal directions (up, down, left, right) that a critter faces and moves toward
- **Boundary_Behavior**: How a critter responds when reaching the edge of the grid
- **Special_Cell**: A cell with Halloween-themed properties that modify critter behavior (tombstone, web, candle, portal)
- **Critter_Type**: One of four creatures, each with unique visual appearance and optional unique movement behavior
- **Part_A**: The audio and canvas painting system owned by sendori
- **Part_B**: The critters, movement rules, and design system owned by zenquessence (this spec)
- **Part_C**: The core model, sharing system, and project foundation owned by nabotz

## Requirements

### Requirement 1: Core Movement System

**User Story:** As a user, I want critters to move predictably across the grid, so that I can intentionally design musical sequences by arranging colored cells.

#### Acceptance Criteria

1. WHEN the Step_Function is called, THE Critter_Movement_Engine SHALL advance each critter exactly one cell in its current direction
2. THE Critter_Movement_Engine SHALL execute all movement logic as pure TypeScript in `src/core/critters/` with no Three.js or Web Audio imports
3. FOR ALL valid states, calling Step_Function with identical state parameters SHALL produce identical output state and note events (deterministic behavior)
4. WHEN a critter moves to a new cell, THE Critter_Movement_Engine SHALL generate a note event containing the critter type and cell position
5. THE Critter_Movement_Engine SHALL ensure critters remain within grid bounds at all times

### Requirement 2: Boundary Handling

**User Story:** As a user, I want critters to react sensibly when they reach the edge of the grid, so that my musical patterns continue smoothly without creatures disappearing.

#### Acceptance Criteria

1. WHEN a critter at position (x, y) with direction D would move outside the grid, THE Boundary_Handler SHALL prevent the out-of-bounds movement
2. WHEN a critter reaches the top or bottom edge, THE Boundary_Handler SHALL reverse the critter's vertical direction (up becomes down, down becomes up)
3. WHEN a critter reaches the left or right edge, THE Boundary_Handler SHALL reverse the critter's horizontal direction (left becomes right, right becomes left)
4. WHEN a critter is at a corner and would move out of bounds, THE Boundary_Handler SHALL reverse both direction components if applicable
5. THE Boundary_Handler SHALL execute all logic within the Step_Function to maintain determinism

### Requirement 3: Critter Placement and Configuration

**User Story:** As a user, I want to place critters on the grid and set their starting direction, so that I can control how my musical composition unfolds.

#### Acceptance Criteria

1. THE Critter_Placement_UI SHALL allow users to select one of four critter types (pumpkin, ghost, bat, spider)
2. WHEN a user clicks on a grid cell with a critter type selected, THE Critter_Placement_UI SHALL place that critter at the clicked position
3. THE Critter_Placement_UI SHALL provide a direction selector with four options (up, down, left, right)
4. WHEN a critter is placed, THE System SHALL assign it the currently selected direction
5. THE Critter_Placement_UI SHALL provide a default placement mode that spawns critters from grid edges moving inward
6. WHEN a user attempts to place a critter on an occupied cell, THE System SHALL replace the existing critter with the new one
7. THE Critter_Placement_UI SHALL allow users to remove critters by selecting an eraser tool and clicking on them

### Requirement 4: Visual Representation

**User Story:** As a user, I want to see distinct, visually appealing Halloween creatures moving across the grid, so that the experience is engaging and thematic.

#### Acceptance Criteria

1. THE Creature_Renderer SHALL create four distinct low-poly or procedural 3D models for pumpkin, ghost, bat, and spider
2. THE Creature_Renderer SHALL implement all 3D models using code or with self-created assets under permissive licenses (no restrictive third-party assets)
3. WHEN a critter moves between cells, THE Creature_Renderer SHALL animate the movement smoothly using the time between beats
4. WHEN a critter triggers a note, THE Creature_Renderer SHALL display a visual effect (particle burst, glow pulse, or animation)
5. THE Creature_Renderer SHALL apply consistent art direction with a dark-warm color palette across all creature models
6. THE Creature_Renderer SHALL ensure creatures are visually distinct from one another at a glance

### Requirement 5: Integration with Shared Model

**User Story:** As a developer, I want the critters system to integrate seamlessly with the shared data model from Part C, so that all three parts of the system work together cohesively.

#### Acceptance Criteria

1. THE Critter_Movement_Engine SHALL read grid dimensions from the shared data model provided by Part C
2. THE Critter_Movement_Engine SHALL read and update critter state (type, position, direction) using the data structures defined in `src/core/model/` by Part C
3. WHEN generating note events, THE Critter_Movement_Engine SHALL use the event format defined by Part C
4. THE Critter_Movement_Engine SHALL implement its logic within the Step_Function skeleton provided by Part C on Day 1
5. THE System SHALL wait for Part C to deliver the shared data model before beginning implementation of movement logic

### Requirement 6: Property-Based Testing Support

**User Story:** As a developer, I want the critters system to be testable with property-based tests, so that edge cases and invariants are automatically verified.

#### Acceptance Criteria

1. THE Critter_Movement_Engine SHALL implement movement logic that can be tested using fast-check generators for random states
2. FOR ALL randomly generated valid states, THE Critter_Movement_Engine SHALL ensure that after calling Step_Function, all critters have positions within grid bounds
3. FOR ALL randomly generated valid states, THE Critter_Movement_Engine SHALL produce identical results when Step_Function is called multiple times with the same state
4. THE Critter_Movement_Engine SHALL handle edge cases (empty grid, single-cell grid, all cells occupied) without throwing exceptions
5. THE test suite SHALL include property tests in `tests/core/critters/*.prop.test.ts` that verify the grid bounds and determinism invariants

### Requirement 7: Special Halloween Cells (Stretch Goal - Priority 1)

**User Story:** As a user, I want special cell types that change how critters behave, so that I can create more varied and interesting musical patterns.

#### Acceptance Criteria

1. WHERE the special cells feature is enabled, WHEN a critter moves onto a tombstone cell, THE Critter_Movement_Engine SHALL stop the critter's movement until the tombstone is removed or the critter is manually moved
2. WHERE the special cells feature is enabled, WHEN a critter moves onto a spider web cell, THE Critter_Movement_Engine SHALL reduce the critter's movement speed by half for the next movement step
3. WHERE the special cells feature is enabled, WHEN a critter moves onto a candle cell, THE Critter_Movement_Engine SHALL rotate the critter's direction 90 degrees clockwise
4. WHERE the special cells feature is enabled, WHEN a critter moves onto a portal cell, THE Critter_Movement_Engine SHALL teleport the critter to the paired portal cell's location
5. WHERE the special cells feature is enabled, THE Critter_Placement_UI SHALL provide a palette for placing special cells alongside color painting
6. WHERE the special cells feature is enabled, THE Creature_Renderer SHALL display distinct visual indicators for each special cell type

### Requirement 8: Unique Critter Behaviors (Stretch Goal - Priority 2)

**User Story:** As a user, I want each creature type to have unique movement personality, so that different critters create different musical patterns on the same painting.

#### Acceptance Criteria

1. WHERE unique behaviors are enabled, WHEN a ghost reaches a grid boundary, THE Ghost_Behavior SHALL wrap to the opposite edge instead of bouncing
2. WHERE unique behaviors are enabled, WHEN a bat moves, THE Bat_Behavior SHALL alternate between moving straight and moving diagonally in a zig-zag pattern
3. WHERE unique behaviors are enabled, WHEN a spider moves, THE Spider_Behavior SHALL leave a web trail on previously visited cells that slows down other critters
4. WHERE unique behaviors are enabled, THE Pumpkin_Behavior SHALL maintain the standard bounce behavior as the baseline
5. WHERE unique behaviors are enabled, FOR ALL critter types, THE System SHALL maintain deterministic movement (same state always produces same sequence)

### Requirement 9: Responsive Mobile Support (Stretch Goal - Priority 3)

**User Story:** As a mobile user, I want to place and configure critters on my touchscreen device, so that I can enjoy TombsPad on phones and tablets.

#### Acceptance Criteria

1. WHERE mobile support is enabled, WHEN a user taps a grid cell on a touch device, THE Critter_Placement_UI SHALL place the selected critter at that position
2. WHERE mobile support is enabled, THE Critter_Placement_UI SHALL adapt the critter type and direction selectors to touch-friendly sizes (minimum 44×44 CSS pixels)
3. WHERE mobile support is enabled, THE Creature_Renderer SHALL maintain smooth animation performance at 30fps or higher on mobile devices from the last 3 years
4. WHERE mobile support is enabled, THE Critter_Placement_UI SHALL provide touch gestures for common actions (tap to place, long-press to remove, swipe to change direction)
5. WHERE mobile support is enabled, THE UI layout SHALL adapt to portrait and landscape orientations without clipping critical controls

### Requirement 10: Scene Lighting and Effects

**User Story:** As a user, I want atmospheric lighting and visual effects, so that the Halloween theme feels immersive and polished.

#### Acceptance Criteria

1. THE Scene_Lighting SHALL implement a dark-warm lighting setup that complements the Halloween aesthetic
2. THE Scene_Lighting SHALL apply subtle bloom effect to glowing elements (critters, note triggers, special cells)
3. THE Scene_Lighting SHALL ensure all critters and cells are clearly visible against the background
4. THE Visual_Effects_System SHALL render particle effects when critters trigger notes without causing frame drops below 30fps on target hardware
5. THE Visual_Effects_System SHALL implement effects using Three.js particle systems or shaders in `src/render/creatures/`

