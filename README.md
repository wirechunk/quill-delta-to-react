# Render Quill's Delta ops in React

Converts [Quill's](https://quilljs.com) [Delta](https://quilljs.com/docs/delta/) format to HTML (insert ops only) with properly nested lists.

## Quickstart

Installation
```
npm install quill-delta-to-react
```

Usage
```javascript
import { RenderDelta } from 'quill-delta-to-react';

// TypeScript / ES6:
// import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html'; 

var deltaOps =  [
    {insert: "Hello\n"},
    {insert: "This is colorful", attributes: {color: '#f00'}}
];

var cfg = {};

var converter = new QuillDeltaToHtmlConverter(deltaOps, cfg);

var html = converter.convert(); 
```

## Configuration

`QuillDeltaToHtmlConverter` accepts a few configuration options as shown below:

|Option | Type | Default | Description                                                                                                                                                                                                             
|---|---|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`paragraphTag`| string |  'p' | Custom tag to wrap inline html elements                                                                                                                                                                                 |
|`classPrefix`| string | 'ql' | A css class name to prefix class generating styles such as `size`, `font`, etc.                                                                                                                                         |
|`inlineStyles`| boolean or object | false | If true or an object, use inline styles instead of classes. See Rendering Inline Styles section below for using an object                                                                                               |
|`multiLineBlockquote`| boolean | true | Instead of rendering multiple `blockquote` elements for quotes that are consecutive and have same styles(`align`, `indent`, and `direction`), it renders them into only one                                             |
|`multiLineHeader`| boolean | true | Same deal as `multiLineBlockquote` for headers                                                                                                                                                                          |
|`multiLineCodeBlock`| boolean | true | Same deal as `multiLineBlockquote` for code-blocks                                                                                                                                                                      |
|`multiLineParagraph`| boolean | true | Set to false to generate a new paragraph tag after each enter press (new line)                                                                                                                                          |
|`linkRel`| string | none | Specifies a value to put on the `rel` attr on all links. This can be overridden by an individual link op by specifying the `rel` attribute in the respective op's attributes                                            |
|`linkTarget`| string | '_blank' | Specifies target for all links; use `''` (empty string) to not generate `target` attribute. This can be overridden by an individual link op by specifiying the `target` with a value in the respective op's attributes. |
|`allowBackgroundClasses`| boolean | false | If true, classes will be added for the background attr                                                                                                                                                                  |
|`urlSanitizer`| function `(url: string): string` | undefined | A function that is called once per url in the ops (image, video, link) for you to do custom sanitization                                                                                                                |
|`customTag`| function `(format: string, op: DeltaInsertOp): string \| undefined` | undefined | Callback allows to provide custom  tag for some format                                                                                                                                                                  |
|`customAttributes`| function `(op: DeltaInsertOp): { [key: string]: string } \| undefined` | undefined | Allows to provide custom html tag attributes                                                                                                                                                                            |
|`customClasses`| function `(op: DeltaInsertOp): string \| string[] \| undefined` | undefined | Allows to provide custom classes                                                                                                                                                                                        |
|`customCssStyles`| function `(op: DeltaInsertOp): string \| string[] \| undefined` | undefined | Allows to provide custom CSS styles                                                                                                                                                                                     |

## Rendering Inline Styles

The easiest way to enable this is to pass the option `inlineStyles: true`.

You can customize styles by passing an object to `inlineStyles` instead:

```
inlineStyles: {
   font: {
      'serif': 'font-family: Georgia, Times New Roman, serif',
      'monospace': 'font-family: Monaco, Courier New, monospace'
   },
   size: {
      'small': 'font-size: 0.75em',
      'large': 'font-size: 1.5em',
      'huge': 'font-size: 2.5em'
   },
   indent: (value, op) => {
      var indentSize = parseInt(value, 10) * 3;
      var side = op.attributes['direction'] === 'rtl' ? 'right' : 'left';
      return 'padding-' + side + ':' + indentSize + 'em';
   },
   direction: (value, op) => {
      if (value === 'rtl') {
         return 'direction:rtl' + ( op.attributes['align'] ? '' : '; text-align: inherit' );
      } else {
         return '';
      }
   }
};
```

Keys to this object are the names of attributes from Quill. The values are either a simple lookup table (like in the 'font' example above) used to map values to styles, or a `fn(value, op)` which returns a style string.

## Advanced Custom Rendering Using Grouped Ops

If you want to do the full rendering yourself, you can do so by getting the processed and grouped ops.

`BlotBlock` represents custom blots with `renderAsBlock:true` property pair in its attributes

See above for `op object` format. 
