import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { InsertDataQuill } from './../src/InsertData.js';
import { convertInsertVal } from '../src/convertInsertVal.js';

describe('convertInsertVal', function () {
  it('should convert raw insert value', function () {
    ['fdsf', { image: 'ff' }, { video: '' }, { formula: '' }].forEach((v) => {
      const act = convertInsertVal(v, {});
      assert.notEqual(act, null);
      assert.ok(act instanceof InsertDataQuill);
    });
  });
});
