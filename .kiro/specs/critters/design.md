# Design Document: Critters

## Overview

The Critters system is the heart of TombsPad's interactive musical experience. It brings Halloween-themed creatures to life on a painted grid canvas, transforming static user artwork into dynamic musical performances. When critters move across colored cells, they trigger musical notes, allowing users to compose melodies by designing visual paths.

This design implements a clean separation between pure game logic (in `src/core/critters/`) and visual rendering (in `src/render/creatures/`). The core movement system is deterministic and testable, while the rendering layer provides smooth animations and atmospheric effects. The architecture supports future extensibility through modular creature models and stretch goal features.

**Scope**: This design covers MVP features deliverable in 3 days:
- Core movement system with straight-line motion and boundary bouncing
- Critter placement and removal logic
- Four distinct creature types with simple visual representations
- Smooth animation interpolation between beats
- Particle effects on note triggers
- Scene lighting and atmosphere

**Stretch goals** (special cells, unique creature behaviors) are designed but marked for Phase 2 implementation after MVP is complete.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Part A (sendori)                      │
│  ┌─────────────────────┐         ┌──────────────────────┐  │
│  │ Audio Scheduler     │         │ Pointer/Raycast      │  │
│  │ (calls step() on    │         │ System               │  │
│  │  each beat)         │         │ (emits Cell_Clicked) │  │
│  └──────────┬──────────┘         └──────────┬───────────┘  │
└─────────────┼─────────────────────────────────┼─────────────┘
              │                                 │
              │ step()                          │ Cell_Clicked_Event
              │                                 │
┌─────────────▼─────────────────────────────────▼─────────────┐
│                        Part C (nabotz)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Shared Data Model (src/core/model/)         │ │
│  │  - Grid state                                          │ │
│  │  - Critter state: {type, position, direction}         │ │
│  │  - Note events                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       Step Function (src/core/model/step.ts)           │ │
│  │  step(state) → { nextState, noteEvents }               │ │
│  │  - Calls Part B's movement rules                       │ │
│  └──────────────────┬─────────────────────────────────────┘ │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      │ moveCritters()
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                        Part B (zenquessence)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Core Logic (src/core/critters/)               │ │
│  │  ┌──────────────────┐    ┌──────────────────────────┐ │ │
│  │  │  movement.ts     │    │  placement.ts            │ │ │
│  │  │  - moveCritters()│    │  - placeCritter()        │ │ │
│  │  │  - handleBoundary│    │  - removeCritter()       │ │ │
│  │  └──────────────────┘    └──────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       Rendering Layer (src/render/creatures/)          │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  CreatureRenderer.ts                             │ │ │
│  │  │  - Interpolates smooth movement between beats    │ │ │
│  │  │  - Manages creature mesh lifecycle               │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  models/ (swappable creature visuals)            │ │ │
│  │  │  - ghost.ts, pumpkin.ts, bat.ts, spider.ts      │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  effects/                                        │ │ │
│  │  │  - particles.ts (note trigger effects)          │ │ │
│  │  │  - lighting.ts (scene atmosphere)               │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

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
    ghost.ts            # Ghost visual (swappable)
    pumpkin.ts          # Pumpkin visual (swappable)
    bat.ts              # Bat visual (swappable)
    spider.ts           # Spider visual (swappable)
  effects/
    particles.ts        # Particle system for note triggers
    lighting.ts         # Scene lighting setup
    
tests/core/critters/
  movement.test.ts      # Unit tests
  movement.prop.test.ts # Property-based tests
  placement.test.ts     # Placement logic tests
```

### Data Flow

**Movement Flow (once per beat):**
```
1. Part A's Audio Scheduler triggers beat
2. Part A calls Part C's step(state)
3. Part C's step() calls Part B's moveCritters(state)
4. moveCritters() returns {nextState, noteEvents}
5. Part A schedules notes from noteEvents
6. Part B's renderer interpolates movement until next beat
```

**Placement Flow (on user interaction):**
```
1. User clicks grid cell
2. Part A's raycast detects click, emits Cell_Clicked_Event {x, y}
3. UI passes event to Part B's placeCritter() or removeCritter()
4. Placement logic validates and updates state
5. Renderer creates/removes creature mesh
```

## Components and Interfaces

### 1. Core Movement System (`src/core/critters/movement.ts`)

**Responsibility**: Pure, deterministic critter movement logic with no side effects.

**Public API**:
```typescript
/**
 * Advance all critters one cell in their current direction.
 * Handles boundary collisions by reversing direction.
 * Generates note events for critters that land on colored cells.
 */
export function moveCritters(state: GameState): MovementResult {
  // Returns: { nextState, noteEvents }
}

/**
 * Calculate next position for a single critter.
 * Does not mutate state.
 */
