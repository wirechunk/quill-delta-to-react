import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { RenderOp } from '../src/render-op.js';
import { DeltaInsertOp } from '../src/DeltaInsertOp.js';
import { InsertDataQuill } from '../src/InsertData.js';
import {
  ScriptType,
  DirectionType,
  AlignType,
  DataType,
} from '../src/value-types.js';
import { RenderDeltaOptions } from '../src/render-delta.js';

describe('OpToHtmlConverter', () => {
  describe('constructor', () => {
    var op = new DeltaInsertOp('hello');
    it('should instantiate', () => {
      const ro = new RenderOp(op);
      assert.ok(ro instanceof RenderOp);
    });
  });

  describe('prefixClass', () => {
    it('should prefix class if an empty string prefix is not given', () => {
      var op = new DeltaInsertOp('aa');
      var c = new RenderOp(op, { classPrefix: '' });
      var act = c.prefixClass('my-class');
      assert.equal(act, 'my-class');

      c = new RenderOp(op, { classPrefix: 'xx' });
      act = c.prefixClass('my-class');
      assert.equal(act, 'xx-my-class');

      c = new RenderOp(op);
      act = c.prefixClass('my-class');
      assert.equal(act, 'ql-my-class');
    });
  });

  describe('getCssStyles', () => {
    var op = new DeltaInsertOp('hello');
    it('should return styles', () => {
      var c = new RenderOp(op);
      assert.deepEqual(c.getCssStyles(), []);
    });

    it('should return custom styles for a custom attribute', () => {
      const op = new DeltaInsertOp('f', { attr1: 'red' });
      const ro = new RenderOp(op, {
        customCssStyles: (op) => {
          const value = op.attributes['attr1'];
          if (value) {
            return {
              color: value as string,
            };
          }
          return undefined;
        },
      });
      assert.deepEqual(ro.getCssStyles(), {
        color: 'red',
      });
    });

    it('should not set the CSS backgroundColor property with the allowBackgroundClasses option', () => {
      const op = new DeltaInsertOp('f', { background: 'red', color: 'blue' });
      const ro = new RenderOp(op, { allowBackgroundClasses: true });
      assert.deepEqual(ro.getCssStyles(), {
        color: 'blue',
      });
    });

    it('should return custom styles for a custom attribute and the background attribute', () => {
      const o = new DeltaInsertOp('f', { background: 'red', attr1: 'green' });
      const ro = new RenderOp(o, {
        customCssStyles: (op) => {
          const value = op.attributes['attr1'];
          if (value) {
            return {
              color: value as string,
            };
          }
          return undefined;
        },
      });
      assert.deepEqual(ro.getCssStyles(), {
        backgroundColor: 'red',
        color: 'green',
      });
    });

    it('should return inline styles', function () {
      var op = new DeltaInsertOp('hello');
      var c = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), []);

      var attrs = {
        indent: 1,
        align: AlignType.Center,
        direction: DirectionType.Rtl,
        font: 'roman',
        size: 'small',
        background: 'red',
      };
      var o = new DeltaInsertOp('f', attrs);
      c = new RenderOp(o, { inlineStyles: {} });
      var styles = [
        'background-color:red',
        'padding-right:3em',
        'text-align:center',
        'direction:rtl',
        'font-family:roman',
        'font-size: 0.75em',
      ];
      assert.deepEqual(c.getCssStyles(), styles);

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), attrs);
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), styles);

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Video, ''), attrs);
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), styles);

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Formula, ''), attrs);
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), styles);

      o = new DeltaInsertOp('f', attrs);
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), styles);

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), {
        direction: DirectionType.Rtl,
      });
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), ['direction:rtl; text-align:inherit']);

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), {
        indent: 2,
      });
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), ['padding-left:6em']);

      // Ignore invalid direction
      o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), {
        direction: 'ltr',
      } as any);
      c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), []);
    });

    it('should allow setting inline styles', () => {
      var op = new DeltaInsertOp('f', { size: 'huge' });
      var c = new RenderOp(op, {
        inlineStyles: {
          size: {
            huge: 'font-size: 6em',
          },
        },
      });
      assert.deepEqual(c.getCssStyles(), ['font-size: 6em']);
    });

    it('should render default font inline styles', () => {
      const op = new DeltaInsertOp('f', { font: 'monospace' });
      const c = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(c.getCssStyles(), {
        fontFamily: 'Monaco, Courier New, monospace -- testing sanity check',
      });
    });

    it('should return nothing for an inline style with no mapped entry', function () {
      const op = new DeltaInsertOp('f', { size: 'biggest' });
      const ro = new RenderOp(op, {
        inlineStyles: {
          somethingElse: () => ({
            fontSize: '0.75em',
          }),
        },
      });
      assert.deepEqual(ro.getCssStyles(), []);
    });

    it('should return nothing for an inline style where the converter returns undefined', function () {
      var op = new DeltaInsertOp('f', { size: 'biggest' });
      var c = new RenderOp(op, {
        inlineStyles: {
          size: () => undefined,
        },
      });
      assert.deepEqual(c.getCssStyles(), []);
    });
  });

  describe('getClasses', function () {
    it('should return prefixed classes', () => {
      const op = new DeltaInsertOp('hello');
      const options: Partial<RenderDeltaOptions> = {
        customClasses: (op) => {
          if (op.attributes.size === 'small') {
            return ['small-size'];
          }
        },
      };
      var c = new RenderOp(op, options);
      assert.deepEqual(c.getClasses(), []);

      var attrs = {
        indent: 1,
        align: AlignType.Center,
        direction: DirectionType.Rtl,
        font: 'roman',
        size: 'small',
        background: 'red',
      };
      var o = new DeltaInsertOp('f', attrs);
      c = new RenderOp(o, options);
      var classes = [
        'small-size',
        'ql-indent-1',
        'ql-align-center',
        'ql-direction-rtl',
        'ql-font-roman',
        'ql-size-small',
      ];
      assert.deepEqual(c.getClasses(), classes);

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), attrs);
      c = new RenderOp(o, options);
      assert.deepEqual(c.getClasses(), classes.concat('ql-image'));

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Video, ''), attrs);
      c = new RenderOp(o, options);
      assert.deepEqual(c.getClasses(), classes.concat('ql-video'));

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Formula, ''), attrs);
      c = new RenderOp(o, options);
      assert.deepEqual(c.getClasses(), classes.concat('ql-formula'));

      o = new DeltaInsertOp('f', attrs);
      c = new RenderOp(o, {
        ...options,
        allowBackgroundClasses: true,
      });
      assert.deepEqual(c.getClasses(), classes.concat('ql-background-red'));
    });

    it('should return no classes if `inlineStyles` is specified', () => {
      var attrs = {
        indent: 1,
        align: AlignType.Center,
        direction: DirectionType.Rtl,
        font: 'roman',
        size: 'small',
        background: 'red',
      };
      var o = new DeltaInsertOp('f', attrs);
      var c = new RenderOp(o, { inlineStyles: {} });
      assert.deepEqual(c.getClasses(), []);
    });
  });

  describe('getTag', () => {
    it('should return the tag to render this op', () => {
      var op = new DeltaInsertOp('hello');
      var c = new RenderOp(op);
      assert.deepEqual(c.getTag(), 'span');

      var o = new DeltaInsertOp('', { code: true });
      c = new RenderOp(o);
      assert.deepEqual(c.getTag(), ['code']);

      (
        [
          [DataType.Image, 'img'],
          [DataType.Video, 'iframe'],
          [DataType.Formula, 'span'],
        ] as const
      ).forEach((item) => {
        o = new DeltaInsertOp(new InsertDataQuill(item[0], ''));
        c = new RenderOp(o);
        assert.deepEqual(c.getTag(), [item[1]]);
      });

      [
        ['blockquote', 'blockquote'],
        ['code-block', 'pre'],
        ['list', 'li'],
        ['header', 'h2'],
      ].forEach((item) => {
        o = new DeltaInsertOp('', { [item[0]]: true, header: 2 });
        c = new RenderOp(o);
        assert.deepEqual(c.getTag(), [item[1]]);
      });

      [
        ['blockquote', 'blockquote'],
        ['code-block', 'div'],
        ['bold', 'h2'],
        ['list', 'li'],
        ['header', 'h2'],
      ].forEach((item) => {
        o = new DeltaInsertOp('', { [item[0]]: true, header: 2 });
        c = new RenderOp(o, {
          customTag: (format) => {
            if (format === 'code-block') {
              return 'div';
            }
            if (format === 'bold') {
              return 'b';
            }
          },
        });
        assert.deepEqual(c.getTag(), [item[1]]);
      });

      const cases = [
        ['blockquote', 'blockquote'],
        ['code-block', 'pre'],
        ['list', 'li'],
        ['attr1', 'div'],
      ] as const;

      cases.forEach(([attribute, expected]) => {
        const op = new DeltaInsertOp('', {
          [attribute]: true,
          renderAsBlock: true,
        });
        const ro = new RenderOp(op, {
          customTag: (format, op) => {
            if (format === 'renderAsBlock' && op.attributes['attr1']) {
              return 'div';
            }
          },
        });
        assert.equal(ro.getTag(), expected);
      });

      var attrs = {
        link: 'http',
        script: ScriptType.Sub,
        bold: true,
        italic: true,
        strike: true,
        underline: true,
        attr1: true,
      };
      o = new DeltaInsertOp('', attrs);
      c = new RenderOp(o, {
        customTag: (format) => {
          if (format === 'bold') {
            return 'b';
          }
          if (format === 'attr1') {
            return 'attr2';
          }
        },
      });
      assert.deepEqual(c.getTag(), ['a', 'sub', 'b', 'em', 's', 'u', 'attr2']);
    });
  });

  describe('getTagAttributes()', function () {
    it('should return tag attributes', () => {
      var op = new DeltaInsertOp('hello');
      var c = new RenderOp(op);
      assert.deepEqual(c.getTagAttributes(), []);

      var o = new DeltaInsertOp('', { code: true, color: 'red' });
      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), []);

      var o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, 'http:'), {
        color: 'red',
      });
      var c = new RenderOp(o, {
        customAttributes: (op) => {
          if (op.attributes.color) {
            return {
              'data-color': op.attributes.color,
            };
          }
        },
      });
      assert.deepEqual(c.getTagAttributes(), [
        ['data-color', 'red'],
        ['class', 'ql-image'],
        ['src', 'http:'],
      ]);

      var o = new DeltaInsertOp(new InsertDataQuill(DataType.Image, 'http:'), {
        width: '200',
      });
      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), [
        ['class', 'ql-image'],
        ['width', '200'],
        ['src', 'http:'],
      ]);

      var o = new DeltaInsertOp(new InsertDataQuill(DataType.Formula, '-'), {
        color: 'red',
      });
      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), [['class', 'ql-formula']]);

      var o = new DeltaInsertOp(new InsertDataQuill(DataType.Video, 'http:'), {
        color: 'red',
      });
      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), [
        ['class', 'ql-video'],
        ['frameborder', '0'],
        ['allowfullscreen', 'true'],
        ['src', 'http:'],
      ]);

      var o = new DeltaInsertOp('link', { color: 'red', link: 'l' });

      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), [
        ['style', 'color:red'],
        ['href', 'l'],
      ]);

      var c = new RenderOp(o, { linkRel: 'nofollow' });
      assert.deepEqual(c.getTagAttributes(), [
        ['style', 'color:red'],
        ['href', 'l'],
        ['rel', 'nofollow'],
      ]);

      var o = new DeltaInsertOp('', { 'code-block': 'javascript' });
      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), [['data-language', 'javascript']]);

      var o = new DeltaInsertOp('', { 'code-block': true });
      var c = new RenderOp(o);
      assert.deepEqual(c.getTagAttributes(), []);
    });
  });

  describe('getContent()', function () {
    it('should return proper content depending on type', () => {
      var o = new DeltaInsertOp('aa', { indent: 1 });
      var c = new RenderOp(o);
      assert.equal(c.getContent(), '');

      o = new DeltaInsertOp('sss<&>,', { bold: true });
      c = new RenderOp(o);
      assert.equal(c.getContent(), 'sss<&>,');

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Formula, 'ff'), {
        bold: true,
      });
      c = new RenderOp(o);
      assert.equal(c.getContent(), 'ff');

      o = new DeltaInsertOp(new InsertDataQuill(DataType.Video, 'ff'), {
        bold: true,
      });
      c = new RenderOp(o);
      assert.equal(c.getContent(), '');
    });
  });

  describe('html retrieval', function () {
    var attributes = {
      link: 'http://',
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      script: ScriptType.Super,
      font: 'verdana',
      size: 'small',
      color: 'red',
      background: '#fff',
    };
    var op1 = new DeltaInsertOp('aaa', attributes);
    var c1 = new RenderOp(op1);
    var result = [
      '<a class="ql-font-verdana ql-size-small"',
      ' style="color:red;background-color:#fff" href="http://">',
      '<sup>',
      '<strong><em><s><u>aaa</u></s></em></strong>',
      '</sup>',
      '</a>',
    ].join('');

    describe('renderNode', function () {
      it('should return inline html', () => {
        c1 = new RenderOp(op1);
        var act = c1.getHtml();
        assert.equal(act, result);

        var op = new DeltaInsertOp('\n', { bold: true });
        c1 = new RenderOp(op);
        assert.equal(c1.getHtml(), '\n');

        var op = new DeltaInsertOp('\n', { color: '#fff' });
        c1 = new RenderOp(op);
        assert.equal(c1.getHtml(), '\n');

        var op = new DeltaInsertOp('\n', { 'code-block': 'javascript' });
        c1 = new RenderOp(op);
        assert.equal(c1.getHtml(), '<pre data-language="javascript"></pre>');

        var op = new DeltaInsertOp(
          new InsertDataQuill(DataType.Image, 'http://'),
        );
        c1 = new RenderOp(op, {
          customClasses: (_) => {
            return 'ql-custom';
          },
        });
        assert.equal(
          c1.renderNode().node,
          '<img class="ql-custom ql-image" src="http://"/>',
        );
      });

      it('should wrap contents with the render function', () => {
        const insert = new DeltaInsertOp('hello');
        const ro = new RenderOp(op);
        const { render } = ro.renderNode();
        const got = render('something');
        assert.equal(got, '<p>something</p>');
      });
    });
  });
});
