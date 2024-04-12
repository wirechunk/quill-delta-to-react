import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import { InsertDataQuill } from './../src/InsertData.js';
import { convertInsertValue } from '../src/convert-insert-value.js';
import { DataType } from '../src/value-types.js';

describe('convertInsertValue', function () {
  const noopSanitize = (v: string) => v;
  const append1Sanitize = (v: string) => `${v}1`;

  it('should convert text', () => {
    const got = convertInsertValue('hello', { urlSanitizer: noopSanitize });
    assert.ok(got instanceof InsertDataQuill);
    assert.ok(got.type === DataType.Text);
    assert.equal(got.value, 'hello');
  });

  it('should convert image', () => {
    const got = convertInsertValue(
      { image: 'http://example.com' },
      { urlSanitizer: noopSanitize },
    );
    assert.ok(got instanceof InsertDataQuill);
    assert.ok(got.type === DataType.Image);
    assert.equal(got.value, 'http://example.com');
  });

  it('should convert video', () => {
    const got = convertInsertValue(
      { video: 'http://example.com' },
      { urlSanitizer: noopSanitize },
    );
    assert.ok(got instanceof InsertDataQuill);
    assert.ok(got.type === DataType.Video);
    assert.equal(got.value, 'http://example.com');
  });

  it('should convert formula', () => {
    const got = convertInsertValue(
      { formula: 'x^2' },
      { urlSanitizer: noopSanitize },
    );
    assert.ok(got instanceof InsertDataQuill);
    assert.ok(got.type === DataType.Formula);
    assert.equal(got.value, 'x^2');
  });

  it('should sanitize an image URL', () => {
    const got = convertInsertValue(
      { image: 'http://example.com' },
      { urlSanitizer: append1Sanitize },
    );
    assert.ok(got instanceof InsertDataQuill);
    assert.ok(got.type === DataType.Image);
    assert.equal(got.value, 'http://example.com1');
  });

  it('should sanitize a video URL', () => {
    const got = convertInsertValue(
      { video: 'http://example.com' },
      { urlSanitizer: append1Sanitize },
    );
    assert.ok(got instanceof InsertDataQuill);
    assert.ok(got.type === DataType.Video);
    assert.equal(got.value, 'http://example.com1');
  });

  it('should ignore the sanitize options for text', () => {
    const got = convertInsertValue('hello', { urlSanitizer: append1Sanitize });
    assert.ok(got instanceof InsertDataQuill);
    assert.equal(got.value, 'hello');
  });
});
