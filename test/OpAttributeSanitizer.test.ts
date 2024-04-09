import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  OpAttributeSanitizer,
  OpAttributeSanitizerOptions,
} from './../src/OpAttributeSanitizer.js';
import { ListType, AlignType, DirectionType } from './../src/value-types.js';

describe('OpAttributeSanitizer', function () {
  describe('isValidHexColor', function () {
    it('should return true for valid HEX colors', () => {
      assert.ok(OpAttributeSanitizer.isValidHexColor('#234'));
      assert.ok(OpAttributeSanitizer.isValidHexColor('#f23'));
      assert.ok(OpAttributeSanitizer.isValidHexColor('#fFe234'));
      assert.equal(OpAttributeSanitizer.isValidHexColor('#g34'), false);
    });

    it('should return false for invalid strings', () => {
      assert.equal(OpAttributeSanitizer.isValidHexColor('e34'), false);
      assert.equal(OpAttributeSanitizer.isValidHexColor('123434'), false);
    });
  });

  describe('isValidFontName', () => {
    it('should return true for valid font names', () => {
      assert.equal(
        OpAttributeSanitizer.isValidFontName('gooD-ol times 2'),
        true,
      );
    });

    it('should return false for invalid strings', () => {
      assert.equal(OpAttributeSanitizer.isValidFontName(''), false);
      assert.equal(OpAttributeSanitizer.isValidHexColor('bad"str?'), false);
    });
  });

  describe('isValidSize', () => {
    it('should return true for valid sizes', function () {
      assert.ok(OpAttributeSanitizer.isValidSize('bigfaT-size'));
    });

    it('should return false for invalid strings', () => {
      assert.equal(OpAttributeSanitizer.isValidSize(''), false);
      assert.equal(OpAttributeSanitizer.isValidSize('big-fat-size!'), false);
      assert.equal(OpAttributeSanitizer.isValidSize('small.size?'), false);
    });
  });

  describe('isValidTarget', () => {
    it('should return true for valid targets', () => {
      ['_self', '_blank', '_parent', '_top'].forEach((target) => {
        assert.ok(OpAttributeSanitizer.isValidTarget(target));
      });
    });

    it('should return false for invalid strings', () => {
      assert.equal(OpAttributeSanitizer.isValidTarget('<'), false);
      assert.equal(OpAttributeSanitizer.isValidTarget('~'), false);
      assert.equal(OpAttributeSanitizer.isValidTarget('_blank+'), false);
    });
  });

  describe('#IsValidWidth()', function () {
    it('should return true if width is valid', function () {
      assert.ok(OpAttributeSanitizer.IsValidWidth('150'));
      assert.ok(OpAttributeSanitizer.IsValidWidth('100px'));
      assert.ok(OpAttributeSanitizer.IsValidWidth('150em'));
      assert.ok(OpAttributeSanitizer.IsValidWidth('10%'));
      assert.equal(OpAttributeSanitizer.IsValidWidth('250%px'), false);
      assert.equal(OpAttributeSanitizer.IsValidWidth('250% border-box'), false);
      assert.equal(OpAttributeSanitizer.IsValidWidth('250.80'), false);
      assert.equal(OpAttributeSanitizer.IsValidWidth('250x'), false);
    });
  });

  describe('#IsValidColorLiteral()', function () {
    it('should return true if color literal is valid', function () {
      assert.ok(OpAttributeSanitizer.IsValidColorLiteral('yellow'));
      assert.ok(OpAttributeSanitizer.IsValidColorLiteral('r'));
      assert.equal(OpAttributeSanitizer.IsValidColorLiteral('#234'), false);
      assert.equal(OpAttributeSanitizer.IsValidColorLiteral('#fFe234'), false);
      assert.equal(OpAttributeSanitizer.IsValidColorLiteral('red1'), false);
      assert.equal(
        OpAttributeSanitizer.IsValidColorLiteral('red-green'),
        false,
      );
      assert.equal(OpAttributeSanitizer.IsValidColorLiteral(''), false);
    });
  });

  describe('#IsValidRGBColor()', function () {
    it('should return true if rgb color is valid', function () {
      assert.ok(OpAttributeSanitizer.IsValidRGBColor('rgb(0,0,0)'));
      assert.ok(OpAttributeSanitizer.IsValidRGBColor('rgb(255, 99, 1)'));
      assert.ok(OpAttributeSanitizer.IsValidRGBColor('RGB(254, 249, 109)'));
      assert.equal(OpAttributeSanitizer.IsValidRGBColor('yellow'), false);
      assert.equal(OpAttributeSanitizer.IsValidRGBColor('#FFF'), false);
      assert.equal(OpAttributeSanitizer.IsValidRGBColor('rgb(256,0,0)'), false);
      assert.equal(OpAttributeSanitizer.IsValidRGBColor('rgb(260,0,0)'), false);
      assert.equal(
        OpAttributeSanitizer.IsValidRGBColor('rgb(2000,0,0)'),
        false,
      );
    });
  });
  describe('IsValidRel', function () {
    it('should return true if rel is valid', function () {
      assert.ok(OpAttributeSanitizer.IsValidRel('nofollow'));
      assert.ok(OpAttributeSanitizer.IsValidRel('tag'));
      assert.ok(OpAttributeSanitizer.IsValidRel('tag nofollow'));
      assert.equal(OpAttributeSanitizer.IsValidRel('no"follow'), false);
      assert.equal(OpAttributeSanitizer.IsValidRel('tag1'), false);
      assert.equal(OpAttributeSanitizer.IsValidRel(''), false);
    });
  });
  describe('IsValidLang', function () {
    it('should return true if lang is valid', function () {
      assert.ok(OpAttributeSanitizer.IsValidLang('javascript'));
      assert.ok(OpAttributeSanitizer.IsValidLang(true));
      assert.ok(OpAttributeSanitizer.IsValidLang('C++'));
      assert.ok(OpAttributeSanitizer.IsValidLang('HTML/XML'));
      assert.equal(OpAttributeSanitizer.IsValidLang('lang"uage'), false);
      assert.equal(OpAttributeSanitizer.IsValidLang(''), false);
    });
  });

  describe('sanitize', () => {
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
      assert.deepEqual(
        OpAttributeSanitizer.sanitize(attrs, noopSanitizeOptions),
        {
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
        },
      );
    });

    it('should sanitize mentions', () => {
      assert.deepEqual(
        OpAttributeSanitizer.sanitize(
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
      assert.deepEqual(
        OpAttributeSanitizer.sanitize({ header: 1 }, noopSanitizeOptions),
        {
          header: 1,
        },
      );
    });

    it('should exclude an undefined header value', () => {
      assert.deepEqual(
        OpAttributeSanitizer.sanitize(
          { header: undefined },
          noopSanitizeOptions,
        ),
        {},
      );
    });

    it('should clamp a header value to 6', () => {
      assert.deepEqual(
        OpAttributeSanitizer.sanitize({ header: 100 }, noopSanitizeOptions),
        {
          header: 6,
        },
      );
    });

    it('should keep a valid align value', () => {
      assert.deepEqual(
        OpAttributeSanitizer.sanitize(
          { align: AlignType.Center },
          noopSanitizeOptions,
        ),
        { align: 'center' },
      );
    });

    it('should keep a valid direction value', () => {
      assert.deepEqual(
        OpAttributeSanitizer.sanitize(
          { direction: DirectionType.Rtl },
          noopSanitizeOptions,
        ),
        { direction: 'rtl' },
      );
    });

    it('should keep a valid indent value', () => {
      assert.deepEqual(
        OpAttributeSanitizer.sanitize({ indent: 2 }, noopSanitizeOptions),
        {
          indent: 2,
        },
      );
    });
  });
});
