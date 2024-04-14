import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { InsertDataQuill } from '../src/insert-data.js';
import { DeltaInsertOp } from '../src/delta-insert-op.js';
import { DataType, ListType } from '../src/value-types.js';

describe('DeltaInsertOp', () => {
  describe('constructor', function () {
    it('should instantiate', function () {
      const embed = new InsertDataQuill(DataType.Image, 'https://');
      const t = new DeltaInsertOp(embed);
      assert.equal(t instanceof DeltaInsertOp, true);
      assert.equal(t.insert instanceof InsertDataQuill, true);
      assert.equal(t.attributes instanceof Object, true);

      const t2 = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'test'));
      assert.deepEqual(t2.insert.value, 'test');

      const t3 = new DeltaInsertOp(
        new InsertDataQuill(DataType.Formula, 'x=data'),
      );
      assert.equal(t3.insert.value, 'x=data');
    });
  });

  describe('isContainerBlock', function () {
    it('should check if the op is a block container', function () {
      const inlineOp = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'test'),
      );
      assert.equal(inlineOp.isContainerBlock(), false);

      const blockOp = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'test'),
        {
          blockquote: true,
        },
      );
      assert.equal(blockOp.isContainerBlock(), true);
    });
  });

  describe('isInline', function () {
    it('should return true if op is an inline', function () {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, '\n'),
        {},
      );
      assert.equal(op.isInline(), true);
    });
  });

  describe('isJustNewline', function () {
    it('should return true if op is a list', function () {
      let op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {});
      assert.equal(op.isJustNewline(), true);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n\n '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isJustNewline(), false);
    });
  });

  describe('isList', function () {
    it('should return true if op is a list', function () {
      let op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {});
      assert.equal(op.isList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isList(), true);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Unchecked,
      });
      assert.equal(op.isList(), true);
    });
  });

  describe('isBulletList', function () {
    it('should return true if op is a bullet list', function () {
      let op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isBulletList(), true);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isBulletList(), false);
    });
  });

  describe('isOrderedList', function () {
    it('should return true if op is an ordered list', function () {
      let op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isOrderedList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isOrderedList(), true);
    });
  });

  describe('isCheckedList', function () {
    it('should return true if op is an checked list', function () {
      let op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Unchecked,
      });
      assert.equal(op.isCheckedList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Checked,
      });
      assert.equal(op.isCheckedList(), true);
    });
  });

  describe('isUncheckedList', function () {
    it('should return true if op is an unchecked list', function () {
      let op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isUncheckedList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Unchecked,
      });
      assert.equal(op.isUncheckedList(), true);
    });
  });

  describe('isSameListAs', function () {
    it('should return true if op list type same as the comparison', function () {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      const op2 = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'ds'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isSameListAs(op2), true);

      const op3 = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'fds '),
        {
          list: ListType.Ordered,
        },
      );
      assert.equal(op.isSameListAs(op3), false);
    });
  });

  describe('isLink', () => {
    it('should correctly identify if op is a link', function () {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Video, ''), {
        link: 'http://',
      });
      assert.equal(op.isLink(), false);

      const op2 = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'http'),
        {
          link: 'http://',
        },
      );
      assert.equal(op2.isLink(), true);
    });
  });
});
