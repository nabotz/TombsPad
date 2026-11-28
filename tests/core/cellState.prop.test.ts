import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  cellIdToIndex, indexToCellId, createCellState, setCellColor, getCellColorByIndex
} from '../../src/core/cellState';

describe('cellState property tests', () => {
  it('cellIdToIndex and indexToCellId are inverses', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 255 }), (n) => {
      return cellIdToIndex(indexToCellId(n)) === n;
    }));
  });

  it('setCellColor stores the correct color', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 7 }),
      (idx, color) => {
        const cells = createCellState();
        const next = setCellColor(cells, idx, color);
        return getCellColorByIndex(next, idx) === color;
      }
    ));
  });

  it('setCellColor with null erases to null', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 255 }), (idx) => {
      const cells = createCellState();
      const painted = setCellColor(cells, idx, 3);
      const erased = setCellColor(painted, idx, null);
      return getCellColorByIndex(erased, idx) === null;
    }));
  });

  it('setCellColor does not mutate original array', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 7 }),
      (idx, color) => {
        const cells = createCellState();
        setCellColor(cells, idx, color);
        return cells[idx] === null;
      }
    ));
  });
});
