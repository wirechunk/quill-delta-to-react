import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { DeltaInsertOp } from './../../src/DeltaInsertOp.js';
import { InsertDataCustom, InsertDataQuill } from './../../src/InsertData.js';
import {
  BlockGroup,
  InlineGroup,
  VideoItem,
} from './../../src/grouper/group-types.js';
import { DataType } from './../../src/value-types.js';
import {
  groupConsecutiveSameStyleBlocks,
  pairOpsWithTheirBlock,
} from '../../src/grouper/grouping.js';

describe('pairOpsWithTheirBlock', () => {
  it('should return ops grouped by group type', function () {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Video, 'http://')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hey')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'how are you?')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'Time is money')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        blockquote: true,
      }),
    ];

    assert.deepEqual(pairOpsWithTheirBlock(ops), [
      new VideoItem(ops[0]),
      new InlineGroup([ops[1], ops[2], ops[3]]),
      new InlineGroup([ops[4], ops[5]]),
      new BlockGroup(ops[7], [ops[6]]),
    ]);
  });
});

describe('groupConsecutiveSameStyleBlocks', () => {
  it('should combine blocks with same type and style into an array', function () {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'this is code')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        'code-block': true,
      }),
      new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'this is code TOO!'),
      ),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        'code-block': true,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        blockquote: true,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        blockquote: true,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        header: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        header: 1,
      }),
      new DeltaInsertOp(
        new InsertDataCustom({
          attr1: true,
          renderAsBlock: true,
        }),
      ),
      new DeltaInsertOp(
        new InsertDataCustom({
          attr1: true,
          renderAsBlock: true,
        }),
      ),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        attr1: true,
        renderAsBlock: true,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        attr1: 'test',
        renderAsBlock: true,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        attr2: 'test',
        renderAsBlock: true,
      }),
    ];

    const pairs = pairOpsWithTheirBlock(ops);
    const groups = groupConsecutiveSameStyleBlocks(pairs, {
      multiLineBlockquote: true,
      multiLineCodeBlock: true,
      multiLineHeader: true,
    });

    assert.deepEqual(groups, [
      [new BlockGroup(ops[1], [ops[0]]), new BlockGroup(ops[1], [ops[2]])],
      [new BlockGroup(ops[4], []), new BlockGroup(ops[4], [])],
      new InlineGroup([ops[6]]),
      [new BlockGroup(ops[7], []), new BlockGroup(ops[8], [])],
      [new BlockGroup(ops[9], []), new BlockGroup(ops[10], [])],
      new BlockGroup(ops[11], []),
      new BlockGroup(ops[12], []),
    ]);
  });
});
