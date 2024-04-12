import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { DeltaInsertOp } from './../../src/DeltaInsertOp.js';
import { InsertDataCustom, InsertDataQuill } from './../../src/InsertData.js';
import {
  BlockGroup,
  BlotBlock,
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
  const ops = [
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'this is code')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
      'code-block': true,
    }),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'this is code TOO!')),
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
      color: 'red',
    }),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
      header: 1,
      color: 'red',
    }),
    new DeltaInsertOp(new InsertDataCustom({ custom: 1 }), {
      renderAsBlock: true,
    }),
    new DeltaInsertOp(new InsertDataCustom({ custom: 2 }), {
      renderAsBlock: true,
    }),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
      attr1: 'test',
    }),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
      attr1: 'test',
    }),
    new DeltaInsertOp(new InsertDataCustom({ custom: 1 })),
    new DeltaInsertOp(new InsertDataCustom({ custom: 2 })),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
    new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
  ];

  const pairs = pairOpsWithTheirBlock(ops);

  it('should combine blocks with same type and style into an array when all grouping options are enabled', () => {
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
      new BlotBlock(ops[9] as DeltaInsertOp<InsertDataCustom>),
      new BlotBlock(ops[10] as DeltaInsertOp<InsertDataCustom>),
      new InlineGroup([ops[11]]),
      new InlineGroup([ops[12]]),
      new InlineGroup([ops[13], ops[14], ops[15]]),
      new InlineGroup([ops[16]]),
    ]);
  });

  it('should combine only code blocks with same style into an array when only the multiLineCodeBlock option is enabled', () => {
    const groups = groupConsecutiveSameStyleBlocks(pairs, {
      multiLineBlockquote: false,
      multiLineCodeBlock: true,
      multiLineHeader: false,
    });

    assert.deepEqual(groups, [
      [new BlockGroup(ops[1], [ops[0]]), new BlockGroup(ops[1], [ops[2]])],
      new BlockGroup(ops[4], []),
      new BlockGroup(ops[5], []),
      new InlineGroup([ops[6]]),
      new BlockGroup(ops[7], []),
      new BlockGroup(ops[8], []),
      new BlotBlock(ops[9] as DeltaInsertOp<InsertDataCustom>),
      new BlotBlock(ops[10] as DeltaInsertOp<InsertDataCustom>),
      new InlineGroup([ops[11]]),
      new InlineGroup([ops[12]]),
      new InlineGroup([ops[13], ops[14], ops[15]]),
      new InlineGroup([ops[16]]),
    ]);
  });

  it('should combine only header blocks with same style into an array when only the multiLineHeader option is enabled', () => {
    const groups = groupConsecutiveSameStyleBlocks(pairs, {
      multiLineBlockquote: false,
      multiLineCodeBlock: false,
      multiLineHeader: true,
    });

    assert.deepEqual(groups, [
      new BlockGroup(ops[1], [ops[0]]),
      new BlockGroup(ops[3], [ops[2]]),
      new BlockGroup(ops[4], []),
      new BlockGroup(ops[5], []),
      new InlineGroup([ops[6]]),
      [new BlockGroup(ops[7], []), new BlockGroup(ops[8], [])],
      new BlotBlock(ops[9] as DeltaInsertOp<InsertDataCustom>),
      new BlotBlock(ops[10] as DeltaInsertOp<InsertDataCustom>),
      new InlineGroup([ops[11]]),
      new InlineGroup([ops[12]]),
      new InlineGroup([ops[13], ops[14], ops[15]]),
      new InlineGroup([ops[16]]),
    ]);
  });

  it('should combine header blocks with the same style when they have text', () => {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), {
        header: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        header: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'bye'), {
        header: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        header: 1,
      }),
    ];

    const pairs = pairOpsWithTheirBlock(ops);

    const groups = groupConsecutiveSameStyleBlocks(pairs, {
      multiLineBlockquote: false,
      multiLineCodeBlock: false,
      multiLineHeader: true,
    });

    assert.deepEqual(groups, [
      [
        new BlockGroup(ops[0], []),
        new BlockGroup(ops[1], []),
        new BlockGroup(ops[2], []),
        new BlockGroup(ops[3], []),
      ],
    ]);
  });

  it('should not combine code blocks with different attributes', () => {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        'code-block': true,
        color: 'red',
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        'code-block': true,
      }),
    ];

    const pairs = pairOpsWithTheirBlock(ops);

    const groups = groupConsecutiveSameStyleBlocks(pairs, {
      multiLineBlockquote: true,
      multiLineCodeBlock: true,
      multiLineHeader: true,
    });

    assert.deepEqual(groups, [
      new BlockGroup(ops[0], []),
      new BlockGroup(ops[1], []),
    ]);
  });

  it('should not combine headers with different attributes', () => {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        header: 1,
        color: 'red',
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        header: 1,
      }),
    ];

    const pairs = pairOpsWithTheirBlock(ops);

    const groups = groupConsecutiveSameStyleBlocks(pairs, {
      multiLineBlockquote: true,
      multiLineCodeBlock: true,
      multiLineHeader: true,
    });

    assert.deepEqual(groups, [
      new BlockGroup(ops[0], []),
      new BlockGroup(ops[1], []),
    ]);
  });
});
