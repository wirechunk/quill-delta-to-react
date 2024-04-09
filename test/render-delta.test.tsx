import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { DeltaInsertOp, DeltaInsertOpType } from './../src/DeltaInsertOp.js';
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
        '<p>mr</p><ol><li>hello</li></ol><ul><li>there</li></ul><ol><li>\n</li></ol>',
      );
    });

    it('should render as separate paragraphs when multiLineParagraph is false', () => {
      const rd = new RenderDelta({
        ops: [{ insert: 'hello\nhow are you?\n\nbye' }],
        options: {
          multiLineParagraph: false,
        },
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p>hello</p><p>how are you?</p><p><br/></p><p>bye</p>',
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

    describe('custom text block', () => {
      const ops = [
        {
          insert: 'line 1',
        },
        {
          attributes: {
            renderAsBlock: true,
            attr1: true,
          },
          insert: '\n',
        },
        {
          insert: 'line 2',
        },
        {
          attributes: {
            renderAsBlock: true,
            attr1: true,
          },
          insert: '\n',
        },
        {
          insert: 'line 3',
        },
        {
          attributes: {
            renderAsBlock: true,
            attr2: true,
          },
          insert: '\n',
        },
        {
          insert: '<p>line 4</p>',
        },
        {
          attributes: {
            renderAsBlock: true,
            attr1: true,
          },
          insert: '\n',
        },
        {
          insert: 'line 5',
        },
        {
          attributes: {
            renderAsBlock: true,
            attr1: 'test',
          },
          insert: '\n',
        },
      ];

      it('should render custom text block', () => {
        const rd = new RenderDelta({
          ops,
          options: {
            customTag: (format, op) => {
              if (
                format === 'renderAsBlock' &&
                op.attributes['attr1'] === 'test'
              ) {
                return 'section';
              }
            },
            customAttributes: (op) => {
              if (op.attributes['attr1'] === 'test') {
                return {
                  attr1: op.attributes['attr1'],
                };
              }
            },
            customClasses: (op) => {
              if (op.attributes['attr1'] === 'test') {
                return ['ql-test'];
              }
            },
            customCssStyles: (op) => {
              if (op.attributes['attr1'] === 'test') {
                return { color: 'red' };
              }
            },
          },
        });

        assert.equal(
          renderToStaticMarkup(rd.render()),
          `<p>line 1</p><br/>line 2</p><p>line 3</p><p>${encodeHtml(
            '<p>line 4</p>',
          )}</p><section attr1="test" class="ql-test" style="color:red">line 5</section>`,
        );
      });

      it('should render custom text block with the multiLineCustomBlock option set to false', () => {
        const rd = new RenderDelta({
          ops,
          options: {
            multiLineCustomBlock: false,
          },
        });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          `<p>line 1</p><p>line 2</p><p>line 3</p><p>${encodeHtml(
            '<p>line 4</p>',
          )}</p><p>line 5</p>`,
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
            `<tr><td data-row="row-1"><br/></td><td data-row="row-1"><br/></td><td data-row="row-1"><br/></td></tr>`,
            `<tr><td data-row="row-2"><br/></td><td data-row="row-2"><br/></td><td data-row="row-2"><br/></td></tr>`,
            `<tr><td data-row="row-3"><br/></td><td data-row="row-3"><br/></td><td data-row="row-3"><br/></td></tr>`,
            `</tbody></table>`,
            `<p><br/></p>`,
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

      describe('getGroupedOps', () => {
        it('should transform raw Delta ops to an array of DeltaInsertOp', function () {
          const ops: DeltaInsertOpType[] = [
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
              new DeltaInsertOp('This '),
              new DeltaInsertOp('is', { font: 'monospace' }),
              new DeltaInsertOp(' a '),
              new DeltaInsertOp('test', { size: 'large' }),
              new DeltaInsertOp(' '),
              new DeltaInsertOp('data', { italic: true, bold: true }),
              new DeltaInsertOp(' '),
              new DeltaInsertOp('that', { underline: true, strike: true }),
              new DeltaInsertOp(' is '),
              new DeltaInsertOp('will', { color: '#e60000' }),
              new DeltaInsertOp(' '),
              new DeltaInsertOp('test', { background: '#ffebcc' }),
              new DeltaInsertOp(' '),
              new DeltaInsertOp('the', { script: ScriptType.Sub }),
              new DeltaInsertOp(' '),
              new DeltaInsertOp('rendering', { script: ScriptType.Super }),
              new DeltaInsertOp(' of '),
              new DeltaInsertOp('inline', { link: 'unsafe:yahoo' }),
              new DeltaInsertOp(' '),
              new DeltaInsertOp(
                new InsertDataQuill(DataType.Formula, 'x=data'),
              ),
              new DeltaInsertOp('  formats.'),
              new DeltaInsertOp('\n'),
            ]),
          ]);
        });

        it('should transform raw custom ops', () => {
          const ops: DeltaInsertOpType[] = [{ insert: { cake: 'chocolate' } }];
          const rd = new RenderDelta({ ops });
          assert.deepEqual(rd.getGroupedOps(), [
            new InlineGroup([
              new DeltaInsertOp(new InsertDataCustom('cake', 'chocolate')),
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
            if (op.insert.type === 'boldAndItalic') {
              return (
                <b>
                  <i>{op.insert.value}</i>
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

      it('should render custom insert types as blocks if renderAsBlock is specified', () => {
        const ops = [
          { insert: 'hello ' },
          { insert: { myBlot: 'my friend' } },
          { insert: '!' },
          {
            insert: { myBlot: 'how r u?' },
            attributes: { renderAsBlock: true },
          },
        ];
        const rd = new RenderDelta({
          ops,
          customRenderer: (op) => {
            if (op.insert.type === 'myBlot') {
              return op.attributes.renderAsBlock ? (
                <div>{op.insert.value}</div>
              ) : (
                op.insert.value
              );
            }
            return 'unknown';
          },
        });
        assert.equal(
          renderToStaticMarkup(rd.render()),
          '<p>hello my friend!</p><div>how r u?</div>',
        );
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
          if (op.insert.type === 'colonizer') {
            return op.insert.value;
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

        it('should render custom insert types with a custom tag', () => {
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
          if (op.insert.type === 'colonizer') {
            return op.insert.value;
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

    describe('getListTag', function () {
      const rd = new RenderDelta({ ops: [] });

      it('should return the expected list tag for an ordered list', () => {
        const op = new DeltaInsertOp('\n', { list: ListType.Ordered });
        assert.equal(rd.getListTag(op), 'ol');
      });

      it('should return the expected list tag for a bullet list', () => {
        const op = new DeltaInsertOp('\n', { list: ListType.Bullet });
        assert.equal(rd.getListTag(op), 'ul');
      });

      it('should return the expected list tag for a checked list', () => {
        const op = new DeltaInsertOp('\n', { list: ListType.Checked });
        assert.equal(rd.getListTag(op), 'ul');
      });

      it('should return the expected list tag for an unchecked list', () => {
        const op = new DeltaInsertOp('\n', { list: ListType.Unchecked });
        assert.equal(rd.getListTag(op), 'ul');
      });
    });

    it('should render inlines custom tag', function () {
      const rd = new RenderDelta({
        ops: [
          { insert: 'Hello' },
          { insert: ' my ', attributes: { italic: true } },
          { insert: '\n', attributes: { italic: true } },
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
        '<p>Hello<i> my </i><br/> name is joey</p>',
      );
    });

    it('should render plain new line string', () => {
      const rd = new RenderDelta({ ops: [new DeltaInsertOp('\n')] });
      assert.equal(renderToStaticMarkup(rd.render()), '<p><br/></p>');
    });

    it('should render when first line is new line', () => {
      const rd = new RenderDelta({
        ops: [new DeltaInsertOp('\n'), new DeltaInsertOp('aa')],
      });
      assert.equal(renderToStaticMarkup(rd.render()), '<p><br/>aa</p>');
    });

    it('should render when last line is new line', () => {
      const rd = new RenderDelta({
        ops: [new DeltaInsertOp('aa'), new DeltaInsertOp('\n')],
      });
      assert.equal(renderToStaticMarkup(rd.render()), '<p>aa</p>');
    });

    it('should render mixed lines', () => {
      const rd = new RenderDelta({
        ops: [new DeltaInsertOp('\na\nb\n')],
      });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p></p><p>a</p><p>b</p>',
      );
    });

    it('should render mixed lines with styled newlines', () => {
      const styledNewlineOp = new DeltaInsertOp('\n', {
        color: '#333',
        italic: true,
      });
      const ops4 = [
        new DeltaInsertOp('a'),
        styledNewlineOp,
        styledNewlineOp,
        styledNewlineOp,
        new DeltaInsertOp('b'),
      ];
      const rd = new RenderDelta({ ops: ops4 });
      assert.equal(
        renderToStaticMarkup(rd.render()),
        '<p>a<br/><br/><br/>b</p>',
      );
    });
  });
});
