import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { MentionSanitizer } from '../src/MentionSanitizer.js';

describe('MentionSanitizer', () => {
  describe('sanitize', () => {
    it('should run the link URL through the URL sanitizer', () => {
      const sanitized = MentionSanitizer.sanitize(
        {
          class: 'cls-9',
          id: 'An-id_9',
          target: '_blank',
          link: 'http://www.yahoo.com',
          slug: 'my-name',
        },
        {
          urlSanitizer: (url) => `${url}1`,
        },
      );

      assert.deepEqual(sanitized, {
        class: 'cls-9',
        id: 'An-id_9',
        target: '_blank',
        link: 'http://www.yahoo.com1',
        slug: 'my-name',
      });
    });

    it('should discard a string', () => {
      assert.deepEqual(
        MentionSanitizer.sanitize('a', {
          urlSanitizer: (url) => url,
        }),
        {},
      );
    });

    it('should return sanitized data (3)', () => {
      assert.deepEqual(
        MentionSanitizer.sanitize(
          { id: 'sb' },
          {
            urlSanitizer: (url) => url,
          },
        ),
        {
          id: 'sb',
        },
      );
    });
  });
});
