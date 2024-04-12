import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { InsertDataQuill, InsertDataCustom } from './../src/InsertData.js';
import { DataType } from './../src/value-types.js';

describe('InsertDataQuill', () => {
  describe('constructor', () => {
    it('should instantiate', () => {
      const t1 = new InsertDataQuill(DataType.Video, 'https://');
      assert.equal(t1.type === DataType.Video, true);
      assert.equal(t1.value === 'https://', true);

      const t2 = new InsertDataQuill(DataType.Text, 'hello');
      assert.equal(t2.type === DataType.Text, true);
      assert.equal(t2.value === 'hello', true);
    });
  });
});

describe('InsertDataCustom', () => {
  describe('constructor', () => {
    it('should instantiate', () => {
      const instance = new InsertDataCustom({ yoyoyo: 1 });
      assert.deepEqual(instance.value, { yoyoyo: 1 });
    });
  });
});
