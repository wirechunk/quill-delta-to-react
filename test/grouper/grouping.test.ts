import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { DeltaInsertOp } from './../../src/DeltaInsertOp.js';
import { InsertDataQuill } from './../../src/InsertData.js';
import {
  VideoItem,
  InlineGroup,
  BlockGroup,
} from './../../src/grouper/group-types.js';
import { DataType } from './../../src/value-types.js';
import {
  groupConsecutiveSameStyleBlocks,
  pairOpsWithTheirBlock,
} from '../../src/grouper/grouping.js';

describe('pairOpsWithTheirBlock', function () {
  const ops = [
    new DeltaInsertOp(new InsertDataQuill(DataType.Video, 'http://')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'how are you?')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'Time is money')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
      blockquote: true,
    }),
  ];

  it('should return ops grouped by group type', function () {
    var act = pairOpsWithTheirBlock(ops);
    var exp = [
      new VideoItem(ops[0]),
      new InlineGroup([ops[1], ops[2], ops[3], ops[4]]),
      new BlockGroup(ops[6], [ops[5]]),
    ];
    assert.deepEqual(act, exp);
  });
});

describe('groupConsecutiveSameStyleBlocks', function () {
  it('should combine blocks with same type and style into an []', function () {
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
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        attr1: true,
        renderAsBlock: true,
      }),
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
      header: true,
      codeBlocks: true,
      blockquotes: true,
      customBlocks: true,
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
