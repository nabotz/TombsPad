# Design Document: Critters

## Overview

Critters move across the painted grid on each beat, triggering musical notes when they land on colored cells. Pure game logic lives in `src/core/critters/`, rendering in `src/render/creatures/`.

## Architecture

### Module Organization

```
src/core/critters/
  movement.ts           # Pure movement logic
  placement.ts          # Critter add/remove logic
  types.ts              # TEMP types until Part C delivers model
  
src/render/creatures/
  CreatureRenderer.ts   # Main renderer class
  models/
    index.ts            # Factory: createCreatureModel(type)
    ghost.ts, pumpkin.ts, bat.ts, spider.ts
  particles.ts          # Particle system for note triggers
  animations.ts         # Creature animation helpers
    
src/render/effects/
  lighting.ts           # Scene lighting setup
  bloom.ts              # Bloom post-processing
  
tests/core/critters/
  movement.test.ts, movement.prop.test.ts, placement.test.ts
```

## Components and Interfaces

### 1. Core Movement System (`src/core/critters/movement.ts`)

**Responsibility**: Pure, deterministic critter movement logic.

**Public API**:
```typescript
export function moveCritters(state: GameState): MovementResult
export function getNextPosition(critter: Critter, gridSize: { width: number; height: number }): 
  { position: Position; direction: Direction; hitBoundary: boolean }
export function handleBoundaryCollision(position: Position, direction: Direction, gridSize: { width: number; height: number }): Direction
```

**Algorithm: moveCritters()**
```
function moveCritters(state):
  nextCritters = []
  noteEvents = []
  
  for each critter in state.critters:
    # Calculate next position based on direction
    nextPos = calculateNextPosition(critter.position, critter.direction)
    
    # Check boundary collision
    if nextPos is out of bounds:
      # Reverse the direction component that hit the edge
      newDirection = handleBoundaryCollision(
        nextPos,
        critter.direction,
        state.grid.size
      )
      # Keep position inside bounds
      nextPos = clampToGrid(nextPos, state.grid.size)
    else:
      newDirection = critter.direction
    
    # Create updated critter
    updatedCritter = {
      ...critter,
      position: nextPos,
      direction: newDirection
    }
    nextCritters.push(updatedCritter)
    
    # Generate note event if cell has color
    cell = state.grid.cells[nextPos.y][nextPos.x]
    if cell.color is not null:
      noteEvents.push({
        critterType: critter.type,
        position: nextPos,
        color: cell.color
      })
  
  return {
    nextState: { ...state, critters: nextCritters },
    noteEvents
  }
```

**Algorithm: handleBoundaryCollision()**
```
function handleBoundaryCollision(position, direction, gridSize):
  newDirection = direction
  
  # Hit left or right edge
  if position.x < 0 or position.x >= gridSize.width:
    if direction == 'left':
      newDirection = 'right'
    else if direction == 'right':
      newDirection = 'left'
  
  # Hit top or bottom edge
  if position.y < 0 or position.y >= gridSize.height:
    if direction == 'up':
      newDirection = 'down'
    else if direction == 'down':
      newDirection = 'up'
  
  return newDirection
```

### 2. Critter Placement Logic (`src/core/critters/placement.ts`)

**Responsibility**: Validate and modify game state when adding/removing critters.

**Public API**:
```typescript
export function placeCritter(state: GameState, position: Position, type: CritterType, direction: Direction): PlacementResult
export function removeCritter(state: GameState, position: Position): PlacementResult
export function isValidPlacement(position: Position, gridSize: { width: number; height: number }): boolean
export function isValidDirection(direction: string): direction is Direction
```

**Algorithm: placeCritter()**
```
function placeCritter(state, position, type, direction):
  # Validate position
  if not isValidPlacement(position, state.grid.size):
    return { state, success: false, error: 'Position out of bounds' }
  
  # Validate direction
  if not isValidDirection(direction):
    return { state, success: false, error: 'Invalid direction' }
  
  # Check if critter already exists at position
  existingIndex = findCritterAtPosition(state.critters, position)
  
  newCritter = {
    id: generateId(),
    type,
    position,
    direction
  }
  
  if existingIndex >= 0:
    # Replace existing critter
    newCritters = [...state.critters]
    newCritters[existingIndex] = newCritter
  else:
    # Add new critter
    newCritters = [...state.critters, newCritter]
  
  return {
    state: { ...state, critters: newCritters },
    success: true
  }
```

**Algorithm: removeCritter()**
```
function removeCritter(state, position):
  # Find critter at position
  index = findCritterAtPosition(state.critters, position)
  
  if index < 0:
    return { state, success: false, error: 'No critter at position' }
  
  # Remove critter
  newCritters = state.critters.filter((_, i) => i !== index)
  
  return {
    state: { ...state, critters: newCritters },
    success: true
  }
```