export function getNextPosition(
  critter: Critter,
  gridSize: { width: number; height: number }
): { position: Position; direction: Direction; hitBoundary: boolean }

/**
 * Handle boundary collision by reversing appropriate direction component.
 */
export function handleBoundaryCollision(
  position: Position,
  direction: Direction,
  gridSize: { width: number; height: number }
): Direction
```

**Internal Logic**:

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

**Edge Cases Handled**:
- Critter at corner: only reverse the component that hit edge
- Multiple critters at same position: allowed (they can overlap)
- Empty grid: no note events generated
- Single-cell grid: critter bounces in place

**Determinism Guarantee**: No use of Math.random(), Date.now(), or any external state. Same input always produces same output.

### 2. Critter Placement Logic (`src/core/critters/placement.ts`)

**Responsibility**: Validate and modify game state when adding/removing critters.

**Public API**:
```typescript
/**
 * Add or replace a critter at the specified position.
 * Validates position is within grid bounds.
 * Validates direction is one of four cardinal directions.
 */
export function placeCritter(
  state: GameState,
  position: Position,
  type: CritterType,
  direction: Direction
): PlacementResult {
  // Returns: { state, success, error? }
}

/**
 * Remove critter at specified position.
 */
export function removeCritter(
  state: GameState,
  position: Position
): PlacementResult

/**
 * Check if position is valid for placement.
 */
export function isValidPlacement(
  position: Position,
  gridSize: { width: number; height: number }
): boolean

/**
 * Check if direction is valid.
 */
export function isValidDirection(direction: string): direction is Direction
```

**Internal Logic**:

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

**Validation Rules**:
- Position must be within `0 <= x < gridWidth` and `0 <= y < gridHeight`
- Direction must be one of: `'up' | 'down' | 'left' | 'right'`
- Type must be one of: `'ghost' | 'pumpkin' | 'bat' | 'spider'`

### 3. Creature Renderer (`src/render/creatures/CreatureRenderer.ts`)

**Responsibility**: Manage Three.js scene objects, interpolate smooth movement, trigger effects.

**Public API**:
```typescript
export class CreatureRenderer {
  constructor(scene: THREE.Scene, gridSize: { width: number; height: number })
  
  /**
   * Update renderer with new game state.
   * Creates/removes meshes as needed.
   */
  update(state: GameState): void
  
  /**
   * Animate creatures between beats.
   * Called every frame by render loop.
   * @param beatProgress - 0.0 to 1.0, progress through current beat
   */
  interpolate(beatProgress: number): void
  
  /**
   * Trigger visual effect when note is played.
   */
  triggerNoteEffect(critterType: CritterType, position: Position): void
  
