import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import { DeltaInsertOp } from './../src/DeltaInsertOp.js';
import { CustomRenderer, RenderDelta } from './../src/render-delta.js';
import { DataType, ListType, ScriptType } from './../src/value-types.js';
import { InsertDataCustom, InsertDataQuill } from '../src/InsertData.js';
import { InlineGroup } from '../src/grouper/group-types.js';
import { renderToStaticMarkup } from 'react-dom/server';

const htmlEncodingMap = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#x27;'],
  ['\\/', '&#x2F;'],
] as const;

const encodeHtml = (str: string) =>
  htmlEncodingMap.reduce(
    (str, [search, replace]) => str.replaceAll(search, replace),
    str,
  );

describe('RenderDelta', () => {
  describe('constructor', () => {
    it('should set default options', () => {
      const rd = new RenderDelta({ ops: [] });

      assert.equal(rd.state.options.orderedListTag, 'ol');
      assert.equal(rd.state.options.bulletListTag, 'ul');
      assert.equal(rd.state.options.allowBackgroundClasses, false);
      // The URL sanitizer should be the identity function by default.
      assert.equal(
        rd.state.options.urlSanitizer('http://example.com?q1=x'),
        'http://example.com?q1=x',
      );
    });
  });

  describe('render', () => {
    it('should render a plain new line string as an empty paragraph', () => {
      const rd = new RenderDelta({
        ops: [{ insert: '\n' }],
      });
      assert.equal(renderToStaticMarkup(rd.render()), '<p></p>');
    });

    it('should render when the first op is just a new line', () => {
      const rd = new RenderDelta({
        ops: [{ insert: '\n' }, { insert: 'aa\n' }],
      });
      assert.equal(renderToStaticMarkup(rd.render()), '<p></p><p>aa</p>');
    });

    it('should render when last line is new line', () => {
      const rd = new RenderDelta({
        ops: [{ insert: 'aa' }, { insert: '\n' }],
      });
      assert.equal(renderToStaticMarkup(rd.render()), '<p>aa</p>');
    });

    it('should render HTML', function () {
      const ops = [
        { insert: 'this is text\nthis is code' },
        {
          attributes: { 'code-block': 'plain' },
          insert: '\n',
        },
        { insert: 'this is code too!' },
        {
          attributes: { 'code-block': 'plain' },
          insert: '\n',
        },
      ];
      const rd = new RenderDelta({ ops });

      assert.equal(
        renderToStaticMarkup(rd.render()),
        `<p>this is text</p><pre data-language="plain">this is code\nthis is code too!</pre>`,
      );
    });

    it('should render a mention with a custom tag', () => {
      const ops = [
        {
          insert: 'Mention1',
          attributes: {
            mentions: true,
            mention: {
              class: 'abc',
              // slug isn't rendered by this library
              slug: 'a',
            },
          },
        },
      ];
      const rd = new RenderDelta({
        ops,
        options: {
          mentionTag: 'span',
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><span class="abc">Mention1</span></p>',
      );
    });

    it('should render a mention with a link', () => {
      const rd = new RenderDelta({
        ops: [
          {
            insert: 'Mention2',
            attributes: {
              mentions: true,
              mention: { link: 'https://example.com/abc' },
            },
          },
        ],
      });
      const html = renderToStaticMarkup(rd.render());
      assert.equal(
        html,
        '<p><a href="https://example.com/abc">Mention2</a></p>',
      );
    });

    it('should return proper HTML for complex ops', function () {
      const ops = [
        { insert: 'link', attributes: { link: 'http://a.com/?x=a&b=()' } },
        { insert: 'This ' },
        { attributes: { font: 'monospace' }, insert: 'is' },
        { insert: ' a ' },
        { attributes: { size: 'large' }, insert: 'test' },
        { insert: ' ' },
        { attributes: { italic: true, bold: true }, insert: 'data' },
        { insert: ' ' },
        { attributes: { underline: true, strike: true }, insert: 'that' },
        { insert: ' is ' },
        { attributes: { color: '#e60000' }, insert: 'will' },
        { insert: ' ' },
        { attributes: { background: '#ffebcc' }, insert: 'test' },
        { insert: ' ' },
        { attributes: { script: 'sub' }, insert: 'the' },
        { insert: ' ' },
        { attributes: { script: 'super' }, insert: 'rendering' },
        { insert: ' of ' },
        { attributes: { link: 'http://yahoo' }, insert: 'inline' },
        { insert: ' ' },
        { insert: { formula: 'x=data' } },
        { insert: ' formats.\n' },
        { insert: 'list' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: 'list' },
        { insert: '\n', attributes: { list: 'checked' } },
        { insert: 'some code', attributes: { code: true, bold: true } },
        {
          attributes: { italic: true, link: '#top', code: true },
          insert: 'Top',
        },
        { insert: '\n' },
      ];
      const rd = new RenderDelta({
        ops,
        options: {
          classPrefix: 'noz',
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><a href="http://a.com/?x=a&amp;b=()" target="_blank">link</a>This <span class="noz-font-monospace">is</span> a <span class="noz-size-large">test</span> <strong><em>data</em></strong> <s><u>that</u></s> is <span style="color:#e60000">will</span> <span style="background-color:#ffebcc">test</span> <sub>the</sub> <sup>rendering</sup> of <a href="http://yahoo" target="_blank">inline</a> <span class="noz-formula">x=data</span> formats.</p><ul><li>list</li></ul><ul><li data-checked="true">list</li></ul><p><strong><code>some code</code></strong><a href="#top" target="_blank"><em><code>Top</code></em></a></p>',
      );
    });

    it('should set default inline styles when inlineStyles is true', function () {
      const hugeOps = [
        { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
        { insert: '\n' },
      ];
      const rd = new RenderDelta({
        ops: hugeOps,
        options: {
          inlineStyles: true,
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><span style="font-size:2.5em">huge</span></p>',
      );
    });

    it('should set default inline styles when inlineStyles is true and custom CSS styles are applied', () => {
      const hugeOps = [
        { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
        { insert: '\n' },
      ];
      const rd = new RenderDelta({
        ops: hugeOps,
        options: {
          inlineStyles: true,
          customCssStyles: (op) => {
            if (op.attributes['attr1'] === 'red') {
              return {
                color: 'red',
              };
            }
          },
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><span style="color:red;font-size:2.5em">huge</span></p>',
      );
    });

    it('should allow setting inline styles', function () {
      const hugeOps = [
        { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
        { insert: '\n' },
      ];
      const rd = new RenderDelta({
        ops: hugeOps,
        options: {
          inlineStyles: {
            size: () => ({ fontSize: '6em' }),
          },
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><span style="font-size:6em">huge</span></p>',
      );
    });

    it('should render links with a rel', function () {
      const ops = [
        {
          attributes: {
            link: '#',
          },
          insert: 'hello',
        },
      ];
      const rd = new RenderDelta({
        ops,
        options: {
          linkRel: 'license',
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><a href="#" target="_blank" rel="license">hello</a></p>',
      );
    });

    it('should render links with a target', function () {
      const ops = [
        {
          attributes: {
            link: '#',
            rel: 'nofollow noopener',
          },
          insert: 'hello',
        },
      ];
      const rd = new RenderDelta({ ops });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><a href="#" target="_blank" rel="nofollow noopener">hello</a></p>',
      );
    });

    it('should render images and image links', function () {
      const ops = [
        { insert: { image: 'http://yahoo.com/abc.jpg' } },
        {
          insert: { image: 'http://yahoo.com/def.jpg' },
          attributes: { link: 'http://aha' },
        },
        { insert: '\n' },
      ];
      const rd = new RenderDelta({ ops });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><img class="ql-image" src="http://yahoo.com/abc.jpg"/><a href="http://aha" target="_blank"><img class="ql-image" src="http://yahoo.com/def.jpg"/></a></p>',
      );
    });

    it('should open and close list tags', function () {
      const ops = [
        { insert: 'mr\n' },
        { insert: 'hello' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'there' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: '\n', attributes: { list: 'ordered' } },
      ];
      const rd = new RenderDelta({ ops });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p>mr</p><ol><li>hello</li></ol><ul><li>there</li></ul><ol><li></li></ol>',
      );
    });

    it('should render separate paragraphs', () => {
      const rd = new RenderDelta({
        ops: [{ insert: 'hello\nhow are you?\n\nbye\n' }],
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p>hello</p><p>how are you?</p><p></p><p>bye</p>',
      );
    });

    it('should create checked/unchecked lists', function () {
      var ops4 = [
        { insert: 'hello' },
        { insert: '\n', attributes: { list: 'checked' } },
        { insert: 'there' },
        { insert: '\n', attributes: { list: 'unchecked' } },
        { insert: 'man' },
        { insert: '\n', attributes: { list: 'checked' } },
        { insert: 'not done' },
        { insert: '\n', attributes: { indent: 1, list: 'unchecked' } },
      ];
      const rd = new RenderDelta({ ops: ops4 });
      const html = renderToStaticMarkup(rd.render());
      assert.equal(
        html,
        [
          '<ul>',
          '<li data-checked="true">hello</li>',
          '<li data-checked="false">there</li>',
          '<li data-checked="true">man',
          '<ul><li data-checked="false">not done</li></ul>',
          '</li>',
          '</ul>',
        ].join(''),
      );
    });

    it('should render text while escaping HTML', () => {
      const ops = [
        { insert: 'line 1\n', attributes: { code: true } },
        { insert: 'line 2' },
        { insert: 'yo\n', attributes: { attr1: true } },
        { insert: 'line 3\n' },
        { insert: '<p>line 4</p>' },
        { insert: '\n', attributes: { attr1: true } },
        { insert: 'line 5' },
        { insert: '\n', attributes: { attr1: 'test' } },
      ];

      const rd = new RenderDelta({
        ops,
        options: {
          customTag: (format) => {
            return format === 'code' ? 'small' : undefined;
          },
          customAttributes: (op) => {
            if (op.attributes['attr1']) {
              return {
                'data-attr1': op.attributes['attr1'],
              };
            }
            return undefined;
          },
          customClasses: (op) => {
            if (op.attributes['attr1'] === 'test') {
              return ['ql-test'];
            }
            return undefined;
          },
          customCssStyles: (op) => {
            if (op.attributes['attr1'] === 'test') {
              return { color: 'red' };
            }
            return undefined;
          },
        },
      });

      assert.equal(
        renderToStaticMarkup(rd.render()),
        `<p><small>line 1</small></p><p>line 2<span data-attr1="true">yo</span></p><p>line 3</p><p>${encodeHtml(
          '<p>line 4</p>',
        )}</p><p>line 5<span style="color:red" class="ql-test" data-attr1="test"></span></p>`,
      );
    });

    describe('overriding paragraphTag', () => {
      const ops = [
        { insert: 'hey' },
        { insert: '\n', attributes: { align: 'center' } },
        { insert: '\n', attributes: { direction: 'rtl' } },
        { insert: '\n', attributes: { indent: 2 } },
      ];

      it('should render with div tag', () => {
        const rd = new RenderDelta({
          ops,
          options: { paragraphTag: 'div' },
        });
        const html = renderToStaticMarkup(rd.render());
        assert.equal(html.includes('hey'), true);
        assert.equal(html.includes('<div class="ql-align'), true);
        assert.equal(html.includes('<div class="ql-direction'), true);
        assert.equal(html.includes('<div class="ql-indent-2'), true);
      });

      it('should render with the default p tag', () => {
        const rd = new RenderDelta({ ops });
        const html = renderToStaticMarkup(rd.render());
        assert.equal(html.includes('hey'), true);
        assert.equal(html.includes('<p class="ql-align'), true);
        assert.equal(html.includes('<p class="ql-direction'), true);
        assert.equal(html.includes('<p class="ql-indent-2'), true);
      });
    });

    describe('target attribute', () => {
      const ops = [
        { attributes: { target: '_self', link: 'http://#' }, insert: 'A' },
        { attributes: { target: '_blank', link: 'http://#' }, insert: 'B' },
        { attributes: { link: 'http://#' }, insert: 'C' },
        { insert: '\n' },
      ];

      it('should render the target attribute when linkTarget is unspecified', () => {
        const rd = new RenderDelta({ ops });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          '<p><a href="http://#" target="_self">A</a><a href="http://#" target="_blank">B</a><a href="http://#" target="_blank">C</a></p>',
        );
      });

      it('should render the target attribute when linkTarget is an empty string', () => {
        const rd = new RenderDelta({ ops, options: { linkTarget: '' } });
        let html = renderToStaticMarkup(rd.render());
        assert.equal(
          html,
          '<p><a href="http://#" target="_self">A</a><a href="http://#" target="_blank">B</a><a href="http://#">C</a></p>',
        );
      });

      it('should render the target attribute when linkTarget is _top', () => {
        const rd = new RenderDelta({ ops, options: { linkTarget: '_top' } });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          [
            `<p><a href="http://#" target="_self">A</a>`,
            `<a href="http://#" target="_blank">B</a>`,
            `<a href="http://#" target="_top">C</a></p>`,
          ].join(''),
        );
      });
    });

    it('should convert using custom url sanitizer', () => {
      const ops = [
        { attributes: { link: 'http://yahoo<%=abc%>/ed' }, insert: 'test' },
        { attributes: { link: 'http://abc<' }, insert: 'hi' },
      ];

      const rd = new RenderDelta({
        ops,
        options: {
          urlSanitizer: (url) => {
            if (url.includes('<%')) {
              return 'REDACTED';
            }
            return url;
          },
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><a href="REDACTED" target="_blank">test</a><a href="http://abc&lt;" target="_blank">hi</a></p>',
      );
    });

    describe('tables', () => {
      it('should render an empty table', () => {
        const ops = [
          {
            insert: '\n\n\n',
            attributes: {
              table: 'row-1',
            },
          },
          {
            attributes: {
              table: 'row-2',
            },
            insert: '\n\n\n',
          },
          {
            attributes: {
              table: 'row-3',
            },
            insert: '\n\n\n',
          },
          {
            insert: '\n',
          },
        ];

        const rd = new RenderDelta({ ops });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          [
            `<table><tbody>`,
            `<tr><td data-row="row-1"></td><td data-row="row-1"></td><td data-row="row-1"></td></tr>`,
            `<tr><td data-row="row-2"></td><td data-row="row-2"></td><td data-row="row-2"></td></tr>`,
            `<tr><td data-row="row-3"></td><td data-row="row-3"></td><td data-row="row-3"></td></tr>`,
            `</tbody></table>`,
            `<p></p>`,
          ].join(''),
        );
      });

      it('should render singe cell table', () => {
        let ops = [
          {
            insert: 'cell',
          },
          {
            insert: '\n',
            attributes: {
              table: 'row-1',
            },
          },
        ];

        const rd = new RenderDelta({ ops });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          [
            `<table><tbody>`,
            `<tr><td data-row="row-1">cell</td></tr>`,
            `</tbody></table>`,
          ].join(''),
        );
      });

      it('should render filled table', () => {
        let ops = [
          {
            insert: '11',
          },
          {
            attributes: {
              table: 'row-1',
            },
            insert: '\n',
          },
          {
            insert: '12',
          },
          {
            attributes: {
              table: 'row-1',
            },
            insert: '\n',
          },
          {
            insert: '13',
          },
          {
            attributes: {
              table: 'row-1',
            },
            insert: '\n',
          },
          {
            insert: '21',
          },
          {
            attributes: {
              table: 'row-2',
            },
            insert: '\n',
          },
          {
            insert: '22',
          },
          {
            attributes: {
              table: 'row-2',
            },
            insert: '\n',
          },
          {
            insert: '23',
          },
          {
            attributes: {
              table: 'row-2',
            },
            insert: '\n',
          },
          {
            insert: '31',
          },
          {
            attributes: {
              table: 'row-3',
            },
            insert: '\n',
          },
          {
            insert: '32',
          },
          {
            attributes: {
              table: 'row-3',
            },
            insert: '\n',
          },
          {
            insert: '33',
          },
          {
            attributes: {
              table: 'row-3',
            },
            insert: '\n',
          },
          {
            insert: '\n',
          },
        ];

        const rd = new RenderDelta({ ops });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          [
            `<table><tbody>`,
            `<tr><td data-row="row-1">11</td><td data-row="row-1">12</td><td data-row="row-1">13</td></tr>`,
            `<tr><td data-row="row-2">21</td><td data-row="row-2">22</td><td data-row="row-2">23</td></tr>`,
            `<tr><td data-row="row-3">31</td><td data-row="row-3">32</td><td data-row="row-3">33</td></tr>`,
            `</tbody></table>`,
            `<p><br/></p>`,
          ].join(''),
        );
      });
    });

    describe('blocks', () => {
      const ops = [
        {
          insert: 'line 1',
        },
        {
          attributes: {
            'code-block': true,
          },
          insert: '\n',
        },
        {
          insert: 'line 2',
        },
        {
          attributes: {
            'code-block': true,
          },
          insert: '\n',
        },
        {
          insert: 'line 3',
        },
        {
          attributes: {
            'code-block': 'javascript',
          },
          insert: '\n',
        },
        {
          insert: '<p>line 4</p>',
        },
        {
          attributes: {
            'code-block': true,
          },
          insert: '\n',
        },
        {
          insert: 'line 5',
        },
        {
          attributes: {
            // This value should be sanitized out.
            'code-block': 'ja"va',
          },
          insert: '\n',
        },
      ];

      it('should correctly render code block', () => {
        const rd = new RenderDelta({ ops });
        let html = renderToStaticMarkup(rd.render());
        assert.equal(
          html,
          `<pre>line 1\nline 2</pre><pre data-language="javascript">line 3</pre><pre>${encodeHtml(
            '<p>line 4</p>',
          )}\nline 5</pre>`,
        );
      });

      it('should render code block with the multiLineCodeBlock option set to false', () => {
        const rd = new RenderDelta({
          ops,
          options: {
            multiLineCodeBlock: false,
          },
        });
        const html = renderToStaticMarkup(rd.render());
        assert.equal(
          html,
          `<pre>line 1</pre><pre>line 2</pre><pre data-language="javascript">line 3</pre><pre>${encodeHtml(
            '<p>line 4</p>',
          )}</pre><pre>line 5</pre>`,
        );
      });
    });

    describe('custom types', () => {
      it('should render custom insert types with the given renderer', () => {
        const ops = [
          { insert: { boldAndItalic: 'my text' } },
          { insert: { blah: 1 } },
        ];
        const rd = new RenderDelta({
          ops,
          customRenderer: (op) => {
            if ('boldAndItalic' in op.insert.value) {
              return (
                <b>
                  <i>{op.insert.value.boldAndItalic as string}</i>
                </b>
              );
            }
            return 'unknown';
          },
        });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          '<p><b><i>my text</i></b>unknown</p>',
        );
      });

      describe('the renderAsBlock attribute', () => {
        it('should render as a top-level element when renderAsBlock is true', () => {
          const ops = [
            { insert: 'hello ' },
            // Notice here there's no renderAsBlock.
            { insert: { myAbbr: 'my friend', title: 'T1' } },
            { insert: '!' },
            // And here it's true.
            {
              insert: { myAbbr: 'how r u?', title: 'T2' },
              attributes: { renderAsBlock: true },
            },
          ];
          const rd = new RenderDelta({
            ops,
            customRenderer: ({ insert }) => {
              if (
                'myAbbr' in insert.value &&
                typeof insert.value.myAbbr === 'string'
              ) {
                return (
                  <abbr
                    title={
                      typeof insert.value.title === 'string'
                        ? insert.value.title
                        : undefined
                    }
                  >
                    {insert.value.myAbbr}
                  </abbr>
                );
              }
              return 'unknown';
            },
          });
          assert.equal(
            renderToStaticMarkup(rd.render()),
            '<p>hello <abbr title="T1">my friend</abbr>!</p><abbr title="T2">how r u?</abbr>',
          );
        });

        it('should render wrapped in a p tag when renderAsBlock is false', () => {
          const ops = [
            { insert: 'hello ' },
            // Notice here there's no renderAsBlock.
            { insert: { myAbbr: 'my friend', title: 'T1' } },
            { insert: '!' },
            // And here it's false.
            {
              insert: { myAbbr: 'how r u?', title: 'T2' },
              attributes: { renderAsBlock: false },
            },
          ];
          const rd = new RenderDelta({
            ops,
            customRenderer: ({ insert }) => {
              if (
                'myAbbr' in insert.value &&
                typeof insert.value.myAbbr === 'string'
              ) {
                return (
                  <abbr
                    title={
                      typeof insert.value.title === 'string'
                        ? insert.value.title
                        : undefined
                    }
                  >
                    {insert.value.myAbbr}
                  </abbr>
                );
              }
              return 'unknown';
            },
          });
          assert.equal(
            renderToStaticMarkup(rd.render()),
            '<p>hello <abbr title="T1">my friend</abbr>!<abbr title="T2">how r u?</abbr></p>',
          );
        });
      });

      describe('inside code blocks', () => {
        const ops = [
          { insert: { colonizer: ':' } },
          { insert: '\n', attributes: { 'code-block': true } },
          { insert: 'code1' },
          { insert: '\n', attributes: { 'code-block': true } },
          { insert: { colonizer: ':' } },
          { insert: '\n', attributes: { 'code-block': true } },
        ];

        const customRenderer: CustomRenderer = (op) => {
          if ('colonizer' in op.insert.value) {
            return op.insert.value.colonizer as string;
          }
          return null;
        };

        it('should render a simple custom insert type', () => {
          const rd = new RenderDelta({ ops: ops.slice(0, 2), customRenderer });
          assert.equal(renderToStaticMarkup(rd.render()), '<pre>:</pre>');
        });

        it('should render a custom insert type among other inserts', () => {
          const rd = new RenderDelta({ ops, customRenderer });
          assert.equal(
            renderToStaticMarkup(rd.render()),
            '<pre>:\ncode1\n:</pre>',
          );
        });

        it('should render custom insert types along with inserts with a custom tag', () => {
          const rd = new RenderDelta({
            ops,
            options: {
              customTag: (format) => {
                if (format === 'code-block') {
                  return 'code';
                }
              },
            },
            customRenderer,
          });
          assert.equal(
            renderToStaticMarkup(rd.render()),
            '<code>:\ncode1\n:</code>',
          );
        });
      });

      describe('inside headers', () => {
        const ops = [
          { insert: { colonizer: ':' } },
          { insert: '\n', attributes: { header: 1 } },
          { insert: 'hello' },
          { insert: '\n', attributes: { header: 1 } },
          { insert: { colonizer: ':' } },
          { insert: '\n', attributes: { header: 1 } },
        ];

        const customRenderer: CustomRenderer = (op) => {
          if ('colonizer' in op.insert.value) {
            return op.insert.value.colonizer as string;
          }
          return '';
        };

        it('should render a simple custom insert type', () => {
          const rd = new RenderDelta({ ops: ops.slice(0, 2), customRenderer });
          assert.equal(renderToStaticMarkup(rd.render()), '<h1>:</h1>');
        });

        it('should render a custom insert type among other inserts', () => {
          const rd = new RenderDelta({ ops, customRenderer });
          assert.equal(
            renderToStaticMarkup(rd.render()),
            '<h1>:<br/>hello<br/>:</h1>',
          );
        });
      });
    });

    it('should render inlines with a custom tag', function () {
      const rd = new RenderDelta({
        ops: [
          { insert: 'Hello' },
          { insert: ' my ', attributes: { italic: true } },
          { insert: '\n' },
          { insert: ' name is joey' },
        ],
        options: {
          customTag: (format) => {
            if (format === 'italic') {
              return 'i';
            }
          },
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p>Hello<i> my </i></p><p> name is joey</p>',
      );
    });

    it('should render a paragraph for each new line', () => {
      const rd = new RenderDelta({
        ops: [{ insert: '\na\nb\n' }],
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p></p><p>a</p><p>b</p>',
      );
    });

    it('should render lines with mixed styles', () => {
      const ops = [
        { insert: 'a', attributes: { color: 'red', italic: true } },
        { insert: '\n\nb\n' },
      ];
      const rd = new RenderDelta({ ops });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p><em style="color:red">a</em></p><p></p><p>b</p>',
      );
    });
  });

  describe('getGroupedOps', () => {
    it('should transform raw Delta ops to an array of DeltaInsertOp', function () {
      const ops = [
        { insert: 'This ' },
        { attributes: { font: 'monospace' }, insert: 'is' },
        { insert: ' a ' },
        { attributes: { size: 'large' }, insert: 'test' },
        { insert: ' ' },
        { attributes: { italic: true, bold: true }, insert: 'data' },
        { insert: ' ' },
        { attributes: { underline: true, strike: true }, insert: 'that' },
        { insert: ' is ' },
        { attributes: { color: '#e60000' }, insert: 'will' },
        { insert: ' ' },
        { attributes: { background: '#ffebcc' }, insert: 'test' },
        { insert: ' ' },
        { attributes: { script: ScriptType.Sub }, insert: 'the' },
        { insert: ' ' },
        { attributes: { script: ScriptType.Super }, insert: 'rendering' },
        { insert: ' of ' },
        { attributes: { link: 'yahoo' }, insert: 'inline' },
        { insert: ' ' },
        { insert: { formula: 'x=data' } },
        { insert: '  formats.\n' },
      ];

      const rd = new RenderDelta({
        ops,
        options: {
          urlSanitizer: (url) =>
            url.includes('yahoo') ? `unsafe:${url}` : url,
        },
      });

      const groupedOps = rd.getGroupedOps();
      assert.deepEqual(groupedOps, [
        new InlineGroup([
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'This ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'is'), {
            font: 'monospace',
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' a ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'test'), {
            size: 'large',
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'data'), {
            italic: true,
            bold: true,
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'that'), {
            underline: true,
            strike: true,
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' is ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'will'), {
            color: '#e60000',
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'test'), {
            background: '#ffebcc',
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'the'), {
            script: ScriptType.Sub,
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'rendering'), {
            script: ScriptType.Super,
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' of ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, 'inline'), {
            link: 'unsafe:yahoo',
          }),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, ' ')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Formula, 'x=data')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, '  formats.')),
          new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n')),
        ]),
      ]);
    });

    it('should transform raw custom ops', () => {
      const rd = new RenderDelta({
        ops: [{ insert: { cake: 'chocolate' } }],
      });
      assert.deepEqual(rd.getGroupedOps(), [
        new InlineGroup([
          new DeltaInsertOp(new InsertDataCustom({ cake: 'chocolate' })),
        ]),
      ]);
    });

    it('should exclude invalid ops', () => {
      [null, undefined, 3, {}].forEach((op: unknown) => {
        const rd = new RenderDelta({ ops: [op] });
        assert.deepEqual(rd.getGroupedOps(), []);
      });
    });
  });

  describe('getListTag', () => {
    const rd = new RenderDelta({ ops: [] });

    it('should return the expected list tag for an ordered list', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Ordered,
      });
      assert.equal(rd.getListTag(op), 'ol');
    });

    it('should return the expected list tag for a bullet list', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Bullet,
      });
      assert.equal(rd.getListTag(op), 'ul');
    });

    it('should return the expected list tag for a checked list', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Checked,
      });
      assert.equal(rd.getListTag(op), 'ul');
    });

    it('should return the expected list tag for an unchecked list', () => {
      const op = new DeltaInsertOp(new InsertDataQuill(DataType.Text, '\n'), {
        list: ListType.Unchecked,
      });
      assert.equal(rd.getListTag(op), 'ul');
    });
  });
});
