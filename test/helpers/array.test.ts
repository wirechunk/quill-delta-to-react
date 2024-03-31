import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { groupConsecutiveElementsWhile } from '../../src/helpers/array.js';

describe('groupConsecutiveElementsWhile', () => {
  it('should move consecutive elements matching predicate into an array (1)', () => {
    var arr = [1, 'ha', 3, 'ha', 'ha'];
    var grp = groupConsecutiveElementsWhile(
      arr,
      (v, prev) => typeof v === typeof prev,
    );
    assert.deepEqual(grp, [1, 'ha', 3, ['ha', 'ha']]);
  });

  it('should move consecutive elements matching predicate into an array (2)', () => {
    const arr2 = [1, 2, 3, 10, 11, 12];
    const grp2 = groupConsecutiveElementsWhile<number>(
      arr2,
      (v, prev) => v - 1 === prev,
    );
    assert.deepEqual(grp2, [
      [1, 2, 3],
      [10, 11, 12],
    ]);
  });
});
