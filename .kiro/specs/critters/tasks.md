# Implementation Plan: Critters

## Overview

This implementation follows a vertical slice approach: build a minimal working system with ghost movement first, then expand to all creatures, placement logic, visual effects, and optional property-based tests. This ensures a functional demo is available early and risk is minimized.

**Day 1**: Vertical slice with ghost movement and required property tests (Tasks 1-8)  
**Day 2**: All creatures, placement logic, visual effects (Tasks 9-19)  
**Day 3**: Optional property tests and stretch goals (Tasks 20-26)

## Tasks

- [ ] 1. Create temporary types until Part C delivers shared model
  - Create `src/core/critters/types.ts` with temporary type definitions
  - Include clear `// TEMP: Replace with shared model from src/core/model/` comments
  - Define: `CritterType`, `Direction`, `Position`, `Critter`, `Cell`, `Grid`, `GameState`, `NoteEvent`, `MovementResult`, `PlacementResult`
  - **BLOCKER**: Wait for Part C to deliver shared model in `src/core/model/` on Day 1, then replace these types with imports from the shared model
  - _Requirements: 1.7, 5.6_

- [ ] 2. Implement ghost-only movement logic with boundary handling
  - Create `src/core/critters/movement.ts` with core movement functions
  - Implement `moveCritters(state: GameState): MovementResult` for ghost type only
  - Implement `getNextPosition(critter, gridSize)` to calculate next position
  - Implement `handleBoundaryCollision(position, direction, gridSize)` for edge bouncing
  - Use only pure TypeScript (no Three.js, Web Audio, DOM, Math.random(), Date, setTimeout, setInterval)
  - Generate note events when critter lands on colored cells
  - Ensure deterministic behavior (same input always produces same output)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Write unit tests for ghost movement
  - Create `tests/core/critters/movement.test.ts`
  - Test forward movement in all four directions
  - Test boundary bouncing at all four edges
  - Test corner behavior (only one direction component reverses)
  - Test note event generation on colored cells
  - Test empty grid (no note events)
  - Test single-cell grid (critter bounces in place)
  - Test overlapping critters (should be allowed)
  - _Requirements: 1.3, 2.1, 2.2, 2.3_

- [ ] 4. Write property test for grid bounds invariant
  - Create `tests/core/critters/movement.prop.test.ts`
  - Install fast-check library if not present
  - Create arbitrary generators for GameState (grid, critters)
  - **Property 1: Grid Bounds Invariant**
  - **Validates: Requirements 1.5, 2.1**
  - Property: For all valid game states, after moveCritters(), all critter positions satisfy 0 ≤ x < grid.width and 0 ≤ y < grid.height
  - Run 100 iterations with random states
  - _Requirements: 6.2_

- [ ] 5. Write property test for deterministic movement
  - Add to `tests/core/critters/movement.prop.test.ts`
  - **Property 2: Deterministic Movement**
  - **Validates: Requirements 1.3**
  - Property: For all valid game states S, calling moveCritters(S) multiple times produces identical next state and note events
  - Run 100 iterations with random states
  - _Requirements: 6.3_

- [ ] 6. Create ghost 3D model
  - Create `src/render/creatures/models/ghost.ts`
  - Implement `createGhost(): THREE.Group` using procedural geometry
  - Use SphereGeometry for body with transparent white material
  - Add dark box geometry for eyes
  - Add vertical bob animation in `userData.animate` function
  - Follow dark-warm color palette (white/gray ghost, dark eyes)
  - _Requirements: 4.1, 4.2, 4.3, 4.6_

- [ ] 7. Implement basic CreatureRenderer for ghost only
  - Create `src/render/creatures/CreatureRenderer.ts` with class structure
  - Implement constructor that accepts Three.js scene and grid size
  - Implement `update(state: GameState)` to sync meshes with state
  - Implement `interpolate(beatProgress: number)` for smooth movement animation
  - Implement mesh lifecycle (add new critters, remove deleted ones)
  - Convert grid coordinates to world coordinates
  - Apply smooth easing to movement interpolation
  - Support ghost type only in this task
  - _Requirements: 4.4, 5.1, 5.2_

- [ ] 8. Checkpoint - Vertical slice integration
  - Verify ghost appears on grid and moves per beat
  - Verify boundary bouncing works at all edges
  - Verify note events are generated on colored cells
  - Verify grid bounds and determinism property tests pass
  - Test with Part C's Step_Function if available
  - Ensure no console errors, 30+ fps with single ghost
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create pumpkin 3D model
  - Create `src/render/creatures/models/pumpkin.ts`
  - Implement `createPumpkin(): THREE.Group` using procedural geometry
  - Use flattened SphereGeometry for body with orange material
  - Add CylinderGeometry for green stem
  - Add cone geometry for triangle eyes and mouth
  - Follow dark-warm color palette (orange body, green stem, black features)
  - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

