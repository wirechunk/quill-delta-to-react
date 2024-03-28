import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  denormalizeInsertOp,
  tokenizeWithNewLines,
} from '../src/denormalizeInsertOp.js';
import { DeltaInsertOpType } from '../src/DeltaInsertOp.js';

describe('denormalizeInsertOp', function () {
  it('should return a denormalized op as an array of ops', function () {
    const op1: DeltaInsertOpType = { insert: '\n' };
    const got1 = denormalizeInsertOp({ insert: '\n' });
    assert.deepEqual(got1, [op1]);

    const op2: DeltaInsertOpType = { insert: 'abcd' };
    const got2 = denormalizeInsertOp(op2);
    assert.deepEqual(got2, [op2]);

    const op3: DeltaInsertOpType = {
      insert: 'abc\n',
      attributes: { link: 'cold' },
    };
    const got3 = denormalizeInsertOp(op3);
    assert.equal(got3.length, 2);
    assert.equal(got3[0].insert, 'abc');
    assert.equal(got3[0].attributes?.link, 'cold');

    const op4: DeltaInsertOpType = {
      insert: '\n\n',
      attributes: { bold: true },
    };
    const got4 = denormalizeInsertOp(op4);
    assert.equal(got4.length, 2);
    assert.equal(got4[1].insert, '\n');
  });
});

describe('tokenizeWithNewLines', function () {
  it('should split and return an array of strings ', () => {
    var act = '';
    assert.deepEqual(tokenizeWithNewLines(act), ['']);

    act = '\n';
    assert.deepEqual(tokenizeWithNewLines(act), ['\n']);

    act = 'abc';
    assert.deepEqual(tokenizeWithNewLines(act), ['abc']);

    act = 'abc\nd';
    assert.deepEqual(tokenizeWithNewLines(act), ['abc', '\n', 'd']);

    act = '\n\n';
    assert.deepEqual(tokenizeWithNewLines(act), ['\n', '\n']);

    act = '\n \n';
    assert.deepEqual(tokenizeWithNewLines(act), ['\n', ' ', '\n']);

    act = ' \nabc\n';
    assert.deepEqual(tokenizeWithNewLines(act), [' ', '\n', 'abc', '\n']);

    act = '\n\nabc\n\n6\n';
    assert.deepEqual(tokenizeWithNewLines(act), [
      '\n',
      '\n',
      'abc',
      '\n',
      '\n',
      '6',
      '\n',
    ]);
  });
});
