import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { Grouper } from './../../src/grouper/Grouper.js';
import { nestLists } from '../../src/grouper/nestLists.js';
import { DeltaInsertOp } from './../../src/DeltaInsertOp.js';
import {
  ListGroup,
  ListItem,
  InlineGroup,
  BlockGroup,
} from './../../src/grouper/group-types.js';
import { ListType } from './../../src/value-types.js';
import { inspect } from 'node:util';

describe('nestLists', function () {
  it('should not nest different types of lists', function () {
    var ops = [
      new DeltaInsertOp('ordered list 1 item 1'),
      new DeltaInsertOp('\n', { list: ListType.Ordered }),
      new DeltaInsertOp('bullet list 1 item 1'),
      new DeltaInsertOp('\n', { list: ListType.Bullet }),
      new DeltaInsertOp('bullet list 1 item 2'),
      new DeltaInsertOp('\n', { list: ListType.Bullet }),
      new DeltaInsertOp('haha'),
      new DeltaInsertOp('\n'),
      new DeltaInsertOp('\n', { list: ListType.Bullet }),
      new DeltaInsertOp('\n', { list: ListType.Checked }),
      new DeltaInsertOp('\n', { list: ListType.Unchecked }),
    ];

    var groups = Grouper.pairOpsWithTheirBlock(ops);
    var act = nestLists(groups);

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
      new DeltaInsertOp('a'),
      new DeltaInsertOp('\n', { list: ListType.Bullet }),
      new DeltaInsertOp('b'),
      new DeltaInsertOp('\n', { list: ListType.Bullet }),
      new DeltaInsertOp('c'),
      new DeltaInsertOp('\n', { list: ListType.Bullet, indent: 1 }),
      new DeltaInsertOp('d'),
      new DeltaInsertOp('\n', { list: ListType.Bullet, indent: 1 }),
      new DeltaInsertOp('e'),
      new DeltaInsertOp('\n', { list: ListType.Bullet }),
      new DeltaInsertOp('f'),
      new DeltaInsertOp('\n', { list: ListType.Bullet, indent: 1 }),
    ];

    const groups = Grouper.pairOpsWithTheirBlock(ops);
    console.log('GGGG');
    console.log(inspect(groups, false, null, true));

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
    console.log('>>>>>>>>>');
    console.log(inspect(got, false, null, true));
    console.log('>>>');
    console.log(inspect(expected, false, null, true));

    assert.deepEqual(got, expected);
  });

  it('should nest if lists are same and later ones have higher indent', function () {
    var ops = [
      new DeltaInsertOp('item 1'),
      new DeltaInsertOp('\n', { list: ListType.Ordered }),
      new DeltaInsertOp('item 1a'),
      new DeltaInsertOp('\n', { list: ListType.Ordered, indent: 1 }),
      new DeltaInsertOp('item 1a-i'),
      new DeltaInsertOp('\n', { list: ListType.Ordered, indent: 3 }),
      new DeltaInsertOp('item 1b'),
      new DeltaInsertOp('\n', { list: ListType.Ordered, indent: 1 }),
      new DeltaInsertOp('item 2'),
      new DeltaInsertOp('\n', { list: ListType.Ordered }),
      new DeltaInsertOp('haha'),
      new DeltaInsertOp('\n'),
      new DeltaInsertOp('\n', { list: ListType.Ordered, indent: 5 }),
      new DeltaInsertOp('\n', { list: ListType.Bullet, indent: 4 }),
    ];
    var pairs = Grouper.pairOpsWithTheirBlock(ops);

    const act = nestLists(pairs);
    console.log(inspect(act, false, null, true));

    var l1b = new ListItem(<BlockGroup>pairs[3]);
    var lai = new ListGroup([new ListItem(<BlockGroup>pairs[2])]);
    var l1a = new ListGroup([new ListItem(<BlockGroup>pairs[1], lai)]);

    const li1 = new ListGroup([
      new ListItem(
        pairs[0] as BlockGroup,
        new ListGroup(l1a.items.concat(l1b)),
      ),
    ]);
    var li2 = new ListGroup([new ListItem(<BlockGroup>pairs[4])]);

    assert.deepEqual(act, [
      new ListGroup(li1.items.concat(li2.items)),

      new InlineGroup([ops[10], ops[11]]),
      new ListGroup([new ListItem(new BlockGroup(ops[12], []))]),
      new ListGroup([new ListItem(new BlockGroup(ops[13], []))]),
    ]);
  });
});
