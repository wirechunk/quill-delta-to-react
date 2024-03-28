import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { MentionSanitizer } from './../../src/mentions/MentionSanitizer.js';

describe('MentionSanitizer', function () {
  describe('sanitize', function () {
    it('should return sanitized data', function () {
      let sanitized = MentionSanitizer.sanitize(
        <any>{
          class: 'A-cls-9',
          id: 'An-id_9:.',
          target: '_blank',
          avatar: 'http://www.yahoo.com',
          'end-point': 'http://abc.com',
          slug: 'my-name',
        },
        {},
      );

      assert.deepEqual(sanitized, {
        class: 'A-cls-9',
        id: 'An-id_9:.',
        target: '_blank',
        avatar: 'http://www.yahoo.com',
        'end-point': 'http://abc.com',
        slug: 'my-name',
      });
    });

    assert.deepEqual(MentionSanitizer.sanitize(<any>'a', {}), {});

    assert.deepEqual(MentionSanitizer.sanitize({ id: 'sb' }, {}), { id: 'sb' });
  });
});
