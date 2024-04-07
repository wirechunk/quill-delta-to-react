import { strict as assert } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { DeltaInsertOp, DeltaInsertOpType } from './../src/DeltaInsertOp.js';
import { RenderDelta } from './../src/render-delta.js';
import { delta1 } from './data/delta1.js';
import { DataType, ListType, ScriptType } from './../src/value-types.js';
import { InsertDataCustom, InsertDataQuill } from '../src/InsertData.js';
import { InlineGroup } from '../src/grouper/group-types.js';
import { renderToString } from 'react-dom/server';

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
    const ops = [
      { insert: 'this is text' },
      { insert: '\n' },
      { insert: 'this is code' },
      { insert: '\n', attributes: { 'code-block': true } },
      { insert: 'this is code TOO!' },
      { insert: '\n', attributes: { 'code-block': true } },
    ];

    it('should render html', function () {
      const rd = new RenderDelta({ ops });

      const html = renderToString(rd.render());
      assert.equal(
        html,
        `<p>this is text</p><pre>this is code</pre><pre>this is code TOO!</pre>`,
      );
    });

    it('should render a mention', () => {
      let ops = [
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
      const html = rd.render();
      assert.equal(html, '<span class="abc">Mention1</span>');
    });

    it('should render a mention with a link', () => {
      var qdc = new RenderDelta({
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
      const html = renderToString(qdc.render());
      assert.equal(
        html,
        '<p><a href="https://example.com/abc" target="_blank">Mention2</a></p>',
      );
    });

    it('should return proper html', function () {
      var qdc = new RenderDelta({
        ops: delta1.ops,
        options: {
          classPrefix: 'noz',
        },
      });
      const html = renderToString(qdc.render());
      assert.equal(html, delta1.html);
    });

    it('should set default inline styles for inlineStyles: true', function () {
      const hugeOps = [
        { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
        { insert: '\n' },
      ];
      var qdc = new RenderDelta({
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
      const html = renderToString(qdc.render());
      assert.equal(
        html.includes('<span style="color:red;font-size: 2.5em">huge</span>'),
        true,
        html,
      );
    });

    it('should set default inline styles when `inlineStyles` is a truthy non-object', function () {
      const hugeOps = [
        { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
        { insert: '\n' },
      ];
      var qdc = new RenderDelta({
        ops: hugeOps,
        options: {
          inlineStyles: 1,
        },
      });
      const html = renderToString(qdc.render());
      assert.equal(
        html.includes('<span style="font-size: 2.5em">huge</span>'),
        true,
        html,
      );
    });

    it('should allow setting inline styles', function () {
      const hugeOps = [
        { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
        { insert: '\n' },
      ];
      var qdc = new RenderDelta({
        ops: hugeOps,
        options: {
          inlineStyles: {
            size: {
              huge: 'font-size: 6em',
            },
          },
        },
      });
      const html = renderToString(qdc.render());
      assert.equal(
        html.includes('<span style="font-size: 6em">huge</span>'),
        true,
        html,
      );
    });

    it('should render links with rels', function () {
      var ops = [
        {
          attributes: {
            link: '#',
            rel: 'nofollow noopener',
          },
          insert: 'external link',
        },
        {
          attributes: {
            link: '#',
          },
          insert: 'internal link',
        },
      ];
      var qdc = new RenderDelta({
        ops,
        options: {
          linkRel: 'license',
        },
      });
      const html = renderToString(qdc.render());
      assert.equal(
        html,
        '<p><a href="#" target="_blank" rel="nofollow noopener">external link</a><a href="#" target="_blank" rel="license">internal link</a></p>',
      );

      qdc = new RenderDelta({ ops });
      html = renderToString(qdc.render());
      assert.equal(
        html,
        '<p><a href="#" target="_blank" rel="nofollow noopener">external link</a><a href="#" target="_blank">internal link</a></p>',
      );
    });
    it('should render image and image links', function () {
      let ops = [
        { insert: { image: 'http://yahoo.com/abc.jpg' } },
        {
          insert: { image: 'http://yahoo.com/def.jpg' },
          attributes: { link: 'http://aha' },
        },
      ];
      let qdc = new RenderDelta({ ops });
      let html = renderToString(qdc.render());
      assert.equal(
        html,
        [
          '<p>',
          '<img class="ql-image" src="http://yahoo.com/abc.jpg"/>',
          '<a href="http://aha" target="_blank">',
          '<img class="ql-image" src="http://yahoo.com/def.jpg"/>',
          '</a>',
          '</p>',
        ].join(''),
      );
    });

    it('should open and close list tags', function () {
      var ops4 = [
        { insert: 'mr\n' },
        { insert: 'hello' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'there' },
        { insert: '\n', attributes: { list: 'bullet' } },
        { insert: '\n', attributes: { list: 'ordered' } },
      ];
      var qdc = new RenderDelta({ ops: ops4 });
      const html = renderToString(qdc.render());

      assert.equal(html.indexOf('<p>mr') > -1, true);
      assert.equal(html.indexOf('</ol><ul><li>there') > -1, true);
    });

    it('should render as separate paragraphs', function () {
      var ops4 = [{ insert: 'hello\nhow areyou?\n\nbye' }];
      var qdc = new RenderDelta({
        ops: ops4,
        options: {
          multiLineParagraph: false,
        },
      });
      const html = renderToString(qdc.render());

      assert.equal(
        html,
        '<p>hello</p><p>how areyou?</p><p><br/></p><p>bye</p>',
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
      var qdc = new RenderDelta({ ops: ops4 });
      const html = renderToString(qdc.render());
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

    it('should wrap positional styles in right tag', function () {
      var ops4 = [
        { insert: 'mr' },
        { insert: '\n', attributes: { align: 'center' } },
        { insert: '\n', attributes: { direction: 'rtl' } },
        { insert: '\n', attributes: { indent: 2 } },
      ];
      var qdc = new RenderDelta({
        ops: ops4,
        options: { paragraphTag: 'div' },
      });
      const html = renderToString(qdc.render());
      assert.equal(html.indexOf('<div class="ql-align') > -1, true);
      assert.equal(html.indexOf('<div class="ql-direction') > -1, true);
      assert.equal(html.indexOf('<div class="ql-indent') > -1, true);

      var qdc = new RenderDelta({ ops: ops4 });
      const html = renderToString(qdc.render());
      assert.equal(html.indexOf('<p class="ql-align') > -1, true);
      assert.equal(html.indexOf('<p class="ql-direction') > -1, true);
      assert.equal(html.indexOf('<p class="ql-indent') > -1, true);
    });
    it('should render target attr correctly', () => {
      let ops = [
        { attributes: { target: '_self', link: 'http://#' }, insert: 'A' },
        { attributes: { target: '_blank', link: 'http://#' }, insert: 'B' },
        { attributes: { link: 'http://#' }, insert: 'C' },
        { insert: '\n' },
      ];
      let qdc = new RenderDelta({ ops, options: { linkTarget: '' } });
      let html = renderToString(qdc.render());
      assert.equal(
        html,
        [
          `<p><a href="http://#" target="_self">A</a>`,
          `<a href="http://#" target="_blank">B</a>`,
          `<a href="http://#">C</a></p>`,
        ].join(''),
      );

      qdc = new RenderDelta({ ops });
      html = renderToString(qdc.render());
      assert.equal(
        html,
        [
          `<p><a href="http://#" target="_self">A</a>`,
          `<a href="http://#" target="_blank">B</a>`,
          `<a href="http://#" target="_blank">C</a></p>`,
        ].join(''),
      );

      qdc = new RenderDelta({ ops, options: { linkTarget: '_top' } });
      html = renderToString(qdc.render());
      assert.equal(
        html,
        [
          `<p><a href="http://#" target="_self">A</a>`,
          `<a href="http://#" target="_blank">B</a>`,
          `<a href="http://#" target="_top">C</a></p>`,
        ].join(''),
      );
    });

    it('should convert using custom url sanitizer', () => {
      let ops = [
        { attributes: { link: 'http://yahoo<%=abc%>/ed' }, insert: 'test' },
        { attributes: { link: 'http://abc<' }, insert: 'hi' },
      ];

      let qdc = new RenderDelta({
        ops,
        options: {
          urlSanitizer: (link) => {
            if (link.includes('<%')) {
              return link;
            }
            return 'REDACTED';
          },
        },
      });
      assert.equal(
        renderToString(qdc.render()),
        [
          `<p><a href="REDACTED" target="_blank">test</a>`,
          `<a href="http://abc&lt;" target="_blank">hi</a></p>`,
        ].join(''),
      );
    });

    it('should render empty table', () => {
      let ops = [
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

      let qdc = new RenderDelta({ ops });
      assert.equal(
        renderToString(qdc.render()),
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

      let qdc = new RenderDelta({ ops });
      assert.equal(
        renderToString(qdc.render()),
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

      let qdc = new RenderDelta({ ops });
      assert.equal(
        renderToString(qdc.render()),
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
      it('should transform raw delta ops to DeltaInsertOp[]', function () {
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

        const qdc = new RenderDelta({ ops });

        const groupedOps = qdc.getGroupedOps();
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
            new DeltaInsertOp(new InsertDataQuill(DataType.Formula, 'x=data')),
            new DeltaInsertOp('  formats.'),
            new DeltaInsertOp('\n'),
          ]),
        ]);
      });

      it('should transform raw custom ops', () => {
        const ops: DeltaInsertOpType[] = [{ insert: { cake: 'chocolate' } }];
        const qdc = new RenderDelta({ ops });
        assert.deepEqual(qdc.getGroupedOps(), [
          new InlineGroup([
            new DeltaInsertOp(new InsertDataCustom('cake', 'chocolate')),
          ]),
        ]);
      });

      it('should exclude invalid ops', () => {
        [null, undefined, 3, {}].forEach((op: unknown) => {
          const qdc = new RenderDelta({ ops: [op] });
          assert.deepEqual(qdc.getGroupedOps(), []);
        });
      });
    });

    describe('blocks', function () {
      var op = new DeltaInsertOp('\n', { header: 3, indent: 2 });
      var inlineop = new DeltaInsertOp('hi there');
      it('should render container block', function () {
        var qdc = new RenderDelta({ ops: [] });
        var blockhtml = qdc._renderBlock(op, [inlineop]);
        assert.equal(
          blockhtml,
          ['<h3 class="ql-indent-2">', 'hi there</h3>'].join(''),
        );

        var qdc = new RenderDelta({ ops: [] });
        var blockhtml = qdc._renderBlock(op, []);
        assert.equal(
          blockhtml,
          ['<h3 class="ql-indent-2">', '<br/></h3>'].join(''),
        );
      });

      it('should correctly render code block', function () {
        let ops = [
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
              'code-block': 'ja"va',
            },
            insert: '\n',
          },
        ];
        var qdc = new RenderDelta({ ops });
        let html = renderToString(qdc.render());
        assert.equal(
          html,
          [
            '<pre>line 1\nline 2</pre>',
            '<pre data-language="javascript">line 3</pre>',
            '<pre>',
            encodeHtml('<p>line 4</p>'),
            '\nline 5' + '</pre>',
          ].join(''),
        );

        qdc = new RenderDelta({
          ops,
          options: {
            multiLineCodeBlock: false,
          },
        });
        html = renderToString(qdc.render());
        assert.equal(
          '<pre>line 1</pre><pre>line 2</pre>' +
            '<pre data-language="javascript">line 3</pre>' +
            '<pre>' +
            encodeHtml('<p>line 4</p>') +
            '</pre>' +
            '<pre>line 5</pre>',
          html,
        );
        qdc = new RenderDelta({ ops: [ops[0], ops[1]] });
        html = renderToString(qdc.render());
        assert.equal(html, '<pre>line 1</pre>');
      });
    });
  });

  describe('custom types', () => {
    it('should return an empty string if a renderer not defined for a custom blot', () => {
      let ops = [{ insert: { customstuff: 'my val' } }];
      let qdc = new RenderDelta({ ops });
      assert.equal(renderToString(qdc.render()), '<p></p>');
    });
    it('should render custom insert types with given renderer', () => {
      let ops = [
        { insert: { bolditalic: 'my text' } },
        { insert: { blah: 1 } },
      ];
      let qdc = new RenderDelta({ ops });
      qdc.renderCustomWith((op) => {
        if (op.insert.type === 'bolditalic') {
          return '<b><i>' + op.insert.value + '</i></b>';
        }
        return 'unknown';
      });
      let html = renderToString(qdc.render());
      assert.equal(html, '<p><b><i>my text</i></b>unknown</p>');
    });

    it('should render custom insert types as blocks if renderAsBlock is specified', () => {
      let ops = [
        { insert: 'hello ' },
        { insert: { myblot: 'my friend' } },
        { insert: '!' },
        { insert: { myblot: 'how r u?' }, attributes: { renderAsBlock: true } },
      ];
      let qdc = new RenderDelta({ ops });
      qdc.renderCustomWith((op) => {
        if (op.insert.type === 'myblot') {
          return op.attributes.renderAsBlock
            ? '<div>' + op.insert.value + '</div>'
            : op.insert.value;
        }
        return 'unknown';
      });
      let html = renderToString(qdc.render());
      assert.equal(html, '<p>hello my friend!</p><div>how r u?</div>');
    });

    it('should render custom insert types in code blocks with given renderer', () => {
      let ops = [
        { insert: { colonizer: ':' } },
        { insert: '\n', attributes: { 'code-block': true } },
        { insert: 'code1' },
        { insert: '\n', attributes: { 'code-block': true } },
        { insert: { colonizer: ':' } },
        { insert: '\n', attributes: { 'code-block': true } },
      ];
      let renderer = (op: DeltaInsertOp) => {
        if (op.insert.type === 'colonizer') {
          return op.insert.value;
        }
        return '';
      };
      let qdc = new RenderDelta({ ops: ops.slice(0, 2) });
      qdc.renderCustomWith(renderer);
      assert.equal(renderToString(qdc.render()), '<pre>:</pre>');

      qdc = new RenderDelta({ ops });
      qdc.renderCustomWith(renderer);
      assert.equal(renderToString(qdc.render()), '<pre>:\ncode1\n:</pre>');

      qdc = new RenderDelta({
        ops,
        options: {
          customTag: (format) => {
            if (format === 'code-block') {
              return 'code';
            }
          },
        },
      });
      qdc.renderCustomWith(renderer);
      assert.equal(renderToString(qdc.render()), '<code>:\ncode1\n:</code>');
    });

    it('should render custom insert types in headers with given renderer', () => {
      let ops = [
        { insert: { colonizer: ':' } },
        { insert: '\n', attributes: { header: 1 } },
        { insert: 'hello' },
        { insert: '\n', attributes: { header: 1 } },
        { insert: { colonizer: ':' } },
        { insert: '\n', attributes: { header: 1 } },
      ];
      let renderer = (op: DeltaInsertOp) => {
        if (op.insert.type === 'colonizer') {
          return op.insert.value;
        }
        return '';
      };
      let qdc = new RenderDelta({ ops: ops.slice(0, 2) });
      qdc.renderCustomWith(renderer);
      assert.equal(renderToString(qdc.render()), '<h1>:</h1>');

      qdc = new RenderDelta({ ops });
      qdc.renderCustomWith(renderer);
      assert.equal(renderToString(qdc.render()), '<h1>:<br/>hello<br/>:</h1>');
    });
  });

  describe('getListTag', function () {
    it('should return the expected list tag', function () {
      const op = new DeltaInsertOp('\n', { list: ListType.Ordered });
      const qdc = new RenderDelta({ ops: delta1.ops });
      assert.equal(qdc.getListTag(op), 'ol');

      const op = new DeltaInsertOp('\n', { list: ListType.Bullet });
      assert.equal(qdc.getListTag(op), 'ul');

      const op = new DeltaInsertOp('\n', { list: ListType.Checked });
      assert.equal(qdc.getListTag(op), 'ul');

      const op = new DeltaInsertOp('\n', { list: ListType.Unchecked });
      assert.equal(qdc.getListTag(op), 'ul');

      const op = new DeltaInsertOp('d');
      assert.equal(qdc.getListTag(op), '');
    });
  });

  describe(' prepare data before inline and block renders', function () {
    let ops: DeltaInsertOp[];
    beforeEach(() => {
      ops = [
        { insert: 'Hello' },
        { insert: ' my ', attributes: { italic: true } },
        { insert: '\n', attributes: { italic: true } },
        { insert: ' name is joey' },
      ].map((v) => new DeltaInsertOp(v.insert, v.attributes));
    });

    describe('renderInlines', function () {
      it('should render inlines', function () {
        var qdc = new RenderDelta({ ops });
        var inlines = renderToString(qdc.render());
        assert.equal(
          inlines,
          ['<p>Hello', '<em> my </em><br/> name is joey</p>'].join(''),
        );

        qdc = new RenderDelta({ ops, options: { paragraphTag: 'div' } });
        var inlines = renderToString(qdc.render());
        assert.equal(
          inlines,
          '<div>Hello<em> my </em><br/> name is joey</div>',
        );
      });

      it('should render inlines custom tag', function () {
        var qdc = new RenderDelta({
          ops,
          options: {
            customTag: (format) => {
              if (format === 'italic') {
                return 'i';
              }
            },
          },
        });
        var inlines = renderToString(qdc.render());
        assert.equal(
          inlines,
          ['<p>Hello', '<i> my </i><br/> name is joey</p>'].join(''),
        );

        qdc = new RenderDelta({ ops, options: { paragraphTag: 'div' } });
        var inlines = renderToString(qdc.render());
        assert.equal(
          inlines,
          '<div>Hello<em> my </em><br/> name is joey</div>',
        );
      });

      it('should render plain new line string', function () {
        var ops = [new DeltaInsertOp('\n')];
        var qdc = new RenderDelta({ ops });
        assert.equal(renderToString(qdc.render()), '<p><br/></p>');
      });

      it('should render styled new line string', function () {
        var ops = [new DeltaInsertOp('\n', { font: 'arial' })];
        var qdc = new RenderDelta({ ops });
        assert.equal(renderToString(qdc.render()), '<p><br/></p>');

        var qdc = new RenderDelta({ ops });
        assert.equal(renderToString(qdc.render()), '<br/>');
      });

      it('should render when first line is new line', function () {
        var ops = [new DeltaInsertOp('\n'), new DeltaInsertOp('aa')];
        var qdc = new RenderDelta({ ops });
        assert.equal(renderToString(qdc.render()), '<p><br/>aa</p>');
      });

      it('should render when last line is new line', function () {
        var ops = [new DeltaInsertOp('aa'), new DeltaInsertOp('\n')];
        var qdc = new RenderDelta({ ops });
        assert.equal(renderToString(qdc.render()), '<p>aa</p>');
      });

      it('should render mixed lines', function () {
        var ops = [new DeltaInsertOp('aa'), new DeltaInsertOp('bb')];
        var nlop = new DeltaInsertOp('\n');
        var stylednlop = new DeltaInsertOp('\n', {
          color: '#333',
          italic: true,
        });
        var qdc = new RenderDelta({ ops });
        assert.equal(renderToString(qdc.render()), '<p>aabb</p>');

        var ops0 = [nlop, ops[0], nlop, ops[1]];
        var qdc2 = new RenderDelta({ ops: ops0 });
        assert.equal(qdc2.render(), '<p><br/>aa<br/>bb</p>');

        var ops4 = [ops[0], stylednlop, stylednlop, stylednlop, ops[1]];
        var qdc3 = new RenderDelta({ ops: ops4 });
        assert.equal(qdc3.render(), ['<p>aa<br/><br/><br/>bb</p>'].join(''));
      });
    });

    it('should correctly render custom text block', function () {
      let ops = [
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

      var qdc = new RenderDelta({
        ops,
        options: {
          customTag: (format, op) => {
            if (
              format === 'renderAsBlock' &&
              op.attributes['attr1'] === 'test'
            ) {
              return 'test';
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
              return ['color:red'];
            }
          },
        },
      });
      let html = renderToString(qdc.render());
      assert.equal(
        html,
        [
          '<p>line 1<br/>line 2</p>',
          '<p>line 3</p>',
          '<p>',
          encodeHtml('<p>line 4</p>'),
          '</p>',
          '<test attr1="test" class="ql-test" style="color:red">line 5</test>',
        ].join(''),
      );

      qdc = new RenderDelta({
        ops,
        options: {
          multiLineCustomBlock: false,
        },
      });
      html = renderToString(qdc.render());
      assert.equal(
        '<p>line 1</p><p>line 2</p>' +
          '<p>line 3</p>' +
          '<p>' +
          encodeHtml('<p>line 4</p>') +
          '</p>' +
          '<p>line 5</p>',
        html,
      );
      qdc = new RenderDelta({ ops: [ops[0], ops[1]] });
      html = renderToString(qdc.render());
      assert.equal(html, '<p>line 1</p>');
    });
  });
});
