import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import {
  CustomRenderer,
  RenderDelta,
  RenderDeltaProps,
} from './../src/render-delta.js';
import { renderToStaticMarkup } from 'react-dom/server';

const render = (props: RenderDeltaProps) =>
  renderToStaticMarkup(
    <RenderDelta
      ops={props.ops}
      options={props.options}
      customRenderer={props.customRenderer}
    />,
  );

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
  it('should render a plain new line string as an empty paragraph', () => {
    const props: RenderDeltaProps = {
      ops: [{ insert: '\n' }],
    };
    assert.equal(render(props), '<p></p>');
  });

  it('should render when the first op is just a new line', () => {
    const props: RenderDeltaProps = {
      ops: [{ insert: '\n' }, { insert: 'aa\n' }],
    };
    assert.equal(render(props), '<p></p><p>aa</p>');
  });

  it('should render when last line is new line', () => {
    const props: RenderDeltaProps = {
      ops: [{ insert: 'aa' }, { insert: '\n' }],
    };
    assert.equal(render(props), '<p>aa</p>');
  });

  it('should render HTML', () => {
    const props: RenderDeltaProps = {
      ops: [
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
      ],
    };

    assert.equal(
      render(props),
      '<p>this is text</p><pre data-language="plain">this is code\nthis is code too!</pre>',
    );
  });

  it('should render a paragraph for each new line', () => {
    const props: RenderDeltaProps = {
      ops: [{ insert: '\na\nb\n' }],
    };
    assert.equal(render(props), '<p></p><p>a</p><p>b</p>');
  });

  it('should render lines with mixed styles', () => {
    const props: RenderDeltaProps = {
      ops: [
        { insert: 'a', attributes: { color: 'red', italic: true } },
        { insert: '\n\nb\n' },
      ],
    };
    assert.equal(
      render(props),
      '<p><em style="color:red">a</em></p><p></p><p>b</p>',
    );
  });

  it('should render an inline with a custom tag', () => {
    const props: RenderDeltaProps = {
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
    };
    assert.equal(render(props), '<p>Hello<i> my </i></p><p> name is joey</p>');
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
    const props: RenderDeltaProps = {
      ops,
      options: {
        mentionTag: 'span',
      },
    };
    assert.equal(render(props), '<p><span class="abc">Mention1</span></p>');
  });

  it('should render a mention with a link', () => {
    const props: RenderDeltaProps = {
      ops: [
        {
          insert: 'Mention2',
          attributes: {
            mentions: true,
            mention: { link: 'https://example.com/abc' },
          },
        },
      ],
    };
    const html = render(props);
    assert.equal(html, '<p><a href="https://example.com/abc">Mention2</a></p>');
  });

  it('should return proper HTML for complex ops', function () {
    const ops = [
      {
        insert: 'link',
        attributes: { link: 'http://a.com/?x=a&b=()', target: '_blank' },
      },
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
    const props: RenderDeltaProps = {
      ops,
      options: {
        classPrefix: 'noz',
      },
    };
    assert.equal(
      render(props),
      '<p><a href="http://a.com/?x=a&amp;b=()" target="_blank">link</a>This <span class="noz-font-monospace">is</span> a <span class="noz-size-large">test</span> <strong><em>data</em></strong> <s><u>that</u></s> is <span style="color:#e60000">will</span> <span style="background-color:#ffebcc">test</span> <sub>the</sub> <sup>rendering</sup> of <a href="http://yahoo">inline</a> <span class="noz-formula">x=data</span> formats.</p><ul><li>list</li></ul><ul><li data-checked="true">list</li></ul><p><strong><code>some code</code></strong><a href="#top"><em><code>Top</code></em></a></p>',
    );
  });

  it('should render styling (italic element) at the beginning of a header', () => {
    const props: RenderDeltaProps = {
      ops: [
        { insert: 'hey', attributes: { italic: true } },
        { insert: ' yo' },
        { insert: '\n', attributes: { header: 1 } },
      ],
    };
    assert.equal(render(props), '<h1><em>hey</em> yo</h1>');
  });

  it('should render styling (span with a color style) at the beginning of a header', () => {
    const props: RenderDeltaProps = {
      ops: [
        { attributes: { color: '#e60000' }, insert: 'hey' },
        { insert: ' yo' },
        { insert: '\n', attributes: { header: 1 } },
      ],
    };
    assert.equal(
      render(props),
      '<h1><span style="color:#e60000">hey</span> yo</h1>',
    );
  });

  it('should set default inline styles when inlineStyles is true', function () {
    const hugeOps = [
      { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
      { insert: '\n' },
    ];
    const props: RenderDeltaProps = {
      ops: hugeOps,
      options: {
        inlineStyles: true,
      },
    };
    assert.equal(
      render(props),
      '<p><span style="font-size:2.5em">huge</span></p>',
    );
  });

  it('should set default inline styles when inlineStyles is true and custom CSS styles are applied', () => {
    const hugeOps = [
      { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
      { insert: '\n' },
    ];
    const props: RenderDeltaProps = {
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
    };
    assert.equal(
      render(props),
      '<p><span style="color:red;font-size:2.5em">huge</span></p>',
    );
  });

  it('should allow setting inline styles', function () {
    const hugeOps = [
      { insert: 'huge', attributes: { size: 'huge', attr1: 'red' } },
      { insert: '\n' },
    ];
    const props: RenderDeltaProps = {
      ops: hugeOps,
      options: {
        inlineStyles: {
          size: () => ({ fontSize: '6em' }),
        },
      },
    };
    assert.equal(
      render(props),
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
    const props: RenderDeltaProps = {
      ops,
      options: {
        linkRel: 'license',
      },
    };
    assert.equal(render(props), '<p><a href="#" rel="license">hello</a></p>');
  });

  it('should render links with a target', function () {
    const ops = [
      {
        attributes: {
          link: '#',
          rel: 'nofollow noopener',
          target: '_top',
        },
        insert: 'hello',
      },
    ];
    const props: RenderDeltaProps = { ops };
    assert.equal(
      render(props),
      '<p><a href="#" target="_top" rel="nofollow noopener">hello</a></p>',
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
    const props: RenderDeltaProps = { ops };
    assert.equal(
      render(props),
      // Note preload directives are added only because we're using the renderToStaticMarkup function.
      '<link rel="preload" as="image" href="http://yahoo.com/abc.jpg"/><link rel="preload" as="image" href="http://yahoo.com/def.jpg"/><p><img class="ql-image" src="http://yahoo.com/abc.jpg"/><a href="http://aha"><img class="ql-image" src="http://yahoo.com/def.jpg"/></a></p>',
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
    const props: RenderDeltaProps = { ops };
    assert.equal(
      render(props),
      '<p>mr</p><ol><li>hello</li></ol><ul><li>there</li></ul><ol><li></li></ol>',
    );
  });

  it('should render separate paragraphs', () => {
    const props: RenderDeltaProps = {
      ops: [{ insert: 'hello\nhow are you?\n\nbye\n' }],
    };
    assert.equal(
      render(props),
      '<p>hello</p><p>how are you?</p><p></p><p>bye</p>',
    );
  });

  it('should create checked/unchecked lists', function () {
    const ops4 = [
      { insert: 'hello' },
      { insert: '\n', attributes: { list: 'checked' } },
      { insert: 'there' },
      { insert: '\n', attributes: { list: 'unchecked' } },
      { insert: 'man' },
      { insert: '\n', attributes: { list: 'checked' } },
      { insert: 'not done' },
      { insert: '\n', attributes: { indent: 1, list: 'unchecked' } },
    ];
    const props: RenderDeltaProps = { ops: ops4 };
    const html = render(props);
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

    const props: RenderDeltaProps = {
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
    };

    assert.equal(
      render(props),
      `<p><small>line 1</small></p><p>line 2<span data-attr1="true">yo</span></p><p>line 3</p><p>${encodeHtml(
        '<p>line 4</p>',
      )}</p><p>line 5</p>`,
    );
  });

  it('should render styling within a single-line header', () => {
    const ops = [
      { insert: 'Hello ' },
      { insert: 'there', attributes: { italic: true } },
      { insert: ' yo' },
      { insert: '\n', attributes: { header: 1 } },
    ];
    const props: RenderDeltaProps = { ops };
    assert.equal(render(props), '<h1>Hello <em>there</em> yo</h1>');
  });

  it('should convert using custom URL sanitizer', () => {
    const ops = [
      { attributes: { link: 'http://yahoo<%=abc%>/ed' }, insert: 'test' },
      { attributes: { link: 'http://abc<' }, insert: 'hi' },
    ];

    const props: RenderDeltaProps = {
      ops,
      options: {
        urlSanitizer: (url) => {
          if (url.includes('<%')) {
            return 'REDACTED';
          }
          return url;
        },
      },
    };
    assert.equal(
      render(props),
      '<p><a href="REDACTED">test</a><a href="http://abc&lt;">hi</a></p>',
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
      const props: RenderDeltaProps = {
        ops,
        options: { paragraphTag: 'div' },
      };
      const html = render(props);
      assert.equal(html.includes('hey'), true);
      assert.equal(html.includes('<div class="ql-align'), true);
      assert.equal(html.includes('<div class="ql-direction'), true);
      assert.equal(html.includes('<div class="ql-indent-2'), true);
    });

    it('should render with the default p tag', () => {
      const props: RenderDeltaProps = { ops };
      const html = render(props);
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

    it('should by default render a target attribute on an op only when it has a target attribute', () => {
      const props: RenderDeltaProps = { ops };
      assert.equal(
        render(props),
        '<p><a href="http://#" target="_self">A</a><a href="http://#" target="_blank">B</a><a href="http://#">C</a></p>',
      );
    });

    it('should render the specified linkTarget option when it is specified while preferring the target attribute on an op', () => {
      const props: RenderDeltaProps = {
        ops,
        options: { linkTarget: '_blank' },
      };
      assert.equal(
        render(props),
        '<p><a href="http://#" target="_self">A</a><a href="http://#" target="_blank">B</a><a href="http://#" target="_blank">C</a></p>',
      );
    });

    it('should not render an empty target attribute when linkTarget is an empty string', () => {
      const props: RenderDeltaProps = { ops, options: { linkTarget: '' } };
      const html = render(props);
      assert.equal(
        html,
        '<p><a href="http://#" target="_self">A</a><a href="http://#" target="_blank">B</a><a href="http://#">C</a></p>',
      );
    });
  });

  describe('tables', () => {
    it('should render an empty table', () => {
      const ops = [
        {
          insert: '\n\n\n',
          attributes: { table: 'row-1' },
        },
        {
          insert: '\n\n\n',
          attributes: { table: 'row-2' },
        },
        {
          insert: '\n\n\n',
          attributes: { table: 'row-3' },
        },
        {
          insert: '\n',
        },
      ];

      const props: RenderDeltaProps = { ops };
      assert.equal(
        render(props),
        [
          '<table><tbody>',
          '<tr><td data-row="row-1"></td><td data-row="row-1"></td><td data-row="row-1"></td></tr>',
          '<tr><td data-row="row-2"></td><td data-row="row-2"></td><td data-row="row-2"></td></tr>',
          '<tr><td data-row="row-3"></td><td data-row="row-3"></td><td data-row="row-3"></td></tr>',
          '</tbody></table>',
          '<p></p>',
        ].join(''),
      );
    });

    it('should render singe cell table', () => {
      const ops = [
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

      const props: RenderDeltaProps = { ops };
      assert.equal(
        render(props),
        [
          '<table><tbody>',
          '<tr><td data-row="row-1">cell</td></tr>',
          '</tbody></table>',
        ].join(''),
      );
    });

    it('should render filled table', () => {
      const ops = [
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

      const props: RenderDeltaProps = { ops };
      assert.equal(
        render(props),
        [
          '<table><tbody>',
          '<tr><td data-row="row-1">11</td><td data-row="row-1">12</td><td data-row="row-1">13</td></tr>',
          '<tr><td data-row="row-2">21</td><td data-row="row-2">22</td><td data-row="row-2">23</td></tr>',
          '<tr><td data-row="row-3">31</td><td data-row="row-3">32</td><td data-row="row-3">33</td></tr>',
          '</tbody></table>',
          '<p></p>',
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
      const props: RenderDeltaProps = { ops };
      const html = render(props);
      assert.equal(
        html,
        `<pre>line 1\nline 2</pre><pre data-language="javascript">line 3</pre><pre>${encodeHtml(
          '<p>line 4</p>',
        )}\nline 5</pre>`,
      );
    });

    it('should render code block with the multiLineCodeBlock option set to false', () => {
      const props: RenderDeltaProps = {
        ops,
        options: {
          multiLineCodeBlock: false,
        },
      };
      const html = render(props);
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
      const props: RenderDeltaProps = {
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
      };
      assert.equal(render(props), '<p><b><i>my text</i></b>unknown</p>');
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
        const props: RenderDeltaProps = {
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
        };
        assert.equal(
          render(props),
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
        const props: RenderDeltaProps = {
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
        };
        assert.equal(
          render(props),
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
        const props: RenderDeltaProps = {
          ops: ops.slice(0, 2),
          customRenderer,
        };
        assert.equal(render(props), '<pre>:</pre>');
      });

      it('should render a custom insert type among other inserts', () => {
        const props: RenderDeltaProps = { ops, customRenderer };
        assert.equal(render(props), '<pre>:\ncode1\n:</pre>');
      });

      it('should render custom insert types along with inserts with a custom tag', () => {
        const props: RenderDeltaProps = {
          ops,
          options: {
            customTag: (format) => {
              if (format === 'code-block') {
                return 'code';
              }
            },
          },
          customRenderer,
        };
        assert.equal(render(props), '<code>:\ncode1\n:</code>');
      });
    });

    describe('inside headers', () => {
      const customRenderer: CustomRenderer = (op) => {
        if ('colonizer' in op.insert.value) {
          return op.insert.value.colonizer as string;
        }
        return '';
      };

      it('should render a simple custom insert type', () => {
        const props: RenderDeltaProps = {
          ops: [
            { insert: { colonizer: ':' } },
            { insert: '\n', attributes: { header: 1 } },
          ],
          customRenderer,
        };
        assert.equal(render(props), '<h1>:</h1>');
      });

      it('should render a custom insert type among other inserts', () => {
        // Note that there's one outer-level h1 tag because of combining multi-line headers.
        const props: RenderDeltaProps = {
          ops: [
            { insert: { colonizer: ':' } },
            { insert: '\n', attributes: { header: 1 } },
            { insert: 'hello' },
            { insert: '\n', attributes: { header: 1 } },
            { insert: { colonizer: ';' } },
            { insert: '\n', attributes: { header: 1 } },
          ],
          customRenderer,
        };
        assert.equal(render(props), '<h1>:\nhello\n;</h1>');
      });

      it('should render a custom insert type among other header inserts when not multiline', () => {
        const props: RenderDeltaProps = {
          ops: [
            { insert: { colonizer: ':' } },
            { insert: '\n', attributes: { header: 1 } },
            { insert: 'hello' },
            { insert: '\n', attributes: { header: 1 } },
            { insert: { colonizer: ';' } },
            { insert: '\n', attributes: { header: 1 } },
          ],
          customRenderer,
          options: {
            multiLineHeader: false,
          },
        };
        assert.equal(render(props), '<h1>:</h1><h1>hello</h1><h1>;</h1>');
      });
    });
  });

  describe('multi-line headers', () => {
    it('should render multi-line headers of the same style', () => {
      const props: RenderDeltaProps = {
        ops: [
          { insert: 'hello\n', attributes: { header: 1 } },
          { insert: 'bye\n', attributes: { header: 1 } },
        ],
      };
      assert.equal(render(props), '<h1>hello\nbye</h1>');
    });

    it('should render styling within a multi-line header', () => {
      const ops = [
        { insert: 'Hello ' },
        { insert: 'there', attributes: { italic: true } },
        { insert: '\n', attributes: { header: 1 } },
        { insert: 'yo' },
        { insert: '\n', attributes: { header: 1 } },
      ];
      const props: RenderDeltaProps = { ops };
      assert.equal(render(props), '<h1>Hello <em>there</em>\nyo</h1>');
    });

    it('should render complex nested styling within a multi-line header', () => {
      const ops = [
        {
          insert: 'H',
        },
        {
          attributes: {
            underline: true,
            bold: true,
          },
          insert: 'e',
        },
        {
          attributes: {
            underline: true,
          },
          insert: 'llo',
        },
        {
          insert: ' ',
        },
        {
          attributes: {
            italic: true,
          },
          insert: 'ther',
        },
        {
          attributes: {
            color: '#e60000',
            italic: true,
          },
          insert: 'e',
        },
        {
          attributes: {
            header: 1,
          },
          insert: '\n',
        },
        {
          attributes: {
            color: '#e60000',
          },
          insert: 'y',
        },
        {
          attributes: {
            underline: true,
          },
          insert: 'o',
        },
        {
          attributes: {
            header: 1,
          },
          insert: '\n',
        },
      ];
      const props: RenderDeltaProps = { ops };
      assert.equal(
        render(props),
        '<h1>H<strong><u>e</u></strong><u>llo</u> <em>ther</em><em style="color:#e60000">e</em>\n<span style="color:#e60000">y</span><u>o</u></h1>',
      );
    });
  });
});