### 3. Creature Renderer (`src/render/creatures/CreatureRenderer.ts`)

**Responsibility**: Manage Three.js scene objects, interpolate smooth movement, trigger effects.

**Public API**:
```typescript
export class CreatureRenderer {
  constructor(scene: THREE.Scene, gridSize: { width: number; height: number })
  update(state: GameState): void
  interpolate(beatProgress: number): void  // beatProgress: 0.0 to 1.0
  triggerNoteEffect(critterType: CritterType, position: Position): void
  dispose(): void
}
```

**Algorithm: update(state)**
```
function update(state):
  # Track which critters exist in new state
  currentIds = new Set(state.critters.map(c => c.id))
  
  # Remove meshes for critters that no longer exist
  for (id, mesh) in this.critterMeshes:
    if id not in currentIds:
      scene.remove(mesh.group)
      mesh.dispose()
      critterMeshes.delete(id)
  
  # Add or update meshes
  for critter in state.critters:
    if critter.id not in critterMeshes:
      # Create new mesh
      model = createCreatureModel(critter.type)
      mesh = {
        group: model,
        targetPosition: critter.position,
        currentPosition: critter.position,
        type: critter.type
      }
      scene.add(model)
      critterMeshes.set(critter.id, mesh)
    else:
      # Update target position for interpolation
      mesh = critterMeshes.get(critter.id)
      mesh.targetPosition = critter.position
  
  # Store state for interpolation
  this.previousState = state
```

**Algorithm: interpolate(beatProgress)**
```
function interpolate(beatProgress):
  # beatProgress goes from 0.0 to 1.0 during each beat
  
  for (id, mesh) in critterMeshes:
    # Interpolate from current to target position
    startPos = mesh.currentPosition
    endPos = mesh.targetPosition
    
    # Convert grid coordinates to world coordinates
    startWorld = gridToWorld(startPos, gridSize)
    endWorld = gridToWorld(endPos, gridSize)
    
    # Smooth interpolation (could use easing function)
    t = smoothstep(beatProgress) # Ease in/out
    interpolatedWorld = lerp(startWorld, endWorld, t)
    
    # Update mesh position
    mesh.group.position.set(
      interpolatedWorld.x,
      0.1, # Slight elevation above grid
      interpolatedWorld.z
    )
    
    # Update facing direction (rotate toward movement direction)
    if startPos != endPos:
      angle = calculateAngle(startPos, endPos)
      mesh.group.rotation.y = angle
    
    # At end of beat, update current position
    if beatProgress >= 1.0:
      mesh.currentPosition = endPos
```

### 4. Creature Models (`src/render/creatures/models/`)

**⚠️ DEFAULT PLACEHOLDER - Team can customize later ⚠️**

**Factory Function** (`models/index.ts`):
```typescript
/**
 * Create a Three.js mesh for the specified creature type.
 * Each creature type is implemented in a separate swappable file.
 */
export function createCreatureModel(type: CritterType): THREE.Group {
  switch (type) {
    case 'ghost': return createGhost()
    case 'pumpkin': return createPumpkin()
    case 'bat': return createBat()
    case 'spider': return createSpider()
  }
}
```

**Default Ghost Visual** (`models/ghost.ts`):
```typescript
export function createGhost(): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.9 })
  )
  body.position.y = 0.3
  group.add(body)
  
  // Eyes (small dark boxes)
  const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.05)
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.1, 0.35, 0.25)
  group.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  rightEye.position.set(0.1, 0.35, 0.25)
  group.add(rightEye)
  
  group.userData.animate = (time: number) => {
    group.position.y = Math.sin(time * 2) * 0.05  // Vertical bob
  }
  return group
}
```

**Default Pumpkin Visual** (`models/pumpkin.ts`):
```typescript
export function createPumpkin(): THREE.Group {
  const group = new THREE.Group()
  const bodyGeometry = new THREE.SphereGeometry(0.3, 16, 12)
  bodyGeometry.scale(1, 0.7, 1)  // Flatten
  const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: 0xff6600 }))
  body.position.y = 0.21
  group.add(body)
  
  // Green stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 0.15, 8),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  )
  stem.position.y = 0.5
  group.add(stem)
  
  // Triangle eyes and mouth (small cones)
  const faceMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 })
  const eyeGeometry = new THREE.ConeGeometry(0.06, 0.1, 3)
  const leftEye = new THREE.Mesh(eyeGeometry, faceMaterial)
  leftEye.rotation.z = Math.PI
  leftEye.position.set(-0.1, 0.25, 0.25)
  group.add(leftEye)
  const rightEye = leftEye.clone()
  rightEye.position.set(0.1, 0.25, 0.25)
  group.add(rightEye)
  
  return group
}
```