- [ ] 10. Create bat 3D model
  - Create `src/render/creatures/models/bat.ts`
  - Implement `createBat(): THREE.Group` using procedural geometry
  - Use ConeGeometry for body with dark gray material
  - Add BoxGeometry for wings
  - Add wing-flapping animation in `userData.animate` function
  - Follow dark-warm color palette (dark gray body and wings)
  - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

- [ ] 11. Create spider 3D model
  - Create `src/render/creatures/models/spider.ts`
  - Implement `createSpider(): THREE.Group` using procedural geometry
  - Use SphereGeometry for body with black material
  - Add 8 CylinderGeometry legs arranged radially
  - Follow dark-warm color palette (black body and legs)
  - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

- [ ] 12. Create creature model factory and update renderer for all types
  - Create `src/render/creatures/models/index.ts` with factory function
  - Implement `createCreatureModel(type: CritterType): THREE.Group`
  - Add switch statement for all four creature types (ghost, pumpkin, bat, spider)
  - Update `CreatureRenderer.ts` to support all four creature types
  - Verify all creatures are visually distinct and recognizable
  - _Requirements: 4.1, 4.7_

- [ ] 13. Implement critter placement and removal logic
  - Create `src/core/critters/placement.ts` with pure functions
  - Implement `placeCritter(state, position, type, direction): PlacementResult`
  - Implement `removeCritter(state, position): PlacementResult`
  - Implement `isValidPlacement(position, gridSize): boolean`
  - Implement `isValidDirection(direction): direction is Direction`
  - Validate position is within grid bounds
  - Validate direction is one of four valid values
  - Replace existing critter if position is occupied
  - Return success=false with error message for invalid inputs
  - Use only pure TypeScript (no DOM, UI, side effects)
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 14. Write unit tests for placement logic
  - Create `tests/core/critters/placement.test.ts`
  - Test adding critter to empty cell
  - Test replacing existing critter at same position
  - Test removing critter from occupied cell
  - Test invalid position (out of bounds) returns error
  - Test invalid direction string returns error
  - Test removing from empty cell returns error
  - Verify state remains unchanged on error
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 15. Integrate placement logic with Cell_Clicked_Event
  - Connect placement functions to Part A's Cell_Clicked_Event from pointer/raycast system
  - Handle add mode: call `placeCritter()` with selected type and direction
  - Handle remove mode: call `removeCritter()` at clicked position
  - Update game state based on placement result
  - **Dependency**: Requires Part A to expose Cell_Clicked_Event from `src/render/scene/`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 16. Implement particle system for note triggers
  - Create `src/render/creatures/particles.ts` with ParticleSystem class
  - Implement `constructor(scene: THREE.Scene)`
  - Implement `trigger(position, color, critterType)` to spawn particle burst
  - Implement `update(deltaTime)` to animate particles (burst outward/upward, then fall and fade)
  - Use 10-20 particles per burst, 500ms lifetime
  - Cap total particles at 1000 (remove oldest first)
  - Connect to `CreatureRenderer.triggerNoteEffect()` method
  - _Requirements: 4.5, 7.4_

- [ ] 17. Implement scene lighting setup
  - Create `src/render/effects/lighting.ts` with lighting functions
  - Implement `setupLighting(scene: THREE.Scene): LightingSetup`
  - Add low amber ambient light (0x402010, intensity 0.3)
  - Add warm directional light (0xff9944, intensity 0.6)
  - Add optional point light for highlights
  - Implement `dispose()` cleanup method
  - **Dependency**: Get scene object from Part A's getter function (e.g., `getSceneContext()`)
  - _Requirements: 7.1, 7.3, 7.6_

- [ ] 18. Implement bloom post-processing
  - Create `src/render/effects/bloom.ts` with bloom setup functions
  - Implement `setupBloom(renderer, scene, camera): BloomSetup`
  - Use THREE.EffectComposer and THREE.UnrealBloomPass
  - Apply subtle bloom to glowing elements (critters, note triggers)
  - Implement `render()` method for composer
  - Implement `dispose()` cleanup method
  - **Dependency**: Get renderer, scene, camera from Part A's getter function
  - _Requirements: 7.2, 7.5, 7.6_

- [ ] 19. Checkpoint - Core feature complete
  - Verify all 4 creatures visible and distinguishable
  - Verify movement synchronized with beats
  - Verify placement and removal work via UI
  - Verify particle effects trigger on note events
  - Verify lighting creates Halloween atmosphere
  - Verify bloom effect enhances visual appeal
  - Test performance: 30+ fps with 20 critters
  - Ensure no console errors
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 20. Write property test for boundary behavior
  - Add to `tests/core/critters/movement.prop.test.ts`
  - **Property 3: Boundary Direction Reversal**
  - **Validates: Requirements 2.2, 2.3**
  - Property: For all critters at a grid boundary facing outward, after moveCritters(), the critter's direction is reversed for the component that hit the edge
  - Run 100 iterations with random boundary states
  - _Requirements: 6.2_

