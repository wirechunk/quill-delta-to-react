import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { InsertDataQuill } from '../src/InsertData.js';
import { DeltaInsertOp } from '../src/DeltaInsertOp.js';
import { DataType, ListType } from '../src/value-types.js';

describe('DeltaInsertOp', () => {
  describe('constructor', function () {
    it('should instantiate', function () {
      var embed = new InsertDataQuill(DataType.Image, 'https://');
      var t = new DeltaInsertOp(embed);
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

  describe('isContainerBlock()', function () {
    it('should successfully check if the op is a block container', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'test'));
      assert.equal(op.isContainerBlock(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'test'), {
        blockquote: true,
      });
      assert.equal(op.isContainerBlock(), true);
    });
  });

  describe('isInline', function () {
    it('should return true if op is an inline', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {});
      assert.equal(op.isInline(), true);
    });
  });

  describe('isJustNewline()', function () {
    it('should return true if op is a list', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {});
      assert.equal(op.isJustNewline(), true);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n\n '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isJustNewline(), false);
    });
  });

  describe('isList()', function () {
    it('should return true if op is a list', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {});
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

  describe('isBulletList()', function () {
    it('should return true if op is a bullet list', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isBulletList(), true);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isBulletList(), false);
    });
  });

  describe('isOrderedList()', function () {
    it('should return true if op is an ordered list', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isOrderedList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isOrderedList(), true);
    });
  });

  describe('isCheckedList()', function () {
    it('should return true if op is an checked list', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Unchecked,
      });
      assert.equal(op.isCheckedList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Checked,
      });
      assert.equal(op.isCheckedList(), true);
    });
  });

  describe('isUncheckedList()', function () {
    it('should return true if op is an unchecked list', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isUncheckedList(), false);

      op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Unchecked,
      });
      assert.equal(op.isUncheckedList(), true);
    });
  });

  describe('isSameListAs()', function () {
    it('should return true if op list type same as the comparison', function () {
      var op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      var op2 = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'ds'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isSameListAs(op2), true);

      var op3 = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'fds '), {
        list: ListType.Ordered,
      });
      assert.equal(op.isSameListAs(op3), false);
    });
  });

  describe('isText()', function () {
    it('should correctly identify insert type', function () {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(op.isVideo(), false);
      assert.equal(op.isText(), true);

      const op2 = new DeltaInsertOp(new InsertDataQuill(DataType.Image, 'd'), {
        list: ListType.Ordered,
      });
      assert.equal(op2.isImage(), true);
      assert.equal(op2.isText(), false);
    });
  });

  it('should correctly identify a video', function () {
    const op = new DeltaInsertOp(new InsertDataQuill(DataType.Video, ''));
    assert.equal(op.isVideo(), true);
    assert.equal(op.isFormula(), false);
    assert.equal(op.isImage(), false);
  });

  it('should correctly identify an image', function () {
    const op = new DeltaInsertOp(new InsertDataQuill(DataType.Image, 'd'));
    assert.equal(op.isImage(), true);
    assert.equal(op.isFormula(), false);
  });

  it('should correctly identify a formula', function () {
    const op = new DeltaInsertOp(new InsertDataQuill(DataType.Formula, 'd'));
    assert.equal(op.isVideo(), false);
    assert.equal(op.isFormula(), true);
  });

  describe('isLink()', function () {
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
