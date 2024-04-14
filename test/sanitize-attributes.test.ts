import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import {
  isValidColorLiteral,
  isValidFontName,
  isValidHexColor,
  isValidLang,
  isValidRel,
  isValidRGBColor,
  isValidSize,
  isValidTarget,
  isValidWidth,
  OpAttributeSanitizerOptions,
  sanitizeAttributes,
} from '../src/sanitize-attributes.js';
import { ListType, AlignType, DirectionType } from './../src/value-types.js';

describe('isValidHexColor', () => {
  it('should return true for valid HEX colors', () => {
    assert.ok(isValidHexColor('#234'));
    assert.ok(isValidHexColor('#f23'));
    assert.ok(isValidHexColor('#fFe234'));
    assert.equal(isValidHexColor('#g34'), false);
  });

  it('should return false for invalid strings', () => {
    assert.equal(isValidHexColor('e34'), false);
    assert.equal(isValidHexColor('123434'), false);
  });
});

describe('isValidFontName', () => {
  it('should return true for valid font names', () => {
    assert.equal(isValidFontName('gooD-ol times 2'), true);
  });

  it('should return false for invalid strings', () => {
    assert.equal(isValidFontName(''), false);
    assert.equal(isValidHexColor('bad"str?'), false);
  });
});

describe('isValidSize', () => {
  it('should return true for valid sizes', function () {
    assert.ok(isValidSize('bigfaT-size'));
  });

  it('should return false for invalid strings', () => {
    assert.equal(isValidSize(''), false);
    assert.equal(isValidSize('big-fat-size!'), false);
    assert.equal(isValidSize('small.size?'), false);
  });
});

describe('isValidTarget', () => {
  it('should return true for valid targets', () => {
    ['_self', '_blank', '_parent', '_top'].forEach((target) => {
      assert.ok(isValidTarget(target));
    });
  });

  it('should return false for invalid strings', () => {
    assert.equal(isValidTarget('<'), false);
    assert.equal(isValidTarget('~'), false);
    assert.equal(isValidTarget('_blank+'), false);
  });
});

describe('isValidWidth', function () {
  it('should return true if width is valid', function () {
    assert.ok(isValidWidth('150'));
    assert.ok(isValidWidth('100px'));
    assert.ok(isValidWidth('150em'));
    assert.ok(isValidWidth('10%'));
    assert.equal(isValidWidth('250%px'), false);
    assert.equal(isValidWidth('250% border-box'), false);
    assert.equal(isValidWidth('250.80'), false);
    assert.equal(isValidWidth('250x'), false);
  });
});

describe('isValidColorLiteral', function () {
  it('should return true if color literal is valid', function () {
    assert.ok(isValidColorLiteral('yellow'));
    assert.ok(isValidColorLiteral('r'));
    assert.equal(isValidColorLiteral('#234'), false);
    assert.equal(isValidColorLiteral('#fFe234'), false);
    assert.equal(isValidColorLiteral('red1'), false);
    assert.equal(isValidColorLiteral('red-green'), false);
    assert.equal(isValidColorLiteral(''), false);
  });
});

describe('isValidRGBColor', function () {
  it('should return true if rgb color is valid', function () {
    assert.ok(isValidRGBColor('rgb(0,0,0)'));
    assert.ok(isValidRGBColor('rgb(255, 99, 1)'));
    assert.ok(isValidRGBColor('RGB(254, 249, 109)'));
    assert.equal(isValidRGBColor('yellow'), false);
    assert.equal(isValidRGBColor('#FFF'), false);
    assert.equal(isValidRGBColor('rgb(256,0,0)'), false);
    assert.equal(isValidRGBColor('rgb(260,0,0)'), false);
    assert.equal(isValidRGBColor('rgb(2000,0,0)'), false);
  });
});

describe('isValidRel', function () {
  it('should return true if rel is valid', function () {
    assert.ok(isValidRel('nofollow'));
    assert.ok(isValidRel('tag'));
    assert.ok(isValidRel('tag nofollow'));
    assert.equal(isValidRel('no"follow'), false);
    assert.equal(isValidRel('tag1'), false);
    assert.equal(isValidRel(''), false);
  });
});

describe('isValidLang', function () {
  it('should return true if lang is valid', function () {
    assert.ok(isValidLang('javascript'));
    assert.ok(isValidLang('C++'));
    assert.ok(isValidLang('HTML/XML'));
    assert.equal(isValidLang('lang"uage'), false);
    assert.equal(isValidLang(''), false);
  });
});

describe('sanitizeAttributes', () => {
  const noopSanitizeOptions: OpAttributeSanitizerOptions = {
    urlSanitizer: (url) => url,
  };

  it('should return sanitized attributes', () => {
    const attrs = {
      bold: 'nonboolval',
      color: '#12345H',
      background: '#333',
      font: 'times new roman',
      size: 'x.large',
      link: 'http://<',
      script: 'supper',
      list: ListType.Ordered,
      header: '3',
      indent: 40,
      direction: DirectionType.Rtl,
      align: AlignType.Center,
      width: '3',
      customAttr1: 'shouldnt be touched',
      mentions: true,
      mention: {
        class: 'A-cls-9',
        id: 'An-id_9:.',
        target: '_blank',
        avatar: 'http://www.yahoo.com',
        slug: 'my-name',
      },
    };
    assert.deepEqual(sanitizeAttributes(attrs, noopSanitizeOptions), {
      bold: true,
      background: '#333',
      font: 'times new roman',
      link: 'http://<',
      list: 'ordered',
      header: 3,
      indent: 30,
      direction: 'rtl',
      align: 'center',
      width: '3',
      customAttr1: 'shouldnt be touched',
      mentions: true,
      mention: {
        class: 'A-cls-9',
        id: 'An-id_9:.',
        target: '_blank',
        avatar: 'http://www.yahoo.com',
        slug: 'my-name',
      },
    });
  });

  it('should sanitize mentions', () => {
    assert.deepEqual(
      sanitizeAttributes(
        {
          mentions: true,
          mention: 1,
        },
        noopSanitizeOptions,
      ),
      {
        mentions: true,
        mention: {},
      },
    );
  });

  it('should keep a valid header value of 1', () => {
    assert.deepEqual(sanitizeAttributes({ header: 1 }, noopSanitizeOptions), {
      header: 1,
    });
  });

  it('should exclude an undefined header value', () => {
    assert.deepEqual(
      sanitizeAttributes({ header: undefined }, noopSanitizeOptions),
      {},
    );
  });

  it('should clamp a header value to 6', () => {
    assert.deepEqual(sanitizeAttributes({ header: 100 }, noopSanitizeOptions), {
      header: 6,
    });
  });

  it('should keep a valid align value', () => {
    assert.deepEqual(
      sanitizeAttributes({ align: AlignType.Center }, noopSanitizeOptions),
      { align: 'center' },
    );
  });

  it('should keep a valid direction value', () => {
    assert.deepEqual(
      sanitizeAttributes({ direction: DirectionType.Rtl }, noopSanitizeOptions),
      { direction: 'rtl' },
    );
  });

  it('should keep a valid indent value', () => {
    assert.deepEqual(sanitizeAttributes({ indent: 2 }, noopSanitizeOptions), {
      indent: 2,
    });
  });
});
