import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { InsertDataQuill } from './../src/InsertData.js';
import { convertInsertValue } from '../src/convert-insert-value.js';

describe('convertInsertValue', function () {
  it('should convert raw insert value', function () {
    ['fdsf', { image: 'ff' }, { video: '' }, { formula: '' }].forEach((v) => {
      const act = convertInsertValue(v, {});
      assert.notEqual(act, null);
      assert.ok(act instanceof InsertDataQuill);
    });
  });
});
