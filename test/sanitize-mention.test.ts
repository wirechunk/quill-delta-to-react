import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import { sanitizeMention } from '../src/sanitize-mention.js';

describe('sanitizeMention', () => {
  it('should run sanitized data while running the link URL through the URL sanitizer', () => {
    const sanitized = sanitizeMention(
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
      sanitizeMention('a', {
        urlSanitizer: (url) => url,
      }),
      {},
    );
  });
});
