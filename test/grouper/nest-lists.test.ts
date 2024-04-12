import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { nestLists } from '../../src/grouper/nest-lists.js';
import { DeltaInsertOp } from './../../src/DeltaInsertOp.js';
import {
  ListGroup,
  ListItem,
  InlineGroup,
  BlockGroup,
} from './../../src/grouper/group-types.js';
import { DataType, ListType } from './../../src/value-types.js';
import { pairOpsWithTheirBlock } from '../../src/grouper/grouping.js';
import { InsertDataQuill } from '../../src/InsertData.js';

describe('nestLists', function () {
  it('should not nest different types of lists', function () {
    const ops = [
      new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'ordered list 1 item 1'),
      ),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
      }),
      new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'bullet list 1 item 1'),
      ),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      }),
      new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'bullet list 1 item 2'),
      ),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'haha')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Checked,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Unchecked,
      }),
    ];

    const groups = pairOpsWithTheirBlock(ops);
    const act = nestLists(groups);

    assert.deepEqual(act, [
      new ListGroup([new ListItem(<BlockGroup>groups[0])]),
      new ListGroup([
        new ListItem(<BlockGroup>groups[1]),
        new ListItem(<BlockGroup>groups[2]),
      ]),
      new InlineGroup([ops[6], ops[7]]),
      new ListGroup([new ListItem(new BlockGroup(ops[8], []))]),
      new ListGroup([
        new ListItem(new BlockGroup(ops[9], [])),
        new ListItem(new BlockGroup(ops[10], [])),
      ]),
    ]);
  });

  it('should nest a simple list', () => {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'a')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'b')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'c')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
        indent: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'd')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
        indent: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'e')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
        indent: 1,
      }),
    ];

    const groups = pairOpsWithTheirBlock(ops);

    const got = nestLists(groups);
    const expected = [
      new ListGroup([
        new ListItem(groups[0] as BlockGroup),
        new ListItem(
          groups[1] as BlockGroup,
          new ListGroup([
            new ListItem(groups[2] as BlockGroup),
            new ListItem(groups[3] as BlockGroup),
          ]),
        ),
        new ListItem(
          groups[4] as BlockGroup,
          new ListGroup([new ListItem(groups[5] as BlockGroup)]),
        ),
      ]),
    ];

    assert.deepEqual(got, expected);
  });

  it('should nest if lists are same and later ones have higher indent', function () {
    const ops = [
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'item 1')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'item 1a')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
        indent: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'item 1a-i')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
        indent: 3,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'item 1b')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
        indent: 1,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'item 2')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'haha')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
        indent: 5,
      }),
      new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
        indent: 4,
      }),
    ];
    const pairs = pairOpsWithTheirBlock(ops);

    const act = nestLists(pairs);

    const lai = new ListGroup([new ListItem(<BlockGroup>pairs[2])]);
    const l1a = new ListGroup([new ListItem(<BlockGroup>pairs[1], lai)]);
    const l1b = new ListItem(<BlockGroup>pairs[3]);

    const li1 = new ListGroup([
      new ListItem(
        pairs[0] as BlockGroup,
        new ListGroup(l1a.items.concat(l1b)),
      ),
    ]);
    const li2 = new ListGroup([new ListItem(<BlockGroup>pairs[4])]);

    const expected = [
      new ListGroup(li1.items.concat(li2.items)),
      new InlineGroup([ops[10], ops[11]]),
      new ListGroup([new ListItem(new BlockGroup(ops[12], []))]),
      new ListGroup([new ListItem(new BlockGroup(ops[13], []))]),
    ];

    assert.deepEqual(act, expected);
  });
});
