import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { DeltaInsertOp } from '../../src/DeltaInsertOp.js';
import { groupTables } from '../../src/grouper/group-tables.js';
import {
  TableGroup,
  TableRow,
  TableCell,
  BlockGroup,
} from '../../src/grouper/group-types.js';
import { pairOpsWithTheirBlock } from '../../src/grouper/grouping.js';

describe('TableGrouper', function () {
  describe('empty table', function () {
    var ops = [
      new DeltaInsertOp('\n', { table: 'row-1' }),
      new DeltaInsertOp('\n', { table: 'row-1' }),
      new DeltaInsertOp('\n', { table: 'row-1' }),
      new DeltaInsertOp('\n', { table: 'row-2' }),
      new DeltaInsertOp('\n', { table: 'row-2' }),
      new DeltaInsertOp('\n', { table: 'row-2' }),
      new DeltaInsertOp('\n', { table: 'row-3' }),
      new DeltaInsertOp('\n', { table: 'row-3' }),
      new DeltaInsertOp('\n', { table: 'row-3' }),
    ];

    it('should return table with 3 rows and 3 cells', function () {
      const groups = pairOpsWithTheirBlock(ops);
      var act = groupTables(groups);
      var exp = [
        new TableGroup([
          new TableRow([
            new TableCell(<BlockGroup>groups[0]),
            new TableCell(<BlockGroup>groups[1]),
            new TableCell(<BlockGroup>groups[2]),
          ]),
          new TableRow([
            new TableCell(<BlockGroup>groups[3]),
            new TableCell(<BlockGroup>groups[4]),
            new TableCell(<BlockGroup>groups[5]),
          ]),
          new TableRow([
            new TableCell(<BlockGroup>groups[6]),
            new TableCell(<BlockGroup>groups[7]),
            new TableCell(<BlockGroup>groups[8]),
          ]),
        ]),
      ];

      assert.deepEqual(act, exp);
    });
  });

  describe('single 1 row table', function () {
    var ops = [
      new DeltaInsertOp('cell1'),
      new DeltaInsertOp('\n', { table: 'row-1' }),
      new DeltaInsertOp('cell2'),
      new DeltaInsertOp('\n', { table: 'row-1' }),
    ];

    it('should return table with 1 row', function () {
      const groups = pairOpsWithTheirBlock(ops);
      var act = groupTables(groups);
      var exp = [
        new TableGroup([
          new TableRow([
            new TableCell(<BlockGroup>groups[0]),
            new TableCell(<BlockGroup>groups[1]),
          ]),
        ]),
      ];

      assert.deepEqual(act, exp);
    });
  });

  describe('single 1 col table', function () {
    var ops = [
      new DeltaInsertOp('cell1'),
      new DeltaInsertOp('\n', { table: 'row-1' }),
      new DeltaInsertOp('cell2'),
      new DeltaInsertOp('\n', { table: 'row-2' }),
    ];

    it('should return table with 1 col', function () {
      const groups = pairOpsWithTheirBlock(ops);
      var act = groupTables(groups);
      var exp = [
        new TableGroup([
          new TableRow([new TableCell(<BlockGroup>groups[0])]),
          new TableRow([new TableCell(<BlockGroup>groups[1])]),
        ]),
      ];

      assert.deepEqual(act, exp);
    });
  });
});