  /**
   * Clean up Three.js resources.
   */
  dispose(): void
}
```

**Internal State**:
```typescript
private scene: THREE.Scene
private gridSize: { width: number; height: number }
private critterMeshes: Map<string, CreatureMesh> // critterId -> mesh data
private previousState: GameState | null
private particleSystem: ParticleSystem
```

**Internal Logic**:

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

**Helper Functions**:
```typescript
function gridToWorld(gridPos: Position, gridSize): THREE.Vector3
function smoothstep(t: number): number // Ease in/out: 3t² - 2t³
function lerp(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3
```

### 4. Creature Models (`src/render/creatures/models/`)

**⚠️ DEFAULT PLACEHOLDER - Subject to Team Decision ⚠️**

This section proposes simple default visuals using Three.js primitives. The team will decide on final creature appearances. The modular architecture makes it easy to swap designs later.

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
  
  // White sphere body
  const bodyGeometry = new THREE.SphereGeometry(0.3, 16, 16)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    emissive: 0x404040,
    transparent: true,
    opacity: 0.9
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.3
  group.add(body)
  
  // Two dark eyes (small boxes)
  const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.05)
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.1, 0.35, 0.25)
  group.add(leftEye)
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  rightEye.position.set(0.1, 0.35, 0.25)
  group.add(rightEye)
  
  // Add animation hook (vertical bob)
  group.userData.animate = (time: number) => {
    group.position.y = Math.sin(time * 2) * 0.05
  }
  
  return group
}
```

**Default Pumpkin Visual** (`models/pumpkin.ts`):
```typescript
export function createPumpkin(): THREE.Group {
  const group = new THREE.Group()
  
  // Orange flattened sphere
  const bodyGeometry = new THREE.SphereGeometry(0.3, 16, 12)
  bodyGeometry.scale(1, 0.7, 1) // Flatten vertically
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: 0x331100
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.21
  group.add(body)
  
  // Green stem (small cylinder)
  const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.15, 8)
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 })
  const stem = new THREE.Mesh(stemGeometry, stemMaterial)
  stem.position.y = 0.5
  group.add(stem)
  
  // Triangle eyes (small cones)
  const eyeGeometry = new THREE.ConeGeometry(0.06, 0.1, 3)
  const faceMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 })
  
  const leftEye = new THREE.Mesh(eyeGeometry, faceMaterial)
  leftEye.rotation.z = Math.PI
  leftEye.position.set(-0.1, 0.25, 0.25)
  group.add(leftEye)
  
  const rightEye = new THREE.Mesh(eyeGeometry, faceMaterial)
  rightEye.rotation.z = Math.PI
  rightEye.position.set(0.1, 0.25, 0.25)
  group.add(rightEye)
  
  // Triangle mouth (small cone)
  const mouth = new THREE.Mesh(eyeGeometry, faceMaterial)
  mouth.rotation.z = Math.PI
  mouth.position.set(0, 0.1, 0.25)
  mouth.scale.set(1.5, 0.8, 1)
  group.add(mouth)
  
  return group
}
```

**Default Bat Visual** (`models/bat.ts`):
```typescript
export function createBat(): THREE.Group {
  const group = new THREE.Group()
  
  // Dark gray cone body
  const bodyGeometry = new THREE.ConeGeometry(0.15, 0.4, 8)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.rotation.x = Math.PI / 2 // Point forward
  body.position.y = 0.25
  group.add(body)
  
  // Wings (flat boxes)
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
  
  // Add flapping animation
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
  
  // Black sphere body
  const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 16)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.2
  group.add(body)
  
  // 8 legs (thin cylinders radiating outward)
  const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6)
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
  
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const leg = new THREE.Mesh(legGeometry, legMaterial)
    
    // Position leg at edge of body
    const radius = 0.2
    leg.position.set(
      Math.cos(angle) * radius,
      0.1,
      Math.sin(angle) * radius
    )
    
    // Angle leg outward and down
    leg.rotation.z = Math.cos(angle) * 0.6
    leg.rotation.x = Math.sin(angle) * 0.6
    
    group.add(leg)
  }
  
  return group
}
```

**Swappability**: To change a creature's visual design, simply replace the content of its file (e.g., `ghost.ts`). The factory function and renderer code remain unchanged. This allows team members to iterate on designs without affecting movement logic or other creatures.

### 5. Particle Effects (`src/render/creatures/effects/particles.ts`)

**Responsibility**: Visual feedback when critters trigger notes.

**Public API**:
```typescript
export class ParticleSystem {
  constructor(scene: THREE.Scene)
  
  /**
   * Spawn particle burst at position with color.
   */
  trigger(position: Position, color: number, critterType: CritterType): void
  
  /**
   * Update particle animations.
   * Called every frame.
   */
  update(deltaTime: number): void
  
  /**
   * Clean up resources.
   */
  dispose(): void
}
```

**Implementation Approach**:
```typescript
// Simple particle implementation using Three.js Points
class ParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  
  trigger(position, color, critterType) {
    // Create 10-20 particles
    const count = 15
    for (let i = 0; i < count; i++) {
      particles.push({
        position: gridToWorld(position),
        velocity: randomVelocity(), // Burst outward
        lifetime: 0.5, // 500ms
        age: 0,
        color
      })
    }
    
    updateGeometry()
  }
  
  update(deltaTime) {
    // Update each particle
    for each particle:
      particle.age += deltaTime
      particle.position += particle.velocity * deltaTime
      particle.velocity.y -= gravity * deltaTime // Fall
      
      // Fade out
      alpha = 1 - (particle.age / particle.lifetime)
      
      // Remove expired particles
      if particle.age >= particle.lifetime:
        remove particle
    
    updateGeometry()
  }
}
```

**Visual Effect**: Colored particles burst outward and upward, then fall and fade. Color matches the cell that triggered the note.

### 6. Scene Lighting (`src/render/creatures/effects/lighting.ts`)

**Responsibility**: Create atmospheric Halloween lighting.

**Public API**:
```typescript
/**
 * Setup scene lighting with dark-warm Halloween aesthetic.
 */
export function setupLighting(scene: THREE.Scene): LightingSetup

export interface LightingSetup {
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  pointLight?: THREE.PointLight // Optional dramatic accent
  dispose(): void
}
```

**Lighting Configuration**:
```typescript
function setupLighting(scene) {
  // Low ambient light (dark atmosphere)
  const ambient = new THREE.AmbientLight(0x402010, 0.3)
  scene.add(ambient)
  
  // Warm directional light (like candlelight from above)
  const directional = new THREE.DirectionalLight(0xff9944, 0.6)
  directional.position.set(2, 5, 3)
  directional.castShadow = true
  scene.add(directional)
  
  // Optional: Subtle point light for highlights
  const point = new THREE.PointLight(0xffaa55, 0.4, 10)
  point.position.set(0, 2, 0)
  scene.add(point)
  
  return { ambient, directional, point, dispose: () => {...} }
}
```

**Post-Processing** (if performance allows):
- Subtle bloom on glowing elements (critters, particles)
- Implemented using THREE.EffectComposer with UnrealBloomPass
- Target: maintain 30+ fps on mid-range hardware

## Data Models

### Temporary Types (src/core/critters/types.ts)

**⚠️ TEMPORARY - Replace with shared model from Part C ⚠️**

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

**Migration Plan**: Once Part C delivers `src/core/model/`, replace all imports from `types.ts` with imports from the shared model. The structure above matches the expected shared model interface.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:**

After analyzing all acceptance criteria in the prework phase, I identified several redundancies:

1. **Requirements 1.5 and 2.1** both test the grid bounds invariant - these are logically equivalent and should be combined into one property
2. **Requirements 2.2 and 2.3** test the same behavior (direction reversal) for different edges - these can be combined into one comprehensive property about boundary bouncing
3. **Requirements 3.5 and 3.6** both test input validation - these can be tested together as one property about invalid input rejection

After consolidation, the following properties provide unique validation value:

### Property 1: Grid Bounds Invariant

*For any* valid game state and any grid dimensions, after calling moveCritters(), all critter positions SHALL satisfy `0 ≤ x < grid.width` and `0 ≤ y < grid.height`.

**Validates: Requirements 1.5, 2.1**

**Test Implementation**: Generate random game states with critters at various positions including edge positions and corners. Call moveCritters() and verify every critter position is within bounds. This property ensures critters never escape the grid regardless of their starting position or direction.

### Property 2: Deterministic Movement

*For any* valid game state S, calling moveCritters(S) multiple times SHALL always produce identical next state S' and identical note events.

**Validates: Requirements 1.3**

**Test Implementation**: Generate random game states. Call moveCritters() with the same state multiple times. Deep-compare the returned states and note events arrays to verify they are identical. This property ensures the movement system is deterministic and contains no hidden randomness or side effects.

### Property 3: Boundary Direction Reversal

*For any* critter at a grid boundary facing outward, after calling moveCritters(), the critter's direction SHALL be reversed for the component that hit the edge (horizontal reversal at left/right edges, vertical reversal at top/bottom edges).

**Validates: Requirements 2.2, 2.3**

**Test Implementation**: Generate game states with critters at boundary positions (x=0, x=width-1, y=0, y=height-1) facing outward. Call moveCritters() and verify direction reversal occurred correctly. Test all edge-direction combinations: left edge + left direction → right, right edge + right direction → left, top edge + up direction → down, bottom edge + down direction → up.

### Property 4: Note Event Generation

*For any* game state where a critter moves onto a cell with a non-null color, moveCritters() SHALL generate a note event containing that critter's type and the cell's position.

**Validates: Requirements 1.4**

**Test Implementation**: Generate game states with colored cells in various positions. Place critters such that they will move onto these colored cells. Call moveCritters() and verify note events are generated with correct critterType and position values. Also verify that critters moving onto empty cells (color = null) do NOT generate note events.

### Property 5: Placement Adds Critter

*For any* valid position (x, y) within grid bounds, valid critter type, and valid direction, calling placeCritter() SHALL result in a critter existing at that position with the specified type and direction.

**Validates: Requirements 3.2**

**Test Implementation**: Generate random valid positions, types, and directions. Call placeCritter() and verify: (1) success = true, (2) a critter exists at the specified position, (3) the critter has the specified type and direction.

### Property 6: Placement Replaces Existing Critter

*For any* game state with an existing critter at position P, calling placeCritter() at position P with a different type or direction SHALL result in exactly one critter at P with the new type and direction (replacement, not addition).

**Validates: Requirements 3.3**

**Test Implementation**: Generate game states with existing critters. Call placeCritter() at occupied positions with different critter data. Verify: (1) only one critter exists at that position, (2) the critter has the new type/direction, (3) total critter count did not increase.

### Property 7: Removal Deletes Critter

*For any* game state with a critter at position P, calling removeCritter(P) SHALL result in no critter existing at position P and the total critter count decreased by one.

**Validates: Requirements 3.4**

**Test Implementation**: Generate game states with critters at various positions. Call removeCritter() at occupied positions. Verify: (1) no critter exists at that position, (2) critter count decreased by exactly 1.

### Property 8: Invalid Input Rejection

*For any* position outside grid bounds OR any invalid direction string (not 'up'|'down'|'left'|'right'), calling placeCritter() SHALL return success = false and leave the game state unchanged.

**Validates: Requirements 3.5, 3.6**

**Test Implementation**: Generate invalid inputs: positions with x < 0 or x >= width or y < 0 or y >= height, and direction strings like '', 'diagonal', 'north', or random strings. Call placeCritter() with these invalid inputs and verify: (1) success = false, (2) state.critters array is unchanged (deep equal to original state).

<function_calls>
<invoke name="prework">
<parameter name="featureName">critters


## Error Handling

The critters system uses defensive programming to handle edge cases gracefully:

### Movement Edge Cases

**Empty Grid**:
- Behavior: moveCritters() processes each critter, generates no note events (no colored cells)
- No crash, deterministic behavior maintained

**Single-Cell Grid**:
- Behavior: Critter bounces in place, reversing direction every beat
- Position clamped to (0, 0), direction alternates each call

**Critter at Corner**:
- Behavior: Only the direction component that hit the edge is reversed
- Example: Critter at (0, 0) moving up-left becomes moving down-right (both components reverse independently)

**Multiple Critters at Same Position**:
- Behavior: Allowed - critters can overlap
- Each critter moves independently according to its own direction
- Multiple note events generated if they're on a colored cell

**Zero-Width or Zero-Height Grid**:
- Behavior: Validation at state creation level (Part C responsibility)
- If encountered, moveCritters() returns empty critters array and no note events

### Placement Edge Cases

**Invalid Position** (out of bounds):
- Behavior: placeCritter() returns `{ state, success: false, error: 'Position out of bounds' }`
- State unchanged, no side effects

**Invalid Direction** (not one of four cardinal directions):
- Behavior: placeCritter() returns `{ state, success: false, error: 'Invalid direction: ${direction}' }`
- State unchanged

**Invalid Critter Type**:
- Behavior: TypeScript type system prevents this at compile time
- Runtime: treat as validation error similar to invalid direction

**Remove Non-Existent Critter**:
- Behavior: removeCritter() returns `{ state, success: false, error: 'No critter at position' }`
- State unchanged (attempting to remove what doesn't exist is not an error that should crash)

### Rendering Edge Cases

**Missing Critter Model**:
- Behavior: createCreatureModel() throws error if type is not recognized
- Handled by: TypeScript type system prevents invalid types at compile time
- Fallback: Could return a simple sphere as "unknown" placeholder

**Rapid State Changes** (faster than frame rate):
- Behavior: Renderer interpolates toward most recent target position
- Multiple updates per frame: only the last state matters for rendering

**Beat Progress > 1.0** (scheduler timing edge case):
- Behavior: Clamp beatProgress to [0, 1] range in interpolate()
- Ensures smooth animation even if timing is imperfect

**Particle Overflow** (too many simultaneous particles):
- Behavior: Cap total particle count at 1000
- Oldest particles removed first if limit exceeded
- Prevents performance degradation on devices with many critters

### Integration Error Handling

**Part C's Step Function Not Available**:
- Behavior: Movement functions are standalone, can be tested in isolation
- Temporary: Use mock Step function in tests

**Part A's Cell_Clicked_Event Missing Position**:
- Behavior: Placement functions validate position exists and is a valid number
- If invalid, return error without crashing

**Three.js Scene Disposal**:
- Behavior: CreatureRenderer.dispose() cleans up all meshes, geometries, materials
- Prevents memory leaks when scene is destroyed

## Testing Strategy

### Dual Testing Approach

The critters system uses both **unit tests** and **property-based tests** for comprehensive coverage:

**Unit Tests** (`tests/core/critters/*.test.ts`):
- Specific examples demonstrating correct behavior
- Edge cases: empty grid, single cell, corners, overlapping critters
- Error conditions: invalid inputs, boundary violations
- Integration points with mocked dependencies

**Property-Based Tests** (`tests/core/critters/*.prop.test.ts`):
- Universal properties verified across randomized inputs
- Each property runs minimum 100 iterations
- Uses fast-check library for input generation
- Tests the 8 correctness properties defined above

### Unit Test Coverage

**movement.test.ts**:
```typescript
describe('moveCritters', () => {
  it('advances critter one cell forward', () => {
    // Specific example: critter at (2,2) facing right → (3,2)
  })
  
  it('handles empty grid without crashing', () => {
    // Edge case: grid with no colored cells
  })
  
  it('handles single-cell grid', () => {
    // Edge case: 1x1 grid, critter bounces in place
  })
  
  it('allows multiple critters at same position', () => {
    // Edge case: overlapping critters move independently
  })
})

describe('handleBoundaryCollision', () => {
  it('reverses left direction at left edge', () => {
    // Specific example: x=0, direction='left' → 'right'
  })
  
  it('reverses direction at corner', () => {
    // Specific example: (0,0), direction='left' → 'right'
  })
})
```

**placement.test.ts**:
```typescript
describe('placeCritter', () => {
  it('adds critter to empty position', () => {
    // Specific example: place ghost at (1,1) facing up
  })
  
  it('replaces existing critter', () => {
    // Specific example: replace ghost with bat at same position
  })
  
  it('rejects out-of-bounds position', () => {
    // Error case: x=-1, success=false
  })
  
  it('rejects invalid direction', () => {
    // Error case: direction='diagonal', success=false
  })
})

describe('removeCritter', () => {
  it('removes critter from occupied position', () => {
    // Specific example: remove critter at (2,3)
  })
  
  it('returns error for empty position', () => {
    // Error case: no critter at position
  })
})
```

**Property-Based Test Configuration:**

**movement.prop.test.ts**:
```typescript
import fc from 'fast-check'

// Generator: random game state
const arbGameState = fc.record({
  grid: fc.record({
    width: fc.integer({ min: 1, max: 20 }),
    height: fc.integer({ min: 1, max: 20 }),
    cells: fc.array(fc.array(fc.record({
      color: fc.option(fc.integer({ min: 0, max: 0xffffff }), { nil: null })
    })))
  }),
  critters: fc.array(fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('ghost', 'pumpkin', 'bat', 'spider'),
    position: fc.record({
      x: fc.integer({ min: 0, max: 19 }),
      y: fc.integer({ min: 0, max: 19 })
    }),
    direction: fc.constantFrom('up', 'down', 'left', 'right')
  }), { maxLength: 50 })
})

describe('Property: Grid Bounds Invariant', () => {
  it('Feature: critters, Property 1: all critters remain within grid bounds after movement', () => {
    fc.assert(
      fc.property(arbGameState, (state) => {
        const result = moveCritters(state)
        
        // Verify every critter is within bounds
        for (const critter of result.nextState.critters) {
          expect(critter.position.x).toBeGreaterThanOrEqual(0)
          expect(critter.position.x).toBeLessThan(state.grid.width)
          expect(critter.position.y).toBeGreaterThanOrEqual(0)
          expect(critter.position.y).toBeLessThan(state.grid.height)
        }
      }),
      { numRuns: 100 } // Minimum 100 iterations
    )
  })
})

describe('Property: Deterministic Movement', () => {
  it('Feature: critters, Property 2: same state produces same result', () => {
    fc.assert(
      fc.property(arbGameState, (state) => {
        const result1 = moveCritters(state)
        const result2 = moveCritters(state)
        
        // Deep equality check
        expect(result1.nextState).toEqual(result2.nextState)
        expect(result1.noteEvents).toEqual(result2.noteEvents)
      }),
      { numRuns: 100 }
    )
  })
})

// ... Additional properties 3-8 following same pattern
```

**placement.prop.test.ts**:
```typescript
describe('Property: Placement Adds Critter', () => {
  it('Feature: critters, Property 5: valid placement succeeds', () => {
    fc.assert(
      fc.property(
        arbGameState,
        fc.integer({ min: 0, max: 19 }),
        fc.integer({ min: 0, max: 19 }),
        fc.constantFrom('ghost', 'pumpkin', 'bat', 'spider'),
        fc.constantFrom('up', 'down', 'left', 'right'),
        (state, x, y, type, direction) => {
          fc.pre(x < state.grid.width && y < state.grid.height) // Ensure valid
          
          const result = placeCritter(state, { x, y }, type, direction)
          
          expect(result.success).toBe(true)
          
          const critterAtPos = result.state.critters.find(
            c => c.position.x === x && c.position.y === y
          )
          expect(critterAtPos).toBeDefined()
          expect(critterAtPos?.type).toBe(type)
          expect(critterAtPos?.direction).toBe(direction)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property: Invalid Input Rejection', () => {
  it('Feature: critters, Property 8: invalid inputs rejected', () => {
    fc.assert(
      fc.property(
        arbGameState,
        fc.integer(), // Any integer (including invalid)
        fc.integer(),
        fc.string(), // Any string (including invalid directions)
        (state, x, y, direction) => {
          const isValidPos = x >= 0 && x < state.grid.width && 
                           y >= 0 && y < state.grid.height
          const isValidDir = ['up', 'down', 'left', 'right'].includes(direction)
          
          if (!isValidPos || !isValidDir) {
            const result = placeCritter(state, { x, y }, 'ghost', direction as Direction)
            
            expect(result.success).toBe(false)
            expect(result.state.critters).toEqual(state.critters) // Unchanged
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Rendering Tests

**CreatureRenderer.test.ts**:
```typescript
// Unit tests with mocked Three.js scene
describe('CreatureRenderer', () => {
  it('creates mesh when critter added', () => {
    // Test mesh creation without actual rendering
  })
  
  it('removes mesh when critter removed', () => {
    // Test cleanup
  })
  
  it('interpolates position smoothly', () => {
    // Test interpolation math at beatProgress 0, 0.5, 1.0
  })
})
```

**Note**: Visual appearance tests (creature models, particles, lighting) rely on manual visual QA and cannot be fully automated. The team should do visual regression testing by comparing screenshots before/after changes.

### Integration Tests

**Step Function Integration**:
```typescript
describe('Integration with Part C Step Function', () => {
  it('calls moveCritters and returns expected format', () => {
    // Mock Part C's step function
    // Verify it correctly calls moveCritters and uses results
  })
})
```

**Cell Click Integration**:
```typescript
describe('Integration with Part A Cell Click', () => {
  it('handles Cell_Clicked_Event correctly', () => {
    // Mock Cell_Clicked_Event from Part A
    // Verify placement logic responds correctly
  })
})
```

### Test Execution Commands

```bash
# Run all tests once
npm test

# Run only property-based tests
npm test -- movement.prop.test.ts placement.prop.test.ts

# Run tests in watch mode (for development)
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Mock Data for Testing

**Shared Test Fixtures** (`tests/core/critters/fixtures.ts`):
```typescript
export const mockGrid3x3: Grid = {
  width: 3,
  height: 3,
  cells: [
    [{ color: 0xff0000 }, { color: null }, { color: 0x00ff00 }],
    [{ color: null }, { color: 0x0000ff }, { color: null }],
    [{ color: 0xffff00 }, { color: null }, { color: 0xff00ff }]
  ]
}

export const mockCritterGhost: Critter = {
  id: 'test-ghost-1',
  type: 'ghost',
  position: { x: 1, y: 1 },
  direction: 'right'
}

export const mockGameState: GameState = {
  grid: mockGrid3x3,
  critters: [mockCritterGhost],
  tempo: 120,
  scale: [0, 2, 4, 5, 7, 9, 11] // C major
}
```

**Property Test Tag Format:**

Each property-based test must include a comment tag referencing the design document:

```typescript
// Feature: critters, Property 1: Grid bounds invariant
it('all critters remain within grid bounds after movement', () => { ... })

// Feature: critters, Property 2: Deterministic movement
it('same state produces same result', () => { ... })
```

This allows traceability from design properties to test implementation.

### Testing Timeline (3-Day Schedule)

**Day 1** (after Part C delivers shared model):
- Setup test infrastructure (Vitest, fast-check)
- Write test fixtures and generators
- Implement movement.test.ts (unit tests)

**Day 2** (during implementation):
- Implement movement.prop.test.ts (property tests)
- Implement placement.test.ts
- Run tests during development to catch bugs early

**Day 3** (integration & polish):
- Integration tests with Part A and Part C
- Visual QA for rendering
- Fix any failing tests
- Verify all 8 properties pass with 100 iterations

### Success Criteria

Tests are considered complete when:
- ✅ All unit tests pass
- ✅ All 8 property-based tests pass with 100 iterations each
- ✅ Code coverage ≥ 80% for `src/core/critters/`
- ✅ No console errors during visual testing
- ✅ Performance: 30+ fps with 20+ critters on mid-range hardware

## 3-Day Implementation Roadmap

### Day 1: Foundation (After Part C Delivers Model)

**Morning** (4 hours):
- ✅ Review Part C's shared data model in `src/core/model/`
- ✅ Remove temporary types.ts, replace imports with shared model
- ✅ Implement `movement.ts`:
  - `moveCritters()` function
  - `getNextPosition()` helper
  - `handleBoundaryCollision()` function
- ✅ Write unit tests for movement (movement.test.ts)

**Afternoon** (4 hours):
- ✅ Implement `placement.ts`:
  - `placeCritter()` function
  - `removeCritter()` function
  - Validation helpers
- ✅ Write unit tests for placement (placement.test.ts)
- ✅ Setup fast-check generators (arbGameState, etc.)
- ✅ Begin movement.prop.test.ts (Properties 1-2)

**End of Day 1 Deliverable**: Core logic complete and unit tested

### Day 2: Rendering & Property Tests

**Morning** (4 hours):
- ✅ Implement `CreatureRenderer.ts`:
  - Constructor, update(), interpolate()
  - Mesh lifecycle management
- ✅ Implement creature models factory (`models/index.ts`)
- ✅ Implement default creature visuals:
  - `ghost.ts` (sphere + eyes)
  - `pumpkin.ts` (flattened sphere + face)
  - `bat.ts` (cone + wings)
  - `spider.ts` (sphere + legs)
- ✅ Test rendering with mock Three.js scene

**Afternoon** (4 hours):
- ✅ Complete property-based tests (Properties 3-8)
- ✅ Implement `effects/particles.ts`:
  - ParticleSystem class
  - trigger() and update() methods
- ✅ Implement `effects/lighting.ts`:
  - setupLighting() function
  - Configure ambient + directional + point lights
- ✅ Run all tests, fix any failures

**End of Day 2 Deliverable**: Complete MVP with passing tests

### Day 3: Integration & Polish

**Morning** (4 hours):
- ✅ Integration with Part A's Cell_Clicked_Event
- ✅ Integration with Part C's Step function
- ✅ Wire renderer to `main.ts`
- ✅ Test beat synchronization (scheduler → step → movement → interpolation)
- ✅ Fix any timing or integration bugs

**Afternoon** (4 hours):
- ✅ Visual QA: test all 4 creature types
- ✅ Visual QA: test particle effects on note triggers
- ✅ Visual QA: test lighting and atmosphere
- ✅ Performance testing: 20+ critters, verify 30+ fps
- ✅ Final bug fixes and polish
- ✅ Document any known issues for stretch goals

**End of Day 3 Deliverable**: Production-ready MVP

### Contingency Plans

**If Part C Delayed** (shared model not ready Day 1):
- Continue using temporary types.ts
- Implement and test core logic with temporary types
- Migration time budgeted for Day 2 morning (1-2 hours)

**If Rendering Takes Longer**:
- Prioritize simple creature visuals (spheres with different colors)
- Delay particle effects to Day 3
- Skip bloom post-processing if performance is tight

**If Integration Issues**:
- Use mock implementations to unblock development
- Schedule additional integration session with Part A/C owners
- Document integration points that need attention

### Risk Mitigation

**Risk: Three.js performance issues**
- Mitigation: Profile early, optimize particle count, disable bloom if needed
- Fallback: Reduce visual complexity

**Risk: Property tests reveal fundamental logic bugs**
- Mitigation: Run tests early and often during Day 1-2
- Budget: Extra 2 hours on Day 2 afternoon for fixes

**Risk: Creature visuals take too long to design**
- Mitigation: Use extremely simple placeholder shapes (colored spheres)
- Defer detailed visual design to post-hackathon (swappable architecture)

### Definition of Done (MVP)

Feature is complete when:
- ✅ All 8 correctness properties pass with 100 iterations
- ✅ All unit tests pass
- ✅ 4 creature types visible and distinguishable
- ✅ Movement synchronized with audio beats
- ✅ Critters bounce at boundaries correctly
- ✅ Placement and removal working via UI
- ✅ Particle effects trigger on notes
- ✅ Scene lighting creates Halloween atmosphere
- ✅ No console errors or warnings
- ✅ Maintains 30+ fps with 20 critters

## Stretch Goals (Phase 2 - Post-MVP)

These features are designed but not included in the 3-day MVP:

### Special Halloween Cells (Priority 1)

**Implementation Estimate**: 4-6 hours

**Changes Required**:
- Add `special?: 'tombstone' | 'web' | 'candle' | 'portal'` to Cell type
- Extend `moveCritters()` to check cell special type before moving
- Add cell special effects to movement rules:
  - Tombstone: `critter.stopped = true` (skip movement until removed)
  - Web: `critter.counters.slowBeat = (beat % 2 === 0)` (move every other beat)
  - Candle: rotate direction 90° clockwise
  - Portal: teleport to paired portal position
- Add visual indicators for special cells in renderer
- Add placement UI for special cells (UI spec responsibility)

**Property Tests**:
- Tombstone stops movement
- Web alternates movement correctly
- Candle rotates direction by 90°
- Portal teleports maintain determinism

### Unique Critter Behaviors (Priority 2)

**Implementation Estimate**: 6-8 hours

**Changes Required**:
- Ghost: Wrap at boundaries instead of bounce
- Bat: Zigzag pattern (forward, sideways-left, forward, sideways-right)
- Spider: Leave web trail on visited cells
- Modify `moveCritters()` to check critter type and apply behavior
- Add `visitedCells` tracking for spider trails
- Update property tests to handle type-specific behaviors

**Property Tests**:
- Ghost wrap maintains grid bounds
- Bat zigzag is deterministic (uses counters, not randomness)
- Spider trail affects other critters correctly

### Post-Processing Effects (Priority 3)

**Implementation Estimate**: 2-3 hours

**Changes Required**:
- Add THREE.EffectComposer to renderer
- Add UnrealBloomPass for glow
- Tune bloom intensity and threshold
- Performance test to ensure 30+ fps maintained

**Risk**: May not be achievable on target hardware. Have kill switch ready.

---

**End of Design Document**