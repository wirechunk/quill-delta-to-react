import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import { RenderOp, RenderOpOptions } from '../src/render-op.js';
import { DeltaInsertOp } from '../src/delta-insert-op.js';
import { InsertDataQuill } from '../src/insert-data.js';
import {
  AlignType,
  DataType,
  DirectionType,
  ListType,
  ScriptType,
} from '../src/value-types.js';
import type { CSSProperties } from 'react';
import type { OpAttributes } from '../src/sanitize-attributes.js';
import { renderToStaticMarkup } from 'react-dom/server';

describe('RenderOp', () => {
  describe('constructor', () => {
    it('should set default options', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello')),
        {
          customClasses: () => 'my-class',
        },
      );
      assert.deepEqual(ro.getCustomClasses(), ['my-class']);
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
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello')),
      );
      assert.deepEqual(ro.getCssStyles(), {});
    });

    it('should return custom styles for a custom attribute', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
        attr1: 'red',
      });
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
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
        background: 'red',
        color: 'blue',
      });
      const ro = new RenderOp(op, { allowBackgroundClasses: true });
      assert.deepEqual(ro.getCssStyles(), {
        color: 'blue',
      });
    });

    it('should return custom styles for a custom attribute and the background attribute', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
        attr1: 'green',
        background: 'red',
      });
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
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), attrs),
        {
          inlineStyles: {},
        },
      );
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
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
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
        // @ts-expect-error -- Notice this is 'ltr' instead of DirectionType.Rtl.
        direction: 'ltr',
      });
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getCssStyles(), {});
    });

    it('should allow setting inline styles', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
        size: 'huge',
      });
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
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
        font: 'monospace',
      });
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getCssStyles(), {
        fontFamily: 'Monaco, Courier New, monospace',
      });
    });

    it('should return nothing for an inline style with no mapped entry', function () {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
          size: 'biggest',
        }),
        {
          inlineStyles: {
            somethingElse: () => ({
              fontSize: '0.75em',
            }),
          },
        },
      );
      assert.deepEqual(ro.getCssStyles(), {});
    });

    it('should return nothing for an inline style where the custom styling function returns undefined', function () {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'f'), {
          size: 'biggest',
        }),
        {
          inlineStyles: {
            size: () => undefined,
          },
        },
      );
      assert.deepEqual(ro.getCssStyles(), {});
    });
  });

  describe('getClasses', () => {
    const options: Partial<RenderOpOptions> = {
      customClasses: (op) => {
        if (op.attributes.size === 'small') {
          return ['small-size-a'];
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
      'small-size-a',
      'ql-align-center',
      'ql-direction-rtl',
      'ql-font-roman',
      'ql-indent-1',
      'ql-size-small',
    ];

    it('should return an empty array when there are no classes', () => {
      // Notice we are not passing in attrs.
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello')),
        options,
      );
      assert.deepEqual(ro.getClasses(), []);
    });

    it('should not prefix a class with an empty custom prefix', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), attrs),
        { ...options, classPrefix: '' },
      );
      assert.deepEqual(ro.getClasses(), [
        'small-size-a',
        'align-center',
        'direction-rtl',
        'font-roman',
        'indent-1',
        'size-small',
      ]);
    });

    it('should prefix each class with a non-empty custom prefix', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'aa'), attrs),
        { ...options, classPrefix: 'xx' },
      );
      assert.deepEqual(ro.getClasses(), [
        'small-size-a',
        'xx-align-center',
        'xx-direction-rtl',
        'xx-font-roman',
        'xx-indent-1',
        'xx-size-small',
      ]);
    });

    it('should by default return prefixed classes for an inline insert', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), attrs),
        options,
      );
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
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'f'),
        attrs,
      );
      const ro = new RenderOp(op, {
        ...options,
        allowBackgroundClasses: true,
      });
      assert.deepEqual(ro.getClasses(), [
        'small-size-a',
        'ql-align-center',
        'ql-background-red',
        'ql-direction-rtl',
        'ql-font-roman',
        'ql-indent-1',
        'ql-size-small',
      ]);
    });

    it('should not return any classes with inlineStyles being specified', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'f'),
        attrs,
      );
      const ro = new RenderOp(op, { inlineStyles: {} });
      assert.deepEqual(ro.getClasses(), []);
    });
  });

  describe('getTagAttributes', () => {
    it('should return an empty object when there are no attributes', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello')),
      );
      assert.deepEqual(ro.getTagAttributes(), {});
    });

    it('should return an object with the proper attributes for an inline code element', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, ''), {
        code: true,
        color: 'red',
      });
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
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'link'), {
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
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'link'), {
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
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, ''), {
        'code-block': 'javascript',
      });
      const ro = new RenderOp(op);
      assert.deepEqual(ro.getTagAttributes(), {
        'data-language': 'javascript',
      });
    });
  });

  describe('renderOp', () => {
    it('should return children directly in a simple case with no formats', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'));
      const ro = new RenderOp(op);
      assert.equal(renderToStaticMarkup(ro.renderOp('something')), 'something');
    });

    it('should wrap its argument with attributes', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'hello'),
        { bold: true, color: 'red' },
      );
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
      assert.equal(
        renderToStaticMarkup(ro.renderOp('something')),
        '<strong style="color:red" data-custom="">something</strong>',
      );
    });

    it('should ignore children for an image', () => {
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Image, 'https://example.com/hello.png'),
      );
      const ro = new RenderOp(op, {
        customClasses: () => 'my-img',
      });
      assert.equal(
        // Note preload directives are added only because we're using the renderToStaticMarkup function.
        renderToStaticMarkup(ro.renderOp('something')),
        '<link rel="preload" as="image" href="https://example.com/hello.png"/><img class="my-img ql-image" src="https://example.com/hello.png"/>',
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
      assert.equal(
        renderToStaticMarkup(ro.renderOp('something')),
        // Note preload directives are added only because we're using the renderToStaticMarkup function.
        '<link rel="preload" as="image" href="https://example.com/hello.png"/><a href="https://example.com/hello"><img class="my-img ql-image" src="https://example.com/hello.png"/></a>',
      );
    });

    it('should render the span tag for a formula', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Formula, '')),
      );
      assert.deepEqual(
        renderToStaticMarkup(ro.renderOp('hello')),
        '<span class="ql-formula">hello</span>',
      );
    });

    it('should render the blockquote tag for a blockquote', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), {
          blockquote: true,
        }),
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp('hello')),
        '<blockquote>hello</blockquote>',
      );
    });

    it('should render the pre tag for a code block', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), {
          'code-block': true,
        }),
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp('hello')),
        '<pre>hello</pre>',
      );
    });

    it('should render the li tag for a list item', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), {
          list: ListType.Bullet,
        }),
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp('hello')),
        '<li>hello</li>',
      );
    });

    it('should render a custom tag', () => {
      const cases = [
        ['code-block', 'div'],
        ['bold', 'h2'],
        ['list', 'li'],
        ['header', 'h2'],
      ] as const;
      cases.forEach(([attr, expected]) => {
        const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, ''), {
          [attr]: true,
          header: 2,
        });
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
        assert.deepEqual(
          renderToStaticMarkup(ro.renderOp('hello')),
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
      const op = new DeltaInsertOp(
        new InsertDataQuill(DataType.Text, 'hello'),
        attributes,
      );
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
      assert.equal(
        renderToStaticMarkup(ro.renderOp('hello')),
        '<span><strong><em><cite><u>hello</u></cite></em></strong></span>',
      );
    });

    it('should return the proper tag for a block insert with custom tags and attributes', () => {
      const cases = [
        ['blockquote', 'blockquote'],
        ['code-block', 'pre'],
        ['list', 'li'],
      ] as const;

      cases.forEach(([attribute, expected]) => {
        const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, ''), {
          [attribute]: true,
        });
        const ro = new RenderOp(op);
        assert.equal(
          renderToStaticMarkup(ro.renderOp('hello')),
          `<${expected}>hello</${expected}>`,
        );
      });
    });

    it('should return the insert plainly when it has no attributes', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, ''));
      const ro = new RenderOp(op);
      assert.equal(renderToStaticMarkup(ro.renderOp('hello')), 'hello');
    });

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

      const ro = new RenderOp(
        new DeltaInsertOp(
          // Notice this value should be ignored.
          new InsertDataQuill(DataType.Text, 'aaa'),
          attributes,
        ),
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp()),
        `<a style="color:red;background-color:#fff" class="ql-font-verdana ql-size-small" href="https://example.com/hello"><sup><strong><em><s><u></u></s></em></strong></sup></a>`,
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp('hello')),
        `<a style="color:red;background-color:#fff" class="ql-font-verdana ql-size-small" href="https://example.com/hello"><sup><strong><em><s><u>hello</u></s></em></strong></sup></a>`,
      );
    });

    it('should return proper HTML content for a paragraph', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'aa'), {
          indent: 1,
        }),
      );
      assert.equal(
        // Notice that what we pass in takes precedence.
        renderToStaticMarkup(ro.renderOp('something')),
        '<p class="ql-indent-1">something</p>',
      );
    });

    it('should return proper HTML content for a blockquote', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'hello'), {
          blockquote: true,
        }),
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp(null)),
        // See the above test for why this is empty.
        '<blockquote></blockquote>',
      );
    });

    it('should return proper HTML content for a formula', () => {
      const ro = new RenderOp(
        new DeltaInsertOp(new InsertDataQuill(DataType.Formula, ''), {
          bold: true,
        }),
      );
      assert.equal(
        renderToStaticMarkup(ro.renderOp('ff')),
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
        renderToStaticMarkup(ro.renderOp(null)),
        // Note preload directives are added only because we're using the renderToStaticMarkup function.
        '<link rel="preload" as="image" href="https://example.com/hello.png"/><img class="my-custom-class ql-image" src="https://example.com/hello.png" alt="Hello"/>',
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
        renderToStaticMarkup(ro.renderOp(null)),
        `<iframe style="border:none" class="ql-video" allowFullScreen="" src="https://example.com/vid1.mp4"></iframe>`,
      );
    });
  });
});
