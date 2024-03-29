import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { encodeLink } from './../src/funcs-html.js';

describe('encodeLink', function () {
  it('should encode a link', function () {
    const act = encodeLink('http://www.yahoo.com/?a=b&c=<>()"\'');
    assert.equal(
      act,
      'http://www.yahoo.com/?a=b&amp;c=&lt;&gt;&#40;&#41;&quot;&#x27;',
    );
  });
});