**Default Bat Visual** (`models/bat.ts`):
```typescript
export function createBat(): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
  )
  body.rotation.x = Math.PI / 2
  body.position.y = 0.25
  group.add(body)
  
  // Wings
  const wingGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.3)
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
  leftWing.position.set(-0.25, 0.25, 0)
  leftWing.rotation.y = -0.3
  group.add(leftWing)
  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
  rightWing.position.set(0.25, 0.25, 0)
  rightWing.rotation.y = 0.3
  group.add(rightWing)
  
  group.userData.animate = (time: number) => {
    const flap = Math.sin(time * 8) * 0.3
    leftWing.rotation.y = -0.3 + flap
    rightWing.rotation.y = 0.3 - flap
  }
  return group
}
```

**Default Spider Visual** (`models/spider.ts`):
```typescript
export function createSpider(): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  )
  body.position.y = 0.2
  group.add(body)
  
  // 8 legs
  const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6)
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const leg = new THREE.Mesh(legGeometry, legMaterial)
    leg.position.set(Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2)
    leg.rotation.z = Math.cos(angle) * 0.6
    leg.rotation.x = Math.sin(angle) * 0.6
    group.add(leg)
  }
  return group
}
```

### 5. Particle Effects (`src/render/creatures/particles.ts`)

**Public API**:
```typescript
export class ParticleSystem {
  constructor(scene: THREE.Scene)
  trigger(position: Position, color: number, critterType: CritterType): void
  update(deltaTime: number): void
  dispose(): void
}
```

**Implementation**: 10-20 particles burst outward/upward, then fall and fade over 500ms.

### 6. Scene Lighting (`src/render/effects/lighting.ts`)

**Public API**:
```typescript
export function setupLighting(scene: THREE.Scene): LightingSetup
export interface LightingSetup {
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  pointLight?: THREE.PointLight
  dispose(): void
}
```

**Configuration**: Low amber ambient (0x402010, 0.3), warm directional (0xff9944, 0.6), optional point light for highlights.

**Integration**: Part A's `src/render/scene/` exposes the scene object through a getter function (e.g., `getSceneContext()`). Part B's lighting code calls this getter to access the scene but does not modify Part A's files.

### 7. Bloom Post-Processing (`src/render/effects/bloom.ts`)

**Public API**:
```typescript
export function setupBloom(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): BloomSetup
export interface BloomSetup {
  composer: THREE.EffectComposer
  render(): void
  dispose(): void
}
```

**Configuration**: Subtle bloom on glowing elements (critters, note triggers, special cells) using THREE.EffectComposer and THREE.UnrealBloomPass.

**Integration**: Part A's `src/render/scene/` exposes renderer, scene, and camera through a getter function. Part B's bloom code consumes these objects for post-processing setup.

## Data Models

**⚠️ TEMPORARY - Replace with shared model from Part C (`src/core/model/`) ⚠️**

