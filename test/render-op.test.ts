import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { OpToNodeConverterOptions, RenderOp } from '../src/render-op.js';
import { DeltaInsertOp } from '../src/DeltaInsertOp.js';
import { InsertDataQuill } from '../src/InsertData.js';
import {
  AlignType,
  DataType,
  DirectionType,
  ListType,
  ScriptType,
} from '../src/value-types.js';
import type { CSSProperties } from 'react';
import type { OpAttributes } from '../src/OpAttributeSanitizer.js';
import { renderToStaticMarkup } from 'react-dom/server';

describe('OpToHtmlConverter', () => {
  describe('constructor', () => {
    it('should set default options', () => {
      const ro = new RenderOp(new DeltaInsertOp('hello'));

      assert.equal(ro.prefixClass(''), 'ql-');
    });
  });

  describe('prefixClass', () => {
    it('should not prefix a class with an empty prefix option', () => {
      const ro = new RenderOp(new DeltaInsertOp('aa'), { classPrefix: '' });
      assert.equal(ro.prefixClass('my-class'), 'my-class');
    });

    it('should prefix class with a non-empty prefix', () => {
      const ro = new RenderOp(new DeltaInsertOp('aa'), { classPrefix: 'xx' });
      assert.equal(ro.prefixClass('my-class'), 'xx-my-class');
    });

    it('should prefix class with the default with no prefix specified', () => {
      const ro = new RenderOp(new DeltaInsertOp('aa'));
      assert.equal(ro.prefixClass('my-class'), 'ql-my-class');
    });
  });

  describe('getCssStyles', () => {
    const attrs: OpAttributes = {
      indent: 1,
      align: AlignType.Center,
      direction: DirectionType.Rtl,
      font: 'roman',
      size: 'small',
      background: 'red',
    };

    const expectedStyles: CSSProperties = {
      backgroundColor: 'red',
      paddingRight: '3em',
      textAlign: 'center',
      direction: 'rtl',
      fontFamily: 'roman',
      fontSize: '0.75em',
    };

    it('should return an empty object when there are no styles', () => {
      const ro = new RenderOp(new DeltaInsertOp('hello'));
      assert.deepEqual(ro.getCssStyles(), {});
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
      const op = new DeltaInsertOp('f', { attr1: 'green', background: 'red' });
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
        backgroundColor: 'red',
        color: 'green',
      });
    });

    it('should return inline styles for an inline insert', () => {
      const ro = new RenderOp(new DeltaInsertOp('hello', attrs), {
        inlineStyles: {},
      });
      assert.deepEqual(ro.getCssStyles(), expectedStyles);
    });

    it('should return inline styles for an image', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Image, ''),
        attrs,
      );
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), expectedStyles);
    });

    it('should return inline styles for a video', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Video, ''),
        attrs,
      );
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), {
        ...expectedStyles,
        border: 'none',
      });
    });

    it('should return inline styles for a formula', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Formula, ''),
        attrs,
      );
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), expectedStyles);
    });

    it('should return the styling for RTL', () => {
      const op = new DeltaInsertOp('f', {
        direction: DirectionType.Rtl,
      });
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), {
        direction: 'rtl',
        textAlign: 'inherit',
      });
    });

    it('should return padding styling', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), {
        indent: 2,
      });
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), {
        paddingLeft: '6em',
      });
    });

    it('should ignore an invalid direction', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Image, ''), {
        // @ts-expect-error
        direction: 'ltr',
      });
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getCssStyles(), {});
    });

    it('should allow setting inline styles', () => {
      const op = new DeltaInsertOp('f', { size: 'huge' });
      const ro = new RenderOp(op, {
        inlineStyles: {
          size: (value) =>
            value === 'huge'
              ? {
                  fontSize: '6em',
                }
              : undefined,
        },
      });
      assert.deepEqual(ro.getCssStyles(), { fontSize: '6em' });
    });

    it('should render default font inline styles', () => {
      const op = new DeltaInsertOp('f', { font: 'monospace' });
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), {
        fontFamily: 'Monaco, Courier New, monospace',
      });
    });

    it('should return nothing for an inline style with no mapped entry', function () {
      const ro = new RenderOp(new DeltaInsertOp('f', { size: 'biggest' }), {
        inlineStyles: {
          somethingElse: () => ({
            fontSize: '0.75em',
          }),
        },
      });
      assert.deepEqual(ro.getCssStyles(), {});
    });

    it('should return nothing for an inline style where the custom styling function returns undefined', function () {
      const ro = new RenderOp(new DeltaInsertOp('f', { size: 'biggest' }), {
        inlineStyles: {
          size: () => undefined,
        },
      });
      assert.deepEqual(ro.getCssStyles(), {});
    });
  });

  describe('getClasses', () => {
    const options: Partial<OpToNodeConverterOptions> = {
      customClasses: (op) => {
        if (op.attributes.size === 'small') {
          return ['small-size'];
        }
      },
    };

    const attrs: OpAttributes = {
      indent: 1,
      align: AlignType.Center,
      direction: DirectionType.Rtl,
      font: 'roman',
      size: 'small',
      background: 'red',
    };

    const expectedClasses = [
      'small-size',
      'ql-indent-1',
      'ql-align-center',
      'ql-direction-rtl',
      'ql-font-roman',
      'ql-size-small',
    ];

    it('should return an empty array when there are no classes', () => {
      // Notice we are not passing in attrs.
      const ro = new RenderOp(new DeltaInsertOp('hello'), options);
      assert.deepEqual(ro.getClasses(), []);
    });

    it('should return prefixed classes for an inline insert', () => {
      const ro = new RenderOp(new DeltaInsertOp('hello', attrs), options);
      assert.deepEqual(ro.getClasses(), expectedClasses);
    });

    it('should return prefixed classes for an image', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Image, ''),
        attrs,
      );
      const ro = new RenderOp(op, options);
      assert.deepEqual(ro.getClasses(), expectedClasses.concat('ql-image'));
    });

    it('should return prefixed classes for a video', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Video, ''),
        attrs,
      );
      const ro = new RenderOp(op, options);
      assert.deepEqual(ro.getClasses(), expectedClasses.concat('ql-video'));
    });

    it('should return prefixed classes for a formula', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Formula, ''),
        attrs,
      );
      const ro = new RenderOp(op, options);
      assert.deepEqual(ro.getClasses(), expectedClasses.concat('ql-formula'));
    });

    it('should add a background class with the allowBackgroundClasses option', () => {
      const op = new DeltaInsertOp('f', attrs);
      const ro = new RenderOp(op, {
        ...options,
        allowBackgroundClasses: true,
      });
      assert.deepEqual(ro.getClasses(), [
        ...expectedClasses,
        'ql-background-red',
      ]);
    });

    it('should not return any classes with inlineStyles being specified', () => {
      const op = new DeltaInsertOp('f', attrs);
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getClasses(), []);
    });
  });

  describe('getTagAttributes', () => {
    it('should return an empty object when there are no attributes', () => {
      const ro = new RenderOp(new DeltaInsertOp('hello'));
      assert.deepEqual(ro.getTagAttributes(), {});
    });

    it('should return an object with a custom data attribute', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Image, 'https://example.com/image.png'),
        {
          something: 'wow',
        },
      );
      const ro = new RenderOp(op, {
        customAttributes: (op) => {
          if (op.attributes.something) {
            return {
              'data-something': op.attributes.something,
            };
          }
        },
      });
      assert.deepEqual(ro.getTagAttributes(), {
        className: 'ql-image',
        src: 'https://example.com/image.png',
        'data-something': 'wow',
      });
    });

    it('should return an object with the proper attributes for an inline code element', () => {
      const op = new DeltaInsertOp('', { code: true, color: 'red' });
      const ro = new RenderOp(op, { inlineStyles: true });
      assert.deepEqual(ro.getTagAttributes(), {
        style: {
          color: 'red',
        },
      });
    });

    it('should return an object with the proper attributes for an image', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Image, 'https://example.com/image.png'),
        {
          width: '200',
        },
      );
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getTagAttributes(), {
        className: 'ql-image',
        src: 'https://example.com/image.png',
        width: '200',
      });
    });

    it('should return an object with the proper attributes for a formula', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Formula, ''), {
        color: 'red',
      });
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getTagAttributes(), {
        className: 'ql-formula',
        style: {
          color: 'red',
        },
      });
    });

    it('should return an object with the proper attributes for a video', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Video, 'https://example.com/video.mp4'),
        {
          color: 'red',
        },
      );
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getTagAttributes(), {
        className: 'ql-video',
        allowFullScreen: true,
        src: 'https://example.com/video.mp4',
        style: {
          border: 'none',
          color: 'red',
        },
      });
    });

    it('should return an object with the proper attributes for a link', () => {
      const op = new DeltaInsertOp('link', {
        color: 'red',
        link: 'https://example.com/hello',
      });
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getTagAttributes(), {
        href: 'https://example.com/hello',
        style: {
          color: 'red',
        },
      });
    });

    it('should return an object with the proper attributes for a link with a linkRel option', () => {
      const op = new DeltaInsertOp('link', {
        color: 'red',
        link: 'https://example.com/hello',
      });
      const ro = new RenderOp(op, { linkRel: 'nofollow' });
      assert.deepEqual(ro.getTagAttributes(), {
        href: 'https://example.com/hello',
        rel: 'nofollow',
        style: {
          color: 'red',
        },
      });
    });

    it('should return an object with the data-language attribute for a code block', () => {
      const op = new DeltaInsertOp('', { 'code-block': 'javascript' });
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getTagAttributes(), {
        'data-language': 'javascript',
      });
    });
  });

  describe('renderNode', () => {
    describe('render', () => {
      it('should return children directly in a simple case with no formats', () => {
        const op = new DeltaInsertOp('hello');
        const ro = new RenderOp(op);
        const { render } = ro.renderNode();
        assert.equal(renderToStaticMarkup(render('something')), 'something');
      });

      it('should wrap its argument with attributes', () => {
        const op = new DeltaInsertOp('hello', { bold: true, color: 'red' });
        const ro = new RenderOp(op, {
          inlineStyles: {
            color: (value) =>
              typeof value === 'string'
                ? {
                    color: value,
                  }
                : undefined,
          },
          customAttributes: () => ({
            'data-custom': '',
          }),
        });
        const { render } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(render('something')),
          '<strong data-custom="" style="color:red">something</strong>',
        );
      });

      it('should ignore children for an image', () => {
        const op = new DeltaInsertOp(
          new InsertDataQuill(DataType.Image, 'https://example.com/hello.png'),
        );
        const ro = new RenderOp(op, {
          customClasses: () => 'my-img',
        });
        const { render } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(render('something')),
          '<img class="my-img ql-image" src="https://example.com/hello.png"/>',
        );
      });

      it('should ignore children for an image link', () => {
        const op = new DeltaInsertOp(
          new InsertDataQuill(DataType.Image, 'https://example.com/hello.png'),
          {
            link: 'https://example.com/hello',
          },
        );
        const ro = new RenderOp(op, {
          customClasses: () => 'my-img',
        });
        const { render } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(render('something')),
          '<a href="https://example.com/hello"><img class="my-img ql-image" src="https://example.com/hello.png"/></a>',
        );
      });

      it('should render the span tag for a formula', () => {
        const ro = new RenderOp(
          new DeltaInsertOp(new InsertDataQuill(DataType.Formula, '')),
        );
        const { render } = ro.renderNode();
        assert.deepEqual(
          renderToStaticMarkup(render('hello')),
          '<span class="ql-formula">hello</span>',
        );
      });

      it('should render the blockquote tag for a blockquote', () => {
        const ro = new RenderOp(
          new DeltaInsertOp('hello', { blockquote: true }),
        );
        const { render } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(render('hello')),
          '<blockquote>hello</blockquote>',
        );
      });

      it('should render the pre tag for a code block', () => {
        const ro = new RenderOp(
          new DeltaInsertOp('hello', { 'code-block': true }),
        );
        const { render } = ro.renderNode();
        assert.equal(renderToStaticMarkup(render('hello')), '<pre>hello</pre>');
      });

      it('should render the li tag for a list item', () => {
        const ro = new RenderOp(
          new DeltaInsertOp('hello', { list: ListType.Bullet }),
        );
        const { render } = ro.renderNode();
        assert.equal(renderToStaticMarkup(render('hello')), '<li>hello</li>');
      });

      it('should render a custom tag', () => {
        const cases = [
          ['code-block', 'div'],
          ['bold', 'h2'],
          ['list', 'li'],
          ['header', 'h2'],
        ] as const;
        cases.forEach(([attr, expected]) => {
          const op = new DeltaInsertOp('', { [attr]: true, header: 2 });
          const ro = new RenderOp(op, {
            customTag: (format) => {
              if (format === 'code-block') {
                return 'div';
              }
              if (format === 'bold') {
                return 'b';
              }
            },
          });
          const { render } = ro.renderNode();
          assert.deepEqual(
            renderToStaticMarkup(render('hello')),
            `<${expected}>hello</${expected}>`,
          );
        });
      });

      it('should render both custom inline tags and built-in inline tags nested', () => {
        const attributes: OpAttributes = {
          bold: true,
          italic: true,
          mentions: true,
          strike: true,
          underline: true,
        };
        const op = new DeltaInsertOp('hello', attributes);
        const ro = new RenderOp(op, {
          customTag: (format) => {
            if (format === 'mentions') {
              // Note the default is 'a'.
              return 'span';
            }
            if (format === 'strike') {
              return 'cite';
            }
            return undefined;
          },
        });
        const { render } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(render('hello')),
          '<span><strong><em><cite><u>hello</u></cite></em></strong></span>',
        );
      });

      it('should return the proper tag for a block insert with custom tags and attributes', () => {
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
          const { render } = ro.renderNode();
          assert.equal(
            renderToStaticMarkup(render('hello')),
            `<${expected}>hello</${expected}>`,
          );
        });
      });
    });

    describe('node', () => {
      it('should return proper HTML content for a complex op', () => {
        const attributes: OpAttributes = {
          link: 'https://example.com/hello',
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

        const ro = new RenderOp(new DeltaInsertOp('aaa', attributes));
        const { node } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(node),
          `<a style="color:red;background-color:#fff" class="ql-font-verdana ql-size-small" href="https://example.com/hello"><sup><strong><em><s><u>aaa</u></s></em></strong></sup></a>`,
        );
      });

      it('should return proper HTML content for a paragraph', () => {
        const ro = new RenderOp(new DeltaInsertOp('aa', { indent: 1 }));
        const { render, node } = ro.renderNode();
        assert.equal(
          renderToStaticMarkup(node),
          // This is empty because we have an indent attribute, which makes this a block, and we should
          // be using the render method to actually render it.
          '<p class="ql-indent-1"></p>',
        );

        // Sanity check:
        assert.equal(
          renderToStaticMarkup(render('something')),
          '<p class="ql-indent-1">something</p>',
        );
      });

      it('should return proper HTML content for a blockquote', () => {
        const ro = new RenderOp(
          new DeltaInsertOp('hello', { blockquote: true }),
        );
        assert.equal(
          renderToStaticMarkup(ro.renderNode().node),
          // See the above test for why this is empty.
          '<blockquote></blockquote>',
        );
      });

      it('should return proper HTML content for a formula', () => {
        const ro = new RenderOp(
          new DeltaInsertOp(new InsertDataQuill(DataType.Formula, 'ff'), {
            bold: true,
          }),
        );
        assert.equal(
          renderToStaticMarkup(ro.renderNode().node),
          '<span class="ql-formula">ff</span>',
        );
      });

      it('should return proper HTML content for an image', () => {
        const op = new DeltaInsertOp(
          new InsertDataQuill(DataType.Image, 'https://example.com/hello.png'),
        );
        const ro = new RenderOp(op, {
          customClasses: () => 'my-custom-class',
          customAttributes: () => ({
            alt: 'Hello',
          }),
        });
        assert.equal(
          renderToStaticMarkup(ro.renderNode().node),
          '<img alt="Hello" class="my-custom-class ql-image" src="https://example.com/hello.png"/>',
        );
      });

      it('should return proper HTML content for a video', () => {
        const ro = new RenderOp(
          new DeltaInsertOp(
            new InsertDataQuill(DataType.Video, 'https://example.com/vid1.mp4'),
            {
              bold: true,
            },
          ),
        );
        assert.equal(
          renderToStaticMarkup(ro.renderNode().node),
          `<iframe style="border:none" class="ql-video" allowfullscreen="" src="https://example.com/vid1.mp4"></iframe>`,
        );
      });
    });
  });
});