- [ ]* 21. Write property test for note event generation
  - Add to `tests/core/critters/movement.prop.test.ts`
  - **Property 4: Note Event Generation**
  - **Validates: Requirements 1.4**
  - Property: For all states where a critter moves onto a cell with non-null color, moveCritters() generates a note event with that critter's type and cell position
  - Run 100 iterations with random colored grids
  - _Requirements: 6.2_

- [ ]* 22. Write property tests for placement logic
  - Create `tests/core/critters/placement.prop.test.ts`
  - **Property 5: Placement Adds Critter**
  - **Validates: Requirements 3.2**
  - Property: For all valid positions, types, and directions, placeCritter() results in a critter at that position with specified properties
  - **Property 6: Placement Replaces Existing Critter**
  - **Validates: Requirements 3.3**
  - Property: For all states with existing critter at position P, placeCritter() at P results in exactly one critter at P with new properties
  - **Property 7: Removal Deletes Critter**
  - **Validates: Requirements 3.4**
  - Property: For all states with critter at P, removeCritter(P) results in no critter at P and count decreased by one
  - **Property 8: Invalid Input Rejection**
  - **Validates: Requirements 3.5, 3.6**
  - Property: For all invalid positions or directions, placeCritter() returns success=false and state unchanged
  - Run 100 iterations per property
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 23. Implement special Halloween cells (Stretch Goal)
  - Add special cell types to game state: 'tombstone', 'web', 'candle', 'portal'
  - Update movement logic to handle tombstone (stop movement)
  - Update movement logic to handle spider web (move every other beat using counter)
  - Update movement logic to handle candle (rotate direction 90° clockwise)
  - Update movement logic to handle portal (teleport to paired portal)
  - Add placement functions for special cells
  - Add visual indicators in CreatureRenderer for each special cell type
  - Maintain deterministic behavior (use counters, not randomness)
  - Write unit tests for each special cell behavior
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ]* 24. Implement unique critter behaviors (Stretch Goal)
  - Update movement logic for ghost: wrap to opposite edge instead of bounce
  - Update movement logic for bat: zigzag pattern (forward, sideways-left, forward, sideways-right) using counter
  - Update movement logic for spider: leave web trail on visited cells
  - Keep pumpkin with standard bounce behavior
  - Use counters in critter state for zigzag and trail tracking
  - Maintain deterministic behavior (same state produces same sequence)
  - Write unit tests for each unique behavior
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 25. Write property tests for unique behaviors (Stretch Goal)
  - Create `tests/core/critters/unique-behaviors.prop.test.ts`
  - Property: Ghost wrap maintains grid bounds
  - Property: Bat zigzag pattern is deterministic (same counter produces same moves)
  - Property: Spider web trails are deterministic (same state produces same trails)
  - Run 100 iterations per property
  - _Requirements: 9.5, 6.6_

- [ ] 26. Final checkpoint and polish
  - Run full test suite (unit tests + property tests if implemented)
  - Verify required property tests pass: grid bounds invariant and determinism (100 iterations each)
  - Verify optional property tests pass if implemented
  - Performance test: 30+ fps with 20 critters
  - Visual QA: all creatures distinct, lighting atmospheric, effects polished
  - Integration test with Parts A and C
  - Fix any remaining bugs or console errors
  - Update temporary types with final shared model from Part C
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- **Tasks 4 and 5 (grid bounds and determinism property tests) are REQUIRED** and positioned early to validate core correctness
- Tasks 1-19 form the core 3-day implementation scope
- Tasks 20-22 are optional property-based tests (additional coverage beyond required tests)
- Tasks 23-25 are stretch goals (Phase 2 features)
- Each task references specific requirements for traceability
- Checkpoints (8, 19, 26) ensure incremental validation and stakeholder visibility
- **CRITICAL BLOCKER**: Task 1 cannot complete until Part C delivers shared model on Day 1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4", "5"] },
    { "id": 4, "tasks": ["6"] },
    { "id": 5, "tasks": ["7"] },
    { "id": 6, "tasks": ["8"] },
    { "id": 7, "tasks": ["9", "10", "11"] },
    { "id": 8, "tasks": ["12"] },
    { "id": 9, "tasks": ["13"] },
    { "id": 10, "tasks": ["14", "15", "16"] },
    { "id": 11, "tasks": ["17", "18"] },
    { "id": 12, "tasks": ["19"] },
    { "id": 13, "tasks": ["20", "21", "22"] },
    { "id": 14, "tasks": ["23", "24"] },
    { "id": 15, "tasks": ["25"] },
    { "id": 16, "tasks": ["26"] }
  ]
}
```
