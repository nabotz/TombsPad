/**
 * Canvas.ts
 * Main Three.js 3D canvas module for TombsPad.
 *
 * Owns the Three.js scene, OrthographicCamera, WebGLRenderer, and 16×16 mesh grid.
 * Handles paint/erase actions, undo stack, and state serialization.
 */

import * as THREE from 'three';
import {
  createCellState,
  setCellColor,
  getCellColorByIndex,
  type CellState,
  type ColorIndex,
} from '../../core/cellState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 16; // 16×16 grid

/** 8 Halloween-themed colors, index 0–7 */
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

/** Default unpainted cell color */
const UNPAINTED_COLOR = '#1a0a2e';

/** Maximum entries retained in the undo stack */
const UNDO_STACK_MAX = 10;

// ---------------------------------------------------------------------------
// Module-level state (initialized by initCanvas)
// ---------------------------------------------------------------------------

let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;

/** Flat 256-element array; value: ColorIndex (0–7) | null */
let cellColors: CellState = createCellState();

/** LIFO stack of { index, prev } snapshots, max length UNDO_STACK_MAX */
let undoStack: Array<{ index: number; prev: ColorIndex }> = [];

/** Currently active tool: 'paint' | 'erase' */
let activeTool: 'paint' | 'erase' = 'paint';

/** Currently active color index (0–7) */
let activeColor = 0;

/** Flat array of 256 THREE.Mesh objects. Index = row * 16 + col. */
let meshGrid: THREE.Mesh[] = [];

/** Module-level reference to the canvas API (set inside initCanvas) */
let _canvasAPI: ReturnType<typeof initCanvas> | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Update a mesh's material color based on a ColorIndex (or null for unpainted).
 */
function updateMeshColor(index: number, colorIndex: ColorIndex): void {
  const mesh = meshGrid[index];
  if (!mesh) return;
  const material = mesh.material as THREE.MeshBasicMaterial;
  if (colorIndex === null) {
    material.color.set(UNPAINTED_COLOR);
  } else {
    material.color.set(COLOR_PALETTE[colorIndex]);
  }
}

// ---------------------------------------------------------------------------
// Module-level export (delegates to _canvasAPI, used by AudioEngine)
// ---------------------------------------------------------------------------

/**
 * Returns the ColorIndex stored for the cell at (col, row), or null if unpainted.
 * Delegates to the active canvas API instance so the dynamic import in AudioEngine
 * always reads the live grid state.
 */
export function getCellColor(col: number, row: number): number | null {
  return _canvasAPI?.getCellColor(col, row) ?? null;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the Three.js canvas inside the given container element.
 *
 * Sets up the scene, camera, renderer, and 16×16 mesh grid.
 * Returns the public API object.
 */
export function initCanvas(container: HTMLElement) {
  // ----- Scene -----
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d0d1a');

  // ----- Camera -----
  // OrthographicCamera(-8, 8, 8, -8, 0.1, 100) looking straight down the Y-axis
  camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(0, 10, 0);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, -1);

  // ----- Renderer -----
  renderer = new THREE.WebGLRenderer({ antialias: true });
  const width = container.clientWidth || 512;
  const height = container.clientHeight || 512;
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // ----- Mesh grid -----
  const geometry = new THREE.PlaneGeometry(1, 1);

  meshGrid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(UNPAINTED_COLOR),
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Position on XZ plane; Y=0
      mesh.position.set(col - 7.5, 0, row - 7.5);

      // Rotate so the PlaneGeometry (which faces +Z by default) faces +Y (up)
      mesh.rotation.x = -Math.PI / 2;

      mesh.userData = { col, row };

      scene.add(mesh);
      meshGrid[row * GRID_SIZE + col] = mesh;
    }
  }

  // ----- Initial render -----
  renderer.render(scene, camera);

  // ----- Raycasting pointer interaction -----
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isPointerDown = false;

  /**
   * Convert a pointer event's client coords to NDC and run a raycast.
   * Calls paintCell or eraseCell on the first hit, based on activeTool.
   */
  function handlePointerHit(event: PointerEvent): void {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(meshGrid);

    if (hits.length > 0) {
      const hit = hits[0];
      const { col, row } = hit.object.userData as { col: number; row: number };

      if (activeTool === 'paint') {
        api.paintCell(col, row, activeColor);
      } else if (activeTool === 'erase') {
        api.eraseCell(col, row);
      }
    }
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    isPointerDown = true;
    handlePointerHit(event);
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!isPointerDown) return;
    handlePointerHit(event);
  });

  renderer.domElement.addEventListener('pointerup', () => {
    isPointerDown = false;
  });

  // ----- Public API object -----
  const api = {
    /**
     * Returns the ColorIndex stored for the cell at (col, row), or null if unpainted.
     */
    getCellColor(col: number, row: number): number | null {
      const index = row * GRID_SIZE + col;
      return getCellColorByIndex(cellColors, index);
    },

    /**
     * Paint a cell with the given ColorIndex.
     * Pushes the previous state onto the undo stack (capped at UNDO_STACK_MAX).
     */
    paintCell(col: number, row: number, colorIndex: number): void {
      const index = row * GRID_SIZE + col;
      const prev = getCellColorByIndex(cellColors, index);

      if (undoStack.length >= UNDO_STACK_MAX) {
        undoStack.shift();
      }
      undoStack.push({ index, prev });

      cellColors = setCellColor(cellColors, index, colorIndex);
      updateMeshColor(index, colorIndex);

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    },

    /**
     * Erase a cell (set its color to null).
     * Pushes the previous state onto the undo stack (capped at UNDO_STACK_MAX).
     */
    eraseCell(col: number, row: number): void {
      const index = row * GRID_SIZE + col;
      const prev = getCellColorByIndex(cellColors, index);

      if (undoStack.length >= UNDO_STACK_MAX) {
        undoStack.shift();
      }
      undoStack.push({ index, prev });

      cellColors = setCellColor(cellColors, index, null);
      updateMeshColor(index, null);

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    },

    /**
     * Undo the most recent paint or erase action.
     * No-op if the undo stack is empty.
     */
    undo(): void {
      if (undoStack.length === 0) return;

      const entry = undoStack.pop();
      if (!entry) return;
      const { index, prev } = entry;

      cellColors = setCellColor(cellColors, index, prev);
      updateMeshColor(index, prev);

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    },

    /**
     * Returns a serializable snapshot of the full canvas state.
     */
    getFullState(): { cells: (number | null)[] } {
      return { cells: [...cellColors] };
    },

    /**
     * Restore the canvas to a previously captured state.
     * Writes all 256 values from state.cells, updates all meshes, and re-renders.
     */
    restoreState(state: { cells: (number | null)[] }): void {
      if (!state || !Array.isArray(state.cells)) return;

      for (let i = 0; i < 256; i++) {
        const colorIndex = state.cells[i] !== undefined ? state.cells[i] : null;
        cellColors = setCellColor(cellColors, i, colorIndex ?? null);
        updateMeshColor(i, colorIndex ?? null);
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    },

    /**
     * Set the active tool.
     */
    setActiveTool(tool: 'paint' | 'erase'): void {
      activeTool = tool;
    },

    /**
     * Set the active paint color index.
     */
    setActiveColor(colorIndex: number): void {
      activeColor = colorIndex;
    },
  };

  // Store reference for the module-level getCellColor export
  _canvasAPI = api;

  return api;
}