```typescript
// TEMP: Replace with shared model from src/core/model/
export type CritterType = 'ghost' | 'pumpkin' | 'bat' | 'spider'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Position {
  x: number // Grid column (0-indexed)
  y: number // Grid row (0-indexed)
}

export interface Critter {
  id: string // Unique identifier
  type: CritterType
  position: Position
  direction: Direction
  // For stretch goals:
  counters?: {
    slowBeat?: number // For spider web effect
    zigzagStep?: number // For bat zig-zag
  }
}

export interface Cell {
  color: number | null // Three.js color (0xRRGGBB) or null if empty
  // For stretch goals:
  special?: 'tombstone' | 'web' | 'candle' | 'portal'
  portalPair?: string // ID of paired portal
}

export interface Grid {
  width: number
  height: number
  cells: Cell[][] // [row][col]
}

export interface GameState {
  grid: Grid
  critters: Critter[]
  tempo: number // BPM
  scale: number[] // Note intervals
}

export interface NoteEvent {
  critterType: CritterType
  position: Position
  color: number
}

export interface MovementResult {
  nextState: GameState
  noteEvents: NoteEvent[]
}

export interface PlacementResult {
  state: GameState
  success: boolean
  error?: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Grid Bounds Invariant
*For any* valid game state and grid dimensions, after moveCritters(), all critter positions satisfy `0 ≤ x < grid.width` and `0 ≤ y < grid.height`.
**Validates: Requirements 1.5, 2.1**

### Property 2: Deterministic Movement
*For any* valid game state S, calling moveCritters(S) multiple times always produces identical next state and note events.
**Validates: Requirements 1.3**

### Property 3: Boundary Direction Reversal
*For any* critter at a grid boundary facing outward, after moveCritters(), the critter's direction is reversed for the component that hit the edge.
**Validates: Requirements 2.2, 2.3**

### Property 4: Note Event Generation
*For any* game state where a critter moves onto a cell with non-null color, moveCritters() generates a note event with that critter's type and cell position.
**Validates: Requirements 1.4**

### Property 5: Placement Adds Critter
*For any* valid position within grid bounds, valid critter type, and valid direction, placeCritter() results in a critter at that position with specified type and direction.
**Validates: Requirements 3.2**

### Property 6: Placement Replaces Existing Critter
*For any* game state with an existing critter at position P, placeCritter() at position P results in exactly one critter at P with the new type and direction.
**Validates: Requirements 3.3**

### Property 7: Removal Deletes Critter
*For any* game state with a critter at position P, removeCritter(P) results in no critter at P and critter count decreased by one.
**Validates: Requirements 3.4**

### Property 8: Invalid Input Rejection
*For any* position outside grid bounds OR invalid direction string, placeCritter() returns success=false and leaves state unchanged.
**Validates: Requirements 3.5, 3.6**

## Error Handling

**Movement Edge Cases**:
- Empty grid: no note events generated
- Single-cell grid: critter bounces in place
- Critters at corners: only component hitting edge reverses
- Multiple critters at same position: allowed (overlap)

**Placement Validation**:
- Invalid position: return `{state, success: false, error}`
- Invalid direction: return error, state unchanged
- Remove non-existent critter: return error (not a crash)

**Rendering Safeguards**:
- Beat progress clamped to [0, 1]
- Particle count capped at 1000 (oldest removed first)
- Dispose() cleans up all Three.js resources

## Testing Strategy

## Testing Strategy

**Dual Approach**: Unit tests (specific examples, edge cases) + Property-based tests (8 properties × 100 iterations using fast-check library).

**Unit Tests** (`tests/core/critters/*.test.ts`):
- movement.test.ts: forward movement, empty grid, single cell, corners, overlapping critters
- placement.test.ts: add, replace, remove, invalid position, invalid direction

**Property-Based Tests** (`tests/core/critters/*.prop.test.ts`):
```typescript
// Example property test structure
describe('Property 1: Grid Bounds Invariant', () => {
  it('Feature: critters, Property 1: all critters remain within bounds', () => {
    fc.assert(
      fc.property(arbGameState, (state) => {
        const result = moveCritters(state)
        for (const critter of result.nextState.critters) {
          expect(critter.position.x).toBeGreaterThanOrEqual(0)
          expect(critter.position.x).toBeLessThan(state.grid.width)
          // ... similar for y
        }
      }),
      { numRuns: 100 }
    )
  })
})
```

**Test Commands**:
```bash
npm test                     # Run all tests
npm test -- --coverage       # With coverage
```

## 3-Day Implementation Roadmap

**Day 1** (after Part C delivers model): Implement core logic (`movement.ts`, `placement.ts`) with unit and property tests. Replace temporary types with shared model.

**Day 2**: Implement rendering (`CreatureRenderer`, creature models, particles in `src/render/creatures/`, lighting and bloom in `src/render/effects/`). Complete all property-based tests (8 properties). Verify tests pass.

**Day 3**: Integration with Parts A/C, beat synchronization, visual QA for all 4 creatures, performance testing (30+ fps with 20+ critters), bug fixes, polish.

**Definition of Done**: All 8 properties pass with 100 iterations, 4 creatures visible and distinguishable, movement synced with beats, boundary bouncing works, placement/removal via UI, particle effects, lighting, no console errors, 30+ fps with 20 critters.

## Stretch Goals (Phase 2)

- **Special Halloween Cells** (4-6 hours): Tombstone (stops movement), Web (move every other beat), Candle (rotate 90°), Portal (teleport)
- **Unique Critter Behaviors** (6-8 hours): Ghost wraps at boundaries, Bat zigzags, Spider leaves web trails
- **Enhanced Post-Processing** (2-3 hours): Additional bloom tuning and optional vignette effects using THREE.EffectComposer (if performance allows)

---

## Integration Dependencies

**Part A Scene Access**: Part A's code in `src/render/scene/` exposes the Three.js renderer, camera, and scene objects to Part B through a getter function (e.g., `getSceneContext()`). Part B's effects code in `src/render/effects/` consumes these objects for lighting and post-processing setup but does not modify `src/render/scene/` files. Part A owns scene initialization; Part B owns effects that operate on that scene.

**Part A Pointer Events**: Part A's pointer/raycast system in `src/render/scene/` provides Cell_Clicked_Event with grid coordinates (x, y). Part B's placement logic in `src/core/critters/placement.ts` consumes these events.

**Part C Data Model**: Part C provides the shared data model in `src/core/model/`. Part B's movement rules in `src/core/critters/` consume this model and are called by Part C's Step_Function.