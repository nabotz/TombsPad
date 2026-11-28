/**
 * cellState.ts
 * Pure cell-state helpers for the TombsPad 16×16 grid.
 *
 * Grid conventions:
 *   - 16 columns (col 0–15) × 16 rows (row 0–15) = 256 cells total
 *   - Flat index = row * 16 + col
 *   - CellId string = "col,row"
 *   - Cell value: ColorIndex (integer 0–7) | null
 */

export type ColorIndex = number | null;
export type CellState = ColorIndex[];

/**
 * Parse a CellId string into a flat array index.
 * @param cellId - e.g. "3,7"
 */
export function cellIdToIndex(cellId: string): number {
  const [col, row] = cellId.split(',').map(Number);
  return row * 16 + col;
}

/**
 * Convert a flat array index back to a CellId string.
 * @param index - flat index in [0, 255]
 */
export function indexToCellId(index: number): string {
  return `${index % 16},${Math.floor(index / 16)}`;
}

/**
 * Create a fresh cell-state array with all 256 cells set to null (unpainted).
 */
export function createCellState(): CellState {
  return new Array(256).fill(null);
}

/**
 * Return a new cell-state array with one cell updated (immutable update).
 * @param cells - current cell-state array
 * @param index - flat index of the cell to update
 * @param colorOrNull - new value: ColorIndex (0–7) or null
 */
export function setCellColor(cells: CellState, index: number, colorOrNull: ColorIndex): CellState {
  const next = cells.slice() as CellState;
  next[index] = colorOrNull;
  return next;
}

/**
 * Read the color stored at a flat index.
 * @param cells - cell-state array
 * @param index - flat index in [0, 255]
 */
export function getCellColorByIndex(cells: CellState, index: number): ColorIndex {
  return cells[index] ?? null;
}
