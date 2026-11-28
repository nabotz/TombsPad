// TEMP: Replace with shared model from src/core/model/
// These types are placeholders until Part C delivers the shared data model on Day 1

/**
 * Type of Halloween creature
 */
export type CritterType = 'ghost' | 'pumpkin' | 'bat' | 'spider';

/**
 * Cardinal direction (no diagonals)
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Grid position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * A single critter with its state
 */
export interface Critter {
  type: CritterType;
  position: Position;
  direction: Direction;
  /**
   * Optional counters for special behaviors (stretch goals)
   * - slowBeatCounter: for spider web slow effect (skip every other beat)
   * - zigzagStep: for bat zig-zag pattern
   */
  counters?: {
    slowBeatCounter?: number;
    zigzagStep?: number;
  };
}

/**
 * A single cell in the grid
 */
export interface Cell {
  color: string | null; // null = unpainted, string = hex color like '#ff0000'
  /**
   * Special cell properties (stretch goals)
   */
  special?: 'tombstone' | 'web' | 'candle' | 'portal';
}

/**
 * The game grid
 */
export interface Grid {
  width: number;
  height: number;
  cells: Cell[][]; // cells[y][x]
}

/**
 * Complete game state
 */
export interface GameState {
  grid: Grid;
  critters: Critter[];
}

/**
 * Event emitted when a critter triggers a note
 */
export interface NoteEvent {
  critterType: CritterType;
  position: Position;
  color: string; // hex color from the cell
}

/**
 * Result of movement logic
 */
export interface MovementResult {
  nextState: GameState;
  noteEvents: NoteEvent[];
}

/**
 * Result of placement logic
 */
export interface PlacementResult {
  success: boolean;
  state: GameState;
  error?: string;
}
